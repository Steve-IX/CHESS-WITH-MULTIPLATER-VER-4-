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

  constructor() {
    // Only initialize socket on client side
    if (typeof window !== 'undefined') {
      try {
        // Initialize socket connection - use the API route for production
        const socketUrl = process.env.NODE_ENV === 'production' 
          ? window.location.origin 
          : 'http://localhost:3000';
        
        this.socket = io(socketUrl, {
          path: '/api/socket',
          autoConnect: false,
          transports: ['polling', 'websocket'],
          timeout: 30000,
          forceNew: false,
          upgrade: true,
          rememberUpgrade: true,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
          pingTimeout: 60000,
          pingInterval: 25000
        });

        this.setupEventListeners();
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        this.socket = null;
      }
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) {
      console.warn('Cannot setup event listeners: socket is null');
      return;
    }

    this.socket.on('connect', () => {
      console.log('🔌 Connected to chess server');
      this.startHeartbeat();
      this.emitCallback('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from chess server:', reason);
      this.emitCallback('disconnect', reason);
      
      // Don't try to reconnect if it was intentional
      if (reason === 'io client disconnect') {
        return;
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.emitCallback('connect_error', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to chess server after', attemptNumber, 'attempts');
      this.emitCallback('reconnect', attemptNumber);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Attempting to reconnect...', attemptNumber);
      this.emitCallback('reconnect_attempt', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error);
      this.emitCallback('reconnect_error', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect after maximum attempts');
      this.emitCallback('reconnect_failed');
    });

    this.socket.on('room-created', (data: { roomId: string, playerColor: PlayerColor }) => {
      console.log('🏠 Room created:', data.roomId);
      this.roomId = data.roomId;
      this.playerColor = data.playerColor;
      this.isHost = true;
      this.emitCallback('room-created', data);
    });

    this.socket.on('room-joined', (data: { roomId: string, playerColor: PlayerColor, gameState?: OnlineGameState }) => {
      console.log('🏠 Room joined:', data.roomId);
      this.roomId = data.roomId;
      this.playerColor = data.playerColor;
      this.isHost = false;
      this.emitCallback('room-joined', data);
    });

    this.socket.on('player-joined', (data: { playerColor: PlayerColor, playerId: string }) => {
      console.log('👥 Player joined:', data);
      this.emitCallback('player-joined', data);
    });

    this.socket.on('player-left', (data: { playerColor: PlayerColor, playerId: string }) => {
      console.log('👥 Player left:', data);
      this.emitCallback('player-left', data);
    });

    this.socket.on('game-started', (gameState: OnlineGameState) => {
      console.log('🎮 Game started');
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

    this.socket.on('chat-message', (data: { playerId: string, message: string, playerColor: PlayerColor }) => {
      console.log('💬 Chat message:', data);
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
    
    const callbacks = this.callbacks.get(event);
    if (callbacks && Array.isArray(callbacks)) {
      callbacks.push(callback);
    }
  }

  private removeCallback(event: string, callback: Function): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks && Array.isArray(callbacks)) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      if (this.socket.connected) {
        resolve();
        return;
      }

      let timeout: NodeJS.Timeout;
      
      const onConnect = () => {
        clearTimeout(timeout);
        this.removeCallback('connect', onConnect);
        this.removeCallback('connect_error', onError);
        console.log('✅ Successfully connected to server');
        resolve();
      };

      const onError = (error: any) => {
        clearTimeout(timeout);
        this.removeCallback('connect', onConnect);
        this.removeCallback('connect_error', onError);
        console.error('❌ Connection failed:', error);
        reject(error);
      };

      // Set a timeout for connection
      timeout = setTimeout(() => {
        this.removeCallback('connect', onConnect);
        this.removeCallback('connect_error', onError);
        reject(new Error('Connection timeout'));
      }, 30000);

      this.addCallback('connect', onConnect);
      this.addCallback('connect_error', onError);

      console.log('🔄 Attempting to connect to server...');
      this.socket.connect();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.roomId = null;
      this.playerColor = null;
      this.isHost = false;
      // Clear all callbacks to prevent memory leaks
      this.callbacks.clear();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  createRoom(): Promise<{ roomId: string, playerColor: PlayerColor }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const onRoomCreated = (data: { roomId: string, playerColor: PlayerColor }) => {
        this.removeCallback('room-created', onRoomCreated);
        this.removeCallback('error', onError);
        resolve(data);
      };

      const onError = (error: string) => {
        this.removeCallback('room-created', onRoomCreated);
        this.removeCallback('error', onError);
        reject(new Error(error));
      };

      this.addCallback('room-created', onRoomCreated);
      this.addCallback('error', onError);

      this.socket.emit('create-room');
    });
  }

  joinRoom(roomId: string): Promise<{ roomId: string, playerColor: PlayerColor, gameState?: OnlineGameState }> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const onRoomJoined = (data: { roomId: string, playerColor: PlayerColor, gameState?: OnlineGameState }) => {
        this.removeCallback('room-joined', onRoomJoined);
        this.removeCallback('room-full', onRoomFull);
        this.removeCallback('room-not-found', onRoomNotFound);
        this.removeCallback('error', onError);
        resolve(data);
      };

      const onRoomFull = () => {
        this.removeCallback('room-joined', onRoomJoined);
        this.removeCallback('room-full', onRoomFull);
        this.removeCallback('room-not-found', onRoomNotFound);
        this.removeCallback('error', onError);
        reject(new Error('Room is full'));
      };

      const onRoomNotFound = () => {
        this.removeCallback('room-joined', onRoomJoined);
        this.removeCallback('room-full', onRoomFull);
        this.removeCallback('room-not-found', onRoomNotFound);
        this.removeCallback('error', onError);
        reject(new Error('Room not found'));
      };

      const onError = (error: string) => {
        this.removeCallback('room-joined', onRoomJoined);
        this.removeCallback('room-full', onRoomFull);
        this.removeCallback('room-not-found', onRoomNotFound);
        this.removeCallback('error', onError);
        reject(new Error(error));
      };

      this.addCallback('room-joined', onRoomJoined);
      this.addCallback('room-full', onRoomFull);
      this.addCallback('room-not-found', onRoomNotFound);
      this.addCallback('error', onError);

      this.socket.emit('join-room', roomId);
    });
  }

  // Game actions
  makeMove(move: Move): void {
    if (this.socket && this.roomId && this.socket.connected) {
      console.log('🎯 Making move:', move);
      this.socket.emit('make-move', {
        roomId: this.roomId,
        move: move
      });
    }
  }

  startGame(): void {
    if (this.socket && this.roomId && this.socket.connected && this.isHost) {
      console.log('🎮 Starting game');
      this.socket.emit('start-game', this.roomId);
    }
  }

  sendChatMessage(message: string): void {
    if (this.socket && this.roomId && this.socket.connected) {
      console.log('💬 Sending chat message:', message);
      this.socket.emit('chat-message', {
        roomId: this.roomId,
        message: message
      });
    }
  }

  resign(): void {
    if (this.socket && this.roomId && this.socket.connected) {
      console.log('🏳️ Resigning game');
      this.socket.emit('resign', this.roomId);
    }
  }

  offerDraw(): void {
    if (this.socket && this.roomId && this.socket.connected) {
      console.log('🤝 Offering draw');
      this.socket.emit('offer-draw', this.roomId);
    }
  }

  acceptDraw(): void {
    if (this.socket && this.roomId && this.socket.connected) {
      console.log('✅ Accepting draw');
      this.socket.emit('accept-draw', this.roomId);
    }
  }

  declineDraw(): void {
    if (this.socket && this.roomId && this.socket.connected) {
      console.log('❌ Declining draw');
      this.socket.emit('decline-draw', this.roomId);
    }
  }

  // Event listeners
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

  // Getters
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
    return this.socket?.connected || false;
  }
}

export const chessSocket = new ChessSocket(); 