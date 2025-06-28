import { GameState, Position, Piece, Move, PieceType, PlayerColor } from './types';

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
  if (!piece || piece.color !== gameState.currentPlayer) return [];

  const pseudoLegalMoves = getPseudoLegalMoves(gameState, position, true);
  
  // Filter out moves that would leave the king in check
  return pseudoLegalMoves.filter(move => {
    const testGameState = makeTestMove(gameState, { from: position, to: move, piece });
    return !isInCheck(testGameState, gameState.currentPlayer);
  });
}

function getPseudoLegalMoves(gameState: GameState, position: Position, includeCastling: boolean = false): Position[] {
  const piece = gameState.board[position.x][position.y];
  if (!piece) return [];

  const moves: Position[] = [];
  const { x, y } = position;

  switch (piece.type) {
    case 'pawn':
      moves.push(...getPawnMoves(gameState, x, y, piece.color));
      break;
    case 'rook':
      moves.push(...getRookMoves(gameState, x, y, piece.color));
      break;
    case 'knight':
      moves.push(...getKnightMoves(gameState, x, y, piece.color));
      break;
    case 'bishop':
      moves.push(...getBishopMoves(gameState, x, y, piece.color));
      break;
    case 'queen':
      moves.push(...getQueenMoves(gameState, x, y, piece.color));
      break;
    case 'king':
      if (includeCastling) {
        moves.push(...getKingMovesWithCastling(gameState, x, y, piece.color));
      } else {
        moves.push(...getKingMoves(gameState, x, y, piece.color));
      }
      break;
  }

  return moves;
}

function getPawnMoves(gameState: GameState, x: number, y: number, color: PlayerColor): Position[] {
  const moves: Position[] = [];
  const direction = color === 'white' ? -1 : 1;
  const startRank = color === 'white' ? 6 : 1;

  // Forward move
  if (isValidPosition(x + direction, y) && !gameState.board[x + direction][y]) {
    moves.push({ x: x + direction, y });

    // Double move from starting position
    if (x === startRank && !gameState.board[x + 2 * direction][y]) {
      moves.push({ x: x + 2 * direction, y });
    }
  }

  // Captures
  for (const dy of [-1, 1]) {
    if (isValidPosition(x + direction, y + dy)) {
      const targetPiece = gameState.board[x + direction][y + dy];
      if (targetPiece && targetPiece.color !== color) {
        moves.push({ x: x + direction, y: y + dy });
      }
    }
  }

  // En passant
  if (gameState.enPassantTarget) {
    const enPassantX = gameState.enPassantTarget.x;
    const enPassantY = gameState.enPassantTarget.y;
    if (x + direction === enPassantX && Math.abs(y - enPassantY) === 1) {
      moves.push({ x: enPassantX, y: enPassantY });
    }
  }

  return moves;
}

function getRookMoves(gameState: GameState, x: number, y: number, color: PlayerColor): Position[] {
  const moves: Position[] = [];
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (const [dx, dy] of directions) {
    let newX = x + dx;
    let newY = y + dy;
    while (isValidPosition(newX, newY)) {
      const targetPiece = gameState.board[newX][newY];
      if (!targetPiece) {
        moves.push({ x: newX, y: newY });
      } else {
        if (targetPiece.color !== color) {
          moves.push({ x: newX, y: newY });
        }
        break;
      }
      newX += dx;
      newY += dy;
    }
  }

  return moves;
}

function getKnightMoves(gameState: GameState, x: number, y: number, color: PlayerColor): Position[] {
  const moves: Position[] = [];
  const knightMoves = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];

  for (const [dx, dy] of knightMoves) {
    const newX = x + dx;
    const newY = y + dy;
    if (isValidPosition(newX, newY)) {
      const targetPiece = gameState.board[newX][newY];
      if (!targetPiece || targetPiece.color !== color) {
        moves.push({ x: newX, y: newY });
      }
    }
  }

  return moves;
}

function getBishopMoves(gameState: GameState, x: number, y: number, color: PlayerColor): Position[] {
  const moves: Position[] = [];
  const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  for (const [dx, dy] of directions) {
    let newX = x + dx;
    let newY = y + dy;
    while (isValidPosition(newX, newY)) {
      const targetPiece = gameState.board[newX][newY];
      if (!targetPiece) {
        moves.push({ x: newX, y: newY });
      } else {
        if (targetPiece.color !== color) {
          moves.push({ x: newX, y: newY });
        }
        break;
      }
      newX += dx;
      newY += dy;
    }
  }

  return moves;
}

