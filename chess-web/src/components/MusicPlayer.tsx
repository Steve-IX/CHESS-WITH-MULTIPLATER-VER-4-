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
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // Track if user has ever played music
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false); // Track if user is seeking
  const [lastSeekTime, setLastSeekTime] = useState(0); // Track last seek operation
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isConnectedRef = useRef(false);
  
  const { theme, colors } = useTheme();
  const currentTrack = playlist[currentTrackIndex];

  // Dynamic text color based on theme
  const getContrastTextColor = () => {
    return theme === 'dark' ? 'text-white' : 'text-gray-900';
  };

  const getSecondaryTextColor = () => {
    return theme === 'dark' ? 'text-white/70' : 'text-gray-700';
  };

  const getMutedTextColor = () => {
    return theme === 'dark' ? 'text-white/50' : 'text-gray-500';
  };

  const getPlayerBackgroundColor = () => {
    return theme === 'dark' 
      ? 'bg-black/20 backdrop-blur-xl border-white/30' 
      : 'bg-white/90 backdrop-blur-xl border-gray-400/50';
  };

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

  const changeTrack = useCallback((direction: 'next' | 'previous') => {
    console.log(`Changing track ${direction}`);
    
    if (direction === 'next') {
      setCurrentTrackIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        return nextIndex >= playlist.length ? 0 : nextIndex;
      });
    } else {
      setCurrentTrackIndex((prevIndex) => {
        const newIndex = prevIndex - 1;
        return newIndex < 0 ? playlist.length - 1 : newIndex;
      });
    }
  }, [playlist.length]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Track change effect - handles auto-play continuation
  useEffect(() => {
    // Reset basic states for new track
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setIsSeeking(false);
    
    // Reset connection state for new audio setup
    isConnectedRef.current = false;
    stopVisualizer();
    
    // If was playing, continue playing the new track
    if (isPlaying && hasUserInteracted && audioRef.current) {
      const playNewTrack = async () => {
        try {
          // Small delay to ensure audio element is ready with new source
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (audioRef.current) {
            // Set volume
            audioRef.current.volume = isMuted ? 0 : volume;
            
            // Wait for canplay if needed
            if (audioRef.current.readyState < 2) {
              await new Promise((resolve) => {
                const onCanPlay = () => {
                  if (audioRef.current) {
                    audioRef.current.removeEventListener('canplay', onCanPlay);
                  }
                  resolve(undefined);
                };
                if (audioRef.current) {
                  audioRef.current.addEventListener('canplay', onCanPlay);
                }
              });
            }
            
            // Play the new track
            await audioRef.current.play();
            console.log('🎵 Auto-play successful for new track');
            
          }
        } catch (error) {
          console.error('Error auto-playing new track:', error);
          setIsPlaying(false);
          setError('Failed to auto-play new track');
        }
      };
      
      playNewTrack();
    }
  }, [currentTrackIndex]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let playbackTimeout: NodeJS.Timeout | undefined;
    let visualizerTimeout: NodeJS.Timeout | undefined;

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
        // Always set the audio element's volume to the current state
        audioRef.current.volume = volume;
        
        // Sync state when metadata loads
        setTimeout(() => {
          if (audioRef.current) {
            const actuallyPlaying = !audioRef.current.paused && !audioRef.current.ended;
            if (actuallyPlaying !== isPlaying) {
              setIsPlaying(actuallyPlaying);
            }
          }
        }, 50);
      }
    };

    const handleTimeUpdate = () => {
      if (audioRef.current && !isSeeking) {
        // Only update currentTime if we're not currently seeking
        // This prevents conflicts between user seeking and natural playback
        const newTime = audioRef.current.currentTime;
        if (Math.abs(newTime - lastSeekTime) > 0.5 || lastSeekTime === 0) {
          setCurrentTime(newTime);
        }
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
      console.log('Track ended:', currentTrack.title);
      stopVisualizer();
      setIsPlaying(false);
      
      // Auto-play next track if enabled and user has interacted
      if (autoPlayEnabled && hasUserInteracted) {
        console.log('Auto-play enabled, moving to next track...');
        setTimeout(() => {
          const nextIndex = (currentTrackIndex + 1) >= playlist.length ? 0 : currentTrackIndex + 1;
          console.log(`🎵 Auto-advancing to track ${nextIndex + 1}: ${playlist[nextIndex].title}`);
          
          // Set the next track
          setCurrentTrackIndex(nextIndex);
          
          // Set playing state for auto-play continuation
          setIsPlaying(true);
          
        }, 300); // Small delay for smooth transition
      }
    };

    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      console.error('Audio playback error for:', target?.src || 'unknown source');
      setError(`Failed to load audio: ${currentTrack.title}`);
      setIsPlaying(false);
      stopVisualizer();
      
      // If there's an error loading, don't try to autoplay
      setHasUserInteracted(false);
    };

    const handleCanPlay = async () => {
      if (!audioRef.current) return;

      try {
        // Only auto-play if user has interacted and music should be playing
        if (isPlaying && hasUserInteracted) {
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
  }, [isPlaying, autoPlayEnabled, hasUserInteracted]);

  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);

  // Simple minimize toggle
  const handleMinimizeToggle = useCallback((minimize: boolean) => {
    setIsMinimized(minimize);
  }, []);

  const nextTrack = () => {
    changeTrack('next');
  };

  const previousTrack = () => {
    changeTrack('previous');
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    
    try {
      setIsSeeking(true); // Mark that we're seeking
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width)); // Clamp between 0 and 1
    const newTime = percentage * duration;
    
      // Clear any existing seek timeout
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
      
      // Update audio currentTime
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
      setLastSeekTime(newTime);
      
      // Clear seeking state after a short delay
      seekTimeoutRef.current = setTimeout(() => {
        setIsSeeking(false);
      }, 200);
      
    } catch (error) {
      console.error('Error seeking:', error);
      setError('Failed to seek');
      setIsSeeking(false);
    }
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
    if (!audioRef.current) {
      setError('Audio not ready');
      return;
    }

    try {
      if (isPlaying) {
        // Currently playing - pause
        audioRef.current.pause();
        setIsPlaying(false);
        console.log('Playback paused');
      } else {
        // Currently paused - play
        setHasUserInteracted(true);
        await initializeAudioContext();
        
        setIsPlaying(true);
        await audioRef.current.play();
        console.log('Playback started');
      }
      
      setError(null);
      
    } catch (error) {
      console.error('Error toggling playback:', error);
      setIsPlaying(false);
      setError('Failed to toggle playback');
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
        className={`fixed bottom-2 right-2 sm:bottom-4 sm:right-4 lg:bottom-6 lg:right-6 z-50 ${
          isMinimized 
            ? 'w-16 h-16 sm:w-20 sm:h-20' 
            : 'w-80 sm:w-96 max-w-[calc(100vw-1rem)] sm:max-w-none'
        } transition-all duration-500`}
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
            className={`${getPlayerBackgroundColor()} rounded-3xl shadow-2xl border border-white/30 overflow-hidden`}
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
                  className="p-3 sm:p-4 lg:p-6"
                >
                  {/* Header with chess piece icon */}
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <motion.div
                        className="text-lg sm:text-xl lg:text-2xl flex-shrink-0"
                        animate={{ rotate: isPlaying ? [0, 360] : 0 }}
                        transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                      >
                        ♔
                      </motion.div>
                      <div className="min-w-0 flex-1">
                        <div className={`${getContrastTextColor()} font-semibold text-xs sm:text-sm`}>
                          {error ? 'Error' : isPlaying ? 'Now Playing' : 'Paused'}
                        </div>
                        <div className={`${getSecondaryTextColor()} text-xs hidden sm:block`}>
                          {currentTrackIndex + 1}/{playlist.length} • Music Player
                        </div>
                      </div>
                    </div>
                    <motion.button
                      onClick={() => handleMinimizeToggle(true)}
                      className={`p-1.5 sm:p-2 rounded-xl ${
                        theme === 'dark' 
                          ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                          : 'hover:bg-gray-200/60 text-gray-600 hover:text-gray-800'
                      } transition-all duration-300 flex-shrink-0`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Minimize2 size={14} className="sm:w-4 sm:h-4" />
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
                  <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
                    <motion.div 
                      className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-lg sm:rounded-xl overflow-hidden relative flex-shrink-0"
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
                        className="absolute inset-0 w-full h-full rounded-lg sm:rounded-xl flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`,
                          display: currentTrack.coverArt ? 'none' : 'flex'
                        }}
                      >
                        <Music size={16} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6" style={{ color: colors.primary }} />
                      </div>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className={`${getContrastTextColor()} font-semibold text-xs sm:text-sm truncate`}>
                        {currentTrack.title}
                      </div>
                      <div className={`${getSecondaryTextColor()} text-xs truncate`}>
                        {currentTrack.artist}
                      </div>
                      <div className={`${getMutedTextColor()} text-xs truncate hidden sm:block`}>
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
                      <span className={`${getSecondaryTextColor()}`}>{formatTime(currentTime)}</span>
                      <span className={`${getSecondaryTextColor()}`}>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <motion.button
                        onClick={previousTrack}
                        className={`p-1.5 sm:p-2 rounded-xl transition-all duration-300 ${
                          theme === 'dark' 
                            ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                            : 'hover:bg-gray-200/60 text-gray-600 hover:text-gray-800'
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={playlist.length <= 1}
                      >
                        <SkipBack size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </motion.button>

                      <motion.button
                        onClick={togglePlay}
                        className="p-2 sm:p-3 rounded-xl transition-all duration-300 text-white"
                        style={{ 
                          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                          boxShadow: `0 4px 15px ${colors.primary}40`
                        }}
                        whileHover={{ scale: 1.05, boxShadow: `0 6px 20px ${colors.primary}60` }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isPlaying ? (
                          <Pause size={18} className="sm:w-5 sm:h-5" />
                        ) : (
                          <Play size={18} className="sm:w-5 sm:h-5" style={{ marginLeft: '1px' }} />
                        )}
                      </motion.button>

                      <motion.button
                        onClick={nextTrack}
                        className={`p-1.5 sm:p-2 rounded-xl transition-all duration-300 ${
                          theme === 'dark' 
                            ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                            : 'hover:bg-gray-200/60 text-gray-600 hover:text-gray-800'
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={playlist.length <= 1}
                      >
                        <SkipForward size={16} className="sm:w-[18px] sm:h-[18px]" />
                      </motion.button>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                      <motion.button
                        onClick={toggleAutoPlay}
                        className="p-1.5 sm:p-2 rounded-xl hover:bg-white/10 transition-all duration-300"
                        style={{ 
                          backgroundColor: autoPlayEnabled ? `${colors.primary}20` : 'rgba(255, 255, 255, 0.05)',
                          border: autoPlayEnabled ? `1px solid ${colors.primary}40` : '1px solid transparent'
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={`Auto-play: ${autoPlayEnabled ? 'On' : 'Off'}`}
                      >
                        {autoPlayEnabled ? (
                          <Repeat size={14} className="sm:w-4 sm:h-4" style={{ color: colors.primary }} />
                        ) : (
                          <RotateCcw size={14} className="sm:w-4 sm:h-4 text-white/60" />
                        )}
                      </motion.button>

                      <motion.button
                        onClick={toggleMute}
                        className="p-1.5 sm:p-2 rounded-xl hover:bg-white/10 transition-all duration-300 text-white/70 hover:text-white"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isMuted ? (
                          <VolumeX size={14} className="sm:w-4 sm:h-4" />
                        ) : (
                          <Volume2 size={14} className="sm:w-4 sm:h-4" />
                        )}
                      </motion.button>
                      
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-12 sm:w-16 h-2 rounded-full appearance-none cursor-pointer bg-white/10"
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
                    onClick={() => handleMinimizeToggle(false)}
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