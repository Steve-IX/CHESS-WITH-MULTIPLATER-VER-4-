'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessGameProps, Position, Piece, Move, PlayerColor, GameState, GameMode, Difficulty, ThemeId, TimerState, TimerMode, GameResult, GameAnalysis, AnalysisProgress } from '../lib/types';
import { calculateLegalMoves, makeMove, createInitialBoard, generateMoveNotation, isInCheck, getAllLegalMoves } from '../lib/chess';
import { chessAI } from '../lib/ai';
import { chessSocket } from '../lib/socket';
import { getThemeById } from '../lib/themes';
import { queueFullAnalysis } from '../lib/analysis';
import { saveGameAnalysis, getGameAnalysis } from '../lib/database';
import { Clock, Play, Pause, RefreshCw, Home, BarChart3 } from 'lucide-react';
import { ThemeToggleButton } from './ThemeToggleButton';
import { useTheme } from '../lib/ThemeContext';
import { GameReview } from './GameReview';

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

// Timer display component
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
        flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300
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
      <Clock size={20} className={isActive ? 'text-blue-400' : 'text-gray-400'} />
      <div className="flex flex-col">
        <div className={`text-xs font-medium ${player === 'white' ? 'text-gray-600' : 'text-gray-300'}`}>
          {player === 'white' ? 'White' : 'Black'}
        </div>
        <div className={`
          text-lg font-bold font-mono
          ${isLowTime && isActive ? 'text-red-400' : (isActive ? 'text-blue-400' : 'text-gray-400')}
        `}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>
    </motion.div>
  );
};

