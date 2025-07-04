export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type PlayerColor = 'white' | 'black';
export type GameMode = 'local' | 'computer' | 'online';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ThemeId = 'classic' | 'neo' | 'glassy' | 'ocean' | 'forest' | 'crystal' | 'red' | 'pink';
export type TimerMode = '3min' | '5min' | '10min' | 'custom' | 'none';

// Analysis types for game review
export type MoveQuality = 'best' | 'great' | 'mistake' | 'miss' | 'blunder' | 'brilliant';
export type GamePhase = 'opening' | 'middlegame' | 'endgame';
export type PhaseRating = 'excellent' | 'good' | 'dubious';

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

// Game analysis types
export interface MoveAnalysis {
  ply: number; // Half-move number (starts at 1)
  move: Move;
  playerColor: PlayerColor;
  bestMoveCp: number; // Best move evaluation in centipawns
  playedMoveCp: number; // Played move evaluation in centipawns
  cpLoss: number; // Centipawn loss (absolute difference)
  quality: MoveQuality;
  bestMove?: Move; // Stockfish suggested best move
  isTactical?: boolean; // Move involves tactical gain/loss
  phase: GamePhase;
}

export interface PhaseAnalysis {
  phase: GamePhase;
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteRating: PhaseRating;
  blackRating: PhaseRating;
  startPly: number;
  endPly: number;
}

export interface PlayerStats {
  accuracy: number;
  brilliant: number;
  great: number;
  best: number;
  mistake: number;
  miss: number;
  blunder: number;
}

export interface GameAnalysis {
  gameId: string;
  white: PlayerStats;
  black: PlayerStats;
  phases: PhaseAnalysis[];
  moves: MoveAnalysis[];
  cpSeries: Array<{ ply: number; cp: number; color: PlayerColor }>;
  isAnalysisComplete: boolean;
  analyzedAt: Date;
}

export interface AnalysisProgress {
  currentPly: number;
  totalPlies: number;
  isAnalyzing: boolean;
  estimatedTimeRemaining?: number;
}

// Stockfish engine types
export interface StockfishConfig {
  depth: number;
  multiPV: number;
  threads: number;
  hash: number;
}

export interface StockfishEvaluation {
  score: number; // Centipawns
  bestMove: string; // UCI notation
  pv: string[]; // Principal variation
  depth: number;
  nodes: number;
  time: number;
  nps: number; // Nodes per second
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
  isReviewMode?: boolean;
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