'use client';

import { useState } from 'react';
import { ChessGame } from '@/components/ChessGame';
import { GameMenu } from '@/components/GameMenu';
import { ThemeSelector } from '@/components/ThemeSelector';
import { MusicPlayer } from '@/components/MusicPlayer';
import { GameMode, Difficulty, GameResult, ThemeId } from '@/lib/types';
import { useTheme } from '@/lib/ThemeContext';
import { chessSocket } from '@/lib/socket';

export default function Home() {
  const [currentMode, setCurrentMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('classic');
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  const handleGameStart = async (mode: GameMode, diff?: Difficulty, roomCode?: string, themeId?: ThemeId) => {
    setCurrentMode(mode);
    
    if (diff) {
      setDifficulty(diff);
    }

    if (themeId) {
      setSelectedTheme(themeId);
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
    setShowThemeSelector(false);
    
    if (chessSocket) {
      chessSocket.disconnect();
    }
  };

  const handleThemeSelect = () => {
    setShowThemeSelector(true);
  };

  const handleThemeChange = (themeId: ThemeId) => {
    setSelectedTheme(themeId);
  };

  const handleBackFromThemes = () => {
    setShowThemeSelector(false);
  };

  if (showThemeSelector) {
    return (
      <>
        <ThemeSelector 
          selectedTheme={selectedTheme}
          onThemeSelect={handleThemeChange}
          onBack={handleBackFromThemes}
        />
        <MusicPlayer />
      </>
    );
  }

  if (!gameStarted || !currentMode) {
    return (
      <>
        <GameMenu 
          onGameStart={handleGameStart}
          onThemeSelect={handleThemeSelect}
          selectedTheme={selectedTheme}
        />
        <MusicPlayer />
      </>
    );
  }

  return (
    <>
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
          themeId={selectedTheme}
          onGameOver={handleGameOver}
        />
      </div>
      <MusicPlayer />
    </>
  );
}
