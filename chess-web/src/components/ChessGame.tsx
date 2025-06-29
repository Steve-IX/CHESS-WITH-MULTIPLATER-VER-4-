'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessGameProps, Position, Piece, Move, PlayerColor, GameState, GameMode, Difficulty, ThemeId, TimerState, TimerMode } from '@/lib/types';
import { calculateLegalMoves, makeMove, createInitialBoard, generateMoveNotation, isInCheck, getAllLegalMoves } from '@/lib/chess';
import { chessAI } from '@/lib/ai';
import { chessSocket } from '@/lib/socket';
import { getThemeById } from '@/lib/themes';
import { Clock, Play, Pause } from 'lucide-react';

const PIECE_SYMBOLS = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
};

// Enhanced piece styling component - Mobile Responsive
const ChessPiece = ({ piece, isHovered, themeId }: { piece: Piece; isHovered: boolean; themeId: ThemeId }) => {
  const theme = getThemeById(themeId);
  
  return (
    <motion.div
      className={`
        text-2xl sm:text-3xl md:text-4xl lg:text-5xl select-none z-10 font-bold relative
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

// Timer display component - Mobile Responsive
const TimerDisplay = ({ 
  time, 
  isActive, 
  player, 
  themeId 
}: { 
  time: number; 
  isActive: boolean; 
  player: PlayerColor; 
  themeId: ThemeId 
}) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const theme = getThemeById(themeId);
  
  const isLowTime = time <= 30;
  
  return (
    <motion.div
      className={`
        flex items-center gap-2 sm:gap-3 px-2 sm:px-3 lg:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all duration-300
        ${isActive 
          ? `border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/30` 
          : `border-gray-400/50 bg-gray-500/10`
        }
        ${isLowTime && isActive ? 'animate-pulse border-red-400 bg-red-500/20' : ''}
      `}
      animate={{
        scale: isActive ? 1.02 : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      <Clock size={16} className={`${isActive ? 'text-blue-400' : 'text-gray-400'} sm:w-5 sm:h-5`} />
      <div className="flex flex-col min-w-0">
        <div className={`text-xs font-medium ${player === 'white' ? 'text-gray-600' : 'text-gray-300'} hidden xl:block`}>
          {player === 'white' ? 'White' : 'Black'}
        </div>
        <div className={`
          text-sm sm:text-base lg:text-lg font-bold font-mono
          ${isLowTime && isActive ? 'text-red-400' : (isActive ? 'text-blue-400' : 'text-gray-400')}
        `}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>
    </motion.div>
  );
};

export function ChessGame({
  gameMode = 'local',
  difficulty = 'medium',
  playerColor = 'white',
  themeId = 'classic',
  timerMode = 'none',
  customTime = 15,
  onGameOver,
}: ChessGameProps) {
  
  // Initialize timer state
  const getInitialTimerState = (): TimerState | undefined => {
    if (timerMode === 'none') return undefined;
    
    let timeInSeconds = 0;
    switch (timerMode) {
      case '3min': timeInSeconds = 3 * 60; break;
      case '5min': timeInSeconds = 5 * 60; break;
      case '10min': timeInSeconds = 10 * 60; break;
      case 'custom': timeInSeconds = (customTime || 15) * 60; break;
    }
    
    return {
      whiteTime: timeInSeconds,
      blackTime: timeInSeconds,
      isActive: false,
      mode: timerMode,
    };
  };

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
    timer: getInitialTimerState(),
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
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [hasGameStarted, setHasGameStarted] = useState(false);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get current theme
  const theme = getThemeById(themeId);

  // Timer countdown effect
  useEffect(() => {
    if (!gameState.timer || !gameState.timer.isActive || isTimerPaused || gameState.isCheckmate || gameState.isStalemate) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setGameState(prevState => {
        if (!prevState.timer) return prevState;
        
        const currentPlayer = prevState.currentPlayer;
        const timeKey = currentPlayer === 'white' ? 'whiteTime' : 'blackTime';
        const newTime = prevState.timer[timeKey] - 1;
        
        // Check for timeout
        if (newTime <= 0) {
          const winner = currentPlayer === 'white' ? 'black' : 'white';
          onGameOver?.({ winner, reason: 'timeout' });
          
          return {
            ...prevState,
            timer: {
              ...prevState.timer,
              [timeKey]: 0,
              isActive: false,
            },
          };
        }
        
        return {
          ...prevState,
          timer: {
            ...prevState.timer,
            [timeKey]: newTime,
          },
        };
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gameState.timer?.isActive, gameState.currentPlayer, isTimerPaused, gameState.isCheckmate, gameState.isStalemate, onGameOver]);

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
    if (isAnimating || isAIThinking) return;
    
    // Online multiplayer turn validation
    if (gameMode === 'online' && gameState.currentPlayer !== playerColor) {
      return;
    }

    // Computer game turn validation
    if (gameMode === 'computer' && gameState.currentPlayer !== playerColor) {
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
      // Deselect if clicking the same square or an invalid move
      setSelectedSquare(null);
      setLegalMoves([]);
    } else {
      // Select a piece
      if (piece && piece.color === gameState.currentPlayer) {
        if (gameMode === 'online' && piece.color !== playerColor) {
          return; // Can't select opponent's pieces in online mode
        }
        
      setSelectedSquare(position);
      const moves = calculateLegalMoves(gameState, position);
      setLegalMoves(moves);
    }
    }
  }, [selectedSquare, legalMoves, gameState, gameMode, playerColor, isAnimating, isAIThinking]);

  const handleMove = async (move: Move) => {
    setIsAnimating(true);
    
    try {
      let newGameState = makeMove(gameState, move);
      
      // Start timer on first move - merge with the move state update
      if (!hasGameStarted && newGameState.timer) {
        setHasGameStarted(true);
        newGameState = {
          ...newGameState,
          timer: newGameState.timer ? { ...newGameState.timer, isActive: true } : undefined
        };
      }
      
      setGameState(newGameState);
    
    // Add move notation
    const notation = generateMoveNotation(move);
    setMoveNotations(prev => [...prev, notation]);
    
      // Clear selection
      setSelectedSquare(null);
      setLegalMoves([]);
    
      // Send move if online
    if (gameMode === 'online') {
        await chessSocket.sendMove(move);
    }

      // Check for game end
      if (newGameState.isCheckmate) {
        const winner = newGameState.currentPlayer === 'white' ? 'black' : 'white';
        onGameOver?.({ winner, reason: 'checkmate' });
      } else if (newGameState.isStalemate) {
        onGameOver?.({ winner: 'draw', reason: 'stalemate' });
      }
      
    } catch (error) {
      console.error('Error making move:', error);
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const updateGameStatus = () => {
    if (gameState.isCheckmate) {
      const winner = gameState.currentPlayer === 'white' ? 'Black' : 'White';
      setGameStatus(`${winner} wins by checkmate!`);
    } else if (gameState.isStalemate) {
      setGameStatus('Game ended in stalemate');
    } else if (gameState.isCheck) {
      const player = gameState.currentPlayer === 'white' ? 'White' : 'Black';
      setGameStatus(`${player} is in check`);
    } else if (gameMode === 'computer' && isAIThinking) {
      setGameStatus(`AI (${difficulty}) is thinking...`);
    } else if (gameMode === 'online' && isWaitingForOpponent) {
      setGameStatus('Waiting for opponent...');
    } else {
      const player = gameState.currentPlayer === 'white' ? 'White' : 'Black';
      setGameStatus(`${player} to move`);
    }
  };

  const resetGame = () => {
    const newInitialState = {
      ...initialState,
      timer: getInitialTimerState(),
    };
    setGameState(newInitialState);
    setSelectedSquare(null);
    setLegalMoves([]);
    setMoveNotations([]);
    setIsTimerPaused(false);
    setHasGameStarted(false);
  };

  const toggleTimer = () => {
    setIsTimerPaused(prev => !prev);
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
      <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto justify-center items-center xl:items-start relative z-10 px-2 sm:px-4">
        {/* Timer Panel - Mobile: Top, Desktop: Left Side */}
        {gameState.timer && (
          <div className="w-full xl:flex-shrink-0 xl:w-64 order-1 xl:order-1">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
              {/* Mobile: Horizontal Layout, Desktop: Vertical */}
              <div className="flex xl:flex-col gap-4 xl:gap-6">
                {/* Timer Header - Hidden on mobile */}
                <div className="hidden xl:block text-center">
                  <h3 className="text-lg lg:text-xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                    <Clock size={20} className="text-blue-600 lg:w-6 lg:h-6" />
                    <span className="text-sm lg:text-base">Game Timer</span>
                  </h3>
                  <div className="text-xs lg:text-sm text-slate-600 font-medium">
                    {gameState.timer.mode === 'custom' 
                      ? `${Math.floor((customTime || 15))} min` 
                      : gameState.timer.mode === 'none' 
                        ? 'No timer' 
                        : gameState.timer.mode.replace('min', ' min')
                    }
                  </div>
                </div>

                {/* Black Timer */}
                <div className="flex-1 xl:space-y-3">
                  <div className="text-center text-xs sm:text-sm font-medium text-slate-600 mb-2 xl:mb-0">Black Player</div>
                  <TimerDisplay 
                    time={gameState.timer.blackTime}
                    isActive={gameState.currentPlayer === 'black' && gameState.timer.isActive && !isTimerPaused}
                    player="black"
                    themeId={themeId}
                  />
                </div>

                {/* Timer Controls - Mobile: Center, Desktop: Below */}
                <div className="flex xl:flex-col gap-2 xl:gap-3 items-center xl:items-stretch">
                  <motion.button
                    onClick={toggleTimer}
                    className={`
                      flex items-center justify-center gap-1 xl:gap-2 px-2 xl:px-4 py-2 xl:py-3 rounded-lg font-medium transition-all duration-300 text-xs xl:text-sm
                      ${isTimerPaused 
                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }
                    `}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={gameState.isCheckmate || gameState.isStalemate || !hasGameStarted}
                  >
                    {isTimerPaused ? <Play size={14} className="xl:w-4 xl:h-4" /> : <Pause size={14} className="xl:w-4 xl:h-4" />}
                    <span className="hidden sm:inline">{isTimerPaused ? 'Resume' : 'Pause'}</span>
                  </motion.button>
                  
                  {!hasGameStarted && gameState.timer.mode !== 'none' && (
                    <div className="text-center text-xs xl:text-sm text-slate-600 bg-yellow-100/80 rounded-lg p-2 xl:p-3 flex-1 xl:flex-none">
                      <span className="hidden sm:inline">Timer will start when White makes the first move</span>
                      <span className="sm:hidden">Timer starts with first move</span>
                    </div>
                  )}
                </div>

                {/* White Timer */}
                <div className="flex-1 xl:space-y-3">
                  <div className="text-center text-xs sm:text-sm font-medium text-slate-600 mb-2 xl:mb-0">White Player</div>
                  <TimerDisplay 
                    time={gameState.timer.whiteTime}
                    isActive={gameState.currentPlayer === 'white' && gameState.timer.isActive && !isTimerPaused}
                    player="white"
                    themeId={themeId}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Board */}
        <div className="flex flex-col items-center flex-none min-w-fit order-2 xl:order-2">
          <div className="mb-2 sm:mb-4 text-center min-w-max">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 mb-1 sm:mb-2 whitespace-nowrap inline-block">Chess Master</h2>
            <div className="text-sm sm:text-base lg:text-lg font-semibold text-slate-600">
              {gameStatus}
            </div>
          </div>

          <div className="relative">
            <div className={`grid grid-cols-8 gap-0 border-2 sm:border-4 ${theme.boardBorder} rounded-lg sm:rounded-xl overflow-hidden shadow-xl sm:shadow-2xl ${theme.boardRing}`}>
              {Array.from({ length: 64 }, (_, i) => {
                const x = Math.floor(i / 8);
                const y = i % 8;
                const isLight = (x + y) % 2 === 0;
                const piece = gameState.board[x][y];
                
                return (
                  <motion.div
                    key={`${x}-${y}`}
                    className={`
                      w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center cursor-pointer relative
                      ${isLight ? theme.lightSquare : theme.darkSquare}
                      ${isSquareHighlighted(x, y) ? 'ring-2 sm:ring-4 ring-blue-500 ring-inset' : ''}
                      ${isSquareLegalMove(x, y) ? 'ring-1 sm:ring-2 ring-emerald-500 ring-inset' : ''}
                      ${isSquareInCheck(x, y) ? 'ring-2 sm:ring-4 ring-red-500 ring-inset' : ''}
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
                        <div className={`w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 rounded-full ${piece ? 'ring-1 sm:ring-2 lg:ring-3 ring-emerald-400 ring-opacity-80' : 'bg-emerald-400/60'}`} />
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
                      <div className={`absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 text-xs sm:text-xs font-bold ${isLight ? theme.coordinateLight : theme.coordinateDark}`}>
                        {String.fromCharCode(97 + y)}
                      </div>
                    )}
                    {y === 0 && (
                      <div className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 text-xs sm:text-xs font-bold ${isLight ? theme.coordinateLight : theme.coordinateDark}`}>
                        {8 - x}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Game Info Panel - Mobile: Bottom, Desktop: Right Side */}
        <motion.div 
          className={`w-full xl:flex-1 ${isPanelMinimized ? 'xl:max-w-16' : 'xl:max-w-md'} transition-all duration-300 order-3 xl:order-3`}
          animate={{ 
            width: isPanelMinimized ? '4rem' : 'auto',
            maxWidth: isPanelMinimized ? '4rem' : '28rem'
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Panel Header with Minimize Button */}
            <div className="flex items-center justify-between p-2 sm:p-3 lg:p-4 bg-slate-50 border-b border-slate-200">
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