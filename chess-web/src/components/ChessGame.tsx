'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessGameProps, Position, Piece, Move, PlayerColor, GameState, GameMode, Difficulty, ThemeId } from '@/lib/types';
import { calculateLegalMoves, makeMove, createInitialBoard, generateMoveNotation, isInCheck, getAllLegalMoves } from '@/lib/chess';
import { chessAI } from '@/lib/ai';
import { chessSocket } from '@/lib/socket';
import { getThemeById } from '@/lib/themes';

const PIECE_SYMBOLS = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
};

// Enhanced piece styling component
const ChessPiece = ({ piece, isHovered, themeId }: { piece: Piece; isHovered: boolean; themeId: ThemeId }) => {
  const theme = getThemeById(themeId);
  
  return (
    <motion.div
      className={`
        text-5xl select-none z-10 font-bold relative
        ${piece.color === 'white' ? theme.whitePieceColor : theme.blackPieceColor}
        ${piece.color === 'white' ? theme.whitePieceShadow : theme.blackPieceShadow}
        filter transition-all duration-200
        ${isHovered ? 'brightness-110 scale-110' : ''}
      `}
      style={{
        textShadow: piece.color === 'white' ? theme.whitePieceTextShadow : theme.blackPieceTextShadow
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.15 }}
      transition={{ type: 'spring', stiffness: 800, damping: 20 }}
    >
      {PIECE_SYMBOLS[piece.color][piece.type]}
    </motion.div>
  );
};

