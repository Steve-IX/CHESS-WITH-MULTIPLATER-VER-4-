import React, { useRef, useState } from 'react';

const MusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = async () => {
    try {
      await audioRef.current?.play();
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error auto-playing new track:', error);
        setIsPlaying(false);
      }
    }
  };

  return (
    <div>
      {/* Rest of the component code */}
    </div>
  );
};

export default MusicPlayer; 