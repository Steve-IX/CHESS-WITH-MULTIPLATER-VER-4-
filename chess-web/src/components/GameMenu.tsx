'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameMode, Difficulty, ThemeId } from '@/lib/types';

interface GameMenuProps {
  onGameStart: (mode: GameMode, difficulty?: Difficulty, roomId?: string, themeId?: ThemeId) => void;
  onThemeSelect: () => void;
  selectedTheme: ThemeId;
}

export function GameMenu({ onGameStart, onThemeSelect, selectedTheme }: GameMenuProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [roomId, setRoomId] = useState('');
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showRoomInput, setShowRoomInput] = useState(false);

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    
    if (mode === 'computer') {
      setShowDifficulty(true);
    } else if (mode === 'online') {
      setShowRoomInput(true);
    } else {
      onGameStart(mode, undefined, undefined, selectedTheme);
    }
  };

  const handleDifficultySelect = (diff: Difficulty) => {
    setDifficulty(diff);
    onGameStart('computer', diff, undefined, selectedTheme);
  };

  const handleOnlineGame = (isHost: boolean) => {
    if (isHost) {
      onGameStart('online', undefined, undefined, selectedTheme);
    } else {
      if (roomId.trim()) {
        onGameStart('online', undefined, roomId.trim(), selectedTheme);
      }
    }
  };

  const resetMenu = () => {
    setSelectedMode(null);
    setShowDifficulty(false);
    setShowRoomInput(false);
    setRoomId('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        {/* Floating Orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-radial from-blue-500/30 to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -50, 100, 0],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-radial from-purple-500/40 to-transparent rounded-full blur-2xl"
          animate={{
            x: [0, -80, 60, 0],
            y: [0, 80, -40, 0],
            scale: [1, 0.9, 1.3, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-gradient-radial from-pink-500/35 to-transparent rounded-full blur-2xl"
          animate={{
            x: [0, 120, -80, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />
        
        {/* Floating Chess Pieces */}
        <motion.div
          className="absolute top-1/6 left-1/6 text-6xl opacity-10"
          animate={{
            rotate: [0, 360],
            y: [0, -20, 0],
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
          className="absolute top-1/3 right-1/5 text-5xl opacity-15"
          animate={{
            rotate: [0, -360],
            x: [0, 15, 0],
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
          className="absolute bottom-1/3 left-1/8 text-4xl opacity-10"
          animate={{
            rotate: [0, 180, 360],
            y: [0, 10, 0],
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
        <motion.div
          className="absolute bottom-1/6 right-1/3 text-5xl opacity-12"
          animate={{
            rotate: [0, -180, 0],
            x: [0, -10, 0],
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
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-8 h-full">
            {Array.from({ length: 64 }, (_, i) => (
              <motion.div
                key={i}
                className={`border border-white/20 ${(Math.floor(i / 8) + (i % 8)) % 2 === 0 ? 'bg-white/5' : 'bg-black/5'}`}
                animate={{
                  opacity: [0.05, 0.15, 0.05],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Menu Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30 max-w-md w-full relative z-10"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="text-center mb-8">
          <motion.h1 
            className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <motion.span
              animate={{ 
                textShadow: [
                  '0 0 20px rgba(255,255,255,0.5)',
                  '0 0 30px rgba(147,197,253,0.8)',
                  '0 0 20px rgba(255,255,255,0.5)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              ♔ Chess Master ♛
            </motion.span>
          </motion.h1>
          <motion.p 
            className="text-white/80 text-lg font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            Choose your game mode
          </motion.p>
          
          {/* Enhanced Theme selector button */}
          <motion.button
            onClick={onThemeSelect}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-white/30 rounded-xl transition-all duration-300 text-white font-semibold shadow-lg backdrop-blur-sm"
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)'
            }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            <motion.span
              animate={{
                color: ['#ffffff', '#c084fc', '#f472b6', '#ffffff']
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              🎨 Themes ({selectedTheme})
            </motion.span>
          </motion.button>
        </div>

        {!selectedMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="space-y-5"
          >
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <GameModeButton
                icon="🤖"
                title="Play vs Computer"
                description="Challenge our AI opponent"
                onClick={() => handleModeSelect('computer')}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
            >
              <GameModeButton
                icon="👥"
                title="Local Multiplayer"
                description="Play with a friend on this device"
                onClick={() => handleModeSelect('local')}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.3 }}
            >
              <GameModeButton
                icon="🌐"
                title="Online Multiplayer"
                description="Play with friends online"
                onClick={() => handleModeSelect('online')}
              />
            </motion.div>
          </motion.div>
        )}

        {showDifficulty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-semibold text-white text-center mb-4">
              Select Difficulty
            </h3>
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
              className="w-full py-2 text-white/70 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {showRoomInput && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-semibold text-white text-center mb-4">
              Online Multiplayer
            </h3>
            
            <button
              onClick={() => handleOnlineGame(true)}
              className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold"
            >
              🏠 Host a Game
            </button>
            
            <div className="text-center text-white/50">or</div>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter room code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={6}
              />
              <button
                onClick={() => handleOnlineGame(false)}
                disabled={!roomId.trim()}
                className="w-full p-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-semibold"
              >
                🚪 Join Game
              </button>
            </div>
            
            <button
              onClick={resetMenu}
              className="w-full py-2 text-white/70 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

interface GameModeButtonProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}

function GameModeButton({ icon, title, description, onClick }: GameModeButtonProps) {
  return (
    <motion.button
      whileHover={{ 
        scale: 1.03,
        y: -2,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
      }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full p-6 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/15 border border-white/30 rounded-2xl transition-all duration-300 text-left group relative overflow-hidden backdrop-blur-sm"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
      />
      
      <div className="flex items-center space-x-4 relative z-10">
        <motion.div 
          className="text-4xl"
          whileHover={{ 
            scale: 1.2,
            rotate: [0, -10, 10, 0],
          }}
          transition={{ duration: 0.3 }}
        >
          {icon}
        </motion.div>
        <div>
          <motion.h3 
            className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-300 group-hover:to-purple-300 group-hover:bg-clip-text transition-all duration-300"
            whileHover={{ x: 5 }}
          >
            {title}
          </motion.h3>
          <motion.p 
            className="text-white/80 text-sm font-medium group-hover:text-white/90 transition-colors duration-300"
            whileHover={{ x: 5 }}
          >
            {description}
          </motion.p>
        </div>
      </div>
      
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 opacity-0 group-hover:opacity-100"
        initial={{ x: '-100%' }}
        whileHover={{ x: '200%' }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />
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
      whileHover={{ 
        scale: 1.03,
        y: -3,
        boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)',
      }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`w-full p-5 ${color} hover:brightness-110 text-white rounded-2xl transition-all duration-300 text-left relative overflow-hidden shadow-lg`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Animated shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 opacity-0"
        whileHover={{ 
          opacity: 1,
          x: ['0%', '200%']
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
      
      <div className="relative z-10">
        <motion.h3 
          className="text-xl font-bold mb-1"
          whileHover={{ x: 3 }}
        >
          {title}
        </motion.h3>
        <motion.p 
          className="text-white/95 text-sm font-medium"
          whileHover={{ x: 3 }}
        >
          {description}
        </motion.p>
      </div>
    </motion.button>
  );
} 