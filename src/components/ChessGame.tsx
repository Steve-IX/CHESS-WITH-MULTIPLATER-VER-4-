'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChessGameProps, Position, Piece, Move } from '@/lib/types';
import { calculateLegalMoves, makeMove, createInitialBoard } from '@/lib/chess';

export function ChessGame({
  gameState: initialGameState,
  gameMode = 'local',
  playerColor = 'white',
  isSpectator = false,
  onMove,
}: ChessGameProps) {
  const [gameState, setGameState] = useState(initialGameState || {
    board: createInitialBoard(),
    currentPlayer: 'white',
    moveHistory: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    capturedPieces: { white: [], black: [] },
  });

  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [hoveredSquare, setHoveredSquare] = useState<Position | null>(null);

  useEffect(() => {
    if (initialGameState) {
      setGameState(initialGameState);
    }
  }, [initialGameState]);

  const handleSquareClick = (position: Position) => {
    if (isSpectator || (gameMode !== 'local' && gameState.currentPlayer !== playerColor)) {
      return;
    }

    const piece = gameState.board[position.x][position.y];

    // If no piece is selected and clicked square has a piece of current player's color
    if (!selectedSquare && piece && piece.color === gameState.currentPlayer) {
      setSelectedSquare(position);
      setLegalMoves(calculateLegalMoves(gameState, position));
      return;
    }

    // If a piece is selected
    if (selectedSquare) {
      // Check if clicked square is a legal move
      const isLegalMove = legalMoves.some(
        move => move.x === position.x && move.y === position.y
      );

      if (isLegalMove) {
        const move: Move = {
          from: selectedSquare,
          to: position,
          piece: gameState.board[selectedSquare.x][selectedSquare.y]!,
          capturedPiece: gameState.board[position.x][position.y] || undefined,
        };

        const newGameState = makeMove(gameState, move);
        setGameState(newGameState);
        onMove?.(move);
      }

      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }
  };

  const renderSquare = (x: number, y: number) => {
    const isLight = (x + y) % 2 === 0;
    const piece = gameState.board[x][y];
    const isSelected = selectedSquare?.x === x && selectedSquare?.y === y;
    const isLegalMove = legalMoves.some(move => move.x === x && move.y === y);
    const isHovered = hoveredSquare?.x === x && hoveredSquare?.y === y;

    return (
      <div
        key={`${x}-${y}`}
        className={`
          relative w-16 h-16 flex items-center justify-center
          ${isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
          ${isSelected ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}
          ${isLegalMove ? 'ring-4 ring-green-400 ring-opacity-50' : ''}
          ${isHovered ? 'ring-2 ring-blue-300 ring-opacity-30' : ''}
        `}
        onClick={() => handleSquareClick({ x, y })}
        onMouseEnter={() => setHoveredSquare({ x, y })}
        onMouseLeave={() => setHoveredSquare(null)}
      >
        {piece && (
          <motion.div
            className="w-12 h-12 flex items-center justify-center"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {renderPiece(piece)}
          </motion.div>
        )}
      </div>
    );
  };

  const renderPiece = (piece: Piece) => {
    const pieceSymbols: Record<string, string> = {
      'white-pawn': '♙',
      'white-rook': '♖',
      'white-knight': '♘',
      'white-bishop': '♗',
      'white-queen': '♕',
      'white-king': '♔',
      'black-pawn': '♟',
      'black-rook': '♜',
      'black-knight': '♞',
      'black-bishop': '♝',
      'black-queen': '♛',
      'black-king': '♚',
    };

    const symbol = pieceSymbols[`${piece.color}-${piece.type}`];
    return (
      <span className={`text-4xl ${piece.color === 'white' ? 'text-white' : 'text-black'}`}>
        {symbol}
      </span>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          {gameState.isCheckmate
            ? `Checkmate! ${gameState.currentPlayer === 'white' ? 'Black' : 'White'} wins!`
            : gameState.isStalemate
            ? 'Stalemate!'
            : `${gameState.currentPlayer === 'white' ? 'White' : 'Black'}'s turn`}
        </h2>
      </div>

      <div className="grid grid-cols-8 gap-0 border-2 border-gray-800">
        {Array.from({ length: 8 }, (_, x) =>
          Array.from({ length: 8 }, (_, y) => renderSquare(x, y))
        )}
      </div>

      <div className="mt-4 flex gap-4">
        <div>
          <h3 className="font-semibold">Captured by White:</h3>
          <div className="flex gap-1">
            {gameState.capturedPieces.white.map((piece, i) => (
              <span key={i}>{renderPiece(piece)}</span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold">Captured by Black:</h3>
          <div className="flex gap-1">
            {gameState.capturedPieces.black.map((piece, i) => (
              <span key={i}>{renderPiece(piece)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 