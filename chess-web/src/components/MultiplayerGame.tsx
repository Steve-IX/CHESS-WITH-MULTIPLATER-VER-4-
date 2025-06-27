'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { ChessGame } from './ChessGame';
import { PlayerColor } from '@/lib/types';

export function MultiplayerGame() {
  const [gameId, setGameId] = useState<string>('');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('white');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);

  const handleCreateGame = () => {
    setIsHost(true);
    setPlayerColor('white');
    setGameId(Math.random().toString(36).substring(2, 8).toUpperCase());
    setIsGameStarted(true);
  };

  const handleJoinGame = () => {
    setIsJoining(true);
  };

  const handleJoinSubmit = () => {
    setPlayerColor('black');
    setIsGameStarted(true);
  };

  if (!isGameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">Online Chess</h1>
            <p className="text-gray-600">Play with a friend online</p>
          </div>

          {!isJoining ? (
            <div className="space-y-4">
              <Button
                onClick={handleCreateGame}
                className="w-full h-16 text-lg"
                variant="outline"
              >
                Create New Game
              </Button>

              <Button
                onClick={handleJoinGame}
                className="w-full h-16 text-lg"
                variant="outline"
              >
                Join Game
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value.toUpperCase())}
                placeholder="Enter Game ID"
                className="w-full p-4 text-lg border rounded"
                maxLength={6}
              />

              <Button
                onClick={handleJoinSubmit}
                className="w-full h-16 text-lg"
                variant="outline"
                disabled={gameId.length !== 6}
              >
                Join
              </Button>

              <Button
                onClick={() => setIsJoining(false)}
                className="w-full h-16 text-lg"
                variant="ghost"
              >
                Back
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col items-center">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Game ID: {gameId}</h2>
          <p className="text-gray-600">
            {isHost ? 'Share this ID with your opponent' : 'Connected as Black'}
          </p>
        </div>

        <Button
          onClick={() => {
            setIsGameStarted(false);
            setIsJoining(false);
            setGameId('');
          }}
          className="mb-8"
          variant="outline"
        >
          ← Leave Game
        </Button>

        <ChessGame
          gameMode="online"
          playerColor={playerColor}
          isSpectator={false}
        />
      </div>
    </div>
  );
} 