import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { GameState, Move, PlayerColor } from '@/lib/types';
import { createInitialBoard, makeMove, isInCheck, getAllLegalMoves } from '@/lib/chess';

interface Player {
  id: string;
  color: PlayerColor;
  isReady: boolean;
  isConnected: boolean;
  lastSeen: Date;
  joinedAt: Date;
}

interface Room {
  id: string;
  host: string;
  players: Map<PlayerColor, Player>;
  spectators: string[];
  gameState: GameState | null;
  isGameStarted: boolean;
  createdAt: Date;
  lastActivity: Date;
}

const rooms = new Map<string, Room>();
const playerRooms = new Map<string, string>(); // Map player ID to room ID
const disconnectedPlayers = new Map<string, { playerId: string, roomId: string, color: PlayerColor, disconnectedAt: Date }>();

// Cleanup rooms periodically (like Java connection timeout handling)
setInterval(() => {
  const now = new Date();
  const roomsToDelete: string[] = [];
  
  rooms.forEach((room, roomId) => {
    // Remove rooms that have been inactive for more than 30 minutes
    if (now.getTime() - room.lastActivity.getTime() > 30 * 60 * 1000) {
      console.log(`🧹 Cleaning up inactive room: ${roomId}`);
      roomsToDelete.push(roomId);
    }
    
    // Mark players as disconnected if not seen for more than 1 minute
    room.players.forEach((player, color) => {
      if (now.getTime() - player.lastSeen.getTime() > 60 * 1000) {
        if (player.isConnected) {
          console.log(`⚠️ Marking player ${player.id} (${color}) as disconnected in room ${roomId}`);
          player.isConnected = false;
        }
      }
    });
  });
  
  roomsToDelete.forEach(roomId => {
    const room = rooms.get(roomId);
    if (room) {
      // Remove player mappings
      room.players.forEach(player => {
        playerRooms.delete(player.id);
        disconnectedPlayers.delete(player.id);
      });
      rooms.delete(roomId);
    }
  });
  
  // Clean up old disconnected players (older than 10 minutes)
  disconnectedPlayers.forEach((data, playerId) => {
    if (now.getTime() - data.disconnectedAt.getTime() > 10 * 60 * 1000) {
      disconnectedPlayers.delete(playerId);
    }
  });
}, 60 * 1000); // Run every minute

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

// Enhanced room state broadcaster
function broadcastRoomState(io: ServerIO, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const roomState = {
    roomId,
    players: Object.fromEntries(
      Array.from(room.players.entries()).map(([color, player]) => [color, player.id])
    ),
    gameState: room.gameState,
    isGameStarted: room.isGameStarted,
    spectators: room.spectators,
    connectedPlayers: Object.fromEntries(
      Array.from(room.players.entries()).map(([color, player]) => [color, player.isConnected])
    )
  };
  
  io.to(roomId).emit('room-updated', roomState);
  console.log(`📡 Broadcasted room state for ${roomId}:`, {
    players: roomState.players,
    connected: roomState.connectedPlayers,
    gameStarted: roomState.isGameStarted
  });
}

