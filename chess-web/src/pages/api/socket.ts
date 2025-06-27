import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';

interface Room {
  id: string;
  players: string[];
  gameState?: any;
}

const rooms = new Map<string, Room>();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Type assertion to access the socket server
  const socketRes = res as any;
  
  if (!socketRes.socket.server.io) {
    console.log('Setting up Socket.IO server...');
    
    const io = new ServerIO(socketRes.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('create-room', () => {
        const roomId = generateRoomId();
        const room: Room = {
          id: roomId,
          players: [socket.id]
        };
        
        rooms.set(roomId, room);
        socket.join(roomId);
        
        console.log(`Room ${roomId} created by ${socket.id}`);
        socket.emit('room-created', roomId);
      });

      socket.on('join-room', (roomId: string) => {
        const room = rooms.get(roomId);
        
        if (!room) {
          socket.emit('room-not-found');
          return;
        }
        
        if (room.players.length >= 2) {
          socket.emit('room-full');
          return;
        }
        
        room.players.push(socket.id);
        socket.join(roomId);
        
        console.log(`${socket.id} joined room ${roomId}`);
        socket.emit('room-joined');
        socket.to(roomId).emit('player-joined');
      });

      socket.on('game-message', (roomId: string, message: any) => {
        socket.to(roomId).emit('game-message', message);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Remove player from rooms and notify other players
        for (const [roomId, room] of rooms.entries()) {
          const playerIndex = room.players.indexOf(socket.id);
          if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            socket.to(roomId).emit('player-left');
            
            // Delete room if empty
            if (room.players.length === 0) {
              rooms.delete(roomId);
              console.log(`Room ${roomId} deleted`);
            }
            break;
          }
        }
      });
    });

    socketRes.socket.server.io = io;
  }

  res.end();
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
} 