export function ChessGame(props: ChessGameProps) {
  const {
    gameState: externalGameState,
    gameMode = 'local',
    difficulty = 'medium',
    playerColor = 'white',
    themeId = 'classic',
    timerMode = 'none',
    customTime = 15,
    onMove,
    onGameOver,
    onBackToMenu,
    isReviewMode: externalIsReviewMode = false,
  } = props;
  
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
    // For online mode, use timer from external state if available, otherwise initialize it
    timer: gameMode === 'online' 
      ? (externalGameState?.timer || getInitialTimerState())
      : getInitialTimerState(),
  };

  const [gameState, setGameState] = useState<GameState>(externalGameState || initialState);
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
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  
  // Game analysis state
  const [gameAnalysis, setGameAnalysis] = useState<GameAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [showAnalysisTab, setShowAnalysisTab] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // Update internal game state when external game state changes
  useEffect(() => {
    if (externalGameState && gameMode === 'online') {
      setGameState(externalGameState);
      // Extract move notations from move history
      const notations = externalGameState.moveHistory.map(move => generateMoveNotation(move));
      setMoveNotations(notations);
      setHasGameStarted(externalGameState.moveHistory.length > 0);
    }
  }, [externalGameState, gameMode]);
  
  // Sync external review mode with internal state
  useEffect(() => {
    setIsReviewMode(externalIsReviewMode);
  }, [externalIsReviewMode]);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get current theme
  const theme = getThemeById(themeId);
  const { theme: currentTheme } = useTheme();

  // Timer countdown effect
  useEffect(() => {
    if (!gameState.timer || !gameState.timer.isActive || isTimerPaused || gameState.isCheckmate || gameState.isStalemate || isReviewMode) {
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
          const winner: PlayerColor = currentPlayer === 'white' ? 'black' : 'white';
          const result: GameResult = { winner, reason: 'timeout' };
          
          if (gameMode === 'online') {
            chessSocket.reportTimeout(currentPlayer);
          } else {
            setGameResult(result);
            setShowGameOverModal(true);
            onGameOver?.(result);
          }
          
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
  }, [gameState.timer?.isActive, gameState.currentPlayer, isTimerPaused, gameState.isCheckmate, gameState.isStalemate, isReviewMode, onGameOver, gameMode]);

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
        !isAIThinking &&
        !isReviewMode) {
      
      const timer = setTimeout(() => {
        makeAIMove();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameMode, playerColor, isAnimating, isAIThinking, isReviewMode]);

  // Update game status
  useEffect(() => {
    updateGameStatus();
  }, [gameState, isAIThinking, gameMode, playerColor, difficulty]);

  // Auto-trigger analysis when game is completed
  useEffect(() => {
    if ((gameState.isCheckmate || gameState.isStalemate) && 
        gameState.moveHistory.length >= 10 && 
        !gameAnalysis && 
        !isAnalyzing) {
      // Small delay to ensure game state is fully updated
      const timer = setTimeout(() => {
        handleGameCompletion(gameState);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState.isCheckmate, gameState.isStalemate, gameState.moveHistory.length, gameAnalysis, isAnalyzing]);

  const initializeMultiplayer = async () => {
    try {
      await chessSocket.connect();
      
      chessSocket.onMoveMade((data) => {
        setGameState(data.gameState);
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
    if (isAIThinking || isReviewMode) return;
    
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

  // Function to get board perspective based on player color
  const getBoardForDisplay = useCallback(() => {
    if (gameMode === 'online' && playerColor === 'black') {
      // Flip the board for black player
      return gameState.board.slice().reverse().map(row => row.slice().reverse());
    }
    return gameState.board;
  }, [gameMode, playerColor, gameState.board]);

  // Function to convert display coordinates to actual board coordinates
  const getActualCoordinates = useCallback((displayX: number, displayY: number) => {
    if (gameMode === 'online' && playerColor === 'black') {
      return { x: 7 - displayX, y: 7 - displayY };
    }
    return { x: displayX, y: displayY };
  }, [gameMode, playerColor]);

  // Function to convert actual coordinates to display coordinates
  const getDisplayCoordinates = useCallback((actualX: number, actualY: number) => {
    if (gameMode === 'online' && playerColor === 'black') {
      return { x: 7 - actualX, y: 7 - actualY };
    }
    return { x: actualX, y: actualY };
  }, [gameMode, playerColor]);

  const handleSquareClick = useCallback(async (displayPosition: Position) => {
    if (isAnimating || isAIThinking || isReviewMode) return;
    
    // Convert display coordinates to actual board coordinates
    const actualPosition = getActualCoordinates(displayPosition.x, displayPosition.y);
    
    // Online multiplayer turn validation
    if (gameMode === 'online' && gameState.currentPlayer !== playerColor) {
      return;
    }

    // Computer game turn validation
    if (gameMode === 'computer' && gameState.currentPlayer !== playerColor) {
      return;
    }

    const piece = gameState.board[actualPosition.x][actualPosition.y];

    if (selectedSquare) {
      // Try to make a move
      if (legalMoves.some(move => move.x === actualPosition.x && move.y === actualPosition.y)) {
        const move: Move = {
          from: selectedSquare,
          to: actualPosition,
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
        
        setSelectedSquare(actualPosition);  // Store actual coordinates
        const moves = calculateLegalMoves(gameState, actualPosition);
        setLegalMoves(moves);
      }
    }
  }, [selectedSquare, legalMoves, gameState, gameMode, playerColor, isAnimating, isAIThinking, getActualCoordinates]);

  // Helper function to generate a consistent game ID from game state
  const generateGameId = (gameState: GameState): string => {
    // Create a hash from the move history to ensure consistent IDs for the same game
    const moveHistoryString = gameState.moveHistory
      .map(move => `${move.from.x}${move.from.y}${move.to.x}${move.to.y}${move.piece.type}${move.piece.color}`)
      .join('');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < moveHistoryString.length; i++) {
      const char = moveHistoryString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `game-${Math.abs(hash)}`;
  };

  // Update handleGameCompletion to handle online games
  const handleGameCompletion = async (finalGameState: GameState) => {
    if (finalGameState.moveHistory.length < 10) {
      console.log('Game too short for analysis');
      return;
    }

    try {
      setIsAnalyzing(true);
      
      // Generate a consistent game ID based on the game state
      const gameId = generateGameId(finalGameState);
      
      // Check if we already have analysis for this game
      const existingAnalysis = await getGameAnalysis(gameId);
      if (existingAnalysis) {
        setGameAnalysis(existingAnalysis);
        setIsAnalyzing(false);
        return;
      }

      // Start new analysis
      const analysis = await queueFullAnalysis(finalGameState, gameId, (progress) => {
        setAnalysisProgress(progress);
      });

      // Save analysis result
      await saveGameAnalysis(analysis);
      
      setGameAnalysis(analysis);
      setIsAnalyzing(false);
      setAnalysisProgress(null);
      
      // Ensure analysis tab is shown
      setShowAnalysisTab(true);
    } catch (error) {
      console.error('Failed to analyze game:', error);
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

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
        if (onMove) {
          onMove(move);
        } else {
          chessSocket.makeMove(move);
        }
      }

      // Check for game end
      if (newGameState.isCheckmate) {
        const winner: PlayerColor = newGameState.currentPlayer === 'white' ? 'black' : 'white';
        const result: GameResult = { winner, reason: 'checkmate' };
        
        // For computer and local modes, show our own modal
        if (gameMode !== 'online') {
          setGameResult(result);
          setShowGameOverModal(true);
        }
        
        // Trigger game analysis on completion
        handleGameCompletion(newGameState);
        
        onGameOver?.(result);
      } else if (newGameState.isStalemate) {
        const result: GameResult = { winner: 'draw', reason: 'stalemate' };
        
        // For computer and local modes, show our own modal
        if (gameMode !== 'online') {
          setGameResult(result);
          setShowGameOverModal(true);
        }
        
        // Trigger game analysis on completion
        handleGameCompletion(newGameState);
        
        onGameOver?.(result);
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
    setGameResult(null);
    setShowGameOverModal(false);
    
    // Clear analysis data
    setGameAnalysis(null);
    setIsAnalyzing(false);
    setAnalysisProgress(null);
    setShowAnalysisTab(false);
    setIsReviewMode(false);
  };

  const handleNewGame = () => {
    resetGame();
    setShowGameOverModal(false);
  };

  const handleBackToMenu = () => {
    if (onBackToMenu) {
      onBackToMenu();
    } else {
      // Fallback to just resetting the game
      resetGame();
    }
  };

  const handleReviewGame = () => {
    // Close the game over modal
    setShowGameOverModal(false);
    
    // Enter review mode
    setIsReviewMode(true);
    
    // Switch to the Game Review tab
    setShowAnalysisTab(true);
    
    // If analysis hasn't started yet, start it
    if (!gameAnalysis && !isAnalyzing && gameState.moveHistory.length >= 10) {
      handleGameCompletion(gameState);
    }
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

  // Update square check functions to work with display coordinates
  const isSquareHighlightedForDisplay = (displayX: number, displayY: number): boolean => {
    if (!selectedSquare) return false;
    const displaySelected = getDisplayCoordinates(selectedSquare.x, selectedSquare.y);
    return displaySelected.x === displayX && displaySelected.y === displayY;
  };

  const isSquareLegalMoveForDisplay = (displayX: number, displayY: number): boolean => {
    const actualCoords = getActualCoordinates(displayX, displayY);
    return legalMoves.some(move => move.x === actualCoords.x && move.y === actualCoords.y);
  };

  const isSquareInCheckForDisplay = (displayX: number, displayY: number): boolean => {
    const actualCoords = getActualCoordinates(displayX, displayY);
    const piece = gameState.board[actualCoords.x][actualCoords.y];
    return piece?.type === 'king' && piece.color === gameState.currentPlayer && gameState.isCheck;
  };

  const displayedBoard = playerColor === 'white' ? gameState.board : [...gameState.board].reverse().map(row => [...row].reverse());

  return (
    <div 
      className={`min-h-screen w-full flex items-center justify-center p-6 animated-grid-background theme-${themeId} relative`}
      style={{
        '--bg-color': currentTheme === 'dark' ? theme.backgroundDark : theme.backgroundLight,
        '--grid-color': currentTheme === 'dark' ? theme.gridColorDark : theme.gridColorLight,
        '--bg-gradient': currentTheme === 'dark' ? theme.backgroundDark : theme.backgroundLight,
      } as React.CSSProperties}
    >
      <div className="absolute top-4 left-4 z-20">
        {/* ThemeToggleButton will be rendered by parent for local/computer modes */}
        {gameMode === 'online' && <ThemeToggleButton />}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto justify-center items-start relative z-10">
        {/* Timer Panel - Left Side */}
        {gameState.timer && (
          <div className="lg:flex-shrink-0 lg:w-64">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-2">
                  <Clock size={24} className="text-blue-600" />
                  Game Timer
                </h3>
                <div className="text-sm text-slate-600 font-medium">
                  {gameState.timer.mode === 'custom' 
                    ? `${Math.floor((customTime || 15))} min` 
                    : gameState.timer.mode === 'none' 
                      ? 'No timer' 
                      : gameState.timer.mode.replace('min', ' min')
                  }
                </div>
              </div>

              {/* Black Timer */}
              <div className="space-y-3">
                <div className="text-center text-sm font-medium text-slate-600">Black Player</div>
                <TimerDisplay 
                  time={gameState.timer.blackTime}
                  isActive={gameState.currentPlayer === 'black' && gameState.timer.isActive && !isTimerPaused}
                  player="black"
                  themeId={themeId}
                />
              </div>

              {/* Timer Controls */}
              <div className="flex flex-col gap-3">
                {gameMode !== 'online' && (
                  <motion.button
                    onClick={toggleTimer}
                    className={`
                      flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300
                      ${isTimerPaused 
                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }
                    `}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={gameState.isCheckmate || gameState.isStalemate || !hasGameStarted}
                  >
                    {isTimerPaused ? <Play size={16} /> : <Pause size={16} />}
                    {isTimerPaused ? 'Resume' : 'Pause'}
                  </motion.button>
                )}
                
                {!hasGameStarted && gameState.timer.mode !== 'none' && (
                  <div className="text-center text-sm text-slate-600 bg-yellow-100/80 rounded-lg p-3">
                    {gameMode === 'online' 
                      ? 'Timer will start when the game begins'
                      : 'Timer will start when White makes the first move'
                    }
                  </div>
                )}
                
                {gameMode === 'online' && (
                  <div className="text-center text-sm text-slate-600 bg-blue-100/80 rounded-lg p-3">
                    Timer is synchronized with your opponent
                  </div>
                )}
              </div>

              {/* White Timer */}
              <div className="space-y-3">
                <div className="text-center text-sm font-medium text-slate-600">White Player</div>
                <TimerDisplay 
                  time={gameState.timer.whiteTime}
                  isActive={gameState.currentPlayer === 'white' && gameState.timer.isActive && !isTimerPaused}
                  player="white"
                  themeId={themeId}
                />
              </div>
            </div>
          </div>
        )}

        {/* Game Board */}
        <div className="flex flex-col items-center flex-none min-w-fit">
          <div className="mb-4 text-center min-w-max">
            <h2 className="text-2xl font-bold text-slate-800 mb-2 whitespace-nowrap inline-block">Chess Master</h2>
            <div className="text-lg font-semibold text-slate-600">
              {gameStatus}
            </div>
            {isReviewMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-lg border border-purple-200 shadow-sm"
              >
                <BarChart3 size={16} />
                <span className="font-medium">Review Mode</span>
              </motion.div>
            )}
          </div>

          <div className="relative">
            <div className={`grid grid-cols-8 gap-0 border-4 ${theme.boardBorder} rounded-xl overflow-hidden shadow-2xl ${theme.boardRing}`}>
              {Array.from({ length: 64 }, (_, i) => {
                const displayX = Math.floor(i / 8);
                const displayY = i % 8;
                const isLight = (displayX + displayY) % 2 === 0;
                
                // Get the piece from the display board
                const displayBoard = getBoardForDisplay();
                const piece = displayBoard[displayX][displayY];
                
                // Get actual coordinates for hover state
                const actualCoords = getActualCoordinates(displayX, displayY);
                const isHovered = hoveredSquare?.x === actualCoords.x && hoveredSquare?.y === actualCoords.y;
                
                return (
                  <motion.div
                    key={`${displayX}-${displayY}`}
                    className={`
                      w-16 h-16 flex items-center justify-center cursor-pointer relative
                      ${isLight ? theme.lightSquare : theme.darkSquare}
                      ${isSquareHighlightedForDisplay(displayX, displayY) ? 'ring-4 ring-blue-500 ring-inset' : ''}
                      ${isSquareLegalMoveForDisplay(displayX, displayY) ? 'ring-2 ring-emerald-500 ring-inset' : ''}
                      ${isSquareInCheckForDisplay(displayX, displayY) ? 'ring-4 ring-red-500 ring-inset' : ''}
                      hover:brightness-110 transition-all duration-200
                      ${isHovered ? 'bg-opacity-80' : ''}
                    `}
                    onClick={() => !isReviewMode && handleSquareClick({ x: displayX, y: displayY })}
                    onMouseEnter={() => setHoveredSquare(actualCoords)}
                    onMouseLeave={() => setHoveredSquare(null)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Legal move indicator */}
                    {isSquareLegalMoveForDisplay(displayX, displayY) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-4 h-4 rounded-full ${piece ? 'ring-3 ring-emerald-400 ring-opacity-80' : 'bg-emerald-400/60'}`} />
                      </div>
                    )}
                    
                    {/* Chess piece */}
                    {piece && (
                      <ChessPiece 
                        piece={piece} 
                        isHovered={isHovered}
                        themeId={themeId}
                      />
                    )}
                    
                    {/* Coordinate labels - adjust for board orientation */}
                    {displayX === 7 && (
                      <div className={`absolute bottom-1 right-1 text-xs font-bold ${isLight ? theme.coordinateLight : theme.coordinateDark}`}>
                        {gameMode === 'online' && playerColor === 'black' 
                          ? String.fromCharCode(104 - displayY) // h-a for flipped board
                          : String.fromCharCode(97 + displayY) // a-h for normal board
                        }
                      </div>
                    )}
                    {displayY === 0 && (
                      <div className={`absolute top-1 left-1 text-xs font-bold ${isLight ? theme.coordinateLight : theme.coordinateDark}`}>
                        {gameMode === 'online' && playerColor === 'black' 
                          ? displayX + 1 // 1-8 for flipped board
                          : 8 - displayX // 8-1 for normal board
                        }
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
            {/* Panel Header with Tabs and Minimize Button */}
            <div className="bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between px-4 pt-4">
              {!isPanelMinimized && (
                  <div className="flex bg-slate-200 rounded-lg p-1">
                    <button
                      onClick={() => setShowAnalysisTab(false)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                        !showAnalysisTab 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                >
                  Game Info
                    </button>
                    <button
                      onClick={() => setShowAnalysisTab(true)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all relative ${
                        showAnalysisTab 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Game Review
                      {(gameAnalysis || isAnalyzing) && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </button>
                  </div>
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
              
              {!isPanelMinimized && (
                <div className="px-4 pb-4">
                  <motion.h3 
                    className="text-lg font-semibold text-slate-800"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {showAnalysisTab ? 'Game Review' : 'Game Info'}
                  </motion.h3>
                </div>
              )}
            </div>

            <AnimatePresence>
              {!isPanelMinimized && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="p-6"
                >
                  {!showAnalysisTab ? (
                    // Game Info Tab Content
                    <div className="space-y-6">
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
                        {isReviewMode && (
                          <button
                            onClick={() => setIsReviewMode(false)}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <BarChart3 size={16} />
                            Exit Review Mode
                          </button>
                        )}
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
                    </div>
                  ) : (
                    // Game Review Tab Content
                    <GameReview
                      analysis={gameAnalysis}
                      isAnalyzing={isAnalyzing}
                      playerNames={{
                        white: gameMode === 'computer' ? 'You' : 'White',
                        black: gameMode === 'computer' ? `AI (${difficulty})` : 'Black'
                      }}
                    />
                  )}
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
                  
                  {(gameAnalysis || isAnalyzing) && (
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-xs">
                      {isAnalyzing ? '🔄' : '📊'}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Game Over Modal */}
      <AnimatePresence>
        {showGameOverModal && gameResult && (
          <GameOverModal
            result={gameResult}
            gameMode={gameMode}
            playerColor={playerColor}
            onNewGame={handleNewGame}
            onBackToMenu={handleBackToMenu}
            onReviewGame={handleReviewGame}
            themeId={themeId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// GameOver Modal Component
const GameOverModal = ({
  result,
  gameMode,
  playerColor,
  onNewGame,
  onBackToMenu,
  onReviewGame,
  themeId
}: {
  result: GameResult;
  gameMode: GameMode;
  playerColor: PlayerColor;
  onNewGame: () => void;
  onBackToMenu: () => void;
  onReviewGame: () => void;
  themeId: ThemeId;
}) => {
  const theme = getThemeById(themeId);
  
  let title = 'Game Over';
  let message = '';
  let emoji = '🏁';
  
  if (result.winner === 'draw') {
    title = "It's a Draw!";
    message = `The game ended in a draw by ${result.reason}.`;
    emoji = '🤝';
  } else {
    const isPlayerWinner = result.winner === playerColor;
    
    if (gameMode === 'computer') {
      if (isPlayerWinner) {
        title = 'You Won!';
        message = `Congratulations! You beat the AI by ${result.reason}.`;
        emoji = '🏆';
      } else {
        title = 'AI Wins';
        message = `The AI won by ${result.reason}. Better luck next time!`;
        emoji = '🤖';
      }
    } else if (gameMode === 'local') {
      title = `${result.winner === 'white' ? 'White' : 'Black'} Wins!`;
      message = `${result.winner === 'white' ? 'White' : 'Black'} won by ${result.reason}.`;
      emoji = result.winner === 'white' ? '⚪' : '⚫';
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        className={`${
          themeId === 'crystal'
            ? 'bg-gradient-to-br from-white/90 via-blue-50/90 to-purple-50/90 border-white/40'
            : 'bg-gradient-to-br from-white to-gray-100 border-gray-300'
        } rounded-3xl border shadow-2xl p-8 w-full max-w-md text-center backdrop-blur-xl`}
      >
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1, rotate: result.winner !== 'draw' && result.winner === playerColor ? 10 : -5 }} 
          transition={{ type: 'spring', delay: 0.2, damping: 10, stiffness: 150 }}
          className="text-6xl mb-4"
        >
          {emoji}
        </motion.div>
        
        <h2 className="text-4xl font-bold mb-2 text-gray-800">{title}</h2>
        <p className="text-gray-600 mb-8 text-lg">{message}</p>
        
        <div className="space-y-4">
          <motion.button
            onClick={onReviewGame}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
              themeId === 'crystal'
                ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-700 border border-purple-500/30'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <BarChart3 size={16} className="inline mr-2" />
            Review Game
          </motion.button>

          <motion.button
            onClick={onNewGame}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
              themeId === 'crystal'
                ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-700 border border-blue-500/30'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw size={16} className="inline mr-2" />
            New Game
          </motion.button>

          <motion.button
            onClick={onBackToMenu}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
              themeId === 'crystal'
                ? 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-700 border border-gray-500/30'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Home size={16} className="inline mr-2" />
            Back to Menu
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}; 