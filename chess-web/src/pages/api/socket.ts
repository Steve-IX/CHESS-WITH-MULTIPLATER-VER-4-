import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { GameState, Move, PlayerColor } from '@/lib/types';
import { createInitialBoard, makeMove, isInCheck, getAllLegalMoves } from '@/lib/chess';

interface Player {
  id: string;
  color: PlayerColor;
  isReady: boolean;
  lastPing: number;
  connectionState: 'connected' | 'disconnected' | 'reconnecting';
}

interface Room {
  id: string;
  host: string;
  players: Map<PlayerColor, Player>;
  spectators: string[];
  gameState: GameState | null;
  isGameStarted: boolean;
  createdAt: Date;
  lastActivity: number;
  isPaused: boolean;
}

const rooms = new Map<string, Room>();
const PING_INTERVAL = 10000; // 10 seconds
const PING_TIMEOUT = 15000;  // 15 seconds
const ROOM_CLEANUP_INTERVAL = 300000; // 5 minutes
const INACTIVE_ROOM_TIMEOUT = 3600000; // 1 hour

// Initialize a proper chess game state
function createInitialGameState(): GameState {
  return {
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
    timer: undefined
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const socketRes = res as any;
  
  if (!socketRes.socket.server.io) {
    console.log('🚀 Setting up Chess Socket.IO server...');
    
    const io = new ServerIO(socketRes.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type"]
      },
      allowEIO3: true,
      transports: ['websocket', 'polling'],
      pingTimeout: PING_TIMEOUT,
      pingInterval: PING_INTERVAL,
      maxHttpBufferSize: 1e6,
      connectTimeout: 45000,
      serveClient: false,
      httpCompression: true,
      perMessageDeflate: {
        threshold: 1024
      },
      upgradeTimeout: 10000,
      allowUpgrades: true
    });

    // Set up room cleanup interval
    setInterval(() => {
      const now = Date.now();
      for (const [roomId, room] of rooms.entries()) {
        if (now - room.lastActivity > INACTIVE_ROOM_TIMEOUT) {
          console.log(`🧹 Cleaning up inactive room ${roomId}`);
          io.to(roomId).emit('room-closed', { reason: 'inactivity' });
          rooms.delete(roomId);
        }
      }
    }, ROOM_CLEANUP_INTERVAL);

    io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);
      let currentRoom: Room | null = null;

      // Handle ping for connection keepalive
      socket.on('ping', () => {
        if (currentRoom) {
          for (const [color, player] of currentRoom.players.entries()) {
            if (player.id === socket.id) {
              player.lastPing = Date.now();
              player.connectionState = 'connected';
              break;
            }
          }
          currentRoom.lastActivity = Date.now();
        }
        socket.emit('pong');
      });

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
          createdAt: new Date(),
          lastActivity: Date.now(),
          isPaused: false
        };
        
        room.players.set(playerColor, {
          id: socket.id,
          color: playerColor,
          isReady: true,
          lastPing: Date.now(),
          connectionState: 'connected'
        });
        
        rooms.set(roomId, room);
        socket.join(roomId);
        currentRoom = room;
        
        console.log(`🏠 Room ${roomId} created by ${socket.id} (${playerColor})`);
        socket.emit('room-created', { roomId, playerColor });
      });

      // Join room with retry mechanism
      socket.on('join-room', async (roomId: string) => {
        const room = rooms.get(roomId);
        
        if (!room) {
          console.log(`❌ Room ${roomId} not found`);
          socket.emit('room-not-found');
          return;
        }
        
        // Check if room is full (2 players max)
        if (room.players.size >= 2) {
          // Check if any player is disconnected and handle reconnection
          let canReconnect = false;
          let disconnectedColor: PlayerColor | null = null;
          
          for (const [color, player] of room.players.entries()) {
            if (player.connectionState === 'disconnected' && 
                Date.now() - player.lastPing > PING_TIMEOUT) {
              disconnectedColor = color;
              canReconnect = true;
              break;
            }
          }
          
          if (!canReconnect) {
            console.log(`❌ Room ${roomId} is full`);
            socket.emit('room-full');
            return;
          }
          
          // Handle reconnection
          if (disconnectedColor) {
            const player = room.players.get(disconnectedColor)!;
            player.id = socket.id;
            player.connectionState = 'connected';
            player.lastPing = Date.now();
            
            socket.join(roomId);
            currentRoom = room;
            
            console.log(`🔄 ${socket.id} reconnected to room ${roomId} as ${disconnectedColor}`);
            socket.emit('room-joined', { 
              roomId, 
              playerColor: disconnectedColor,
              gameState: {
                roomId,
                players: Object.fromEntries(
                  Array.from(room.players.entries()).map(([color, player]) => [color, player.id])
                ),
                gameState: room.gameState,
                isGameStarted: room.isGameStarted,
                spectators: room.spectators
              }
            });
            
            // Notify other players about the reconnection
            socket.to(roomId).emit('player-reconnected', { 
              playerColor: disconnectedColor, 
              playerId: socket.id 
            });
            
            return;
          }
        }
        
        // Assign player color (black if white is taken)
        const playerColor: PlayerColor = room.players.has('white') ? 'black' : 'white';
        
        room.players.set(playerColor, {
          id: socket.id,
          color: playerColor,
          isReady: true,
          lastPing: Date.now(),
          connectionState: 'connected'
        });
        
        socket.join(roomId);
        currentRoom = room;
        room.lastActivity = Date.now();
        
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
        
        // Notify other players about the new joiner
        socket.to(roomId).emit('player-joined', { playerColor, playerId: socket.id });
        
        // Send complete room state to all players
        const roomState = {
          roomId,
          players: Object.fromEntries(
            Array.from(room.players.entries()).map(([color, player]) => [color, player.id])
          ),
          gameState: room.gameState,
          isGameStarted: room.isGameStarted,
          spectators: room.spectators
        };
        
        io.to(roomId).emit('room-updated', roomState);
        
        // Auto-start game if 2 players with a proper delay
        if (room.players.size === 2 && !room.isGameStarted) {
          console.log(`🎮 Starting game in room ${roomId} with 2 players`);
          
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
          
          // Give a proper delay to ensure both players are ready
          setTimeout(() => {
            if (room.players.size === 2) {  // Double check players are still there
              io.to(roomId).emit('game-started', gameState);
              console.log(`🎮 Game started in room ${roomId} with players:`, 
                Array.from(room.players.entries()).map(([color, player]) => `${color}: ${player.id}`));
            }
          }, 1000);
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
        
        if (currentRoom) {
          for (const [color, player] of currentRoom.players.entries()) {
            if (player.id === socket.id) {
              player.connectionState = 'disconnected';
              player.lastPing = Date.now();
              
              // Notify other players
              socket.to(currentRoom.id).emit('player-disconnected', {
                playerColor: color,
                playerId: socket.id
              });
              
              // Pause the game if it was in progress
              if (currentRoom.isGameStarted && !currentRoom.isPaused) {
                currentRoom.isPaused = true;
                io.to(currentRoom.id).emit('game-paused', {
                  reason: 'player_disconnected',
                  playerColor: color
                });
              }
              
              break;
            }
          }
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
        
        try {
          // Apply move using proper chess logic
          const newGameState = makeMove(room.gameState, data.move);
          
          // Check for game over conditions
          const opponent = newGameState.currentPlayer;
          const allLegalMoves = getAllLegalMoves(newGameState, opponent);
          
          if (allLegalMoves.length === 0) {
            if (isInCheck(newGameState, opponent)) {
              newGameState.isCheckmate = true;
              // Game over - checkmate
              io.to(data.roomId).emit('game-over', {
                reason: 'checkmate',
                winner: player.color
              });
              room.isGameStarted = false;
              console.log(`🏁 Game over in room ${data.roomId} - ${player.color} wins by checkmate`);
            } else {
              newGameState.isStalemate = true;
              // Game over - stalemate
              io.to(data.roomId).emit('game-over', {
                reason: 'stalemate',
                winner: 'draw'
              });
              room.isGameStarted = false;
              console.log(`🏁 Game over in room ${data.roomId} - stalemate`);
            }
          } else {
            // Check if opponent is in check
            newGameState.isCheck = isInCheck(newGameState, opponent);
          }
          
          // Update room state
          room.gameState = newGameState;
          
          // Broadcast move to all players in room (including the sender for confirmation)
          io.to(data.roomId).emit('move-made', {
            move: data.move,
            gameState: newGameState
          });
          
          console.log(`♟️ Move made in room ${data.roomId}:`, data.move, `New turn: ${newGameState.currentPlayer}`);
          
        } catch (error) {
          console.error('Invalid move:', error);
          socket.emit('error', 'Invalid move');
        }
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
    });

    socketRes.socket.server.io = io;
  }
  res.end();
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
} 