function getQueenMoves(gameState: GameState, x: number, y: number, color: PlayerColor): Position[] {
  return [
    ...getRookMoves(gameState, x, y, color),
    ...getBishopMoves(gameState, x, y, color)
  ];
}

function getKingMoves(gameState: GameState, x: number, y: number, color: PlayerColor): Position[] {
  const moves: Position[] = [];
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  // Regular king moves (one square in any direction)
  for (const [dx, dy] of directions) {
    const newX = x + dx;
    const newY = y + dy;
    if (isValidPosition(newX, newY)) {
      const targetPiece = gameState.board[newX][newY];
      if (!targetPiece || targetPiece.color !== color) {
        moves.push({ x: newX, y: newY });
      }
    }
  }

  return moves;
}

function getKingMovesWithCastling(gameState: GameState, x: number, y: number, color: PlayerColor): Position[] {
  const moves = getKingMoves(gameState, x, y, color);
  
  // Add castling moves only when calculating legal moves (not during check detection)
  const piece = gameState.board[x][y];
  if (piece && !piece.hasMoved && !isInCheck(gameState, color)) {
    // Kingside castling
    if (canCastle(gameState, color, 'kingside')) {
      moves.push({ x, y: y + 2 });
    }
    // Queenside castling
    if (canCastle(gameState, color, 'queenside')) {
      moves.push({ x, y: y - 2 });
    }
  }

  return moves;
}

function canCastle(gameState: GameState, color: PlayerColor, side: 'kingside' | 'queenside'): boolean {
  const row = color === 'white' ? 7 : 0;
  const rookCol = side === 'kingside' ? 7 : 0;
  const rook = gameState.board[row][rookCol];

  if (!rook || rook.type !== 'rook' || rook.hasMoved) {
    return false;
  }

  // Check if squares between king and rook are empty
  const start = side === 'kingside' ? 5 : 1;
  const end = side === 'kingside' ? 6 : 3;
  
  for (let y = start; y <= end; y++) {
    if (gameState.board[row][y]) {
      return false;
    }
  }

  // Check if king would pass through or end up in check
  const kingCol = 4;
  const step = side === 'kingside' ? 1 : -1;
  
  for (let y = kingCol; y !== kingCol + 2 * step + step; y += step) {
    if (isSquareAttackedBy(gameState, row, y, color === 'white' ? 'black' : 'white')) {
      return false;
    }
  }

  return true;
}

