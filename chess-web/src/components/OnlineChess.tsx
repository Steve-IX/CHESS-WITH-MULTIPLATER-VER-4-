'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessGame } from './ChessGame';
import { chessSocket } from '@/lib/socket';
import { PlayerColor, GameResult, Move, GameState, ThemeId, TimerMode } from '@/lib/types';
import { useTheme } from '@/lib/ThemeContext';
import { Copy, Users, MessageCircle, Crown, Wifi, WifiOff, Send, Flag, Handshake, X, RefreshCw, Home, ShieldCheck, ShieldAlert, BarChart3 } from 'lucide-react';
import { ThemeToggleButton } from './ThemeToggleButton';
import { getThemeById } from '@/lib/themes';

interface OnlineChessProps {
  onBack: () => void;
  selectedTheme: ThemeId;
  timerMode: TimerMode;
  customTime: number;
  onChatToggle?: (isOpen: boolean) => void;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerColor: PlayerColor;
  message: string;
  timestamp: Date;
}

export function OnlineChess({ onBack, selectedTheme, timerMode, customTime, onChatToggle }: OnlineChessProps) {
  const [gamePhase, setGamePhase] = useState<'menu' | 'waiting' | 'playing'>('menu');
  const [roomId, setRoomId] = useState<string>('');
  const [playerColor, setPlayerColor] = useState<PlayerColor | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  
  // Chat functionality
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Game actions
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showDrawOfferModal, setShowDrawOfferModal] = useState(false);
  const [rematchOffer, setRematchOffer] = useState<{ from: PlayerColor } | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const { theme } = useTheme();
  const chessTheme = getThemeById(selectedTheme);

  // Initialize socket connection
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const initializeConnection = async (retryCount = 0) => {
      try {
        setConnectionStatus('connecting');
        setError(null);
        await chessSocket.connect();
        setConnectionStatus('connected');
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to connect:', error);
        setConnectionStatus('disconnected');
        
        if (retryCount < 3) {
          setError(`Connection failed, retrying... (${retryCount + 1}/3)`);
          setTimeout(() => initializeConnection(retryCount + 1), 2000);
        } else {
          setError('Failed to connect to server. Please check your internet connection and try again.');
        }
      }
    };

    initializeConnection();

    // Setup event listeners
    const unsubscribers = [
      chessSocket.onConnect(() => {
        setConnectionStatus('connected');
        setIsConnected(true);
        setError(null);
      }),

      chessSocket.onDisconnect((reason) => {
        console.log('Disconnected:', reason);
        setConnectionStatus('disconnected');
        setIsConnected(false);
        
        // Only show error for unexpected disconnections
        if (reason !== 'io client disconnect') {
          setError('Connection lost, attempting to reconnect...');
        }
      }),

      chessSocket.onReconnect((attemptNumber) => {
        console.log('Reconnected after', attemptNumber, 'attempts');
        setConnectionStatus('connected');
        setIsConnected(true);
        setError(null);
        addSystemMessage('Connection restored!');
      }),

      chessSocket.onReconnectAttempt((attemptNumber) => {
        console.log('Reconnection attempt', attemptNumber);
        setConnectionStatus('connecting');
        setError(`Reconnecting... (attempt ${attemptNumber}/5)`);
      }),

      chessSocket.onReconnectError((error) => {
        console.error('Reconnection error:', error);
        setConnectionStatus('disconnected');
      }),

      chessSocket.onReconnectFailed(() => {
        console.error('Failed to reconnect');
        setConnectionStatus('disconnected');
        setError('Failed to reconnect. Please refresh the page.');
      }),

      chessSocket.onRoomCreated((data) => {
        setRoomId(data.roomId);
        setPlayerColor(data.playerColor);
        setIsHost(true);
        setGamePhase('waiting');
        setError(null);
      }),

      chessSocket.onRoomJoined((data) => {
        setRoomId(data.roomId);
        setPlayerColor(data.playerColor);
        setIsHost(false);
        setGamePhase('waiting');
        setError(null);
        
        if (data.gameState?.isGameStarted) {
          setGameState(data.gameState.gameState);
          setGamePhase('playing');
        }
      }),

      chessSocket.onPlayerJoined(() => {
        addSystemMessage('Opponent joined the game');
      }),

      chessSocket.onPlayerLeft(() => {
        addSystemMessage('Opponent left the game');
        if (gamePhase === 'playing') {
          setError('Opponent disconnected');
        }
      }),

      chessSocket.onGameStarted((onlineGameState) => {
        setGameState(onlineGameState.gameState);
        setGamePhase('playing');
        addSystemMessage('Game started! Good luck!');
      }),

      chessSocket.onMoveMade((data) => {
        console.log('Received move update:', data);
        setGameState(data.gameState);
      }),

      chessSocket.onGameOver((result: GameResult) => {
        setGameResult(result);
        setShowGameOverModal(true);
        let message = '';
        if (result.winner === 'draw') {
          message = `Game ended in a ${result.reason}!`;
        } else {
          message = `${result.winner === playerColor ? 'You' : 'Opponent'} won by ${result.reason}!`;
        }
        addSystemMessage(message);
      }),

      chessSocket.onDrawOffered((data) => {
        setShowDrawOfferModal(true);
        addSystemMessage(`Opponent has offered a draw.`);
      }),

      chessSocket.onDrawDeclined(() => {
        addSystemMessage(`Your draw offer was declined.`);
      }),

      chessSocket.onRematchOffered((data) => {
        setRematchOffer(data);
        addSystemMessage(`Opponent has offered a rematch.`);
      }),

      chessSocket.onRematchDeclined(() => {
        setRematchOffer(null);
        addSystemMessage(`Your rematch offer was declined.`);
      }),

      chessSocket.onGameRestarted((onlineGameState) => {
        setGameState(onlineGameState.gameState);
        setGamePhase('playing');
        setGameResult(null);
        setShowGameOverModal(false);
        setRematchOffer(null);
        addSystemMessage('Rematch accepted! New game started.');
      }),

      chessSocket.onChatMessage((data) => {
        try {
          if (!data || typeof data.message !== 'string') {
            console.warn('Invalid chat message data received:', data);
            return;
          }
          
          const newMessage: ChatMessage = {
            id: Date.now().toString(),
            playerId: data.playerId,
            playerColor: data.playerColor,
            message: data.message,
            timestamp: new Date()
          };
          
          setChatMessages(prev => {
            if (!Array.isArray(prev)) {
              console.warn('Chat messages state is not an array, resetting');
              return [newMessage];
            }
            return [...prev, newMessage];
          });
          
          if (!showChat) {
            setUnreadMessages(prev => (typeof prev === 'number' ? prev + 1 : 1));
          }
        } catch (error) {
          console.error('Error handling chat message:', error);
        }
      }),

      chessSocket.onError((error) => {
        setError(error);
      }),

      chessSocket.onRoomUpdated((roomState) => {
        console.log('Room updated:', roomState);
        // Update room state to ensure both players are properly synchronized
        if (roomState.isGameStarted && roomState.gameState) {
          setGameState(roomState.gameState);
          setGamePhase('playing');
          addSystemMessage('Both players connected! Game starting...');
        }
      }),

      chessSocket.onPlayerDisconnected((data) => {
        console.log('Player temporarily disconnected:', data);
        addSystemMessage(`Opponent temporarily disconnected, waiting for reconnection...`);
      })
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
      // Don't disconnect on component unmount unless we're actually leaving the page
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        chessSocket.disconnect();
      }
    };
  }, []);

  const addSystemMessage = (message: string) => {
    try {
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        playerId: 'system',
        playerColor: 'white',
        message,
        timestamp: new Date()
      };
      setChatMessages(prev => {
        if (!Array.isArray(prev)) {
          console.warn('Chat messages state is not an array, resetting');
          return [systemMessage];
        }
        return [...prev, systemMessage];
      });
    } catch (error) {
      console.error('Error adding system message:', error);
    }
  };

  const handleCreateRoom = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      setError(null);
      await chessSocket.createRoom(timerMode, customTime);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleJoinRoom = async () => {
    if (typeof window === 'undefined') return;
    
    if (!joinRoomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    try {
      setError(null);
      await chessSocket.joinRoom(joinRoomId.trim().toUpperCase());
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleMove = useCallback((move: Move) => {
    if (typeof window === 'undefined') return;
    
    if (playerColor && gameState?.currentPlayer === playerColor) {
      chessSocket.makeMove(move);
    }
  }, [playerColor, gameState]);

  const handleGameOver = useCallback((result: GameResult) => {
    // Game over is handled by socket events
  }, []);

  const handleSendMessage = () => {
    if (typeof window === 'undefined') return;
    
    if (chatInput.trim()) {
      chessSocket.sendChatMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleResign = () => {
    if (typeof window === 'undefined') return;
    
    chessSocket.resign();
    setShowGameMenu(false);
  };

  const handleOfferDraw = () => {
    if (typeof window === 'undefined') return;
    
    chessSocket.offerDraw();
    setShowGameMenu(false);
  };

  const handleAcceptDraw = () => {
    chessSocket.acceptDraw();
    setShowDrawOfferModal(false);
  };

  const handleDeclineDraw = () => {
    chessSocket.declineDraw();
    setShowDrawOfferModal(false);
  };

  const handleOfferRematch = () => {
    chessSocket.offerRematch();
    setRematchOffer({ from: playerColor! }); // Optimistically show that you offered
  };

  const handleAcceptRematch = () => {
    chessSocket.acceptRematch();
  };

  const handleDeclineRematch = () => {
    chessSocket.declineRematch();
    setRematchOffer(null);
  };

  const handleReviewGame = () => {
    setShowGameOverModal(false);
    setIsReviewMode(true);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  const toggleChat = () => {
    const newShowChat = !showChat;
    setShowChat(newShowChat);
    if (newShowChat) {
      setUnreadMessages(0);
    }
    onChatToggle?.(newShowChat);
  };

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
      connectionStatus === 'connected' 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
        : connectionStatus === 'connecting'
        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`}>
      {connectionStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
      {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
    </div>
  );

  if (gamePhase === 'menu') {
    return (
      <div 
        className={`min-h-screen flex items-center justify-center relative overflow-hidden p-4 animated-grid-background theme-${selectedTheme}`}
        style={{
          '--bg-color': theme === 'dark' ? chessTheme.backgroundDark : chessTheme.backgroundLight,
          '--grid-color': theme === 'dark' ? chessTheme.gridColorDark : chessTheme.gridColorLight,
          '--bg-gradient': theme === 'dark' ? chessTheme.backgroundDark : chessTheme.backgroundLight,
        } as React.CSSProperties}
      >
        <div className="relative z-10 w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${
              theme === 'dark' 
                ? 'bg-white/10 border-white/30 text-white' 
                : 'bg-white/80 border-gray-300/50 text-gray-800'
            } backdrop-blur-xl rounded-3xl shadow-2xl border p-8`}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Users size={32} className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
                <h2 className="text-3xl font-bold">Online Chess</h2>
              </div>
              <p className={`text-lg ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
                Play with friends online
              </p>
              <div className="mt-4 flex justify-center">
                <ConnectionStatus />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <motion.div 
                className="mb-6 p-4 rounded-xl text-sm bg-red-500/20 border border-red-500/30 text-red-300"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            {/* Menu options */}
            <div className="space-y-4">
              {!isJoining ? (
                <>
                  <motion.button
                    onClick={handleCreateRoom}
                    disabled={!isConnected}
                    className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                      isConnected
                        ? theme === 'dark'
                          ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30'
                          : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300'
                        : 'bg-gray-500/20 text-gray-500 border border-gray-500/30 cursor-not-allowed'
                    }`}
                    whileHover={isConnected ? { scale: 1.02 } : {}}
                    whileTap={isConnected ? { scale: 0.98 } : {}}
                  >
                    <Crown size={20} className="inline mr-2" />
                    Create Game Room
                  </motion.button>

                  <motion.button
                    onClick={() => setIsJoining(true)}
                    disabled={!isConnected}
                    className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                      isConnected
                        ? theme === 'dark'
                          ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30'
                          : 'bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300'
                        : 'bg-gray-500/20 text-gray-500 border border-gray-500/30 cursor-not-allowed'
                    }`}
                    whileHover={isConnected ? { scale: 1.02 } : {}}
                    whileTap={isConnected ? { scale: 0.98 } : {}}
                  >
                    <Users size={20} className="inline mr-2" />
                    Join Game Room
                  </motion.button>
                </>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                    placeholder="Enter Room ID (e.g., ABC123)"
                    className={`w-full p-4 text-lg rounded-xl border ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/30 text-white placeholder-white/50'
                        : 'bg-white/80 border-gray-300 text-gray-800 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    maxLength={6}
                  />

                  <div className="flex gap-3">
                    <motion.button
                      onClick={handleJoinRoom}
                      disabled={!isConnected || joinRoomId.length !== 6}
                      className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                        isConnected && joinRoomId.length === 6
                          ? theme === 'dark'
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30'
                            : 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300'
                          : 'bg-gray-500/20 text-gray-500 border border-gray-500/30 cursor-not-allowed'
                      }`}
                      whileHover={isConnected && joinRoomId.length === 6 ? { scale: 1.02 } : {}}
                      whileTap={isConnected && joinRoomId.length === 6 ? { scale: 0.98 } : {}}
                    >
                      Join Room
                    </motion.button>

                    <motion.button
                      onClick={() => {
                        setIsJoining(false);
                        setJoinRoomId('');
                        setError(null);
                      }}
                      className={`py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                        theme === 'dark'
                          ? 'bg-white/10 hover:bg-white/20 text-white border border-white/30'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
              )}

              <motion.button
                onClick={onBack}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/30'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                ← Back to Menu
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'waiting') {
    return (
      <div 
        className={`min-h-screen flex items-center justify-center relative overflow-hidden p-4 animated-grid-background theme-${selectedTheme}`}
        style={{
          '--bg-color': theme === 'dark' ? chessTheme.backgroundDark : chessTheme.backgroundLight,
          '--grid-color': theme === 'dark' ? chessTheme.gridColorDark : chessTheme.gridColorLight,
          '--bg-gradient': theme === 'dark' ? chessTheme.backgroundDark : chessTheme.backgroundLight,
        } as React.CSSProperties}
      >

        <div className="relative z-10 w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${
              theme === 'dark' 
                ? 'bg-white/10 border-white/30 text-white' 
                : 'bg-white/80 border-gray-300/50 text-gray-800'
            } backdrop-blur-xl rounded-3xl shadow-2xl border p-8 text-center`}
          >
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${isHost ? 'bg-yellow-400' : 'bg-blue-400'} animate-pulse`} />
                <h2 className="text-2xl font-bold">
                  {isHost ? 'Waiting for Opponent' : 'Joined Game Room'}
                </h2>
              </div>
              <ConnectionStatus />
            </div>

            {/* Room info */}
            <div className="mb-8">
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl ${
                theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
              }`}>
                <span className="text-sm font-medium">Room ID:</span>
                <span className="text-2xl font-bold tracking-wider">{roomId}</span>
                <motion.button
                  onClick={copyRoomId}
                  className={`p-2 rounded-lg ${
                    theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                  } transition-colors`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Copy Room ID"
                >
                  <Copy size={16} />
                </motion.button>
              </div>
            </div>

            {/* Instructions */}
            <p className={`text-sm mb-6 ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
              {isHost 
                ? 'Share the Room ID with your friend to start playing!'
                : 'Waiting for the game to start...'
              }
            </p>

            {/* Back button */}
            <motion.button
              onClick={onBack}
              className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/30'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ← Leave Room
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="min-h-screen relative">
      {/* Theme toggle button */}
      <div className="absolute top-4 left-4 z-30">
        <ThemeToggleButton />
      </div>

      {/* Game header */}
      <div className="absolute top-4 left-20 right-4 z-20 flex items-center justify-between">
        <motion.button
          onClick={onBack}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-black/20 hover:bg-black/40 text-white border border-white/30'
              : 'bg-white/80 hover:bg-white text-gray-800 border border-gray-300'
          } backdrop-blur-sm`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← Leave Game
        </motion.button>

        <div className="flex items-center gap-4">
          <ConnectionStatus />
          
          {/* Room info */}
          <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
            theme === 'dark'
              ? 'bg-black/20 text-white border border-white/30'
              : 'bg-white/80 text-gray-800 border border-gray-300'
          } backdrop-blur-sm`}>
            Room: {roomId}
          </div>

          {/* Chat toggle */}
          <motion.button
            onClick={toggleChat}
            className={`relative p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-black/20 hover:bg-black/40 text-white border border-white/30'
                : 'bg-white/80 hover:bg-white text-gray-800 border border-gray-300'
            } backdrop-blur-sm`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <MessageCircle size={20} />
            {unreadMessages > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadMessages}
              </div>
            )}
          </motion.button>

          {/* Game menu */}
          <motion.button
            onClick={() => setShowGameMenu(true)}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-black/20 hover:bg-black/40 text-white border border-white/30'
                : 'bg-white/80 hover:bg-white text-gray-800 border border-gray-300'
            } backdrop-blur-sm`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ⋮
          </motion.button>
        </div>
      </div>

      {/* Chess game */}
      {gameState && (
        <ChessGame
          gameMode="online"
          playerColor={playerColor}
          isSpectator={false}
          gameState={gameState}
          onMove={handleMove}
          onGameOver={handleGameOver}
          themeId={selectedTheme}
          timerMode={timerMode}
          customTime={customTime}
          isReviewMode={isReviewMode}
        />
      )}

      {/* Modals */}
      <AnimatePresence>
        {showGameOverModal && gameResult && (
          <GameOverModal
            result={gameResult}
            playerColor={playerColor!}
            onRematch={handleOfferRematch}
            onMenu={onBack}
            onReview={handleReviewGame}
            rematchOffer={rematchOffer}
            onAcceptRematch={handleAcceptRematch}
            onDeclineRematch={handleDeclineRematch}
          />
        )}

        {showDrawOfferModal && (
          <DrawOfferModal
            onAccept={handleAcceptDraw}
            onDecline={handleDeclineDraw}
          />
        )}
      </AnimatePresence>

      {/* Chat sidebar */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className={`fixed top-0 right-0 h-full w-80 z-30 ${
              theme === 'dark'
                ? 'bg-black/80 border-white/30'
                : 'bg-white/90 border-gray-300'
            } border-l backdrop-blur-xl`}
          >
            <div className="flex flex-col h-full">
              {/* Chat header */}
              <div className="flex items-center justify-between p-4 border-b border-current/20">
                <h3 className="font-semibold">Game Chat</h3>
                <motion.button
                  onClick={toggleChat}
                  className="p-1 rounded hover:bg-current/10"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`${
                    msg.playerId === 'system' ? 'text-center' : ''
                  }`}>
                    {msg.playerId === 'system' ? (
                      <div className="text-sm text-gray-500 italic">
                        {msg.message}
                      </div>
                    ) : (
                      <div className={`${
                        msg.playerColor === playerColor ? 'text-right' : 'text-left'
                      }`}>
                        <div className={`inline-block max-w-[80%] p-3 rounded-xl ${
                          msg.playerColor === playerColor
                            ? 'bg-blue-500 text-white'
                            : theme === 'dark'
                            ? 'bg-white/10 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          <div className="text-sm">{msg.message}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {msg.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chat input */}
              <div className="p-4 border-t border-current/20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className={`flex-1 p-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/30 text-white placeholder-white/50'
                        : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <motion.button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim()}
                    className={`p-2 rounded-lg ${
                      chatInput.trim()
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    } transition-colors`}
                    whileHover={chatInput.trim() ? { scale: 1.05 } : {}}
                    whileTap={chatInput.trim() ? { scale: 0.95 } : {}}
                  >
                    <Send size={16} />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game menu modal */}
      <AnimatePresence>
        {showGameMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            onClick={() => setShowGameMenu(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${
                theme === 'dark'
                  ? 'bg-black/80 border-white/30 text-white'
                  : 'bg-white border-gray-300 text-gray-800'
              } rounded-2xl border backdrop-blur-xl p-6 w-full max-w-sm`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-6 text-center">Game Menu</h3>
              
              <div className="space-y-3">
                <motion.button
                  onClick={handleOfferDraw}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30'
                      : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Handshake size={16} className="inline mr-2" />
                  Offer Draw
                </motion.button>

                <motion.button
                  onClick={handleResign}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                      : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Flag size={16} className="inline mr-2" />
                  Resign
                </motion.button>

                <motion.button
                  onClick={() => setShowGameMenu(false)}
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-white/10 hover:bg-white/20 text-white border border-white/30'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Modals ---

const GameOverModal = ({ 
  result, 
  playerColor, 
  onRematch, 
  onMenu,
  onReview,
  rematchOffer,
  onAcceptRematch,
  onDeclineRematch 
}: { 
  result: GameResult; 
  playerColor: PlayerColor;
  onRematch: () => void;
  onMenu: () => void;
  onReview: () => void;
  rematchOffer: { from: PlayerColor } | null;
  onAcceptRematch: () => void;
  onDeclineRematch: () => void;
}) => {
  const { theme } = useTheme();
  const isWinner = result.winner === playerColor;
  const isDraw = result.winner === 'draw';
  
  let title = 'Game Over';
  let message = '';
  if (isDraw) {
    title = "It's a Draw!";
    message = `The game ended in a draw by ${result.reason}.`;
  } else if (isWinner) {
    title = 'You Won!';
    message = `Congratulations! You won by ${result.reason}.`;
  } else {
    title = 'You Lost';
    message = `Better luck next time! You lost by ${result.reason}.`;
  }

  const hasOpponentOfferedRematch = !!(rematchOffer && rematchOffer.from !== playerColor);
  const haveYouOfferedRematch = !!(rematchOffer && rematchOffer.from === playerColor);

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
          theme === 'dark'
            ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-white/20'
            : 'bg-gradient-to-br from-white to-gray-100 border-gray-300'
        } rounded-3xl border shadow-2xl p-8 w-full max-w-md text-center`}
      >
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1, rotate: isWinner ? 10 : -10 }} 
          transition={{ type: 'spring', delay: 0.2, damping: 10, stiffness: 150 }}
          className="text-6xl mb-4"
        >
          {isDraw ? '🤝' : isWinner ? '🏆' : '🏳️'}
        </motion.div>
        
        <h2 className="text-4xl font-bold mb-2">{title}</h2>
        <p className={`${theme === 'dark' ? 'text-white/70' : 'text-gray-600'} mb-8`}>{message}</p>
        
        <div className="space-y-4">
          {hasOpponentOfferedRematch ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Opponent wants a rematch!</p>
              <div className="flex gap-3">
                <motion.button
                  onClick={onAcceptRematch}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 transition-all"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                >
                  <ShieldCheck size={16} className="inline mr-2" /> Accept
                </motion.button>
                <motion.button
                  onClick={onDeclineRematch}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                >
                  <ShieldAlert size={16} className="inline mr-2" /> Decline
                </motion.button>
              </div>
            </div>
          ) : (
            <motion.button
              onClick={onRematch}
              disabled={haveYouOfferedRematch}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
                haveYouOfferedRematch
                  ? 'bg-gray-500/20 text-gray-400 cursor-wait'
                  : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30'
              }`}
              whileHover={!haveYouOfferedRematch ? { scale: 1.02 } : {}}
              whileTap={!haveYouOfferedRematch ? { scale: 0.98 } : {}}
            >
              <RefreshCw size={16} className="inline mr-2" />
              {haveYouOfferedRematch ? 'Waiting for opponent...' : 'Offer Rematch'}
            </motion.button>
          )}

          <motion.button
            onClick={onReview}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
              theme === 'dark'
                ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <BarChart3 size={16} className="inline mr-2" />
            Review Game
          </motion.button>

          <motion.button
            onClick={onMenu}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
              theme === 'dark'
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/30'
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

const DrawOfferModal = ({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void; }) => {
  const { theme } = useTheme();

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
          theme === 'dark'
            ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-black border-white/20'
            : 'bg-gradient-to-br from-white to-gray-100 border-gray-300'
        } rounded-3xl border shadow-2xl p-8 w-full max-w-sm text-center`}
      >
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          transition={{ type: 'spring', delay: 0.2, damping: 10, stiffness: 150 }}
          className="text-6xl mb-4"
        >
          🤝
        </motion.div>
        
        <h2 className="text-3xl font-bold mb-2">Draw Offer</h2>
        <p className={`${theme === 'dark' ? 'text-white/70' : 'text-gray-600'} mb-8`}>
          Your opponent has offered a draw. Do you accept?
        </p>
        
        <div className="flex gap-4">
          <motion.button
            onClick={onAccept}
            className="flex-1 py-3 px-4 rounded-xl font-semibold bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 transition-all"
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          >
            <ShieldCheck size={16} className="inline mr-2" />
            Accept
          </motion.button>

          <motion.button
            onClick={onDecline}
            className="flex-1 py-3 px-4 rounded-xl font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all"
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          >
            <ShieldAlert size={16} className="inline mr-2" />
            Decline
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}; 