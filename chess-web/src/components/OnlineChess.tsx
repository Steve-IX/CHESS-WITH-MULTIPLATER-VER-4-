'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessGame } from './ChessGame';
import { chessSocket, OnlineGameState } from '@/lib/socket';
import { PlayerColor, GameResult, Move, GameState, ThemeId, TimerMode } from '@/lib/types';
import { useTheme } from '@/lib/ThemeContext';
import { Copy, Users, MessageCircle, Crown, Wifi, WifiOff, Send, Flag, Handshake, X, RefreshCw, AlertCircle, Settings } from 'lucide-react';

interface OnlineChessProps {
  onBack: () => void;
  selectedTheme: ThemeId;
  timerMode: TimerMode;
  customTime: number;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerColor: PlayerColor;
  message: string;
  timestamp: Date;
}

export function OnlineChess({ onBack, selectedTheme, timerMode, customTime }: OnlineChessProps) {
  const { theme } = useTheme();
  
  // Connection and Room State
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [gamePhase, setGamePhase] = useState<'menu' | 'waiting' | 'playing'>('menu');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // Game State
  const [roomId, setRoomId] = useState<string>('');
  const [playerColor, setPlayerColor] = useState<PlayerColor | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  
  // UI State
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showConnectionStatus, setShowConnectionStatus] = useState(true);

  // Initialize connection
  useEffect(() => {
    const initializeConnection = async (retryCount = 0) => {
      if (retryCount > 0) {
        console.log(`🔄 Connection attempt ${retryCount}`);
        setConnectionAttempts(retryCount);
      }
      
      try {
        setConnectionStatus('connecting');
        setError(null);
        
        await chessSocket.connect();
        setIsConnected(true);
        setConnectionStatus('connected');
        setConnectionAttempts(0);
        console.log('✅ Successfully connected to chess server');
        
      } catch (error: any) {
        console.error('❌ Connection failed:', error.message);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setError(`Connection failed: ${error.message}`);
        
        // Retry connection with exponential backoff
        if (retryCount < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`⏰ Retrying connection in ${delay}ms...`);
          setTimeout(() => initializeConnection(retryCount + 1), delay);
        } else {
          setError('Failed to connect after multiple attempts. Please check your internet connection.');
        }
      }
    };

    initializeConnection();

    // Set up event listeners
    const unsubscribeConnect = chessSocket.onConnect(() => {
      console.log('🔌 Connected to server');
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      setConnectionAttempts(0);
    });

    const unsubscribeDisconnect = chessSocket.onDisconnect((reason) => {
      console.log('🔌 Disconnected from server:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      if (reason !== 'io client disconnect') {
        setError(`Connection lost: ${reason}`);
      }
    });

    const unsubscribeReconnectAttempt = chessSocket.onReconnectAttempt((attemptNumber) => {
      console.log('🔄 Reconnection attempt:', attemptNumber);
      setConnectionStatus('reconnecting');
      setConnectionAttempts(attemptNumber);
    });

    const unsubscribeReconnect = chessSocket.onReconnect((attemptNumber) => {
      console.log('✅ Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionStatus('connected');
      setConnectionAttempts(0);
      setError(null);
      addSystemMessage(`Reconnected to server after ${attemptNumber} attempts`);
    });

    const unsubscribeReconnectFailed = chessSocket.onReconnectFailed(() => {
      console.log('❌ Reconnection failed');
      setConnectionStatus('disconnected');
      setError('Connection lost. Attempting to reconnect...');
      
      // Try to reinitialize connection
      setTimeout(() => initializeConnection(), 5000);
    });

    const unsubscribeError = chessSocket.onError((error) => {
      console.error('❌ Socket error:', error);
      setError(error);
    });

    // Room events
    const unsubscribeRoomCreated = chessSocket.onRoomCreated((data) => {
      console.log('🏠 Room created:', data.roomId);
      setRoomId(data.roomId);
      setPlayerColor(data.playerColor);
      setGamePhase('waiting');
      setIsWaitingForOpponent(true);
      setIsCreatingRoom(false);
      addSystemMessage(`Room ${data.roomId} created. You are playing as ${data.playerColor}. Share this room ID with your opponent!`);
    });

    const unsubscribeRoomJoined = chessSocket.onRoomJoined((data) => {
      console.log('🏠 Room joined:', data.roomId);
      setRoomId(data.roomId);
      setPlayerColor(data.playerColor);
      setGamePhase('waiting');
      setIsJoining(false);
      
      if (data.gameState) {
        setGameState(data.gameState.gameState);
        setIsGameStarted(data.gameState.isGameStarted);
        if (data.gameState.isGameStarted) {
          setGamePhase('playing');
          setIsWaitingForOpponent(false);
        }
      }
      
      addSystemMessage(`Joined room ${data.roomId} as ${data.playerColor}`);
    });

    const unsubscribePlayerJoined = chessSocket.onPlayerJoined((data) => {
      console.log('👥 Player joined:', data.playerColor);
      setOpponentConnected(true);
      addSystemMessage(`${data.playerColor === playerColor ? 'You' : 'Opponent'} joined the game`);
    });

    const unsubscribePlayerLeft = chessSocket.onPlayerLeft((data) => {
      console.log('👥 Player left:', data.playerColor);
      if (data.playerColor !== playerColor) {
        setOpponentConnected(false);
        addSystemMessage('Opponent left the game');
      }
    });

    const unsubscribePlayerDisconnected = chessSocket.onPlayerDisconnected((data) => {
      console.log('⚠️ Player disconnected:', data.playerColor);
      if (data.playerColor !== playerColor) {
        addSystemMessage('Opponent disconnected but may reconnect...');
      }
    });

    const unsubscribeGameStarted = chessSocket.onGameStarted((gameStateData) => {
      console.log('🎮 Game started');
      setGameState(gameStateData.gameState);
      setIsGameStarted(true);
      setGamePhase('playing');
      setIsWaitingForOpponent(false);
      setOpponentConnected(true);
      addSystemMessage('Game started! Good luck!');
    });

    const unsubscribeMoveMade = chessSocket.onMoveMade((data) => {
      console.log('♟️ Move received');
      setGameState(data.gameState);
    });

    const unsubscribeGameOver = chessSocket.onGameOver((data) => {
      console.log('🏁 Game over:', data);
      let message = '';
      if (data.winner === 'draw') {
        message = `Game ended in a draw (${data.reason})`;
      } else {
        const winnerText = data.winner === playerColor ? 'You' : 'Opponent';
        message = `${winnerText} won by ${data.reason}`;
      }
      addSystemMessage(message);
    });

    const unsubscribeChatMessage = chessSocket.onChatMessage((data) => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        playerId: data.playerId,
        playerColor: data.playerColor,
        message: data.message,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, newMessage]);
      
      if (!showChat && data.playerColor !== playerColor) {
        setUnreadMessages(prev => prev + 1);
      }
    });

    const unsubscribeRoomFull = chessSocket.onError(() => {
      setError('Room is full');
      setIsJoining(false);
    });

    const unsubscribeRoomNotFound = chessSocket.onError(() => {
      setError('Room not found');
      setIsJoining(false);
    });

    // Cleanup
    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeReconnectAttempt();
      unsubscribeReconnect();
      unsubscribeReconnectFailed();
      unsubscribeError();
      unsubscribeRoomCreated();
      unsubscribeRoomJoined();
      unsubscribePlayerJoined();
      unsubscribePlayerLeft();
      unsubscribePlayerDisconnected();
      unsubscribeGameStarted();
      unsubscribeMoveMade();
      unsubscribeGameOver();
      unsubscribeChatMessage();
      unsubscribeRoomFull();
      unsubscribeRoomNotFound();
      chessSocket.disconnect();
    };
  }, [playerColor, showChat]);

  const addSystemMessage = (message: string) => {
    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId: 'system',
      playerColor: 'white',
      message,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, systemMessage]);
  };

  const handleCreateRoom = async () => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }

    setIsCreatingRoom(true);
    setError(null);
    
    try {
      const data = await chessSocket.createRoom();
      console.log('✅ Room created successfully:', data.roomId);
    } catch (error: any) {
      console.error('❌ Failed to create room:', error.message);
      setError(error.message);
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }

    if (joinRoomId.length !== 6) {
      setError('Room ID must be 6 characters');
      return;
    }

    setIsJoining(true);
    setError(null);
    
    try {
      const data = await chessSocket.joinRoom(joinRoomId.trim().toUpperCase());
      console.log('✅ Joined room successfully:', data.roomId);
    } catch (error: any) {
      console.error('❌ Failed to join room:', error.message);
      setError(error.message);
      setIsJoining(false);
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

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  const toggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) {
      setUnreadMessages(0);
    }
  };

  // Connection status indicator with enhanced states
  const ConnectionStatus = () => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
      connectionStatus === 'connected' 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
        : connectionStatus === 'connecting'
        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        : connectionStatus === 'reconnecting'
        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
        : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`}>
      {connectionStatus === 'connected' ? (
        <><Wifi size={12} /> Connected</>
      ) : connectionStatus === 'connecting' ? (
        <><RefreshCw size={12} className="animate-spin" /> Connecting...</>
      ) : connectionStatus === 'reconnecting' ? (
        <><RefreshCw size={12} className="animate-spin" /> Reconnecting... ({connectionAttempts})</>
      ) : (
        <><WifiOff size={12} /> Disconnected</>
      )}
    </div>
  );

  if (gamePhase === 'menu') {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        {/* Background */}
        <div className={`absolute inset-0 transition-all duration-1000 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900'
            : 'bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100'
        }`} />

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
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="mb-6 p-4 rounded-xl text-sm bg-red-500/20 border border-red-500/30 text-red-300 flex items-center gap-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Connection status warning */}
            {!isConnected && (
              <motion.div 
                className="mb-6 p-4 rounded-xl text-sm bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 flex items-center gap-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={16} />
                {connectionStatus === 'connecting' || connectionStatus === 'reconnecting' 
                  ? 'Connecting to server...' 
                  : 'Not connected to server. Retrying...'}
              </motion.div>
            )}

            {/* Menu options */}
            <div className="space-y-4">
              {!isJoining ? (
                <>
                  <motion.button
                    onClick={handleCreateRoom}
                    disabled={!isConnected || isCreatingRoom}
                    className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                      isConnected && !isCreatingRoom
                        ? theme === 'dark'
                          ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30'
                          : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300'
                        : 'bg-gray-500/20 text-gray-500 border border-gray-500/30 cursor-not-allowed'
                    }`}
                    whileHover={isConnected && !isCreatingRoom ? { scale: 1.02 } : {}}
                    whileTap={isConnected && !isCreatingRoom ? { scale: 0.98 } : {}}
                  >
                    {isCreatingRoom ? (
                      <><RefreshCw size={20} className="animate-spin" /> Creating Room...</>
                    ) : (
                      <><Crown size={20} /> Create Game Room</>
                    )}
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
                    disabled={!isConnected}
                  />

                  <div className="flex gap-3">
                    <motion.button
                      onClick={handleJoinRoom}
                      disabled={!isConnected || joinRoomId.length !== 6 || isJoining}
                      className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                        isConnected && joinRoomId.length === 6 && !isJoining
                          ? theme === 'dark'
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30'
                            : 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300'
                          : 'bg-gray-500/20 text-gray-500 border border-gray-500/30 cursor-not-allowed'
                      }`}
                      whileHover={isConnected && joinRoomId.length === 6 && !isJoining ? { scale: 1.02 } : {}}
                      whileTap={isConnected && joinRoomId.length === 6 && !isJoining ? { scale: 0.98 } : {}}
                    >
                      {isJoining ? (
                        <><RefreshCw size={16} className="animate-spin" /> Joining...</>
                      ) : (
                        'Join Room'
                      )}
                    </motion.button>

                    <motion.button
                      onClick={() => {
                        setIsJoining(false);
                        setJoinRoomId('');
                        setError(null);
                      }}
                      className={`py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                        theme === 'dark'
                          ? 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/30'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-400'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Back button */}
              <motion.button
                onClick={onBack}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 border border-gray-600/30'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-400'
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
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        {/* Background */}
        <div className={`absolute inset-0 transition-all duration-1000 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900'
            : 'bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100'
        }`} />

        <div className="relative z-10 w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${
              theme === 'dark' 
                ? 'bg-white/10 border-white/30 text-white' 
                : 'bg-white/80 border-gray-300/50 text-gray-800'
            } backdrop-blur-xl rounded-3xl shadow-2xl border p-8 text-center`}
          >
            {/* Room Info */}
            <div className="mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Users size={32} className={theme === 'dark' ? 'text-green-400' : 'text-green-600'} />
                <h2 className="text-2xl font-bold">Room Created</h2>
              </div>
              
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-4">
                <div className="text-sm text-green-300 mb-2">Room ID</div>
                <div className="text-3xl font-bold text-green-400 font-mono tracking-wider mb-3">
                  {roomId}
                </div>
                <motion.button
                  onClick={copyRoomId}
                  className="flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-300 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Copy size={16} />
                  Copy Room ID
                </motion.button>
              </div>

              <div className="flex items-center justify-center gap-2 mb-4">
                <ConnectionStatus />
              </div>

              <p className={`text-lg ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
                Share this Room ID with your opponent
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-white/50' : 'text-gray-500'} mt-2`}>
                You are playing as <span className="font-semibold text-white">{playerColor}</span>
              </p>
            </div>

            {/* Waiting animation */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="animate-pulse w-3 h-3 bg-blue-400 rounded-full"></div>
                <div className="animate-pulse w-3 h-3 bg-blue-400 rounded-full delay-100"></div>
                <div className="animate-pulse w-3 h-3 bg-blue-400 rounded-full delay-200"></div>
              </div>
              <p className={theme === 'dark' ? 'text-white/70' : 'text-gray-600'}>
                Waiting for opponent to join...
              </p>
            </div>

            {/* Back to menu */}
            <motion.button
              onClick={() => {
                chessSocket.disconnect();
                onBack();
              }}
              className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 border border-gray-600/30'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-400'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel & Return to Menu
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="relative">
      {/* Connection status overlay */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-center text-white border border-white/20">
              <RefreshCw size={32} className="animate-spin mx-auto mb-4 text-yellow-400" />
              <h3 className="text-xl font-bold mb-2">Connection Lost</h3>
              <p className="text-white/70 mb-4">
                {connectionStatus === 'reconnecting' 
                  ? `Reconnecting... (attempt ${connectionAttempts})`
                  : 'Attempting to reconnect...'}
              </p>
              <ConnectionStatus />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game interface */}
      {gameState && (
        <ChessGame
          gameState={gameState}
          gameMode="online"
          playerColor={playerColor || 'white'}
          themeId={selectedTheme}
          timerMode={timerMode}
          customTime={customTime}
          onMove={handleMove}
          onGameOver={handleGameOver}
        />
      )}

      {/* Floating action buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {/* Chat button */}
        <motion.button
          onClick={toggleChat}
          className={`relative p-4 rounded-full shadow-lg backdrop-blur-xl border transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
              : 'bg-white/80 border-gray-300/50 text-gray-800 hover:bg-white'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MessageCircle size={24} />
          {unreadMessages > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {unreadMessages}
            </span>
          )}
        </motion.button>

        {/* Game menu button */}
        <motion.button
          onClick={() => setShowGameMenu(true)}
          className={`p-4 rounded-full shadow-lg backdrop-blur-xl border transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
              : 'bg-white/80 border-gray-300/50 text-gray-800 hover:bg-white'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Settings size={24} />
        </motion.button>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-6 top-6 bottom-6 w-80 z-30"
          >
            <div className={`h-full ${
              theme === 'dark' 
                ? 'bg-white/10 border-white/30 text-white' 
                : 'bg-white/90 border-gray-300/50 text-gray-800'
            } backdrop-blur-xl rounded-2xl shadow-2xl border flex flex-col`}>
              {/* Chat header */}
              <div className="p-4 border-b border-white/20 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <MessageCircle size={20} />
                  Chat
                </h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`${
                      message.playerId === 'system'
                        ? 'text-center text-xs text-gray-400 italic'
                        : message.playerColor === playerColor
                          ? 'text-right'
                          : 'text-left'
                    }`}
                  >
                    {message.playerId !== 'system' && (
                      <div className={`text-xs ${
                        message.playerColor === 'white' ? 'text-blue-400' : 'text-purple-400'
                      } mb-1`}>
                        {message.playerColor === playerColor ? 'You' : 'Opponent'}
                      </div>
                    )}
                    <div className={`${
                      message.playerId === 'system'
                        ? ''
                        : message.playerColor === playerColor
                          ? 'bg-blue-500/20 text-blue-100 ml-8'
                          : 'bg-gray-500/20 text-gray-100 mr-8'
                    } p-2 rounded-lg text-sm`}>
                      {message.message}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat input */}
              <div className="p-4 border-t border-white/20">
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
                        : 'bg-white/80 border-gray-300 text-gray-800 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    maxLength={500}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game menu */}
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
                  ? 'bg-white/10 border-white/30 text-white' 
                  : 'bg-white/90 border-gray-300/50 text-gray-800'
              } backdrop-blur-xl rounded-2xl shadow-2xl border p-6 max-w-sm w-full`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-6 text-center">Game Options</h3>
              
              <div className="space-y-4">
                <motion.button
                  onClick={handleOfferDraw}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30'
                      : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Handshake size={20} />
                  Offer Draw
                </motion.button>

                <motion.button
                  onClick={handleResign}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                      : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Flag size={20} />
                  Resign
                </motion.button>

                <motion.button
                  onClick={() => setShowGameMenu(false)}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                    theme === 'dark'
                      ? 'bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 border border-gray-600/30'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-400'
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