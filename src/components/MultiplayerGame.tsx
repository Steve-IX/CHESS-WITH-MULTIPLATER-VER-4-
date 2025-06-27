import { useState, useCallback } from 'react';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { ChessGame } from '@/components/ChessGame';
import { GameState, Move } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function MultiplayerGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [joinGameId, setJoinGameId] = useState('');
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);

  const handleGameStateUpdate = useCallback((newState: GameState) => {
    setGameState(newState);
  }, []);

  const handleOpponentJoined = useCallback(() => {
    setIsWaitingForOpponent(false);
    toast.success('Opponent joined the game!');
  }, []);

  const handleOpponentDisconnected = useCallback(() => {
    toast.error('Opponent disconnected');
    setGameState(null);
    setIsWaitingForOpponent(false);
  }, []);

  const {
    createGame,
    joinGame,
    makeMove,
    isConnected,
    gameId,
    playerColor,
  } = useMultiplayer({
    onGameStateUpdate: handleGameStateUpdate,
    onOpponentJoined: handleOpponentJoined,
    onOpponentDisconnected: handleOpponentDisconnected,
  });

  const handleCreateGame = async () => {
    try {
      const { gameId } = await createGame();
      setIsWaitingForOpponent(true);
      toast.success(`Game created! Share this code with your friend: ${gameId}`);
    } catch (error) {
      toast.error('Failed to create game');
    }
  };

  const handleJoinGame = async () => {
    try {
      const response = await joinGame(joinGameId.toUpperCase());
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success('Successfully joined game!');
      }
    } catch (error) {
      toast.error('Failed to join game');
    }
  };

  const handleMove = (move: Move) => {
    if (gameState?.currentPlayer !== playerColor) {
      toast.error("It's not your turn!");
      return;
    }
    makeMove(move);
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connecting to server...</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-6">Chess Online</h1>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleCreateGame}
              className="w-full"
              disabled={isWaitingForOpponent}
            >
              {isWaitingForOpponent ? 'Waiting for opponent...' : 'Create New Game'}
            </Button>

            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter game code"
                value={joinGameId}
                onChange={(e) => setJoinGameId(e.target.value.toUpperCase())}
                maxLength={6}
                className="flex-1"
              />
              <Button onClick={handleJoinGame} disabled={!joinGameId}>
                Join Game
              </Button>
            </div>
          </div>

          {gameId && isWaitingForOpponent && (
            <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
              <p className="text-center text-yellow-800">
                Share this game code with your friend:
                <br />
                <span className="font-mono text-2xl font-bold">{gameId}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col items-center">
        <div className="mb-4">
          <span className="font-semibold">Game Code: </span>
          <span className="font-mono">{gameId}</span>
        </div>
        
        <ChessGame
          gameState={gameState}
          onMove={handleMove}
          playerColor={playerColor}
          isSpectator={playerColor === 'spectator'}
        />
      </div>
    </div>
  );
} 