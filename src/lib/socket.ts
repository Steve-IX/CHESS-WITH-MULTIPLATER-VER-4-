import { Server as NetServer } from 'http';
import { Server as ServerIO } from 'socket.io';
import { NextApiResponse } from 'next';
import { Position, GameState, Move } from './types';

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: ServerIO;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

interface GameRoom {
  id: string;
  players: {
    white?: string;
    black?: string;
  };
  spectators: string[];
  gameState: GameState;
}

const games = new Map<string, GameRoom>();

export function initSocket(res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    const io = new ServerIO(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Create or join game room
      socket.on('create-game', (callback) => {
        const gameId = generateGameId();
        games.set(gameId, {
          id: gameId,
          players: { white: socket.id },
          spectators: [],
          gameState: createInitialGameState(),
        });
        socket.join(gameId);
        callback({ gameId, color: 'white' });
      });

      socket.on('join-game', (gameId: string, callback) => {
        const game = games.get(gameId);
        if (!game) {
          callback({ error: 'Game not found' });
          return;
        }

        if (!game.players.black) {
          game.players.black = socket.id;
          socket.join(gameId);
          callback({ color: 'black' });
          io.to(gameId).emit('opponent-joined', { gameId });
        } else {
          game.spectators.push(socket.id);
          socket.join(gameId);
          callback({ color: 'spectator' });
        }
      });

      // Handle moves
      socket.on('make-move', (gameId: string, move: Move) => {
        const game = games.get(gameId);
        if (!game) return;

        const isWhite = game.players.white === socket.id;
        const isBlack = game.players.black === socket.id;
        const playerColor = isWhite ? 'white' : isBlack ? 'black' : null;

        if (!playerColor || game.gameState.currentPlayer !== playerColor) return;

        // Update game state
        const newState = applyMove(game.gameState, move);
        game.gameState = newState;

        // Broadcast the move to all players in the room
        io.to(gameId).emit('move-made', { gameState: newState, move });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        for (const [gameId, game] of games.entries()) {
          if (game.players.white === socket.id || game.players.black === socket.id) {
            io.to(gameId).emit('opponent-disconnected');
            games.delete(gameId);
          }
        }
      });
    });
  }
  return res.socket.server.io;
}

function generateGameId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createInitialGameState(): GameState {
  return {
    board: initializeBoard(),
    currentPlayer: 'white',
    moveHistory: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    capturedPieces: { white: [], black: [] },
  };
}

function initializeBoard() {
  // Initialize the chess board with starting positions
  // This will be implemented in the chess logic module
  return [];
}

function applyMove(gameState: GameState, move: Move): GameState {
  // Apply the move and return the new game state
  // This will be implemented in the chess logic module
  return gameState;
} 