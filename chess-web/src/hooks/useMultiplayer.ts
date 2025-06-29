import { useState, useEffect, useCallback } from 'react';
import { chessSocket } from '@/lib/socket';
import { Move, GameState } from '@/lib/types';

export function useMultiplayer() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);

  const connect = useCallback(async () => {
    try {
      await chessSocket.connect();
      setIsConnected(true);
      
      chessSocket.onPlayerJoined(() => {
        setOpponentConnected(true);
        setIsWaitingForOpponent(false);
      });

      chessSocket.onPlayerLeft(() => {
        setOpponentConnected(false);
      });

    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }, []);

  const createRoom = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Not connected to server');
    }

    try {
      const roomData = await chessSocket.createRoom();
      setRoomId(roomData.roomId);
      setIsHost(true);
      setIsWaitingForOpponent(true);
      return roomData.roomId;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }, [isConnected]);

  const joinRoom = useCallback(async (roomCode: string) => {
    if (!isConnected) {
      throw new Error('Not connected to server');
    }

    try {
      const roomData = await chessSocket.joinRoom(roomCode);
      setRoomId(roomData.roomId);
      setIsHost(false);
      setOpponentConnected(true);
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }, [isConnected]);

  const sendMove = useCallback((move: Move) => {
    if (roomId) {
      chessSocket.makeMove(move);
    }
  }, [roomId]);

  const onMoveReceived = useCallback((callback: (data: { move: Move, gameState: GameState }) => void) => {
    chessSocket.onMoveMade(callback);
  }, []);

  const disconnect = useCallback(() => {
    chessSocket.disconnect();
    setIsConnected(false);
    setRoomId(null);
    setIsHost(false);
    setIsWaitingForOpponent(false);
    setOpponentConnected(false);
  }, []);

  return {
    isConnected,
    roomId,
    isHost,
    isWaitingForOpponent,
    opponentConnected,
    connect,
    createRoom,
    joinRoom,
    sendMove,
    onMoveReceived,
    disconnect,
  };
} 