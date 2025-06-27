export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type PlayerColor = 'white' | 'black' | 'spectator';
export type GameMode = 'computer' | 'local' | 'online';

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
  isPromotion?: boolean;
  promotionPiece?: PieceType;
  isCastling?: boolean;
  isEnPassant?: boolean;
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
}

export interface ChessGameProps {
  gameState?: GameState;
  gameMode?: GameMode;
  playerColor: PlayerColor;
  isSpectator: boolean;
  onMove?: (move: Move) => void;
}

export interface MultiplayerGameState extends GameState {
  gameId: string;
  players: {
    white?: string;
    black?: string;
  };
  spectators: string[];
} 