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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">♔ Chess Master ♛</h1>
          <p className="text-white/70">Choose your game mode</p>
          
          {/* Theme selector button */}
          <motion.button
            onClick={onThemeSelect}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200 text-white/80 hover:text-white text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🎨 Themes ({selectedTheme})
          </motion.button>
        </div>

        {!selectedMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <GameModeButton
              icon="🤖"
              title="Play vs Computer"
              description="Challenge our AI opponent"
              onClick={() => handleModeSelect('computer')}
            />
            <GameModeButton
              icon="👥"
              title="Local Multiplayer"
              description="Play with a friend on this device"
              onClick={() => handleModeSelect('local')}
            />
            <GameModeButton
              icon="🌐"
              title="Online Multiplayer"
              description="Play with friends online"
              onClick={() => handleModeSelect('online')}
            />
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full p-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all duration-200 text-left group"
    >
      <div className="flex items-center space-x-4">
        <div className="text-3xl">{icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
            {title}
          </h3>
          <p className="text-white/70 text-sm">{description}</p>
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full p-4 ${color} hover:opacity-90 text-white rounded-xl transition-all duration-200 text-left`}
    >
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-white/90 text-sm">{description}</p>
      </div>
    </motion.button>
  );
} 