// Update player activity (like heartbeat in Java)
function updatePlayerActivity(playerId: string) {
  const roomId = playerRooms.get(playerId);
  if (!roomId) return;
  
  const room = rooms.get(roomId);
  if (!room) return;
  
  // Find and update player
  room.players.forEach(player => {
    if (player.id === playerId) {
      player.lastSeen = new Date();
      player.isConnected = true;
    }
  });
  
  room.lastActivity = new Date();
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Type assertion to access the socket server
  const socketRes = res as any;
  
  if (!socketRes.socket.server.io) {
    console.log('🚀 Setting up Enhanced Chess Socket.IO server...');
    
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
      transports: ['websocket', 'polling'], // Prefer websocket like Java TCP
      pingTimeout: 45000, // Longer timeout for stability
      pingInterval: 20000, // More frequent pings
      maxHttpBufferSize: 1e6,
      connectTimeout: 30000,
      serveClient: false,
      httpCompression: true,
      perMessageDeflate: {
        threshold: 1024,
      },
      upgradeTimeout: 10000,
      allowUpgrades: true,
      cookie: false,
      // Additional stability options
      destroyUpgrade: false,
      destroyUpgradeTimeout: 1000
    });

    io.on('connection', (socket) => {
      console.log('🔌 Client connected:', socket.id);
      
      // Update activity on any message (like Java heartbeat)
      const originalEmit = socket.emit;
      socket.emit = function(...args) {
        updatePlayerActivity(socket.id);
        return originalEmit.apply(this, args);
      };

      // Handle ping/pong for connection keepalive (Java-style heartbeat)
      socket.on('ping', () => {
        updatePlayerActivity(socket.id);
        socket.emit('pong');
      });

      // Enhanced disconnect handling
      socket.on('disconnect', (reason) => {
        console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason);
        
        const roomId = playerRooms.get(socket.id);
        if (roomId) {
          const room = rooms.get(roomId);
          if (room) {
            // Find the player's color
            let playerColor: PlayerColor | null = null;
            room.players.forEach((player, color) => {
              if (player.id === socket.id) {
                playerColor = color;
                player.isConnected = false;
                player.lastSeen = new Date();
              }
            });
            
            if (playerColor) {
              // Store disconnected player info for potential rejoin
              disconnectedPlayers.set(socket.id, {
                playerId: socket.id,
                roomId,
                color: playerColor,
                disconnectedAt: new Date()
              });
              
              // Notify other players
              socket.to(roomId).emit('player-disconnected', { 
                playerColor, 
                playerId: socket.id 
              });
              
              // Update room state
              broadcastRoomState(io, roomId);
              
              console.log(`⚠️ Player ${socket.id} (${playerColor}) disconnected from room ${roomId}`);
            }
          }
        }
      });

      // Create room with enhanced error handling
      socket.on('create-room', () => {
        try {
          // Check if player is already in a room
          const existingRoomId = playerRooms.get(socket.id);
          if (existingRoomId && rooms.has(existingRoomId)) {
            socket.emit('error', 'Already in a room. Leave current room first.');
            return;
          }
          
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
            lastActivity: new Date()
          };
          
          room.players.set(playerColor, {
            id: socket.id,
            color: playerColor,
            isReady: true,
            isConnected: true,
            lastSeen: new Date(),
            joinedAt: new Date()
          });
          
          rooms.set(roomId, room);
          playerRooms.set(socket.id, roomId);
          socket.join(roomId);
          
          console.log(`🏠 Room ${roomId} created by ${socket.id} (${playerColor})`);
          socket.emit('room-created', { roomId, playerColor });
          
          // Broadcast initial room state
          setTimeout(() => broadcastRoomState(io, roomId), 100);
          
        } catch (error) {
          console.error('Error creating room:', error);
          socket.emit('error', 'Failed to create room');
        }
      });

      // Enhanced join room with better synchronization
      socket.on('join-room', (roomId: string) => {
        try {
          // Validate room ID
          if (!roomId || typeof roomId !== 'string' || roomId.length !== 6) {
            socket.emit('room-not-found');
            return;
          }
          
          roomId = roomId.toUpperCase();
          const room = rooms.get(roomId);
          
          if (!room) {
            console.log(`❌ Room ${roomId} not found`);
            socket.emit('room-not-found');
            return;
          }
          
          // Check if player is already in this room (reconnection)
          let existingPlayer: Player | null = null;
          let existingColor: PlayerColor | null = null;
          
          room.players.forEach((player, color) => {
            if (player.id === socket.id) {
              existingPlayer = player;
              existingColor = color;
            }
          });
          
          if (existingPlayer && existingColor) {
            // Player is rejoining
            console.log(`🔄 Player ${socket.id} rejoining room ${roomId} as ${existingColor}`);
            existingPlayer.isConnected = true;
            existingPlayer.lastSeen = new Date();
            
            socket.join(roomId);
            playerRooms.set(socket.id, roomId);
            
            socket.emit('room-joined', { 
              roomId, 
              playerColor: existingColor,
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
            
            socket.to(roomId).emit('player-joined', { playerColor: existingColor, playerId: socket.id });
            broadcastRoomState(io, roomId);
            return;
          }
          
          // Check if room is full (2 players max)
          const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
          if (connectedPlayers.length >= 2) {
            console.log(`❌ Room ${roomId} is full (${connectedPlayers.length} connected players)`);
            socket.emit('room-full');
            return;
          }
          
          // Assign player color
          const takenColors = new Set(Array.from(room.players.keys()));
          const availableColors: PlayerColor[] = ['white', 'black'].filter(color => !takenColors.has(color as PlayerColor));
          
          if (availableColors.length === 0) {
            console.log(`❌ Room ${roomId} has no available colors`);
            socket.emit('room-full');
            return;
          }
          
          const playerColor = availableColors[0];
          
          // Add player to room
          const newPlayer: Player = {
            id: socket.id,
            color: playerColor,
            isReady: true,
            isConnected: true,
            lastSeen: new Date(),
            joinedAt: new Date()
          };
          
          room.players.set(playerColor, newPlayer);
          playerRooms.set(socket.id, roomId);
          socket.join(roomId);
          room.lastActivity = new Date();
          
          console.log(`👥 ${socket.id} joined room ${roomId} as ${playerColor} (${room.players.size} total players)`);
          
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
          
          // Broadcast updated room state
          broadcastRoomState(io, roomId);
          
          // Auto-start game if 2 players are connected and game hasn't started
          const currentConnectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
          if (currentConnectedPlayers.length === 2 && !room.isGameStarted) {
            console.log(`🎮 Auto-starting game in room ${roomId} with 2 connected players`);
            
            // Wait a moment to ensure both players are fully synchronized
            setTimeout(() => {
              const updatedRoom = rooms.get(roomId);
              if (updatedRoom && !updatedRoom.isGameStarted) {
                const stillConnected = Array.from(updatedRoom.players.values()).filter(p => p.isConnected);
                
                if (stillConnected.length === 2) {
                  updatedRoom.gameState = createInitialGameState();
                  updatedRoom.isGameStarted = true;
                  updatedRoom.lastActivity = new Date();
                  
                  const gameState = {
                    roomId,
                    players: Object.fromEntries(
                      Array.from(updatedRoom.players.entries()).map(([color, player]) => [color, player.id])
                    ),
                    gameState: updatedRoom.gameState,
                    isGameStarted: true,
                    spectators: updatedRoom.spectators
                  };
                  
                  io.to(roomId).emit('game-started', gameState);
                  broadcastRoomState(io, roomId);
                  
                  console.log(`🎮 Game started in room ${roomId} with players:`, 
                    Array.from(updatedRoom.players.entries()).map(([color, player]) => `${color}: ${player.id} (connected: ${player.isConnected})`));
                } else {
                  console.log(`⚠️ Cannot start game in room ${roomId}: only ${stillConnected.length} players connected`);
                }
              }
            }, 1000); // 1 second delay for better synchronization
          }
          
        } catch (error) {
          console.error('Error joining room:', error);
          socket.emit('error', 'Failed to join room');
        }
      });

      // Handle room rejoining after disconnect
      socket.on('rejoin-room', (roomId: string) => {
        try {
          const disconnectedData = disconnectedPlayers.get(socket.id);
          if (!disconnectedData || disconnectedData.roomId !== roomId) {
            socket.emit('room-not-found');
            return;
          }
          
          const room = rooms.get(roomId);
          if (!room) {
            socket.emit('room-not-found');
            return;
          }
          
          const player = room.players.get(disconnectedData.color);
          if (!player || player.id !== socket.id) {
            socket.emit('room-not-found');
            return;
          }
          
          // Reconnect the player
          player.isConnected = true;
          player.lastSeen = new Date();
          socket.join(roomId);
          playerRooms.set(socket.id, roomId);
          disconnectedPlayers.delete(socket.id);
          
          console.log(`🔄 Player ${socket.id} successfully rejoined room ${roomId} as ${disconnectedData.color}`);
          
          socket.emit('room-joined', { 
            roomId, 
            playerColor: disconnectedData.color,
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
          
          socket.to(roomId).emit('player-joined', { 
            playerColor: disconnectedData.color, 
            playerId: socket.id 
          });
          
          broadcastRoomState(io, roomId);
          
        } catch (error) {
          console.error('Error rejoining room:', error);
          socket.emit('error', 'Failed to rejoin room');
        }
      });

      // Start game (host only)
      socket.on('start-game', (roomId: string) => {
        try {
          const room = rooms.get(roomId);
          
          if (!room || room.host !== socket.id) {
            socket.emit('error', 'Not authorized to start game');
            return;
          }
          
          if (room.isGameStarted) {
            socket.emit('error', 'Game already started');
            return;
          }
          
          const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
          if (connectedPlayers.length < 2) {
            socket.emit('error', 'Need 2 players to start game');
            return;
          }
          
          room.gameState = createInitialGameState();
          room.isGameStarted = true;
          room.lastActivity = new Date();
          
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
          broadcastRoomState(io, roomId);
          
          console.log(`🎮 Host ${socket.id} started game in room ${roomId}`);
          
        } catch (error) {
          console.error('Error starting game:', error);
          socket.emit('error', 'Failed to start game');
        }
      });

      // Handle moves with enhanced validation
      socket.on('make-move', (data: { roomId: string, move: Move }) => {
        try {
          updatePlayerActivity(socket.id);
          
          const room = rooms.get(data.roomId);
          if (!room || !room.gameState || !room.isGameStarted) {
            socket.emit('error', 'Game not found or not started');
            return;
          }
          
          // Find player color
          let playerColor: PlayerColor | null = null;
          room.players.forEach((player, color) => {
            if (player.id === socket.id && player.isConnected) {
              playerColor = color;
            }
          });
          
          if (!playerColor) {
            socket.emit('error', 'Player not found in game');
            return;
          }
          
          // Validate it's the player's turn
          if (room.gameState.currentPlayer !== playerColor) {
            socket.emit('error', 'Not your turn');
            return;
          }
          
          // Make the move
          const newGameState = makeMove(room.gameState, data.move);
          room.gameState = newGameState;
          room.lastActivity = new Date();
          
          // Broadcast the move to all players
          io.to(data.roomId).emit('move-made', {
            move: data.move,
            gameState: newGameState
          });
          
          console.log(`♟️ Move made by ${socket.id} (${playerColor}) in room ${data.roomId}:`, 
            `${data.move.from.x},${data.move.from.y} → ${data.move.to.x},${data.move.to.y}`);
          
          // Check for game over
          if (newGameState.isCheckmate) {
            const winner = newGameState.currentPlayer === 'white' ? 'black' : 'white';
            io.to(data.roomId).emit('game-over', { 
              reason: 'checkmate', 
              winner 
            });
            console.log(`🏁 Game over in room ${data.roomId}: ${winner} wins by checkmate`);
          } else if (newGameState.isStalemate) {
            io.to(data.roomId).emit('game-over', { 
              reason: 'stalemate', 
              winner: 'draw' 
            });
            console.log(`🏁 Game over in room ${data.roomId}: stalemate`);
          }
          
        } catch (error) {
          console.error('Error making move:', error);
          socket.emit('error', 'Failed to make move');
        }
      });

      // Chat messages
      socket.on('chat-message', (data: { roomId: string, message: string }) => {
        try {
          updatePlayerActivity(socket.id);
          
          const room = rooms.get(data.roomId);
          if (!room) {
            socket.emit('error', 'Room not found');
            return;
          }
          
          // Find player color
          let playerColor: PlayerColor | null = null;
          room.players.forEach((player, color) => {
            if (player.id === socket.id) {
              playerColor = color;
            }
          });
          
          if (!playerColor) {
            socket.emit('error', 'Player not found in room');
            return;
          }
          
          const message = data.message.trim();
          if (message.length === 0 || message.length > 500) {
            socket.emit('error', 'Invalid message length');
            return;
          }
          
          room.lastActivity = new Date();
          
          // Broadcast chat message
          io.to(data.roomId).emit('chat-message', {
            playerId: socket.id,
            playerColor,
            message
          });
          
          console.log(`💬 Chat message from ${socket.id} (${playerColor}) in room ${data.roomId}: ${message}`);
          
        } catch (error) {
          console.error('Error sending chat message:', error);
          socket.emit('error', 'Failed to send message');
        }
      });

      // Game actions
      socket.on('resign', (roomId: string) => {
        try {
          updatePlayerActivity(socket.id);
          
          const room = rooms.get(roomId);
          if (!room || !room.isGameStarted) return;
          
          let playerColor: PlayerColor | null = null;
          room.players.forEach((player, color) => {
            if (player.id === socket.id) {
              playerColor = color;
            }
          });
          
          if (!playerColor) return;
          
          const winner = playerColor === 'white' ? 'black' : 'white';
          room.lastActivity = new Date();
          
          io.to(roomId).emit('game-over', { 
            reason: 'resignation', 
            winner 
          });
          
          console.log(`🏳️ ${socket.id} (${playerColor}) resigned in room ${roomId}`);
          
        } catch (error) {
          console.error('Error handling resignation:', error);
        }
      });

      // Draw offers and responses
      socket.on('offer-draw', (roomId: string) => {
        try {
          updatePlayerActivity(socket.id);
          
          const room = rooms.get(roomId);
          if (!room || !room.isGameStarted) return;
          
          let playerColor: PlayerColor | null = null;
          room.players.forEach((player, color) => {
            if (player.id === socket.id) {
              playerColor = color;
            }
          });
          
          if (!playerColor) return;
          
          room.lastActivity = new Date();
          
          socket.to(roomId).emit('draw-offered', { 
            playerColor 
          });
          
          console.log(`🤝 Draw offered by ${socket.id} (${playerColor}) in room ${roomId}`);
          
        } catch (error) {
          console.error('Error offering draw:', error);
        }
      });

      socket.on('accept-draw', (roomId: string) => {
        try {
          updatePlayerActivity(socket.id);
          
          const room = rooms.get(roomId);
          if (!room || !room.isGameStarted) return;
          
          room.lastActivity = new Date();
          
          io.to(roomId).emit('game-over', { 
            reason: 'draw-agreement', 
            winner: 'draw' 
          });
          
          console.log(`🤝 Draw accepted by ${socket.id} in room ${roomId}`);
          
        } catch (error) {
          console.error('Error accepting draw:', error);
        }
      });

      socket.on('decline-draw', (roomId: string) => {
        try {
          updatePlayerActivity(socket.id);
          
          const room = rooms.get(roomId);
          if (!room || !room.isGameStarted) return;
          
          room.lastActivity = new Date();
          
          socket.to(roomId).emit('draw-declined');
          
          console.log(`❌ Draw declined by ${socket.id} in room ${roomId}`);
          
        } catch (error) {
          console.error('Error declining draw:', error);
        }
      });
    });

    socketRes.socket.server.io = io;
    console.log('✅ Enhanced Chess Socket.IO server setup complete');
  }

  res.end();
}

// Enhanced room ID generation
function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // Generate 6 character room ID
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Ensure uniqueness
  if (rooms.has(result)) {
    return generateRoomId(); // Recursive call if collision
  }
  
  return result;
} 