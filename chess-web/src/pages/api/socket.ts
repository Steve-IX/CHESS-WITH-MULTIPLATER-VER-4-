import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { GameState, Move, PlayerColor, TimerState, TimerMode } from '@/lib/types';
import { createInitialBoard, makeMove, isInCheck, getAllLegalMoves } from '@/lib/chess';

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
  timerMode: TimerMode;
  customTime?: number;
}

const rooms = new Map<string, Room>();

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

// Helper function to create timer state based on host's settings
function createTimerState(timerMode: string, customTime?: number): TimerState | undefined {
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
    mode: timerMode as TimerMode,
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
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type"]
      },
      allowEIO3: true,
      transports: ['polling', 'websocket'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6,
      connectTimeout: 45000,
      serveClient: false,
      httpCompression: false,
      perMessageDeflate: false,
      upgradeTimeout: 10000,
      allowUpgrades: true
    });

    io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);

      // Handle ping for connection keepalive
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Create room
      socket.on('create-room', (data: { timerMode: TimerMode, customTime?: number } = { timerMode: 'none' }) => {
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
          timerMode: data.timerMode || 'none',
          customTime: data.customTime
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
        
        // Notify other players about the new joiner
        socket.to(roomId).emit('player-joined', { playerColor, playerId: socket.id });
        
        // Also send complete room state to all players
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
        console.log(`📡 Room state updated for ${roomId}:`, roomState);
        
        // Auto-start game if 2 players
        if (room.players.size === 2 && !room.isGameStarted) {
          console.log(`🎮 Starting game in room ${roomId} with 2 players`);
          
          room.gameState = createInitialGameState();
          room.gameState.timer = createTimerState(room.timerMode, room.customTime);
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
          
          // Give a small delay to ensure both players are properly connected
          setTimeout(() => {
            io.to(roomId).emit('game-started', gameState);
            console.log(`🎮 Game started in room ${roomId} with players:`, 
              Array.from(room.players.entries()).map(([color, player]) => `${color}: ${player.id}`));
          }, 100);
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
        room.gameState.timer = createTimerState(room.timerMode, room.customTime);
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
          
          // Handle timer on first move
          if (newGameState.timer && newGameState.moveHistory.length === 1) {
            newGameState.timer.isActive = true;
          }
          
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

        const player = Array.from(room.players.values()).find(p => p.id === socket.id);
        if (!player) return;
        
        socket.to(roomId).emit('draw-offered', { from: player.color });
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
          winner: 'draw'
        });
        
        room.isGameStarted = false;
        console.log(`🤝 Draw accepted in room ${roomId}`);
      });

      // Decline draw
      socket.on('decline-draw', (roomId: string) => {
        const room = rooms.get(roomId);
        if (!room) return;
        const player = Array.from(room.players.values()).find(p => p.id === socket.id);
        if (!player) return;
        socket.to(roomId).emit('draw-declined', { from: player.color });
        console.log(`❌ Draw declined in room ${roomId}`);
      });

      // Offer rematch
      socket.on('offer-rematch', (roomId: string) => {
        const room = rooms.get(roomId);
        if (!room) return;
        const player = Array.from(room.players.values()).find(p => p.id === socket.id);
        if (!player) return;
        socket.to(roomId).emit('rematch-offered', { from: player.color });
        console.log(`🤝 Rematch offered in room ${roomId} by ${player.color}`);
      });

      // Accept rematch
      socket.on('accept-rematch', (roomId: string) => {
        const room = rooms.get(roomId);
        if (!room) return;
        
        // Reset game state
        room.gameState = createInitialGameState();
        room.gameState.timer = createTimerState(room.timerMode, room.customTime);
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
        
        io.to(roomId).emit('game-restarted', gameState);
        console.log(`🔄 Game restarted in room ${roomId}`);
      });

      // Decline rematch
      socket.on('decline-rematch', (roomId: string) => {
        const room = rooms.get(roomId);
        if (!room) return;
        const player = Array.from(room.players.values()).find(p => p.id === socket.id);
        if (!player) return;
        socket.to(roomId).emit('rematch-declined', { from: player.color });
        console.log(`❌ Rematch declined in room ${roomId} by ${player.color}`);
      });

      // Handle timer timeout
      socket.on('timer-timeout', (data: { roomId: string, playerColor: PlayerColor }) => {
        const room = rooms.get(data.roomId);
        
        if (!room || !room.isGameStarted || !room.gameState) {
          return;
        }
        
        // Verify the timeout is for the current player
        if (room.gameState.currentPlayer !== data.playerColor) {
          return;
        }
        
        const winner = data.playerColor === 'white' ? 'black' : 'white';
        
        io.to(data.roomId).emit('game-over', {
          reason: 'timeout',
          winner
        });
        
        room.isGameStarted = false;
        console.log(`⏰ Timer timeout in room ${data.roomId} - ${winner} wins`);
      });

      // Disconnect
      socket.on('disconnect', (reason) => {
        console.log('🔌 Client disconnected:', socket.id, 'reason:', reason);
        
        // Only permanently remove player for clean disconnects, not transport errors
        const isCleanDisconnect = reason === 'client namespace disconnect' || reason === 'server namespace disconnect';
        
        // Remove player from rooms and notify other players
        for (const [roomId, room] of rooms.entries()) {
          // Check if disconnected player was in this room
          let disconnectedPlayerColor: PlayerColor | null = null;
          
          for (const [color, player] of room.players.entries()) {
            if (player.id === socket.id) {
              disconnectedPlayerColor = color;
              
              if (isCleanDisconnect) {
                room.players.delete(color);
                console.log(`👥 Player ${color} (${socket.id}) permanently left room ${roomId}`);
              } else {
                console.log(`⚠️ Player ${color} (${socket.id}) temporarily disconnected from room ${roomId}`);
              }
              break;
            }
          }
          
          if (disconnectedPlayerColor) {
            if (isCleanDisconnect) {
              // Notify remaining players of permanent departure
              socket.to(roomId).emit('player-left', {
                playerColor: disconnectedPlayerColor,
                playerId: socket.id
              });
              
              // If game was in progress, end it
              if (room.isGameStarted) {
                const winner = disconnectedPlayerColor === 'white' ? 'black' : 'white';
                socket.to(roomId).emit('game-over', {
                  reason: 'opponent left',
                  winner
                });
                console.log(`🏁 Game over in room ${roomId} - ${winner} wins by opponent leaving`);
              }
            
            // Delete room if empty
              if (room.players.size === 0) {
              rooms.delete(roomId);
                console.log(`🗑️ Room ${roomId} deleted (empty)`);
            }
            } else {
              // For transport errors, just notify of temporary disconnection
              socket.to(roomId).emit('player-disconnected', {
                playerColor: disconnectedPlayerColor,
                playerId: socket.id
              });
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