function isSquareAttackedBy(gameState: GameState, x: number, y: number, attackerColor: PlayerColor): boolean {
  // Check if any piece of attackerColor can attack the square at (x, y)
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = gameState.board[i][j];
      if (piece && piece.color === attackerColor) {
        const moves = getPseudoLegalMoves(gameState, { x: i, y: j }, false);
        if (moves.some(move => move.x === x && move.y === y)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function makeMove(gameState: GameState, move: Move): GameState {
  const newBoard = gameState.board.map(row => [...row]);
  const newCapturedPieces = {
    white: [...gameState.capturedPieces.white],
    black: [...gameState.capturedPieces.black]
  };

  const piece = newBoard[move.from.x][move.from.y];
  if (!piece) return gameState;

  // Handle captured pieces
  if (move.capturedPiece) {
    if (move.piece.color === 'white') {
      newCapturedPieces.white.push(move.capturedPiece);
    } else {
      newCapturedPieces.black.push(move.capturedPiece);
    }
  }

  // Handle en passant capture
  if (piece.type === 'pawn' && gameState.enPassantTarget && 
      move.to.x === gameState.enPassantTarget.x && move.to.y === gameState.enPassantTarget.y) {
    const capturedPawnRow = piece.color === 'white' ? move.to.x + 1 : move.to.x - 1;
    const capturedPawn = newBoard[capturedPawnRow][move.to.y];
    if (capturedPawn) {
      newCapturedPieces[piece.color].push(capturedPawn);
      newBoard[capturedPawnRow][move.to.y] = null;
    }
  }

  // Handle castling
  if (piece.type === 'king' && Math.abs(move.to.y - move.from.y) === 2) {
    const rookFromY = move.to.y > move.from.y ? 7 : 0;
    const rookToY = move.to.y > move.from.y ? 5 : 3;
    const rook = newBoard[move.from.x][rookFromY];
    if (rook) {
      newBoard[move.from.x][rookFromY] = null;
      newBoard[move.from.x][rookToY] = { ...rook, hasMoved: true };
    }
  }

  // Move the piece
  newBoard[move.from.x][move.from.y] = null;
  newBoard[move.to.x][move.to.y] = { ...piece, hasMoved: true };

  // Handle pawn promotion
  if (piece.type === 'pawn') {
    if ((piece.color === 'white' && move.to.x === 0) ||
        (piece.color === 'black' && move.to.x === 7)) {
      newBoard[move.to.x][move.to.y] = { type: 'queen', color: piece.color, hasMoved: true };
    }
  }

  // Set en passant target
  let enPassantTarget: Position | null = null;
  if (piece.type === 'pawn' && Math.abs(move.to.x - move.from.x) === 2) {
    enPassantTarget = { 
      x: move.from.x + (move.to.x - move.from.x) / 2, 
      y: move.from.y 
    };
  }

  const newGameState: GameState = {
    board: newBoard,
    currentPlayer: gameState.currentPlayer === 'white' ? 'black' : 'white',
    moveHistory: [...gameState.moveHistory, move],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    capturedPieces: newCapturedPieces,
    enPassantTarget,
    halfmoveClock: piece.type === 'pawn' || move.capturedPiece ? 0 : gameState.halfmoveClock + 1,
    fullmoveNumber: gameState.currentPlayer === 'black' ? gameState.fullmoveNumber + 1 : gameState.fullmoveNumber,
    timer: gameState.timer
  };

  // Update game status
  newGameState.isCheck = isInCheck(newGameState, newGameState.currentPlayer);
  const hasLegalMoves = getAllLegalMoves(newGameState, newGameState.currentPlayer).length > 0;
  
  if (!hasLegalMoves) {
    if (newGameState.isCheck) {
      newGameState.isCheckmate = true;
    } else {
      newGameState.isStalemate = true;
    }
  }

  return newGameState;
}

function makeTestMove(gameState: GameState, move: Partial<Move>): GameState {
  const newBoard = gameState.board.map(row => [...row]);
  if (move.from && move.to) {
    const piece = newBoard[move.from.x][move.from.y];
    newBoard[move.from.x][move.from.y] = null;
    newBoard[move.to.x][move.to.y] = piece;
  }
  
  return {
    ...gameState,
    board: newBoard
  };
}

export function isInCheck(gameState: GameState, color: PlayerColor): boolean {
  const kingPosition = findKing(gameState, color);
  if (!kingPosition) return false;

  const opponentColor = color === 'white' ? 'black' : 'white';
  
  // Check if any opponent piece can attack the king
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      const piece = gameState.board[x][y];
      if (piece && piece.color === opponentColor) {
        const moves = getPseudoLegalMoves(gameState, { x, y }, false); // Don't include castling in attack calculation
        if (moves.some(move => move.x === kingPosition.x && move.y === kingPosition.y)) {
          return true;
        }
      }
    }
  }

  return false;
}

function findKing(gameState: GameState, color: PlayerColor): Position | null {
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      const piece = gameState.board[x][y];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { x, y };
      }
    }
  }
  return null;
}

export function getAllLegalMoves(gameState: GameState, color: PlayerColor): Move[] {
  const moves: Move[] = [];
  
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      const piece = gameState.board[x][y];
      if (piece && piece.color === color) {
        const legalMoves = calculateLegalMoves(gameState, { x, y });
        for (const move of legalMoves) {
          moves.push({
            from: { x, y },
            to: move,
            piece,
            capturedPiece: gameState.board[move.x][move.y] || undefined
          });
        }
      }
    }
  }
  
  return moves;
}

function isValidPosition(x: number, y: number): boolean {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

export function generateMoveNotation(move: Move): string {
  const piece = move.piece;
  const from = `${String.fromCharCode(97 + move.from.y)}${8 - move.from.x}`;
  const to = `${String.fromCharCode(97 + move.to.y)}${8 - move.to.x}`;
  
  let notation = '';
  
  if (piece.type !== 'pawn') {
    notation += piece.type === 'knight' ? 'N' : piece.type.charAt(0).toUpperCase();
  }
  
  if (move.capturedPiece) {
    if (piece.type === 'pawn') {
      notation += from.charAt(0);
    }
    notation += 'x';
  }
  
  notation += to;
  
  return notation;
} 