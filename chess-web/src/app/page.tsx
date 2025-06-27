'use client';

import { useState } from 'react';
import { ChessGame } from '@/components/ChessGame';
import { GameMenu } from '@/components/GameMenu';
import { GameMode, Difficulty, GameResult } from '@/lib/types';
import { chessSocket } from '@/lib/socket';

export default function Home() {
  const [currentMode, setCurrentMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  const handleGameStart = async (mode: GameMode, diff?: Difficulty, roomCode?: string) => {
    setCurrentMode(mode);
    
    if (diff) {
      setDifficulty(diff);
    }

    if (mode === 'online') {
      try {
        await chessSocket.connect();
        
        if (roomCode) {
          // Join existing room
          await chessSocket.joinRoom(roomCode);
          setRoomId(roomCode);
        } else {
          // Create new room
          const newRoomId = await chessSocket.createRoom();
          setRoomId(newRoomId);
        }
      } catch (error) {
        console.error('Failed to setup online game:', error);
        alert('Failed to connect to online game. Please try again.');
        return;
      }
    }

    setGameStarted(true);
  };

  const handleGameOver = (result: GameResult) => {
    let message = '';
    
    if (result.winner === 'draw') {
      message = `Game ended in a ${result.reason}!`;
    } else {
      message = `${result.winner === 'white' ? 'White' : 'Black'} wins by ${result.reason}!`;
    }
    
    setTimeout(() => {
      alert(message);
    }, 500);
  };

  const handleBackToMenu = () => {
    setGameStarted(false);
    setCurrentMode(null);
    setRoomId(null);
    
    if (chessSocket) {
      chessSocket.disconnect();
    }
  };

  if (!gameStarted || !currentMode) {
    return <GameMenu onGameStart={handleGameStart} />;
  }

  return (
    <div className="relative">
      <button
        onClick={handleBackToMenu}
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
      >
        ← Back to Menu
      </button>
      
      <ChessGame
        gameMode={currentMode}
        difficulty={difficulty}
        onGameOver={handleGameOver}
      />
    </div>
  );
}
