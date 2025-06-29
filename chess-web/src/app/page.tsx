'use client';

import { useState } from 'react';
import { ChessGame } from '@/components/ChessGame';
import { GameMenu } from '@/components/GameMenu';
import { ThemeSelector } from '@/components/ThemeSelector';
import { MusicPlayer } from '@/components/MusicPlayer';
import { OnlineChess } from '@/components/OnlineChess';
import { GameMode, Difficulty, GameResult, ThemeId, TimerMode } from '@/lib/types';

export default function Home() {
  const [currentMode, setCurrentMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('classic');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>('none');
  const [customTime, setCustomTime] = useState<number>(15);

  const handleGameStart = (
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

  if (currentMode === 'online') {
    return (
      <>
        <OnlineChess
          onBack={handleBackToMenu}
          selectedTheme={selectedTheme}
          timerMode={timerMode}
          customTime={customTime}
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
          timerMode={timerMode}
          customTime={customTime}
          onGameOver={handleGameOver}
        />
      </div>
      <MusicPlayer />
    </>
  );
}
