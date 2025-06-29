import { io, Socket } from 'socket.io-client';
import { GameState, Move, NetworkMessage } from './types';

export class ChessSocket {
  private socket: Socket | null = null;
  private isHost: boolean = false;
  private roomId: string | null = null;

  constructor() {
    try {
      // Get the base URL for the Socket.IO connection
      const baseURL = process.env.NEXT_PUBLIC_SITE_URL || 
        (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

      // Initialize socket connection
      this.socket = io(baseURL, {
        autoConnect: false,
        path: '/api/socket',
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        forceNew: true,
        withCredentials: true
      });

      // Add error logging
      if (this.socket) {
        this.socket.on('connect', () => {
          console.log('Socket connected successfully');
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          // Fallback to polling if WebSocket fails
          if (this.socket?.io?.opts?.transports?.includes('websocket')) {
            console.log('Falling back to polling transport');
            this.socket.io.opts.transports = ['polling', 'websocket'];
          }
        });

        this.socket.on('connect_timeout', () => {
          console.error('Socket connection timeout');
        });

        this.socket.on('error', (error) => {
          console.error('Socket error:', error);
        });

        this.socket.on('reconnect_attempt', () => {
          console.log('Attempting to reconnect...');
        });

        this.socket.on('reconnect', () => {
          console.log('Reconnected successfully');
          // Rejoin room if we were in one
          if (this.roomId) {
            if (this.isHost) {
              this.createRoom().catch(console.error);
            } else {
              this.joinRoom(this.roomId).catch(console.error);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error initializing socket:', error);
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      try {
        this.socket.connect();
        
        this.socket.on('connect', () => {
          console.log('Connected to server');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error connecting socket:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        console.error('Error disconnecting socket:', error);
      }
    }
  }

  createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      try {
        this.socket.emit('create-room');
        
        this.socket.on('room-created', (roomId: string) => {
          this.roomId = roomId;
          this.isHost = true;
          resolve(roomId);
        });

        this.socket.on('error', (error: string) => {
          reject(new Error(error));
        });
      } catch (error) {
        console.error('Error creating room:', error);
        reject(error);
      }
    });
  }

  joinRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      try {
        this.socket.emit('join-room', roomId);
        
        this.socket.on('room-joined', () => {
          this.roomId = roomId;
          this.isHost = false;
          resolve();
        });

        this.socket.on('room-full', () => {
          reject(new Error('Room is full'));
        });

        this.socket.on('room-not-found', () => {
          reject(new Error('Room not found'));
        });
      } catch (error) {
        console.error('Error joining room:', error);
        reject(error);
      }
    });
  }

  sendMove(move: Move): void {
    if (this.socket && this.roomId) {
      try {
        const message: NetworkMessage = {
          type: 'move',
          data: move
        };
        this.socket.emit('game-message', this.roomId, message);
      } catch (error) {
        console.error('Error sending move:', error);
      }
    }
  }

  sendGameState(gameState: GameState): void {
    if (this.socket && this.roomId) {
      try {
        const message: NetworkMessage = {
          type: 'gameState',
          data: gameState
        };
        this.socket.emit('game-message', this.roomId, message);
      } catch (error) {
        console.error('Error sending game state:', error);
      }
    }
  }

  onMove(callback: (move: Move) => void): void {
    if (this.socket) {
      this.socket.on('game-message', (message: NetworkMessage) => {
        if (message.type === 'move') {
          callback(message.data);
        }
      });
    }
  }

  onGameState(callback: (gameState: GameState) => void): void {
    if (this.socket) {
      this.socket.on('game-message', (message: NetworkMessage) => {
        if (message.type === 'gameState') {
          callback(message.data);
        }
      });
    }
  }

  onPlayerJoined(callback: () => void): void {
    if (this.socket) {
      this.socket.on('player-joined', callback);
    }
  }

  onPlayerLeft(callback: () => void): void {
    if (this.socket) {
      this.socket.on('player-left', callback);
    }
  }

  getIsHost(): boolean {
    return this.isHost;
  }

  getRoomId(): string | null {
    return this.roomId;
  }
}

export const chessSocket = new ChessSocket(); 