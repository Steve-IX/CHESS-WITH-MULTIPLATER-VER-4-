'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chessThemes, ChessTheme } from '@/lib/themes';
import { ThemeId } from '@/lib/types';

interface ThemeSelectorProps {
  selectedTheme: ThemeId;
  onThemeSelect: (themeId: ThemeId) => void;
  onBack: () => void;
}

const ThemePreview = ({ theme, isSelected }: { theme: ChessTheme; isSelected: boolean }) => (
  <div className={`relative rounded-lg overflow-hidden transition-all duration-300 ${
    isSelected ? 'ring-4 ring-blue-500 shadow-xl scale-105' : 'hover:shadow-lg hover:scale-102'
  }`}>
    {/* Mini chess board preview */}
    <div className={`grid grid-cols-4 gap-0 ${theme.boardBorder} border-2`}>
      {Array.from({ length: 16 }, (_, i) => {
        const x = Math.floor(i / 4);
        const y = i % 4;
        const isLight = (x + y) % 2 === 0;
        const showPiece = (x === 0 && y === 0) || (x === 0 && y === 3) || (x === 3 && y === 0) || (x === 3 && y === 3);
        const pieceColor = (x === 0) ? 'white' : 'black';
        const pieceSymbol = (y === 0 || y === 3) ? (pieceColor === 'white' ? '♖' : '♜') : (pieceColor === 'white' ? '♙' : '♟');
        
        return (
          <div
            key={i}
            className={`w-8 h-8 flex items-center justify-center ${
              isLight ? theme.lightSquare : theme.darkSquare
            }`}
          >
            {showPiece && (
              <span 
                className={`text-sm font-bold ${
                  pieceColor === 'white' ? theme.whitePieceColor : theme.blackPieceColor
                } ${pieceColor === 'white' ? theme.whitePieceShadow : theme.blackPieceShadow}`}
                style={{
                  textShadow: pieceColor === 'white' 
                    ? '1px 1px 0px #374151, -0.5px -0.5px 0px #374151'
                    : '1px 1px 0px #f9fafb, -0.5px -0.5px 0px #f9fafb'
                }}
              >
                {pieceSymbol}
              </span>
            )}
          </div>
        );
      })}
    </div>
    
    {/* Theme info */}
    <div className="p-3 bg-white">
      <h3 className="font-semibold text-gray-800 text-sm">{theme.name}</h3>
      <p className="text-xs text-gray-600 mt-1">{theme.description}</p>
    </div>
    
    {/* Selection indicator */}
    {isSelected && (
      <motion.div
        className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <span className="text-white text-xs font-bold">✓</span>
      </motion.div>
    )}
  </div>
);

export function ThemeSelector({ selectedTheme, onThemeSelect, onBack }: ThemeSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.button
            onClick={onBack}
            className="absolute left-6 top-6 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-lg">←</span>
            <span className="font-medium">Back</span>
          </motion.button>
          
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Choose Your Theme</h1>
          <p className="text-slate-600">Select a board theme that suits your style</p>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {chessThemes.map((theme) => (
            <motion.button
              key={theme.id}
              onClick={() => onThemeSelect(theme.id as ThemeId)}
              className="text-left focus:outline-none"
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <ThemePreview 
                theme={theme} 
                isSelected={selectedTheme === theme.id} 
              />
            </motion.button>
          ))}
        </div>

        {/* Selected Theme Info */}
        <motion.div
          key={selectedTheme}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-lg p-6 text-center"
        >
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Selected: {chessThemes.find(t => t.id === selectedTheme)?.name}
          </h2>
          <p className="text-slate-600 mb-4">
            {chessThemes.find(t => t.id === selectedTheme)?.description}
          </p>
          <motion.button
            onClick={onBack}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Playing
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
} 