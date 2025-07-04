'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GameAnalysis, 
  MoveAnalysis, 
  PlayerStats, 
  PhaseAnalysis, 
  MoveQuality,
  PhaseRating,
  PlayerColor 
} from '../lib/types';

interface GameReviewProps {
  analysis: GameAnalysis | null;
  isAnalyzing: boolean;
  playerNames?: {
    white: string;
    black: string;
  };
  onClose?: () => void;
}

// Move quality icons and colors
const MOVE_QUALITY_CONFIG = {
  brilliant: { icon: '💠', color: '#00bcd4', label: 'Brilliant' },
  great: { icon: '🔵', color: '#2196f3', label: 'Great' },
  best: { icon: '⭐', color: '#4caf50', label: 'Best' },
  mistake: { icon: '❓', color: '#ff9800', label: 'Mistake' },
  miss: { icon: '❌', color: '#f44336', label: 'Miss' },
  blunder: { icon: '‼️', color: '#d32f2f', label: 'Blunder' }
};

const PHASE_RATING_CONFIG = {
  excellent: { icon: '⭐', color: '#4caf50' },
  good: { icon: '✅', color: '#8bc34a' },
  dubious: { icon: '🤔', color: '#ff9800' }
};

export function GameReview({ analysis, isAnalyzing, playerNames, onClose }: GameReviewProps) {
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);
  const [showDetailedMoves, setShowDetailedMoves] = useState(false);

  if (isAnalyzing) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <h3 className="text-lg font-semibold text-slate-800">Analyzing Game...</h3>
          </div>
          <p className="text-slate-600">
            This may take a few minutes. Stockfish is analyzing each move at depth 18.
          </p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-slate-600">
          <p>No game analysis available yet.</p>
          <p className="text-sm mt-2">Complete a game to see detailed analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">✓</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Game Review</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="text-xl">×</span>
            </button>
          )}
        </div>
        <p className="text-sm text-slate-600 mt-1">
          You had a nice tactical find in this game. Let's review!
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Player Statistics */}
        <div className="grid grid-cols-2 gap-6">
          <PlayerStatsCard
            player="white"
            stats={analysis.white}
            playerName={playerNames?.white || 'White'}
            analysis={analysis}
          />
          <PlayerStatsCard
            player="black"
            stats={analysis.black}
            playerName={playerNames?.black || 'Black'}
            analysis={analysis}
          />
        </div>

        {/* Game Rating */}
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="font-semibold text-slate-800 mb-3">Game Rating</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">
                {Math.round(analysis.white.accuracy * 10)}
              </div>
              <div className="text-sm text-slate-600">White Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">
                {Math.round(analysis.black.accuracy * 10)}
              </div>
              <div className="text-sm text-slate-600">Black Rating</div>
            </div>
          </div>
        </div>

        {/* Phase Performance */}
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-800">Phase Performance</h4>
          <div className="space-y-2">
            {analysis.phases.map((phase, index) => (
              <PhasePerformanceRow key={index} phase={phase} />
            ))}
          </div>
        </div>

        {/* Evaluation Chart */}
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-800">Game Analysis</h4>
          <EvaluationChart cpSeries={analysis.cpSeries} />
        </div>

        {/* Move Details Toggle */}
        <div className="border-t pt-4">
          <button
            onClick={() => setShowDetailedMoves(!showDetailedMoves)}
            className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-800 font-medium"
          >
            {showDetailedMoves ? '▼' : '▶'} Detailed Move Analysis
          </button>
          
          <AnimatePresence>
            {showDetailedMoves && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-2 max-h-64 overflow-y-auto"
              >
                {analysis.moves.map((move, index) => (
                  <MoveAnalysisRow
                    key={index}
                    move={move}
                    index={index}
                    isSelected={selectedMoveIndex === index}
                    onClick={() => setSelectedMoveIndex(
                      selectedMoveIndex === index ? null : index
                    )}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Player Statistics Card Component
function PlayerStatsCard({ 
  player, 
  stats, 
  playerName, 
  analysis 
}: { 
  player: PlayerColor;
  stats: PlayerStats;
  playerName: string;
  analysis: GameAnalysis;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          player === 'white' ? 'bg-slate-200' : 'bg-slate-700'
        }`}>
          <span className={`text-2xl ${player === 'white' ? '♔' : '♚'}`}>
            {player === 'white' ? '♔' : '♚'}
          </span>
        </div>
        <div>
          <div className="font-semibold text-slate-800">{playerName}</div>
          <div className="text-sm text-slate-600 capitalize">{player}</div>
        </div>
      </div>

      <div className="text-center">
        <div className="text-3xl font-bold text-slate-800">
          {stats.accuracy.toFixed(1)}
        </div>
        <div className="text-sm text-slate-600">Accuracy</div>
      </div>

      <div className="space-y-2">
        {Object.entries(MOVE_QUALITY_CONFIG).map(([quality, config]) => {
          const count = stats[quality as keyof PlayerStats] as number;
          return (
            <div key={quality} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <span className="text-sm font-medium" style={{ color: config.color }}>
                  {config.label}
                </span>
              </div>
              <span className="font-bold text-slate-800">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Phase Performance Row Component
function PhasePerformanceRow({ phase }: { phase: PhaseAnalysis }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
      <div className="font-medium text-slate-800 capitalize">
        {phase.phase}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">White:</span>
          <span className={PHASE_RATING_CONFIG[phase.whiteRating].icon}></span>
          <span className="font-bold text-slate-800">
            {phase.whiteAccuracy.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Black:</span>
          <span className={PHASE_RATING_CONFIG[phase.blackRating].icon}></span>
          <span className="font-bold text-slate-800">
            {phase.blackAccuracy.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Evaluation Chart Component (Simplified)
function EvaluationChart({ cpSeries }: { cpSeries: Array<{ ply: number; cp: number; color: PlayerColor }> }) {
  const maxCp = Math.max(...cpSeries.map(point => Math.abs(point.cp)));
  const normalizedData = cpSeries.map(point => ({
    ...point,
    normalizedCp: (point.cp / Math.max(maxCp, 500)) * 50 + 50 // Normalize to 0-100 range
  }));

  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <div className="h-32 border border-slate-200 rounded relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          <span className="text-sm">Move Evaluation Chart</span>
        </div>
        
        {/* Simple line chart representation */}
        <svg className="w-full h-full">
          <defs>
            <linearGradient id="evalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#4caf50', stopOpacity: 0.8 }} />
              <stop offset="50%" style={{ stopColor: '#ffeb3b', stopOpacity: 0.5 }} />
              <stop offset="100%" style={{ stopColor: '#f44336', stopOpacity: 0.8 }} />
            </linearGradient>
          </defs>
          
          {normalizedData.map((point, index) => {
            if (index === 0) return null;
            const prevPoint = normalizedData[index - 1];
            const x1 = ((index - 1) / (normalizedData.length - 1)) * 100;
            const x2 = (index / (normalizedData.length - 1)) * 100;
            const y1 = 100 - prevPoint.normalizedCp;
            const y2 = 100 - point.normalizedCp;
            
            return (
              <line
                key={index}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke={point.cp > 0 ? '#4caf50' : '#f44336'}
                strokeWidth="2"
                opacity="0.8"
              />
            );
          })}
        </svg>
      </div>
      
      <div className="flex justify-between text-xs text-slate-600 mt-2">
        <span>Move 1</span>
        <span>Game End</span>
      </div>
    </div>
  );
}

// Move Analysis Row Component
function MoveAnalysisRow({ 
  move, 
  index, 
  isSelected, 
  onClick 
}: { 
  move: MoveAnalysis;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const qualityConfig = MOVE_QUALITY_CONFIG[move.quality];
  
  return (
    <motion.div
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-300 bg-blue-50' 
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-slate-600">
            {Math.floor(move.ply / 2) + 1}{move.ply % 2 === 1 ? '.' : '...'}
          </span>
          <span className="font-medium text-slate-800">
            {/* This would show algebraic notation - simplified for now */}
            Move {move.ply}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-lg">{qualityConfig.icon}</span>
          <span className="text-xs font-medium" style={{ color: qualityConfig.color }}>
            {move.cpLoss > 0 && `-${move.cpLoss}`}
          </span>
        </div>
      </div>
      
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 pt-3 border-t border-slate-200 text-sm text-slate-600"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Evaluation:</span> {move.playedMoveCp > 0 ? '+' : ''}{(move.playedMoveCp / 100).toFixed(2)}
            </div>
            <div>
              <span className="font-medium">Best:</span> {move.bestMoveCp > 0 ? '+' : ''}{(move.bestMoveCp / 100).toFixed(2)}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
} 