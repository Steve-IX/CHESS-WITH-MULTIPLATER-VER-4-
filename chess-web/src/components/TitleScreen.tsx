'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Crown } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setIsVisible(false);
    setTimeout(onStart, 800);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center diamond-grid-background overflow-hidden"
        >
      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 50 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-60 floating-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Rainbow Glow Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-20 blur-xl rainbow-orb"
            style={{
              width: `${100 + Math.random() * 200}px`,
              height: `${100 + Math.random() * 200}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `hsl(${i * 45}, 70%, 60%)`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={showContent ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
        className="relative z-10 text-center max-w-4xl mx-auto px-8"
      >
        {/* App Title */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-wider title-glow">
            <span className="rainbow-text">CHESS</span>
          </h1>
          
          <h2 className="text-2xl md:text-4xl font-light text-white/90 tracking-widest">
            MASTER
          </h2>
          
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-white to-transparent mx-auto mt-6 title-underline" />
        </div>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/80 mb-12 font-light max-w-2xl mx-auto leading-relaxed">
          Experience the ultimate chess adventure with stunning visuals, 
          AI opponents, and multiplayer battles
        </p>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="group relative overflow-hidden start-button"
        >
          {/* Button Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 rounded-full opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Animated Border */}
          <div className="absolute inset-0 rounded-full border-2 border-white/30 button-border" />
          
          {/* Button Content */}
          <div className="relative px-12 py-4 flex items-center gap-3">
            <Crown size={24} className="text-white group-hover:scale-110 transition-transform duration-300" />
            <span className="text-white font-semibold text-lg tracking-wide">
              START GAME
            </span>
            <Play size={20} className="text-white group-hover:translate-x-1 transition-transform duration-300" />
          </div>

          {/* Hover Glow */}
          <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 button-glow" />
        </button>

        {/* Floating Chess Pieces */}
        <div className="absolute inset-0 pointer-events-none">
          {['♔', '♕', '♖', '♗', '♘', '♙'].map((piece, i) => (
            <div
              key={i}
              className="absolute text-4xl text-white/20 floating-piece"
              style={{
                left: `${10 + (i * 15)}%`,
                top: `${20 + Math.sin(i) * 30}%`,
                animationDelay: `${i * 0.5}s`,
              }}
            >
              {piece}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bottom Decoration */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <div className="w-8 h-px bg-white/30" />
          <span className="font-light tracking-widest">PRESS START TO BEGIN</span>
          <div className="w-8 h-px bg-white/30" />
        </div>
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 