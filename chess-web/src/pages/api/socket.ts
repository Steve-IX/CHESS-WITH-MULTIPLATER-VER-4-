import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { GameState, Move, PlayerColor } from '@/lib/types';

interface Player {
  id: string;
  color: PlayerColor;
  isReady: boolean;
}

interface Room {
  id: string;
  host: string;
  players: Map<PlayerColor, Player>;
  spectators: string[];
  gameState: GameState | null;
  isGameStarted: boolean;
  createdAt: Date;
}

const rooms = new Map<string, Room>();

// Initialize a basic chess game state
function createInitialGameState(): GameState {
  // Create initial chess board
  const board: (any | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Set up pieces (simplified initial setup)
  const pieces = {
    'rook': '♜', 'knight': '♞', 'bishop': '♝', 'queen': '♛', 'king': '♚', 'pawn': '♟'
  };
  
  // Initial board setup would go here
  // For now, return a basic game state structure
  return {
    board,
    currentPlayer: 'white' as PlayerColor,
    moveHistory: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    capturedPieces: { white: [], black: [] },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Type assertion to access the socket server
  const socketRes = res as any;
  
  if (!socketRes.socket.server.io) {
    console.log('🚀 Setting up Chess Socket.IO server...');
    
    const io = new ServerIO(socketRes.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);

      // Create room
      socket.on('create-room', () => {
        const roomId = generateRoomId();
        const playerColor: PlayerColor = 'white'; // Host is always white
        
        const room: Room = {
          id: roomId,
          host: socket.id,
          players: new Map(),
          spectators: [],
          gameState: null,
          isGameStarted: false,
          createdAt: new Date()
        };
        
        room.players.set(playerColor, {
          id: socket.id,
          color: playerColor,
          isReady: true
        });
        
        rooms.set(roomId, room);
        socket.join(roomId);
        
        console.log(`🏠 Room ${roomId} created by ${socket.id} (${playerColor})`);
        socket.emit('room-created', { roomId, playerColor });
      });

      // Join room
      socket.on('join-room', (roomId: string) => {
        const room = rooms.get(roomId);
        
        if (!room) {
          console.log(`❌ Room ${roomId} not found`);
          socket.emit('room-not-found');
          return;
        }
        
        // Check if room is full (2 players max)
        if (room.players.size >= 2) {
          console.log(`❌ Room ${roomId} is full`);
          socket.emit('room-full');
          return;
        }
        
        // Assign player color (black if white is taken)
        const playerColor: PlayerColor = room.players.has('white') ? 'black' : 'white';
        
        room.players.set(playerColor, {
          id: socket.id,
          color: playerColor,
          isReady: true
        });
        
        socket.join(roomId);
        
        console.log(`👥 ${socket.id} joined room ${roomId} as ${playerColor}`);
        
        // Notify the joiner
        socket.emit('room-joined', { 
          roomId, 
          playerColor,
          gameState: room.gameState ? {
            roomId,
            players: Object.fromEntries(
              Array.from(room.players.entries()).map(([color, player]) => [color, player.id])
            ),
            gameState: room.gameState,
            isGameStarted: room.isGameStarted,
            spectators: room.spectators
          } : undefined
        });
        
        // Notify other players
        socket.to(roomId).emit('player-joined', { playerColor, playerId: socket.id });
        
        // Auto-start game if 2 players
        if (room.players.size === 2 && !room.isGameStarted) {
          room.gameState = createInitialGameState();
          room.isGameStarted = true;
          
          const gameState = {
            roomId,
            players: Object.fromEntries(
              Array.from(room.players.entries()).map(([color, player]) => [color, player.id])
            ),
            gameState: room.gameState,
            isGameStarted: true,
            spectators: room.spectators
          };
          
          io.to(roomId).emit('game-started', gameState);
          console.log(`🎮 Game started in room ${roomId}`);
        }
      });

      // Start game (host only)
      socket.on('start-game', (roomId: string) => {
        const room = rooms.get(roomId);
        
        if (!room || room.host !== socket.id) {
          socket.emit('error', 'Not authorized to start game');
          return;
        }
        
        if (room.players.size < 2) {
          socket.emit('error', 'Need 2 players to start');
          return;
        }
        
        if (room.isGameStarted) {
          socket.emit('error', 'Game already started');
          return;
        }
        
        room.gameState = createInitialGameState();
        room.isGameStarted = true;
        
        const gameState = {
          roomId,
          players: Object.fromEntries(
            Array.from(room.players.entries()).map(([color, player]) => [color, player.id])
          ),
          gameState: room.gameState,
          isGameStarted: true,
          spectators: room.spectators
        };
        
        io.to(roomId).emit('game-started', gameState);
        console.log(`🎮 Game manually started in room ${roomId}`);
      });

      // Make move
      socket.on('make-move', (data: { roomId: string, move: Move }) => {
        const room = rooms.get(data.roomId);
        
        if (!room || !room.isGameStarted || !room.gameState) {
          socket.emit('error', 'Game not active');
          return;
        }
        
        // Verify player is in the game
        const player = Array.from(room.players.values()).find(p => p.id === socket.id);
        if (!player) {
          socket.emit('error', 'Not a player in this game');
          return;
        }
        
        // Verify it's the player's turn
        if (room.gameState.currentPlayer !== player.color) {
          socket.emit('error', 'Not your turn');
          return;
        }
        
        // Apply move to game state (simplified - in real implementation, validate move)
        room.gameState.moveHistory.push(data.move);
        room.gameState.currentPlayer = room.gameState.currentPlayer === 'white' ? 'black' : 'white';
        
        // Broadcast move to all players in room
        socket.to(data.roomId).emit('move-made', {
          move: data.move,
          gameState: room.gameState
        });
        
        console.log(`♟️ Move made in room ${data.roomId}:`, data.move);
      });

      // Chat message
      socket.on('chat-message', (data: { roomId: string, message: string }) => {
        const room = rooms.get(data.roomId);
        
        if (!room) {
          socket.emit('error', 'Room not found');
          return;
        }
        
        const player = Array.from(room.players.values()).find(p => p.id === socket.id);
        const playerColor = player?.color || 'white';
        
        // Broadcast chat message to all in room
        io.to(data.roomId).emit('chat-message', {
          playerId: socket.id,
          message: data.message,
          playerColor
        });
        
        console.log(`💬 Chat in room ${data.roomId}: ${data.message}`);
      });

      // Resign
      socket.on('resign', (roomId: string) => {
        const room = rooms.get(roomId);
        
        if (!room || !room.isGameStarted) {
          socket.emit('error', 'Game not active');
          return;
        }
        
        const player = Array.from(room.players.values()).find(p => p.id === socket.id);
        if (!player) {
          socket.emit('error', 'Not a player in this game');
          return;
        }
        
        const winner = player.color === 'white' ? 'black' : 'white';
        
        io.to(roomId).emit('game-over', {
          reason: 'resignation',
          winner
        });
        
        room.isGameStarted = false;
        console.log(`🏳️ Player ${player.color} resigned in room ${roomId}`);
      });

      // Offer draw
      socket.on('offer-draw', (roomId: string) => {
        const room = rooms.get(roomId);
        
        if (!room || !room.isGameStarted) {
          socket.emit('error', 'Game not active');
          return;
        }
        
        socket.to(roomId).emit('draw-offered');
        console.log(`🤝 Draw offered in room ${roomId}`);
      });

      // Accept draw
      socket.on('accept-draw', (roomId: string) => {
        const room = rooms.get(roomId);
        
        if (!room || !room.isGameStarted) {
          socket.emit('error', 'Game not active');
          return;
        }
        
        io.to(roomId).emit('game-over', {
          reason: 'draw',
          winner: undefined
        });
        
        room.isGameStarted = false;
        console.log(`🤝 Draw accepted in room ${roomId}`);
      });

      // Decline draw
      socket.on('decline-draw', (roomId: string) => {
        socket.to(roomId).emit('draw-declined');
        console.log(`❌ Draw declined in room ${roomId}`);
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
        
        // Remove player from rooms and notify other players
        for (const [roomId, room] of rooms.entries()) {
          // Check if disconnected player was in this room
          let disconnectedPlayerColor: PlayerColor | null = null;
          
          for (const [color, player] of room.players.entries()) {
            if (player.id === socket.id) {
              disconnectedPlayerColor = color;
              room.players.delete(color);
              break;
            }
          }
          
          if (disconnectedPlayerColor) {
            // Notify remaining players
            socket.to(roomId).emit('player-left', {
              playerColor: disconnectedPlayerColor,
              playerId: socket.id
            });
            
            // If game was in progress, end it
            if (room.isGameStarted) {
              const winner = disconnectedPlayerColor === 'white' ? 'black' : 'white';
              socket.to(roomId).emit('game-over', {
                reason: 'disconnect',
                winner
              });
            }
            
            // Delete room if empty
            if (room.players.size === 0) {
              rooms.delete(roomId);
              console.log(`🗑️ Room ${roomId} deleted (empty)`);
            }
            
            break;
          }
          
          // Also check spectators
          const spectatorIndex = room.spectators.indexOf(socket.id);
          if (spectatorIndex !== -1) {
            room.spectators.splice(spectatorIndex, 1);
          }
        }
      });
    });

    // Cleanup old rooms periodically
    setInterval(() => {
      const now = new Date();
      for (const [roomId, room] of rooms.entries()) {
        const ageInMinutes = (now.getTime() - room.createdAt.getTime()) / (1000 * 60);
        if (ageInMinutes > 60 && room.players.size === 0) { // Delete empty rooms after 1 hour
          rooms.delete(roomId);
          console.log(`🧹 Cleaned up old room ${roomId}`);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    socketRes.socket.server.io = io;
  }

  res.end();
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
} 