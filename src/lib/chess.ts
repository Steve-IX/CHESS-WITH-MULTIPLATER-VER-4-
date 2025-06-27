import { GameState, Position, Piece, Move, PieceType } from './types';

export function createInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));

  // Place pawns
  for (let i = 0; i < 8; i++) {
    board[1][i] = { type: 'pawn', color: 'black', hasMoved: false };
    board[6][i] = { type: 'pawn', color: 'white', hasMoved: false };
  }

  // Place other pieces
  const pieces: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let i = 0; i < 8; i++) {
    board[0][i] = { type: pieces[i], color: 'black', hasMoved: false };
    board[7][i] = { type: pieces[i], color: 'white', hasMoved: false };
  }

  return board;
}

export function calculateLegalMoves(gameState: GameState, position: Position): Position[] {
  const piece = gameState.board[position.x][position.y];
  if (!piece) return [];

  const moves: Position[] = [];
  const { x, y } = position;

  switch (piece.type) {
    case 'pawn':
      // Forward moves
      const direction = piece.color === 'white' ? -1 : 1;
      const startRank = piece.color === 'white' ? 6 : 1;

      // Single step forward
      if (x + direction >= 0 && x + direction < 8 && !gameState.board[x + direction][y]) {
        moves.push({ x: x + direction, y });

        // Double step from starting position
        if (x === startRank && !gameState.board[x + direction * 2][y]) {
          moves.push({ x: x + direction * 2, y });
        }
      }

      // Captures
      for (const dy of [-1, 1]) {
        if (y + dy >= 0 && y + dy < 8) {
          const targetPiece = gameState.board[x + direction][y + dy];
          if (targetPiece && targetPiece.color !== piece.color) {
            moves.push({ x: x + direction, y: y + dy });
          }
        }
      }
      break;

    case 'knight':
      const knightMoves = [
        { dx: -2, dy: -1 }, { dx: -2, dy: 1 },
        { dx: -1, dy: -2 }, { dx: -1, dy: 2 },
        { dx: 1, dy: -2 }, { dx: 1, dy: 2 },
        { dx: 2, dy: -1 }, { dx: 2, dy: 1 }
      ];

      for (const move of knightMoves) {
        const newX = x + move.dx;
        const newY = y + move.dy;
        if (newX >= 0 && newX < 8 && newY >= 0 && newY < 8) {
          const targetPiece = gameState.board[newX][newY];
          if (!targetPiece || targetPiece.color !== piece.color) {
            moves.push({ x: newX, y: newY });
          }
        }
      }
      break;

    case 'bishop':
    case 'rook':
    case 'queen':
      const directions = piece.type === 'rook'
        ? [[0, 1], [0, -1], [1, 0], [-1, 0]]
        : piece.type === 'bishop'
        ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
        : [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

      for (const [dx, dy] of directions) {
        let newX = x + dx;
        let newY = y + dy;
        while (newX >= 0 && newX < 8 && newY >= 0 && newY < 8) {
          const targetPiece = gameState.board[newX][newY];
          if (!targetPiece) {
            moves.push({ x: newX, y: newY });
          } else {
            if (targetPiece.color !== piece.color) {
              moves.push({ x: newX, y: newY });
            }
            break;
          }
          newX += dx;
          newY += dy;
        }
      }
      break;

    case 'king':
      const kingMoves = [
        { dx: -1, dy: -1 }, { dx: -1, dy: 0 }, { dx: -1, dy: 1 },
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 }
      ];

      for (const move of kingMoves) {
        const newX = x + move.dx;
        const newY = y + move.dy;
        if (newX >= 0 && newX < 8 && newY >= 0 && newY < 8) {
          const targetPiece = gameState.board[newX][newY];
          if (!targetPiece || targetPiece.color !== piece.color) {
            moves.push({ x: newX, y: newY });
          }
        }
      }
      break;
  }

  return moves;
}

export function makeMove(gameState: GameState, move: Move): GameState {
  const newBoard = gameState.board.map(row => [...row]);
  const newCapturedPieces = {
    white: [...gameState.board[move.to.x][move.to.y]?.color === 'black' ? [...gameState.capturedPieces.white, gameState.board[move.to.x][move.to.y]!] : gameState.capturedPieces.white],
    black: [...gameState.board[move.to.x][move.to.y]?.color === 'white' ? [...gameState.capturedPieces.black, gameState.board[move.to.x][move.to.y]!] : gameState.capturedPieces.black],
  };

  // Update piece position
  newBoard[move.to.x][move.to.y] = {
    ...move.piece,
    hasMoved: true,
  };
  newBoard[move.from.x][move.from.y] = null;

  // Check for pawn promotion
  if (move.piece.type === 'pawn' && (move.to.x === 0 || move.to.x === 7)) {
    newBoard[move.to.x][move.to.y] = {
      ...newBoard[move.to.x][move.to.y]!,
      type: 'queen', // Auto-promote to queen for now
    };
  }

  return {
    ...gameState,
    board: newBoard,
    currentPlayer: gameState.currentPlayer === 'white' ? 'black' : 'white',
    moveHistory: [...gameState.moveHistory, move],
    capturedPieces: newCapturedPieces,
  };
} 