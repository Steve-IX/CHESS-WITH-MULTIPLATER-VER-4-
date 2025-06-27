import { io, Socket } from 'socket.io-client';
import { GameState, Move, NetworkMessage } from './types';

export class ChessSocket {
  private socket: Socket | null = null;
  private isHost: boolean = false;
  private roomId: string | null = null;

  constructor() {
    // Initialize socket connection
    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      autoConnect: false
    });
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.connect();
      
      this.socket.on('connect', () => {
        console.log('Connected to server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      this.socket.emit('create-room');
      
      this.socket.on('room-created', (roomId: string) => {
        this.roomId = roomId;
        this.isHost = true;
        resolve(roomId);
      });

      this.socket.on('error', (error: string) => {
        reject(new Error(error));
      });
    });
  }

  joinRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

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
    });
  }

  sendMove(move: Move): void {
    if (this.socket && this.roomId) {
      const message: NetworkMessage = {
        type: 'move',
        data: move
      };
      this.socket.emit('game-message', this.roomId, message);
    }
  }

  sendGameState(gameState: GameState): void {
    if (this.socket && this.roomId) {
      const message: NetworkMessage = {
        type: 'gameState',
        data: gameState
      };
      this.socket.emit('game-message', this.roomId, message);
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