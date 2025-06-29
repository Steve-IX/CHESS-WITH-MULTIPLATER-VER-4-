'use client';

import { useState } from 'react';
import { ChessGame } from '@/components/ChessGame';
import { GameMenu } from '@/components/GameMenu';
import { ThemeSelector } from '@/components/ThemeSelector';
import { MusicPlayer } from '@/components/MusicPlayer';
import { GameMode, Difficulty, GameResult, ThemeId, TimerMode } from '@/lib/types';
import { chessSocket } from '@/lib/socket';

export default function Home() {
  const [currentMode, setCurrentMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('classic');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>('none');
  const [customTime, setCustomTime] = useState<number>(15);

  const handleGameStart = async (
    mode: GameMode, 
    diff?: Difficulty, 
    roomCode?: string, 
    themeId?: ThemeId, 
    timer?: TimerMode, 
    customTimerValue?: number
  ) => {
    setCurrentMode(mode);
    
    if (diff) {
      setDifficulty(diff);
    }

    if (themeId) {
      setSelectedTheme(themeId);
    }

    if (timer) {
      setTimerMode(timer);
    }

    if (customTimerValue) {
      setCustomTime(customTimerValue);
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
    setTimerMode('none');
    
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
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <button
          onClick={handleBackToMenu}
          className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 px-3 py-2 sm:px-4 sm:py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm sm:text-base"
        >
          ← Back
        </button>
        
        <div className="pt-16 sm:pt-20 pb-4 px-2 sm:px-4">
          <ChessGame
            gameMode={currentMode}
            difficulty={difficulty}
            themeId={selectedTheme}
            timerMode={timerMode}
            customTime={customTime}
            onGameOver={handleGameOver}
          />
        </div>
      </div>
      <MusicPlayer />
    </>
  );
}
