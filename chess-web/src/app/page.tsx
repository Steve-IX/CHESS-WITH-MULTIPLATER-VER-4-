'use client';

import { useState } from 'react';
import { ChessGame } from '../components/ChessGame';
import { GameMenu } from '../components/GameMenu';
import { ThemeSelector } from '../components/ThemeSelector';
import { MusicPlayer } from '../components/MusicPlayer';
import { OnlineChess } from '../components/OnlineChess';
import { TitleScreen } from '../components/TitleScreen';
import { GameMode, Difficulty, GameResult, ThemeId, TimerMode } from '../lib/types';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

export default function Home() {
  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const [currentMode, setCurrentMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('classic');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>('none');
  const [customTime, setCustomTime] = useState<number>(15);
  const [isChatOpen, setIsChatOpen] = useState(false);

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
    // Game over is now handled by the ChessGame component's modal
    // This function is kept for compatibility but doesn't need to do anything
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

  const handleTitleScreenComplete = () => {
    setShowTitleScreen(false);
  };

  // Show title screen first
  if (showTitleScreen) {
    return <TitleScreen onStart={handleTitleScreenComplete} />;
  }

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
          onChatToggle={setIsChatOpen}
        />
        <MusicPlayer isChatOpen={isChatOpen} />
      </>
    );
  }

  return (
    <>
      <div className="relative">
        <div className="flex items-center gap-3 absolute top-4 left-4 z-10">
          <button
            onClick={handleBackToMenu}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            ← Back to Menu
          </button>
          <ThemeToggleButton />
        </div>
        <ChessGame
          gameMode={currentMode}
          difficulty={difficulty}
          themeId={selectedTheme}
          timerMode={timerMode}
          customTime={customTime}
          onGameOver={handleGameOver}
          onBackToMenu={handleBackToMenu}
        />
      </div>
      <MusicPlayer />
    </>
  );
}
