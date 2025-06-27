export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type PlayerColor = 'white' | 'black';
export type GameMode = 'local' | 'computer' | 'online';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: PieceType;
  color: PlayerColor;
  hasMoved: boolean;
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece?: Piece;
  isEnPassant?: boolean;
  isCastling?: boolean;
  promotion?: PieceType;
}

export interface GameState {
  board: (Piece | null)[][];
  currentPlayer: PlayerColor;
  moveHistory: Move[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  capturedPieces: {
    white: Piece[];
    black: Piece[];
  };
  enPassantTarget: Position | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

export interface ChessGameProps {
  gameState?: GameState;
  gameMode?: GameMode;
  playerColor?: PlayerColor;
  isSpectator?: boolean;
  difficulty?: Difficulty;
  onMove?: (move: Move) => void;
  onGameOver?: (result: GameResult) => void;
}

export interface GameResult {
  winner: PlayerColor | 'draw';
  reason: 'checkmate' | 'stalemate' | 'resignation' | 'timeout' | 'draw';
}

export interface ChessAI {
  getBestMove(gameState: GameState, difficulty: Difficulty): Move | null;
}

export interface NetworkMessage {
  type: 'move' | 'gameState' | 'chat' | 'disconnect';
  data: any;
} 