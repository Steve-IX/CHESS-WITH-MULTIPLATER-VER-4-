'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Music, Minimize2, Maximize2, SkipBack, SkipForward, Repeat, RotateCcw } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

interface Track {
  title: string;
  artist: string;
  album: string;
  filename: string;
  coverArt?: string;
}

export const MusicPlayer = () => {
  // Actual playlist from the reference repository
  const originalPlaylist: Track[] = [
    {
      title: "Last Goodbye",
      artist: "Undertale OST",
      album: "Undertale Soundtrack",
      filename: "Undertale OST - Last Goodbye.mp3",
      coverArt: "/music/covers/undertale-last-goodbye.jpg"
    },
    {
      title: "Field of Hopes and Dreams",
      artist: "Deltarune OST",
      album: "Deltarune Soundtrack",
      filename: "Deltarune OST： 13 - Field of Hopes and Dreams.mp3",
      coverArt: "/music/covers/deltarune-field-of-hopes.jpg"
    },
    {
      title: "Amore Mio Aiutami (Dream Version)",
      artist: "Piero Piccioni",
      album: "The Best of Piero Piccioni - The Greatest Hits 2",
      filename: "Amore Mio Aiutami (Dream Version) ● Piero Piccioni.mp3",
      coverArt: "/music/covers/piero-piccioni-greatest-hits.jpg"
    },
    {
      title: "Naruto Shippūden",
      artist: "Naruto OST",
      album: "Naruto Shippūden Soundtrack",
      filename: "Naruto Shippūden.mp3",
      coverArt: "/music/covers/naruto-shippuden.jpg"
    },
    {
      title: "Crossing Field (Orchestra)",
      artist: "Orchestra Version",
      album: "Sword Art Online OST",
      filename: "Crossing Field (Orchestra).mp3",
      coverArt: "/music/covers/crossing-field-orchestra.jpg"
    },
    {
      title: "Diamond & Pearl",
      artist: "Pokemon OST",
      album: "Pokemon Diamond & Pearl Soundtrack",
      filename: "Pokemon Diamond & Pearl.mp3",
      coverArt: "/music/covers/pokemon-diamond-pearl.jpg"
    },
    {
      title: "Polaris X Peace Sign",
      artist: "Polaris",
      album: "My Hero Academia OST",
      filename: "Polaris X Peace Sign.mp3",
      coverArt: "/music/covers/polaris-peace-sign.jpg"
    },
    {
      title: "Final Boss Phase",
      artist: "Sonic Colors OST",
      album: "Sonic Colors Soundtrack",
      filename: "Sonic Colors _Final Boss Phase.mp3",
      coverArt: "/music/covers/sonic-colors-final-boss.jpg"
    },
    {
      title: "One Piece",
      artist: "One Piece OST",
      album: "One Piece Soundtrack",
      filename: "one_piece.mp3",
      coverArt: "/music/covers/one-piece.jpg"
    },
    {
      title: "Haruka Mirai",
      artist: "Black Clover OST",
      album: "Black Clover Soundtrack",
      filename: "Black Clover - Haruka Mirai.mp3",
      coverArt: "/music/covers/black-clover-haruka-mirai.jpg"
    },
    {
      title: "A Cruel Angel's Thesis",
      artist: "Evangelion OST",
      album: "Neon Genesis Evangelion Soundtrack",
      filename: "A Cruel Angel's Thesis.mp3",
      coverArt: "/music/covers/cruel-angels-thesis.jpg"
    },
    {
      title: "Silhouette",
      artist: "KANA-BOON",
      album: "Naruto Shippuden OST",
      filename: "KANA-BOON - Silhouette.mp3",
      coverArt: "/music/covers/kana-boon-silhouette.jpg"
    },
    {
      title: "Hip Shop",
      artist: "Deltarune OST",
      album: "Deltarune Chapter 1 Soundtrack",
      filename: "Hip Shop.mp3",
      coverArt: "/music/covers/deltarune-hip-shop.jpg"
    },
    {
      title: "Fate",
      artist: "Fate Series OST",
      album: "Fate/Stay Night Soundtrack",
      filename: "fate.mp3",
      coverArt: "/music/covers/Fate_art.jpg"
    }
  ];

  // Fisher-Yates shuffle algorithm
  const shufflePlaylist = (array: Track[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const [playlist, setPlaylist] = useState(originalPlaylist);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [isChangingTrack, setIsChangingTrack] = useState(false);
  const playAttemptRef = useRef<AbortController | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isConnectedRef = useRef(false);
  
  const { theme, colors } = useTheme();
  const currentTrack = playlist[currentTrackIndex];

  // Shuffle playlist on mount
  useEffect(() => {
    console.log('🎵 Shuffling music playlist for fresh listening experience...');
    const shuffledPlaylist = shufflePlaylist(originalPlaylist);
    setPlaylist(shuffledPlaylist);
  }, []);

  // Audio visualizer setup
  const setupAudioContext = async () => {
    if (!audioRef.current) return false;

    try {
      // If already connected, disconnect first
      if (isConnectedRef.current && sourceRef.current && analyzerRef.current && audioContextRef.current) {
        try {
          sourceRef.current.disconnect();
          analyzerRef.current.disconnect();
        } catch (e) {
          console.log('Cleaning up previous audio context...');
        }
      }

      // Create new audio context if needed
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Resume suspended context
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Create new analyzer
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      analyzerRef.current.smoothingTimeConstant = 0.8;

      // Create new source
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      
      // Connect nodes
      sourceRef.current.connect(analyzerRef.current);
      analyzerRef.current.connect(audioContextRef.current.destination);
      
      isConnectedRef.current = true;
      console.log('Audio context setup completed successfully');
      return true;
    } catch (error) {
      console.error('Failed to setup audio context:', error);
      setError('Audio visualization unavailable');
      isConnectedRef.current = false;
      return false;
    }
  };

  // Initialize audio context on user interaction
  const initializeAudioContext = async () => {
    if (isConnectedRef.current) return true;
    
    const success = await setupAudioContext();
    if (success) {
      setError(null);
    }
    return success;
  };

  const drawVisualizer = () => {
    if (!analyzerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure canvas dimensions match display size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyzerRef.current.getByteFrequencyData(dataArray);
    
    // Clear the canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate bar dimensions
    const barWidth = (rect.width / bufferLength) * 2.5;
    const heightMultiplier = rect.height / 256;
    let x = 0;

    // Create gradient for bars - using chess theme colors
    const gradient = ctx.createLinearGradient(0, rect.height, 0, 0);
    gradient.addColorStop(0, theme === 'dark' ? '#4d9de0' : '#1a6fb0');
    gradient.addColorStop(0.5, theme === 'dark' ? '#2ec4b6' : '#16a699');
    gradient.addColorStop(1, theme === 'dark' ? '#ff3366' : '#e01e5a');

    // Draw frequency bars
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i] * heightMultiplier;
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, rect.height - barHeight, barWidth - 1, barHeight);
      
      x += barWidth;
    }
  };

  const startVisualizer = () => {
    if (!analyzerRef.current || !canvasRef.current) return;
    
    const animate = () => {
      drawVisualizer();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Stop any existing animation
    stopVisualizer();
    
    // Start new animation
    animate();
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Format time helper
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Track change effect
  useEffect(() => {
    const setupNewTrack = async () => {
      if (!audioRef.current) return;

      // Cancel any pending play attempts
      if (playAttemptRef.current) {
        playAttemptRef.current.abort();
      }
      playAttemptRef.current = new AbortController();
      const { signal } = playAttemptRef.current;

      try {
        setIsChangingTrack(true);
        // Reset connection state to force new setup
        isConnectedRef.current = false;
        
        // Stop current visualizer
        stopVisualizer();
        
        // Reset audio element
        audioRef.current.currentTime = 0;
        
        if (isPlaying) {
          try {
            // Small delay to ensure proper cleanup between tracks
            await new Promise(resolve => setTimeout(resolve, 50));
            if (signal.aborted) return;

            // This will trigger handlePlay which sets up the new context
            await audioRef.current.play();
          } catch (error: unknown) {
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error('Error auto-playing new track:', error);
              setIsPlaying(false);
            }
          }
        }
      } finally {
        setIsChangingTrack(false);
      }
    };

    setupNewTrack();

    return () => {
      if (playAttemptRef.current) {
        playAttemptRef.current.abort();
      }
    };
  }, [currentTrackIndex]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let playbackTimeout: NodeJS.Timeout;
    let visualizerTimeout: NodeJS.Timeout;

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const handlePlay = async () => {
      try {
        // Initialize audio context if not already done
        const success = await initializeAudioContext();
        if (success) {
          startVisualizer();
          setIsPlaying(true);
          setError(null);
        }
      } catch (error) {
        console.error('Error during play:', error);
        setError('Failed to start playback');
        setIsPlaying(false);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      stopVisualizer();
    };

    const handleEnded = () => {
      stopVisualizer();
      if (autoPlayEnabled) {
        nextTrack();
        // Ensure isPlaying stays true for autoplay
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    };

    const handleError = () => {
      console.error('Audio playback error');
      setError('Failed to load audio');
      setIsPlaying(false);
      stopVisualizer();
    };

    const handleCanPlay = async () => {
      if (!audioRef.current) return;

      try {
        if (isPlaying) {
          await audioRef.current.play();
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error auto-playing new track:', error);
          setIsPlaying(false);
        }
      }
    };

    // Effect for handling audio element events
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      if (playbackTimeout) clearTimeout(playbackTimeout);
      if (visualizerTimeout) clearTimeout(visualizerTimeout);
      
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [isPlaying, autoPlayEnabled]);

  const nextTrack = () => {
    if (isChangingTrack) return; // Prevent rapid track changes
    stopVisualizer();
    setCurrentTrackIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      return nextIndex >= playlist.length ? 0 : nextIndex;
    });
  };

  const previousTrack = () => {
    if (isChangingTrack) return; // Prevent rapid track changes
    stopVisualizer();
    setCurrentTrackIndex((prevIndex) => {
      const prevTrackIndex = prevIndex - 1;
      return prevTrackIndex < 0 ? playlist.length - 1 : prevTrackIndex;
    });
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(false);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleAutoPlay = () => {
    setAutoPlayEnabled(prev => !prev);
  };

  const togglePlay = async () => {
    if (isChangingTrack) return; // Prevent toggle during track change

    try {
      if (!isPlaying) {
        await initializeAudioContext();
        await audioRef.current?.play();
      } else {
        audioRef.current?.pause();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setError('Failed to toggle playback');
      setIsPlaying(false);
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={`/music/${currentTrack.filename}`}
        preload="metadata"
        playsInline
        key={currentTrackIndex}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 1 }}
        className={`fixed bottom-6 right-6 z-50 ${isMinimized ? 'w-20 h-20' : 'w-96'} transition-all duration-500`}
      >
        {/* Chess-themed background with animated elements */}
        <div className="relative">
          {/* Animated background orbs */}
          <motion.div
            className="absolute inset-0 rounded-3xl opacity-20"
            animate={{
              background: [
                'radial-gradient(circle at 20% 80%, rgba(79, 70, 229, 0.3) 0%, transparent 50%)',
                'radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.3) 0%, transparent 50%)',
                'radial-gradient(circle at 40% 40%, rgba(236, 72, 153, 0.3) 0%, transparent 50%)',
                'radial-gradient(circle at 20% 80%, rgba(79, 70, 229, 0.3) 0%, transparent 50%)'
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Main player container with glassmorphism */}
          <motion.div
            className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden"
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence>
              {!isMinimized ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-6"
                >
                  {/* Header with chess piece icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="text-2xl"
                        animate={{ rotate: isPlaying ? [0, 360] : 0 }}
                        transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                      >
                        ♔
                      </motion.div>
                      <div>
                        <div className="text-white font-semibold text-sm">
                          {error ? 'Error' : isPlaying ? 'Now Playing' : 'Paused'}
                        </div>
                        <div className="text-white/60 text-xs">
                          {currentTrackIndex + 1}/{playlist.length} • Music Player
                        </div>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => setIsMinimized(true)}
                      className="p-2 rounded-xl hover:bg-white/10 transition-all duration-300 text-white/70 hover:text-white"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Minimize2 size={16} />
                    </motion.button>
                  </div>

                  {/* Error message */}
                  {error && (
                    <motion.div 
                      className="mb-4 p-3 rounded-xl text-xs bg-red-500/20 border border-red-500/30 text-red-300"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {error}
                    </motion.div>
                  )}

                  {/* Track Info with cover art */}
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div 
                      className="w-20 h-20 rounded-xl overflow-hidden relative"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      {currentTrack.coverArt ? (
                        <img
                          src={currentTrack.coverArt}
                          alt={`${currentTrack.title} cover art`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div 
                        className="absolute inset-0 w-full h-full rounded-xl flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`,
                          display: currentTrack.coverArt ? 'none' : 'flex'
                        }}
                      >
                        <Music size={24} style={{ color: colors.primary }} />
                      </div>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm truncate">
                        {currentTrack.title}
                      </div>
                      <div className="text-white/70 text-xs truncate">
                        {currentTrack.artist}
                      </div>
                      <div className="text-white/50 text-xs truncate">
                        {currentTrack.album}
                      </div>
                    </div>
                  </div>

                  {/* Audio Visualizer */}
                  <div className="mb-4">
                    <div 
                      className="w-full h-16 rounded-xl overflow-hidden relative"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <canvas
                        ref={canvasRef}
                        width={384}
                        height={64}
                        className="w-full h-full"
                        style={{ 
                          filter: isPlaying ? 'none' : 'opacity(0.6)',
                          transition: 'filter 0.3s ease'
                        }}
                      />
                      
                      {/* Center line */}
                      <div 
                        className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-px opacity-20"
                        style={{ backgroundColor: colors.primary }}
                      />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div 
                      className="w-full h-2 rounded-full cursor-pointer relative bg-white/10"
                      onClick={handleProgressClick}
                    >
                      <motion.div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${progressPercentage}%`,
                          background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-white/60">{formatTime(currentTime)}</span>
                      <span className="text-white/60">{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={previousTrack}
                        className="p-2 rounded-xl hover:bg-white/10 transition-all duration-300 text-white/70 hover:text-white"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={playlist.length <= 1}
                      >
                        <SkipBack size={18} />
                      </motion.button>

                      <motion.button
                        onClick={togglePlay}
                        className="p-3 rounded-xl transition-all duration-300 text-white"
                        style={{ 
                          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                          boxShadow: `0 4px 15px ${colors.primary}40`
                        }}
                        whileHover={{ scale: 1.05, boxShadow: `0 6px 20px ${colors.primary}60` }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isPlaying ? (
                          <Pause size={20} />
                        ) : (
                          <Play size={20} style={{ marginLeft: '2px' }} />
                        )}
                      </motion.button>

                      <motion.button
                        onClick={nextTrack}
                        className="p-2 rounded-xl hover:bg-white/10 transition-all duration-300 text-white/70 hover:text-white"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={playlist.length <= 1}
                      >
                        <SkipForward size={18} />
                      </motion.button>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={toggleAutoPlay}
                        className="p-2 rounded-xl hover:bg-white/10 transition-all duration-300"
                        style={{ 
                          backgroundColor: autoPlayEnabled ? `${colors.primary}20` : 'rgba(255, 255, 255, 0.05)',
                          border: autoPlayEnabled ? `1px solid ${colors.primary}40` : '1px solid transparent'
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={`Auto-play: ${autoPlayEnabled ? 'On' : 'Off'}`}
                      >
                        {autoPlayEnabled ? (
                          <Repeat size={16} style={{ color: colors.primary }} />
                        ) : (
                          <RotateCcw size={16} className="text-white/60" />
                        )}
                      </motion.button>

                      <motion.button
                        onClick={toggleMute}
                        className="p-2 rounded-xl hover:bg-white/10 transition-all duration-300 text-white/70 hover:text-white"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isMuted ? (
                          <VolumeX size={16} />
                        ) : (
                          <Volume2 size={16} />
                        )}
                      </motion.button>
                      
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-2 rounded-full appearance-none cursor-pointer bg-white/10"
                        style={{
                          background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.2) 100%)`
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 flex items-center justify-center h-full"
                >
                  <motion.button
                    onClick={() => setIsMinimized(false)}
                    className="absolute top-2 right-2 p-1 rounded-lg hover:bg-white/10 transition-all duration-300 text-white/70 hover:text-white"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Maximize2 size={12} />
                  </motion.button>
                  <motion.button
                    onClick={togglePlay}
                    className="p-3 rounded-xl transition-all duration-300 text-white"
                    style={{ 
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                      boxShadow: `0 4px 15px ${colors.primary}40`
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isPlaying ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} style={{ marginLeft: '1px' }} />
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}; 