export function ChessGame({
  gameMode = 'local',
  difficulty = 'medium',
  playerColor = 'white',
  themeId = 'classic',
  onGameOver,
}: ChessGameProps) {
  const initialState: GameState = {
    board: createInitialBoard(),
    currentPlayer: 'white',
    moveHistory: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    capturedPieces: { white: [], black: [] },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };

  const [gameState, setGameState] = useState<GameState>(initialState);
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [hoveredSquare, setHoveredSquare] = useState<Position | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [gameStatus, setGameStatus] = useState<string>('');
  const [moveNotations, setMoveNotations] = useState<string[]>([]);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  
  // Get current theme
  const theme = getThemeById(themeId);

  // Initialize multiplayer if needed
  useEffect(() => {
    if (gameMode === 'online') {
      initializeMultiplayer();
    }
  }, [gameMode]);

  // AI move handling
  useEffect(() => {
    if (gameMode === 'computer' && 
        gameState.currentPlayer !== playerColor && 
        !gameState.isCheckmate && 
        !gameState.isStalemate &&
        !isAnimating &&
        !isAIThinking) {
      
      const timer = setTimeout(() => {
        makeAIMove();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameMode, playerColor, isAnimating, isAIThinking]);

  // Update game status
  useEffect(() => {
    updateGameStatus();
  }, [gameState, isAIThinking, gameMode, playerColor, difficulty]);

  const initializeMultiplayer = async () => {
    try {
      await chessSocket.connect();
      
      chessSocket.onMove((move: Move) => {
        setGameState(prevState => makeMove(prevState, move));
      });

      chessSocket.onPlayerJoined(() => {
        setIsWaitingForOpponent(false);
      });

      chessSocket.onPlayerLeft(() => {
        setGameStatus('Opponent disconnected');
      });

    } catch (error) {
      console.error('Failed to initialize multiplayer:', error);
    }
  };

  const makeAIMove = async () => {
    if (isAIThinking) return;
    
    setIsAIThinking(true);
    
    try {
      // Add a timeout wrapper for the AI
      const aiMovePromise = new Promise<Move | null>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('AI timeout'));
        }, 10000); // 10 second timeout
        
        try {
          const move = chessAI.getBestMove(gameState, difficulty);
          clearTimeout(timeoutId);
          resolve(move);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      const aiMove = await aiMovePromise;
      
      if (aiMove) {
        await handleMove(aiMove);
      } else {
        console.error('AI could not find a valid move');
        // This shouldn't happen with a working AI, but just in case
        const allMoves = getAllLegalMoves(gameState, gameState.currentPlayer);
        if (allMoves.length > 0) {
          await handleMove(allMoves[0]);
        }
      }
    } catch (error) {
      console.error('AI move failed:', error);
      
      // Fallback: make a random legal move
      try {
        const allMoves = getAllLegalMoves(gameState, gameState.currentPlayer);
        if (allMoves.length > 0) {
          const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
          await handleMove(randomMove);
        }
      } catch (fallbackError) {
        console.error('Even fallback move failed:', fallbackError);
      }
    } finally {
      setIsAIThinking(false);
    }
  };

  const handleSquareClick = useCallback(async (position: Position) => {
    if (isAnimating) return;
    
    // Online multiplayer turn validation
    if (gameMode === 'online' && gameState.currentPlayer !== playerColor) {
      return;
    }

    const piece = gameState.board[position.x][position.y];

    if (selectedSquare) {
      // Try to make a move
      if (legalMoves.some(move => move.x === position.x && move.y === position.y)) {
        const move: Move = {
          from: selectedSquare,
          to: position,
          piece: gameState.board[selectedSquare.x][selectedSquare.y]!,
          capturedPiece: piece || undefined,
        };
        
        await handleMove(move);
      }
      
      // Clear selection
      setSelectedSquare(null);
      setLegalMoves([]);
    } else if (piece && piece.color === gameState.currentPlayer) {
      // Select piece
      setSelectedSquare(position);
      const moves = calculateLegalMoves(gameState, position);
      setLegalMoves(moves);
    }
  }, [gameState, selectedSquare, legalMoves, isAnimating, gameMode, playerColor]);

  const handleMove = async (move: Move) => {
    setIsAnimating(true);
    
    // Add move notation
    const notation = generateMoveNotation(move);
    setMoveNotations(prev => [...prev, notation]);
    
    // Animate the move
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newGameState = makeMove(gameState, move);
    setGameState(newGameState);
    
    // Send move in multiplayer
    if (gameMode === 'online') {
      chessSocket.sendMove(move);
    }
    
    setIsAnimating(false);

    // Check for game over
    if (newGameState.isCheckmate || newGameState.isStalemate) {
      const result = {
        winner: newGameState.isCheckmate ? 
          (newGameState.currentPlayer === 'white' ? 'black' : 'white') as PlayerColor : 
          'draw' as const,
        reason: (newGameState.isCheckmate ? 'checkmate' : 'stalemate') as 'checkmate' | 'stalemate'
      };
      onGameOver?.(result);
    }
  };

  const updateGameStatus = () => {
    if (gameState.isCheckmate) {
      const winner = gameState.currentPlayer === 'white' ? 'Black' : 'White';
      setGameStatus(`Checkmate! ${winner} wins!`);
    } else if (gameState.isStalemate) {
      setGameStatus('Stalemate! Game is a draw.');
    } else if (isAIThinking && gameMode === 'computer' && gameState.currentPlayer !== playerColor) {
      setGameStatus(`AI is thinking... (${difficulty} difficulty)`);
    } else if (gameState.isCheck) {
      setGameStatus(`${gameState.currentPlayer === 'white' ? 'White' : 'Black'} is in check!`);
    } else {
      setGameStatus(`${gameState.currentPlayer === 'white' ? 'White' : 'Black'} to move`);
    }
  };

  const resetGame = () => {
    setGameState(initialState);
    setSelectedSquare(null);
    setLegalMoves([]);
    setMoveNotations([]);
    setGameStatus('');
  };

  const isSquareHighlighted = (x: number, y: number): boolean => {
    return selectedSquare?.x === x && selectedSquare?.y === y;
  };

  const isSquareLegalMove = (x: number, y: number): boolean => {
    return legalMoves.some(move => move.x === x && move.y === y);
  };

  const isSquareInCheck = (x: number, y: number): boolean => {
    const piece = gameState.board[x][y];
    return piece?.type === 'king' && piece.color === gameState.currentPlayer && gameState.isCheck;
  };

  return (
    <div className={`min-h-screen p-6 ${
      themeId === 'crystal' 
        ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden' 
        : 'bg-gradient-to-br from-slate-100 to-slate-200'
    }`}>
      {/* Crystal theme background effects */}
      {themeId === 'crystal' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-blue-100/20 to-purple-100/10" />
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-radial from-white/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-radial from-blue-200/40 to-transparent rounded-full blur-3xl" />
            <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-gradient-radial from-purple-200/30 to-transparent rounded-full blur-2xl" />
          </div>
        </>
      )}
      <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto justify-center items-start relative z-10">
        {/* Game Board */}
        <div className="flex flex-col items-center lg:flex-shrink-0">
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Chess Master</h2>
            <div className="text-lg font-semibold text-slate-600">
              {gameStatus}
            </div>
          </div>

          <div className="relative">
            <div className={`grid grid-cols-8 gap-0 border-4 ${theme.boardBorder} rounded-xl overflow-hidden shadow-2xl ${theme.boardRing}`}>
              {Array.from({ length: 64 }, (_, i) => {
                const x = Math.floor(i / 8);
                const y = i % 8;
                const isLight = (x + y) % 2 === 0;
                const piece = gameState.board[x][y];
                
                return (
                  <motion.div
                    key={`${x}-${y}`}
                    className={`
                      w-16 h-16 flex items-center justify-center cursor-pointer relative
                      ${isLight ? theme.lightSquare : theme.darkSquare}
                      ${isSquareHighlighted(x, y) ? 'ring-4 ring-blue-500 ring-inset' : ''}
                      ${isSquareLegalMove(x, y) ? 'ring-2 ring-emerald-500 ring-inset' : ''}
                      ${isSquareInCheck(x, y) ? 'ring-4 ring-red-500 ring-inset' : ''}
                      hover:brightness-110 transition-all duration-200
                      ${hoveredSquare?.x === x && hoveredSquare?.y === y ? 'bg-opacity-80' : ''}
                    `}
                    onClick={() => handleSquareClick({ x, y })}
                    onMouseEnter={() => setHoveredSquare({ x, y })}
                    onMouseLeave={() => setHoveredSquare(null)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Legal move indicator */}
                    {isSquareLegalMove(x, y) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-4 h-4 rounded-full ${piece ? 'ring-3 ring-emerald-400 ring-opacity-80' : 'bg-emerald-400/60'}`} />
                      </div>
                    )}
                    
                    {/* Chess piece */}
                    {piece && (
                      <ChessPiece 
                        piece={piece} 
                        isHovered={hoveredSquare?.x === x && hoveredSquare?.y === y}
                        themeId={themeId}
                      />
                    )}
                    
                    {/* Coordinate labels */}
                    {x === 7 && (
                      <div className={`absolute bottom-1 right-1 text-xs font-bold ${isLight ? theme.coordinateLight : theme.coordinateDark}`}>
                        {String.fromCharCode(97 + y)}
                      </div>
                    )}
                    {y === 0 && (
                      <div className={`absolute top-1 left-1 text-xs font-bold ${isLight ? theme.coordinateLight : theme.coordinateDark}`}>
                        {8 - x}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Game Info Panel */}
        <motion.div 
          className={`flex-1 ${isPanelMinimized ? 'max-w-16' : 'max-w-md'} transition-all duration-300`}
          animate={{ 
            width: isPanelMinimized ? '4rem' : 'auto',
            maxWidth: isPanelMinimized ? '4rem' : '28rem'
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Panel Header with Minimize Button */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
              {!isPanelMinimized && (
                <motion.h3 
                  className="text-lg font-semibold text-slate-800"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  Game Info
                </motion.h3>
              )}
              <motion.button
                onClick={() => setIsPanelMinimized(!isPanelMinimized)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isPanelMinimized ? 'Expand panel' : 'Minimize panel'}
              >
                <motion.div
                  animate={{ rotate: isPanelMinimized ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isPanelMinimized ? '→' : '←'}
                </motion.div>
              </motion.button>
            </div>

            <AnimatePresence>
              {!isPanelMinimized && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="p-6 space-y-6"
                >
                  {/* Game Mode Info */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      {gameMode === 'computer' && `vs AI (${difficulty})`}
                      {gameMode === 'local' && 'Local Multiplayer'}
                      {gameMode === 'online' && (roomId ? `Room: ${roomId}` : 'Online Game')}
                    </h3>
                    {isWaitingForOpponent && (
                      <div className="text-yellow-600 font-medium">Waiting for opponent...</div>
                    )}
                  </div>

                  {/* Captured Pieces */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-600 mb-2">Captured by White</h4>
                      <div className="flex flex-wrap gap-2 min-h-[2rem] bg-slate-50 rounded p-3">
                        {gameState.capturedPieces.white.map((piece, index) => (
                          <div key={index} className="relative">
                            <span 
                              className={`
                                text-xl font-bold
                                ${piece.color === 'white' 
                                  ? 'text-gray-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                                  : 'text-gray-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)]'
                                }
                              `}
                              style={{
                                textShadow: piece.color === 'white' 
                                  ? '1px 1px 0px #374151, -0.5px -0.5px 0px #374151'
                                  : '1px 1px 0px #f9fafb, -0.5px -0.5px 0px #f9fafb'
                              }}
                            >
                              {PIECE_SYMBOLS[piece.color][piece.type]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-600 mb-2">Captured by Black</h4>
                      <div className="flex flex-wrap gap-2 min-h-[2rem] bg-slate-50 rounded p-3">
                        {gameState.capturedPieces.black.map((piece, index) => (
                          <div key={index} className="relative">
                            <span 
                              className={`
                                text-xl font-bold
                                ${piece.color === 'white' 
                                  ? 'text-gray-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' 
                                  : 'text-gray-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)]'
                                }
                              `}
                              style={{
                                textShadow: piece.color === 'white' 
                                  ? '1px 1px 0px #374151, -0.5px -0.5px 0px #374151'
                                  : '1px 1px 0px #f9fafb, -0.5px -0.5px 0px #f9fafb'
                              }}
                            >
                              {PIECE_SYMBOLS[piece.color][piece.type]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Move History */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">Move History</h4>
                    <div className="bg-slate-50 rounded p-3 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {moveNotations.map((notation, index) => (
                          <div key={index} className={`${index % 2 === 0 ? 'text-slate-800' : 'text-slate-600'}`}>
                            {Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'} {notation}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Game Controls */}
                  <div className="space-y-3">
                    <button
                      onClick={resetGame}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      New Game
                    </button>
                    
                    {gameMode === 'online' && roomId && (
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-2">Share room code:</p>
                        <div className="bg-slate-100 rounded px-3 py-2 font-mono text-lg font-bold text-center">
                          {roomId}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Minimized State Indicators */}
            {isPanelMinimized && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-2 space-y-2"
              >
                {/* Quick status indicators */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold">
                    {gameState.currentPlayer === 'white' ? 'W' : 'B'}
                  </div>
                  
                  {gameState.capturedPieces.white.length > 0 && (
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs">
                      {gameState.capturedPieces.white.length}
                    </div>
                  )}
                  
                  {gameState.capturedPieces.black.length > 0 && (
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs">
                      {gameState.capturedPieces.black.length}
                    </div>
                  )}
                  
                  {moveNotations.length > 0 && (
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs">
                      {moveNotations.length}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
} 