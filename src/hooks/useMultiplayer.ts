import { useEffect, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Move, PlayerColor } from '@/lib/types';

interface UseMultiplayerProps {
  onGameStateUpdate: (gameState: GameState) => void;
  onOpponentJoined: () => void;
  onOpponentDisconnected: () => void;
}

interface UseMultiplayerReturn {
  createGame: () => Promise<{ gameId: string; color: PlayerColor }>;
  joinGame: (gameId: string) => Promise<{ color: PlayerColor; error?: string }>;
  makeMove: (move: Move) => void;
  isConnected: boolean;
  gameId: string | null;
  playerColor: PlayerColor | null;
}

let socket: Socket | null = null;

export function useMultiplayer({
  onGameStateUpdate,
  onOpponentJoined,
  onOpponentDisconnected,
}: UseMultiplayerProps): UseMultiplayerReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<PlayerColor | null>(null);

  useEffect(() => {
    const initSocket = async () => {
      await fetch('/api/socket');

      if (!socket) {
        socket = io();

        socket.on('connect', () => {
          console.log('Connected to server');
          setIsConnected(true);
        });

        socket.on('disconnect', () => {
          console.log('Disconnected from server');
          setIsConnected(false);
        });

        socket.on('move-made', ({ gameState, move }) => {
          onGameStateUpdate(gameState);
        });

        socket.on('opponent-joined', () => {
          onOpponentJoined();
        });

        socket.on('opponent-disconnected', () => {
          onOpponentDisconnected();
        });
      }
    };

    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [onGameStateUpdate, onOpponentJoined, onOpponentDisconnected]);

  const createGame = useCallback(async () => {
    return new Promise<{ gameId: string; color: PlayerColor }>((resolve) => {
      if (!socket) throw new Error('Socket not initialized');

      socket.emit('create-game', (response: { gameId: string; color: PlayerColor }) => {
        setGameId(response.gameId);
        setPlayerColor(response.color);
        resolve(response);
      });
    });
  }, []);

  const joinGame = useCallback(async (gameId: string) => {
    return new Promise<{ color: PlayerColor; error?: string }>((resolve) => {
      if (!socket) throw new Error('Socket not initialized');

      socket.emit('join-game', gameId, (response: { color: PlayerColor; error?: string }) => {
        if (!response.error) {
          setGameId(gameId);
          setPlayerColor(response.color);
        }
        resolve(response);
      });
    });
  }, []);

  const makeMove = useCallback((move: Move) => {
    if (!socket || !gameId) return;
    socket.emit('make-move', gameId, move);
  }, [gameId]);

  return {
    createGame,
    joinGame,
    makeMove,
    isConnected,
    gameId,
    playerColor,
  };
} 