import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';

interface Room {
  id: string;
  players: string[];
  gameState?: any;
}

const rooms = new Map<string, Room>();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Type assertion to access the socket server
    const socketRes = res as any;
    
    if (!socketRes.socket.server.io) {
      console.log('Setting up Socket.IO server...');
      
      const httpServer: NetServer = socketRes.socket.server;
      
      const io = new ServerIO(httpServer, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
          origin: process.env.NODE_ENV === 'production' 
            ? [process.env.NEXT_PUBLIC_SITE_URL || '', 'https://chess-with-multiplater-ver-4.vercel.app'] 
            : 'http://localhost:3000',
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        upgradeTimeout: 30000,
        allowUpgrades: true,
        cookie: false,
        serveClient: false
      });

      io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('error', (error) => {
          console.error('Socket error:', error);
        });

        // Handle room creation
        socket.on('create-room', () => {
          try {
            const roomId = generateRoomId();
            const room: Room = {
              id: roomId,
              players: [socket.id]
            };
            
            rooms.set(roomId, room);
            socket.join(roomId);
            
            console.log(`Room ${roomId} created by ${socket.id}`);
            socket.emit('room-created', roomId);
          } catch (error) {
            console.error('Error creating room:', error);
            socket.emit('error', 'Failed to create room');
          }
        });

        // Handle room joining
        socket.on('join-room', (roomId: string) => {
          try {
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
          } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', 'Failed to join room');
          }
        });

        // Handle game messages
        socket.on('game-message', (roomId: string, message: any) => {
          try {
            const room = rooms.get(roomId);
            if (room && room.players.includes(socket.id)) {
              socket.to(roomId).emit('game-message', message);
            }
          } catch (error) {
            console.error('Error sending game message:', error);
            socket.emit('error', 'Failed to send game message');
          }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
          try {
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
          } catch (error) {
            console.error('Error handling disconnect:', error);
          }
        });
      });

      socketRes.socket.server.io = io;
    }

    res.end();
  } catch (error) {
    console.error('Socket.IO server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
} 