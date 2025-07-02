export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type PlayerColor = 'white' | 'black';
export type GameMode = 'local' | 'computer' | 'online';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ThemeId = 'classic' | 'neo' | 'glassy' | 'ocean' | 'forest' | 'crystal';
export type TimerMode = '3min' | '5min' | '10min' | 'custom' | 'none';

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

export interface TimerState {
  whiteTime: number; // in seconds
  blackTime: number; // in seconds
  isActive: boolean;
  mode: TimerMode;
  increment?: number; // increment in seconds per move
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
  timer?: TimerState;
}

export interface ChessGameProps {
  gameState?: GameState;
  gameMode?: GameMode;
  playerColor?: PlayerColor;
  isSpectator?: boolean;
  difficulty?: Difficulty;
  themeId?: ThemeId;
  timerMode?: TimerMode;
  customTime?: number;
  onMove?: (move: Move) => void;
  onGameOver?: (result: GameResult) => void;
  onBackToMenu?: () => void;
}

export interface GameResult {
  winner?: PlayerColor | 'draw';
  reason: 'checkmate' | 'stalemate' | 'resignation' | 'timeout' | 'draw' | 'opponent left';
}

export interface ChessAI {
  getBestMove(gameState: GameState, difficulty: Difficulty): Move | null;
}

export interface NetworkMessage {
  type: 'move' | 'gameState' | 'chat' | 'disconnect' | 'draw-offer' | 'draw-accept' | 'draw-decline' | 'resign' | 'game-over';
  data: any;
} 