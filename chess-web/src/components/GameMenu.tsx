'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameMode, Difficulty, ThemeId, TimerMode } from '@/lib/types';
import { useTheme } from '@/lib/ThemeContext';
import { Sun, Moon, Clock } from 'lucide-react';

interface GameMenuProps {
  onGameStart: (mode: GameMode, difficulty?: Difficulty, roomId?: string, themeId?: ThemeId, timerMode?: TimerMode, customTime?: number) => void;
  onThemeSelect: () => void;
  selectedTheme: ThemeId;
}

export function GameMenu({ onGameStart, onThemeSelect, selectedTheme }: GameMenuProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const [showDifficulty, setShowDifficulty] = useState(false);

  const [showTimerSelect, setShowTimerSelect] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>('none');
  const [customTime, setCustomTime] = useState<number>(15);
  const { theme, toggleTheme } = useTheme();

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    setShowTimerSelect(true);
  };

  const handleTimerSelect = (timer: TimerMode) => {
    setTimerMode(timer);
    
    if (selectedMode === 'computer') {
      setShowTimerSelect(false);
      setShowDifficulty(true);
    } else if (selectedMode === 'online') {
      setShowTimerSelect(false);
      handleOnlineGame();
    } else {
      // Local mode
      const finalCustomTime = timer === 'custom' ? customTime : undefined;
      if (selectedMode) {
        onGameStart(selectedMode, undefined, undefined, selectedTheme, timer, finalCustomTime);
      }
    }
  };

  const handleDifficultySelect = (diff: Difficulty) => {
    setDifficulty(diff);
    const finalCustomTime = timerMode === 'custom' ? customTime : undefined;
    onGameStart('computer', diff, undefined, selectedTheme, timerMode, finalCustomTime);
  };

  const handleOnlineGame = () => {
    const finalCustomTime = timerMode === 'custom' ? customTime : undefined;
    onGameStart('online', undefined, undefined, selectedTheme, timerMode, finalCustomTime);
  };

  const resetMenu = () => {
    setSelectedMode(null);
    setShowDifficulty(false);
    setShowTimerSelect(false);
    setTimerMode('none');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Theme Toggle Button */}
      <motion.button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 bg-white/10 backdrop-blur-xl border border-white/30 rounded-full hover:bg-white/20 transition-all duration-300"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        <motion.div
          animate={{ rotate: theme === 'dark' ? 0 : 180 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {theme === 'dark' ? (
            <Sun size={24} className="text-yellow-400" />
          ) : (
            <Moon size={24} className="text-blue-400" />
          )}
        </motion.div>
      </motion.button>

      {/* Enhanced Animated Background */}
      <div className={`absolute inset-0 transition-all duration-1000 ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900'
          : 'bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100'
      }`}>
        {/* Animated Grid Pattern */}
        <div className={`absolute inset-0 opacity-10 ${
          theme === 'dark' ? 'bg-white' : 'bg-gray-800'
        }`} style={{
          backgroundImage: `linear-gradient(${theme === 'dark' ? '#ffffff' : '#1f2937'} 1px, transparent 1px), linear-gradient(90deg, ${theme === 'dark' ? '#ffffff' : '#1f2937'} 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        {/* Large Background Chess Pieces */}
        <motion.div
          className={`absolute top-1/6 left-1/6 text-8xl font-bold ${
            theme === 'dark' ? 'text-white/30' : 'text-gray-800/40'
          } filter drop-shadow-2xl`}
          animate={{
            rotate: [0, 360],
            y: [0, -30, 0],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          ♔
        </motion.div>
        
        <motion.div
          className={`absolute top-1/3 right-1/5 text-7xl font-bold ${
            theme === 'dark' ? 'text-purple-300/40' : 'text-purple-600/50'
          } filter drop-shadow-xl`}
          animate={{
            rotate: [0, -360],
            x: [0, 25, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        >
          ♛
        </motion.div>
        
        <motion.div
          className={`absolute bottom-1/3 left-1/8 text-6xl font-bold ${
            theme === 'dark' ? 'text-blue-300/35' : 'text-blue-600/45'
          } filter drop-shadow-lg`}
          animate={{
            rotate: [0, 180, 360],
            y: [0, 15, 0],
            x: [0, -10, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
        >
          ♜
        </motion.div>

        {/* Additional Floating Chess Pieces - More Dynamic */}
        <motion.div
          className={`absolute top-1/4 right-1/3 text-5xl font-bold ${
            theme === 'dark' ? 'text-green-300/35' : 'text-green-600/45'
          } filter drop-shadow-lg`}
          animate={{
            rotate: [0, -180, 0],
            y: [0, 25, 0],
            x: [0, -15, 0],
            scale: [1, 0.8, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        >
          ♞
        </motion.div>

        <motion.div
          className={`absolute bottom-1/4 right-1/6 text-6xl font-bold ${
            theme === 'dark' ? 'text-yellow-300/40' : 'text-yellow-600/50'
          } filter drop-shadow-xl`}
          animate={{
            rotate: [0, 270, 0],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        >
          ♗
        </motion.div>

        <motion.div
          className={`absolute top-1/2 left-1/12 text-5xl font-bold ${
            theme === 'dark' ? 'text-red-300/35' : 'text-red-600/45'
          } filter drop-shadow-lg`}
          animate={{
            rotate: [0, 90, 180, 270, 360],
            y: [0, -10, 0, 10, 0],
            scale: [1, 1.2, 1, 0.9, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5
          }}
        >
          ♟
        </motion.div>

        <motion.div
          className={`absolute top-3/4 left-1/3 text-7xl font-bold ${
            theme === 'dark' ? 'text-cyan-300/40' : 'text-cyan-600/50'
          } filter drop-shadow-xl`}
          animate={{
            rotate: [0, -90, -180, -270, -360],
            x: [0, 20, 0, -20, 0],
            y: [0, 15, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3.5
          }}
        >
          ♙
        </motion.div>

        {/* Smaller Floating Pieces */}
        <motion.div
          className={`absolute top-1/5 right-1/8 text-4xl font-bold ${
            theme === 'dark' ? 'text-pink-300/30' : 'text-pink-600/40'
          } filter drop-shadow-md`}
          animate={{
            rotate: [0, 180, 360],
            y: [0, -20, 0],
            x: [0, 10, 0],
            scale: [0.8, 1.1, 0.8],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
        >
          ♜
        </motion.div>

        <motion.div
          className={`absolute bottom-1/5 left-1/4 text-4xl font-bold ${
            theme === 'dark' ? 'text-orange-300/30' : 'text-orange-600/40'
          } filter drop-shadow-md`}
          animate={{
            rotate: [0, -120, -240, -360],
            x: [0, -15, 0],
            y: [0, 12, 0],
          }}
          transition={{
            duration: 17,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2.5
          }}
        >
          ♞
        </motion.div>

        <motion.div
          className={`absolute top-2/3 right-1/4 text-4xl font-bold ${
            theme === 'dark' ? 'text-indigo-300/30' : 'text-indigo-600/40'
          } filter drop-shadow-md`}
          animate={{
            rotate: [0, 45, 90, 135, 180],
            scale: [1, 0.7, 1, 1.3, 1],
            y: [0, -8, 0],
          }}
          transition={{
            duration: 19,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4.5
          }}
        >
          ♗
        </motion.div>

        {/* Tiny Floating Pieces for Atmosphere */}
        <motion.div
          className={`absolute top-1/8 left-1/2 text-3xl font-bold ${
            theme === 'dark' ? 'text-white/20' : 'text-gray-800/30'
          } filter drop-shadow-sm`}
          animate={{
            rotate: [0, 360],
            y: [0, -15, 0],
            x: [0, 8, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 6
          }}
        >
          ♟
        </motion.div>

        <motion.div
          className={`absolute bottom-1/8 right-1/2 text-3xl font-bold ${
            theme === 'dark' ? 'text-white/20' : 'text-gray-800/30'
          } filter drop-shadow-sm`}
          animate={{
            rotate: [0, -360],
            x: [0, -12, 0],
            y: [0, 8, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 7
          }}
        >
          ♙
        </motion.div>

        <motion.div
          className={`absolute top-1/2 right-1/12 text-3xl font-bold ${
            theme === 'dark' ? 'text-white/20' : 'text-gray-800/30'
          } filter drop-shadow-sm`}
          animate={{
            rotate: [0, 180, 0],
            scale: [0.8, 1.2, 0.8],
            y: [0, -10, 0],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 8
          }}
        >
          ♔
        </motion.div>

        {/* Floating Orbs for Enhanced Atmosphere */}
        <motion.div
          className="absolute top-1/4 left-1/5 w-32 h-32 rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle, ${theme === 'dark' ? 'rgba(147, 51, 234, 0.3)' : 'rgba(147, 51, 234, 0.2)'} 0%, transparent 70%)`
          }}
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 20, 0],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.div
          className="absolute bottom-1/4 right-1/5 w-24 h-24 rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle, ${theme === 'dark' ? 'rgba(79, 70, 229, 0.3)' : 'rgba(79, 70, 229, 0.2)'} 0%, transparent 70%)`
          }}
          animate={{
            scale: [1, 0.8, 1],
            x: [0, -25, 0],
            y: [0, 10, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />

        <motion.div
          className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full opacity-15"
          style={{
            background: `radial-gradient(circle, ${theme === 'dark' ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)'} 0%, transparent 70%)`
          }}
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full flex items-center justify-center min-h-[calc(100vh-2rem)]">
        <div className="w-full max-w-4xl flex justify-center">
          <AnimatePresence mode="wait">
            {/* Timer Selection */}
            {showTimerSelect && (
              <motion.div
                key="timer-select"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`${
                  theme === 'dark' 
                    ? 'bg-white/10 border-white/30 text-white' 
                    : 'bg-white/80 border-gray-300/50 text-gray-800'
                } backdrop-blur-xl rounded-3xl shadow-2xl border p-8`}>
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <Clock size={32} className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
                      <h2 className="text-3xl font-bold">Game Timer</h2>
                    </div>
                    <p className={`text-lg ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
                      Choose your preferred time control
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    <TimerButton
                      mode="none"
                      title="No Timer"
                      description="Play at your own pace"
                      color="gray"
                      theme={theme}
                      onClick={() => handleTimerSelect('none')}
                    />
                    <TimerButton
                      mode="3min"
                      title="3 Minutes"
                      description="Fast-paced games"
                      color="green"
                      theme={theme}
                      onClick={() => handleTimerSelect('3min')}
                    />
                    <TimerButton
                      mode="5min"
                      title="5 Minutes"
                      description="Balanced gameplay"
                      color="blue"
                      theme={theme}
                      onClick={() => handleTimerSelect('5min')}
                    />
                    <TimerButton
                      mode="10min"
                      title="10 Minutes"
                      description="Strategic thinking"
                      color="purple"
                      theme={theme}
                      onClick={() => handleTimerSelect('10min')}
                    />
                    
                    <div className="md:col-span-2">
                      <div className={`${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/20 hover:bg-white/10'
                          : 'bg-white/60 border-gray-300/40 hover:bg-white/80'
                      } border rounded-2xl p-6 transition-all duration-300 hover:scale-105`}>
                        <div className="text-center mb-4">
                          <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'} mb-2`}>
                            Custom Timer
                          </div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                            Set your own time limit
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-4">
                          <input
                            type="range"
                            min="1"
                            max="60"
                            value={customTime}
                            onChange={(e) => setCustomTime(Number(e.target.value))}
                            className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className={`text-lg font-bold min-w-[4rem] ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>
                            {customTime}m
                          </span>
                        </div>
                        
                        <motion.button
                          onClick={() => handleTimerSelect('custom')}
                          className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                            theme === 'dark'
                              ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30'
                              : 'bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Select Custom Timer
                        </motion.button>
          </div>
        </div>
      </div>

                  <div className="flex justify-center">
                    <motion.button
                      onClick={resetMenu}
                      className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        theme === 'dark'
                          ? 'bg-white/10 hover:bg-white/20 text-white border border-white/30'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ← Back to Game Modes
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
      
      {/* Main Menu Card */}
            {!showTimerSelect && !showDifficulty && (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
                className={`${
                  theme === 'dark' 
                    ? 'bg-white/10 border-white/30 text-white' 
                    : 'bg-white/80 border-gray-300/50 text-gray-800'
                } backdrop-blur-xl rounded-3xl p-8 shadow-2xl border max-w-xs w-full relative z-10 min-w-fit`}
      >
        <div className="text-center mb-8">
          <motion.h1 
                    className={`text-5xl font-bold mb-4 bg-gradient-to-r whitespace-nowrap ${
                      theme === 'dark' 
                        ? 'from-white via-blue-200 to-purple-200' 
                        : 'from-gray-800 via-blue-600 to-purple-600'
                    } bg-clip-text text-transparent`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            >
              ♔ Chess Master ♛
          </motion.h1>
          <motion.p 
                    className={`${theme === 'dark' ? 'text-white/80' : 'text-gray-600'} text-lg font-medium`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            Choose your game mode
          </motion.p>
          
          <motion.button
            onClick={onThemeSelect}
                    className={`mt-6 px-6 py-3 ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border-white/30 text-white'
                        : 'bg-gradient-to-r from-purple-200/80 to-pink-200/80 hover:from-purple-300/80 hover:to-pink-300/80 border-gray-400/50 text-gray-800'
                    } border rounded-xl transition-all duration-300 font-semibold shadow-lg backdrop-blur-sm`}
                    whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            >
              🎨 Themes ({selectedTheme})
          </motion.button>
        </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="space-y-5"
            >
              <GameModeButton
                icon="🤖"
                title="Play vs Computer"
                description="Challenge our AI opponent"
                    theme={theme}
                onClick={() => handleModeSelect('computer')}
              />
              <GameModeButton
                icon="👥"
                title="Local Multiplayer"
                description="Play with a friend on this device"
                    theme={theme}
                onClick={() => handleModeSelect('local')}
              />
              <GameModeButton
                icon="🌐"
                title="Online Multiplayer"
                description="Play with friends online"
                    theme={theme}
                onClick={() => handleModeSelect('online')}
              />
            </motion.div>
          </motion.div>
        )}

        {showDifficulty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                className={`${
                  theme === 'dark' 
                    ? 'bg-white/10 border-white/30 text-white' 
                    : 'bg-white/80 border-gray-300/50 text-gray-800'
                } backdrop-blur-xl rounded-3xl shadow-2xl border p-8 max-w-md w-full`}
              >
                <h3 className={`text-2xl font-semibold text-center mb-6 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
              Select Difficulty
            </h3>
                <div className="space-y-4">
            <DifficultyButton
              level="easy"
              title="Easy"
              description="Good for beginners"
              color="bg-green-500"
              onClick={() => handleDifficultySelect('easy')}
            />
            <DifficultyButton
              level="medium"
              title="Medium"
              description="Balanced challenge"
              color="bg-yellow-500"
              onClick={() => handleDifficultySelect('medium')}
            />
            <DifficultyButton
              level="hard"
              title="Hard"
              description="For experienced players"
              color="bg-red-500"
              onClick={() => handleDifficultySelect('hard')}
            />
            <button
              onClick={resetMenu}
                    className={`w-full py-2 ${
                      theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-800'
                    } transition-colors`}
            >
              ← Back
            </button>
                </div>
          </motion.div>
        )}


          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface GameModeButtonProps {
  icon: string;
  title: string;
  description: string;
  theme: string;
  onClick: () => void;
}

function GameModeButton({ icon, title, description, theme, onClick }: GameModeButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`w-full p-5 ${
        theme === 'dark'
          ? 'bg-white/10 hover:bg-white/20 text-white border border-white/30'
          : 'bg-white/60 hover:bg-white/80 text-gray-800 border border-gray-300'
      } rounded-2xl transition-all duration-300 text-left relative overflow-hidden shadow-lg backdrop-blur-sm`}
    >
      <div className="relative z-10 flex items-center gap-4">
        <div className="text-3xl">{icon}</div>
        <div>
          <h3 className={`text-xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            {title}
          </h3>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
            {description}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

interface DifficultyButtonProps {
  level: Difficulty;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}

function DifficultyButton({ level, title, description, color, onClick }: DifficultyButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`w-full p-5 ${color} hover:brightness-110 text-white rounded-2xl transition-all duration-300 text-left relative overflow-hidden shadow-lg`}
    >
      <div className="relative z-10">
        <h3 className="text-xl font-bold mb-1">{title}</h3>
        <p className="text-white/95 text-sm font-medium">{description}</p>
      </div>
    </motion.button>
  );
}

interface TimerButtonProps {
  mode: TimerMode;
  title: string;
  description: string;
  color: string;
  theme: string;
  onClick: () => void;
}

function TimerButton({ mode, title, description, color, theme, onClick }: TimerButtonProps) {
  const colorMap = {
    gray: theme === 'dark' ? 'from-gray-500/20 to-gray-600/20 border-gray-500/30' : 'from-gray-200 to-gray-300 border-gray-400',
    green: theme === 'dark' ? 'from-green-500/20 to-green-600/20 border-green-500/30' : 'from-green-200 to-green-300 border-green-400',
    blue: theme === 'dark' ? 'from-blue-500/20 to-blue-600/20 border-blue-500/30' : 'from-blue-200 to-blue-300 border-blue-400',
    purple: theme === 'dark' ? 'from-purple-500/20 to-purple-600/20 border-purple-500/30' : 'from-purple-200 to-purple-300 border-purple-400',
    orange: theme === 'dark' ? 'from-orange-500/20 to-orange-600/20 border-orange-500/30' : 'from-orange-200 to-orange-300 border-orange-400'
  };

  return (
    <motion.button
      onClick={onClick}
      className={`p-6 rounded-2xl border transition-all duration-300 hover:scale-105 bg-gradient-to-br ${colorMap[color as keyof typeof colorMap]} ${
        theme === 'dark' ? 'text-white hover:bg-white/10' : 'text-gray-800 hover:bg-gray-100'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="text-center">
        <div className="text-2xl font-bold mb-2">{title}</div>
        <div className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>{description}</div>
      </div>
    </motion.button>
  );
} 