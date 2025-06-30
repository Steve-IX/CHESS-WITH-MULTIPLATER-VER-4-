import { io, Socket } from 'socket.io-client';
import { GameState, Move, NetworkMessage, PlayerColor } from './types';

export interface OnlineGameState {
  roomId: string;
  players: {
    white?: string;
    black?: string;
  };
  gameState: GameState;
  isGameStarted: boolean;
  spectators: string[];
}

export class ChessSocket {
  private socket: Socket | null = null;
  private isHost: boolean = false;
  private roomId: string | null = null;
  private playerColor: PlayerColor | null = null;
  private callbacks: Map<string, Function[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = 15;
  private isIntentionalDisconnect: boolean = false;
  private lastHeartbeat: number = 0;
  private heartbeatCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Only initialize socket on client side
    if (typeof window !== 'undefined') {
      this.initializeSocket();
    }
  }

  private initializeSocket(): void {
    try {
      // Clear any existing socket
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }

      // Initialize socket connection with Vercel-optimized settings
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3000';
      
      this.socket = io(socketUrl, {
        path: '/api/socket',
        autoConnect: false,
        // Prioritize polling for Vercel serverless compatibility
        transports: ['polling'], // Only use polling for Vercel
        timeout: 20000, // Shorter timeout for faster fallback
        forceNew: false,
        upgrade: false, // Disable upgrade to WebSocket
        rememberUpgrade: false,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectionAttempts,
        reconnectionDelay: 1000, // Faster initial retry
        reconnectionDelayMax: 5000, // Lower max delay
        randomizationFactor: 0.2, // Less randomization
        closeOnBeforeunload: false,
        // Additional Vercel-friendly options
        multiplex: true,
        rejectUnauthorized: false,
        withCredentials: false
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      this.socket = null;
      this.connectionState = 'disconnected';
      this.emitCallback('connect_error', error);
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) {
      console.warn('Cannot setup event listeners: socket is null');
      return;
    }

    // Connection events with robust handling
    this.socket.on('connect', () => {
      console.log('🔌 Connected to chess server (ID:', this.socket?.id, ')');
      this.connectionState = 'connected';
      this.reconnectionAttempts = 0;
      this.isIntentionalDisconnect = false;
      this.startHeartbeat();
      this.emitCallback('connect');
      
      // If we were in a room before disconnect, try to rejoin
      if (this.roomId && this.reconnectionAttempts > 0) {
        console.log('🔄 Attempting to rejoin room after reconnection:', this.roomId);
        this.rejoinRoom();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from chess server:', reason);
      this.connectionState = 'disconnected';
      this.stopHeartbeat();
      this.stopHeartbeatCheck();
      this.emitCallback('disconnect', reason);
      
      // Handle different disconnect reasons
      if (reason === 'io client disconnect' || this.isIntentionalDisconnect) {
        console.log('🔌 Intentional disconnect, not attempting to reconnect');
        return;
      }
      
      // Automatic reconnection for network issues
      if (reason === 'transport close' || reason === 'ping timeout' || reason === 'transport error') {
        console.log('🔄 Network issue detected, will attempt to reconnect...');
        this.connectionState = 'reconnecting';
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message || error);
      this.connectionState = 'disconnected';
      
      // Provide more specific error messages for common issues
      let errorMessage = 'Connection failed';
      if (error.message?.includes('websocket')) {
        errorMessage = 'WebSocket connection failed, retrying with polling...';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout, retrying...';
      } else if (error.message?.includes('xhr poll error')) {
        errorMessage = 'Network error, please check your connection';
      }
      
      this.emitCallback('connect_error', new Error(errorMessage));
      
      // Reinitialize socket if connection fails repeatedly
      if (this.reconnectionAttempts > 3) {
        console.log('🔄 Multiple connection failures, reinitializing socket...');
        setTimeout(() => this.initializeSocket(), 3000);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to chess server after', attemptNumber, 'attempts');
      this.connectionState = 'connected';
      this.reconnectionAttempts = attemptNumber;
      this.emitCallback('reconnect', attemptNumber);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt', attemptNumber, 'of', this.maxReconnectionAttempts);
      this.connectionState = 'reconnecting';
      this.reconnectionAttempts = attemptNumber;
      this.emitCallback('reconnect_attempt', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error);
      this.emitCallback('reconnect_error', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect after maximum attempts');
      this.connectionState = 'disconnected';
      this.emitCallback('reconnect_failed');
      
      // Try to reinitialize the socket completely
      setTimeout(() => {
        console.log('🔄 Attempting to reinitialize socket after reconnection failure');
        this.initializeSocket();
      }, 10000);
    });

    // Room management events
    this.socket.on('room-created', (data: { roomId: string, playerColor: PlayerColor }) => {
      console.log('🏠 Room created:', data.roomId, 'as', data.playerColor);
      this.roomId = data.roomId;
      this.playerColor = data.playerColor;
      this.isHost = true;
      this.emitCallback('room-created', data);
    });

    this.socket.on('room-joined', (data: { roomId: string, playerColor: PlayerColor, gameState?: OnlineGameState }) => {
      console.log('🏠 Room joined:', data.roomId, 'as', data.playerColor);
      this.roomId = data.roomId;
      this.playerColor = data.playerColor;
      this.isHost = false;
      this.emitCallback('room-joined', data);
    });

    this.socket.on('player-joined', (data: { playerColor: PlayerColor, playerId: string }) => {
      console.log('👥 Player joined:', data.playerColor, '(', data.playerId, ')');
      this.emitCallback('player-joined', data);
    });

    this.socket.on('player-left', (data: { playerColor: PlayerColor, playerId: string }) => {
      console.log('👥 Player left:', data.playerColor, '(', data.playerId, ')');
      this.emitCallback('player-left', data);
    });

    this.socket.on('game-started', (gameState: OnlineGameState) => {
      console.log('🎮 Game started with players:', gameState.players);
      this.emitCallback('game-started', gameState);
    });

    this.socket.on('move-made', (data: { move: Move, gameState: GameState }) => {
      console.log('♟️ Move received:', data.move);
      this.emitCallback('move-made', data);
    });

    this.socket.on('game-over', (data: { reason: string, winner?: PlayerColor | 'draw' }) => {
      console.log('🏁 Game over:', data);
      this.emitCallback('game-over', data);
    });

    // Error handling
    this.socket.on('room-full', () => {
      console.log('🚫 Room is full');
      this.emitCallback('room-full');
    });

    this.socket.on('room-not-found', () => {
      console.log('🚫 Room not found');
      this.emitCallback('room-not-found');
    });

    this.socket.on('error', (error: string) => {
      console.error('❌ Socket error:', error);
      this.emitCallback('error', error);
    });

    // Chat and other features
    this.socket.on('chat-message', (data: { playerId: string, message: string, playerColor: PlayerColor }) => {
      console.log('💬 Chat message from', data.playerColor, ':', data.message);
      this.emitCallback('chat-message', data);
    });

    this.socket.on('room-updated', (roomState: OnlineGameState) => {
      console.log('📡 Room state updated:', roomState);
      this.emitCallback('room-updated', roomState);
    });

    this.socket.on('player-disconnected', (data: { playerColor: PlayerColor, playerId: string }) => {
      console.log('⚠️ Player temporarily disconnected:', data);
      this.emitCallback('player-disconnected', data);
    });

    // Heartbeat responses
    this.socket.on('pong', () => {
      this.lastHeartbeat = Date.now();
    });
  }

  private emitCallback(event: string, data?: any): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks && Array.isArray(callbacks)) {
      // Create a copy to avoid issues with concurrent modifications
      const callbacksCopy = [...callbacks];
      callbacksCopy.forEach(callback => {
        try {
          if (typeof callback === 'function') {
            callback(data);
          }
        } catch (error) {
          console.error(`Error in callback for event ${event}:`, error);
        }
      });
    }
  }

  private addCallback(event: string, callback: Function): void {
    if (typeof callback !== 'function') {
      console.warn('Attempted to add non-function callback:', callback);
      return;
    }
    
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    
    const callbacks = this.callbacks.get(event)!;
    callbacks.push(callback);
  }

  private removeCallback(event: string, callback: Function): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  async connect(): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    if (this.socket.connected) {
      console.log('Socket already connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.connectionState = 'connecting';
      
      const onConnect = () => {
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        resolve();
      };

      const onError = (error: any) => {
        this.socket?.off('connect', onConnect);
        this.socket?.off('connect_error', onError);
        this.connectionState = 'disconnected';
        reject(new Error(`Connection failed: ${error.message || error}`));
      };

      this.socket.on('connect', onConnect);
      this.socket.on('connect_error', onError);

      // Attempt connection
      try {
        this.socket.connect();
      } catch (error) {
        onError(error);
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.connectionState === 'connecting') {
          onError(new Error('Connection timeout'));
        }
      }, 30000);
    });
  }

  disconnect(): void {
    this.isIntentionalDisconnect = true;
    this.connectionState = 'disconnected';
    this.stopHeartbeat();
    this.stopHeartbeatCheck();
    
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.stopHeartbeatCheck();
    
    // Send ping every 8 seconds (optimized for polling transport)
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 8000);
    
    // Check for heartbeat response every 15 seconds
    this.heartbeatCheckInterval = setInterval(() => {
      const now = Date.now();
      if (this.lastHeartbeat > 0 && now - this.lastHeartbeat > 25000) {
        console.warn('⚠️ Heartbeat timeout detected, forcing reconnect');
        this.socket?.disconnect();
      }
    }, 15000);
    
    this.lastHeartbeat = Date.now();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private stopHeartbeatCheck(): void {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }
  }

  private rejoinRoom(): void {
    if (this.roomId && this.socket?.connected) {
      console.log('🔄 Rejoining room:', this.roomId);
      this.socket.emit('rejoin-room', this.roomId);
    }
  }

  // Public API methods with improved error handling
  createRoom(): Promise<{ roomId: string, playerColor: PlayerColor }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Room creation timeout'));
      }, 10000);

      const onRoomCreated = (data: { roomId: string, playerColor: PlayerColor }) => {
        clearTimeout(timeout);
        this.socket?.off('room-created', onRoomCreated);
        this.socket?.off('error', onError);
        resolve(data);
      };

      const onError = (error: string) => {
        clearTimeout(timeout);
        this.socket?.off('room-created', onRoomCreated);
        this.socket?.off('error', onError);
        reject(new Error(error));
      };

      this.socket.on('room-created', onRoomCreated);
      this.socket.on('error', onError);
      this.socket.emit('create-room');
    });
  }

  joinRoom(roomId: string): Promise<{ roomId: string, playerColor: PlayerColor, gameState?: OnlineGameState }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Room join timeout'));
      }, 15000);

      const cleanup = () => {
        clearTimeout(timeout);
        this.socket?.off('room-joined', onRoomJoined);
        this.socket?.off('room-full', onRoomFull);
        this.socket?.off('room-not-found', onRoomNotFound);
        this.socket?.off('error', onError);
      };

      const onRoomJoined = (data: { roomId: string, playerColor: PlayerColor, gameState?: OnlineGameState }) => {
        cleanup();
        resolve(data);
      };

      const onRoomFull = () => {
        cleanup();
        reject(new Error('Room is full'));
      };

      const onRoomNotFound = () => {
        cleanup();
        reject(new Error('Room not found'));
      };

      const onError = (error: string) => {
        cleanup();
        reject(new Error(error));
      };

      this.socket.on('room-joined', onRoomJoined);
      this.socket.on('room-full', onRoomFull);
      this.socket.on('room-not-found', onRoomNotFound);
      this.socket.on('error', onError);
      
      console.log('🏠 Attempting to join room:', roomId);
      this.socket.emit('join-room', roomId);
    });
  }

  makeMove(move: Move): void {
    if (this.socket?.connected && this.roomId) {
      console.log('♟️ Sending move:', move);
      this.socket.emit('make-move', { roomId: this.roomId, move });
    } else {
      console.error('Cannot send move: not connected or no room');
      this.emitCallback('error', 'Cannot send move: not connected to game');
    }
  }

  startGame(): void {
    if (this.socket?.connected && this.roomId && this.isHost) {
      this.socket.emit('start-game', this.roomId);
    }
  }

  sendChatMessage(message: string): void {
    if (this.socket?.connected && this.roomId) {
      this.socket.emit('chat-message', { 
        roomId: this.roomId, 
        message: message.trim() 
      });
    }
  }

  resign(): void {
    if (this.socket?.connected && this.roomId) {
      this.socket.emit('resign', this.roomId);
    }
  }

  offerDraw(): void {
    if (this.socket?.connected && this.roomId) {
      this.socket.emit('offer-draw', this.roomId);
    }
  }

  acceptDraw(): void {
    if (this.socket?.connected && this.roomId) {
      this.socket.emit('accept-draw', this.roomId);
    }
  }

  declineDraw(): void {
    if (this.socket?.connected && this.roomId) {
      this.socket.emit('decline-draw', this.roomId);
    }
  }

  // Event listener methods
  onRoomCreated(callback: (data: { roomId: string, playerColor: PlayerColor }) => void): () => void {
    this.addCallback('room-created', callback);
    return () => this.removeCallback('room-created', callback);
  }

  onRoomJoined(callback: (data: { roomId: string, playerColor: PlayerColor, gameState?: OnlineGameState }) => void): () => void {
    this.addCallback('room-joined', callback);
    return () => this.removeCallback('room-joined', callback);
  }

  onPlayerJoined(callback: (data: { playerColor: PlayerColor, playerId: string }) => void): () => void {
    this.addCallback('player-joined', callback);
    return () => this.removeCallback('player-joined', callback);
  }

  onPlayerLeft(callback: (data: { playerColor: PlayerColor, playerId: string }) => void): () => void {
    this.addCallback('player-left', callback);
    return () => this.removeCallback('player-left', callback);
  }

  onGameStarted(callback: (gameState: OnlineGameState) => void): () => void {
    this.addCallback('game-started', callback);
    return () => this.removeCallback('game-started', callback);
  }

  onMoveMade(callback: (data: { move: Move, gameState: GameState }) => void): () => void {
    this.addCallback('move-made', callback);
    return () => this.removeCallback('move-made', callback);
  }

  onGameOver(callback: (data: { reason: string, winner?: PlayerColor | 'draw' }) => void): () => void {
    this.addCallback('game-over', callback);
    return () => this.removeCallback('game-over', callback);
  }

  onChatMessage(callback: (data: { playerId: string, message: string, playerColor: PlayerColor }) => void): () => void {
    this.addCallback('chat-message', callback);
    return () => this.removeCallback('chat-message', callback);
  }

  onError(callback: (error: string) => void): () => void {
    this.addCallback('error', callback);
    return () => this.removeCallback('error', callback);
  }

  onConnect(callback: () => void): () => void {
    this.addCallback('connect', callback);
    return () => this.removeCallback('connect', callback);
  }

  onDisconnect(callback: (reason?: string) => void): () => void {
    this.addCallback('disconnect', callback);
    return () => this.removeCallback('disconnect', callback);
  }

  onReconnect(callback: (attemptNumber: number) => void): () => void {
    this.addCallback('reconnect', callback);
    return () => this.removeCallback('reconnect', callback);
  }

  onReconnectAttempt(callback: (attemptNumber: number) => void): () => void {
    this.addCallback('reconnect_attempt', callback);
    return () => this.removeCallback('reconnect_attempt', callback);
  }

  onReconnectError(callback: (error: any) => void): () => void {
    this.addCallback('reconnect_error', callback);
    return () => this.removeCallback('reconnect_error', callback);
  }

  onReconnectFailed(callback: () => void): () => void {
    this.addCallback('reconnect_failed', callback);
    return () => this.removeCallback('reconnect_failed', callback);
  }

  onRoomUpdated(callback: (roomState: OnlineGameState) => void): () => void {
    this.addCallback('room-updated', callback);
    return () => this.removeCallback('room-updated', callback);
  }

  onPlayerDisconnected(callback: (data: { playerColor: PlayerColor, playerId: string }) => void): () => void {
    this.addCallback('player-disconnected', callback);
    return () => this.removeCallback('player-disconnected', callback);
  }

  // Utility methods
  getIsHost(): boolean {
    return this.isHost;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  getPlayerColor(): PlayerColor | null {
    return this.playerColor;
  }

  isConnected(): boolean {
    return this.socket?.connected === true && this.connectionState === 'connected';
  }

  getConnectionState(): string {
    return this.connectionState;
  }

  getReconnectionAttempts(): number {
    return this.reconnectionAttempts;
  }
}

// Export a singleton instance
export const chessSocket = new ChessSocket(); 