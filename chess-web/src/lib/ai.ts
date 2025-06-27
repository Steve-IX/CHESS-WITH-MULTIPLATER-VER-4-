import { GameState, Move, Piece, PlayerColor, Difficulty, ChessAI } from './types';
import { getAllLegalMoves, makeMove, isInCheck } from './chess';

export class ChessAIEngine implements ChessAI {
  private maxThinkingTime = 5000; // 5 seconds max
  private startTime = 0;
  private nodesSearched = 0;

  getBestMove(gameState: GameState, difficulty: Difficulty): Move | null {
    const depth = this.getDepthForDifficulty(difficulty);
    const legalMoves = getAllLegalMoves(gameState, gameState.currentPlayer);
    
    if (legalMoves.length === 0) {
      return null;
    }

    // Easy mode: random move with slight preference for captures
    if (difficulty === 'easy') {
      const captureMoves = legalMoves.filter(move => move.capturedPiece);
      if (captureMoves.length > 0 && Math.random() < 0.3) {
        return captureMoves[Math.floor(Math.random() * captureMoves.length)];
      }
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    // Reset search statistics
    this.startTime = Date.now();
    this.nodesSearched = 0;

    try {
      // Sort moves for better alpha-beta pruning
      const sortedMoves = this.sortMoves(legalMoves, gameState);
      
      let bestMove = sortedMoves[0]; // Fallback to first move
      let bestScore = -Infinity;

      for (const move of sortedMoves) {
        // Check timeout
        if (Date.now() - this.startTime > this.maxThinkingTime) {
          console.log('AI timeout reached, returning best move found so far');
          break;
        }

        const newGameState = makeMove(gameState, move);
        const score = this.minimax(newGameState, depth - 1, -Infinity, Infinity, false);
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }

      console.log(`AI searched ${this.nodesSearched} nodes in ${Date.now() - this.startTime}ms`);
      return bestMove;

    } catch (error) {
      console.error('AI error:', error);
      // Return a safe random move if AI fails
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
  }

  private getDepthForDifficulty(difficulty: Difficulty): number {
    switch (difficulty) {
      case 'easy': return 1;
      case 'medium': return 3;
      case 'hard': return 4; // Reduced from 5 to prevent crashes
      default: return 3;
    }
  }

  private sortMoves(moves: Move[], gameState: GameState): Move[] {
    // Sort moves to improve alpha-beta pruning efficiency
    return moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Prioritize captures
      if (a.capturedPiece) scoreA += this.getPieceValue(a.capturedPiece);
      if (b.capturedPiece) scoreB += this.getPieceValue(b.capturedPiece);

      // Prioritize moving more valuable pieces last (safer)
      scoreA -= this.getPieceValue(a.piece) * 0.1;
      scoreB -= this.getPieceValue(b.piece) * 0.1;

      return scoreB - scoreA;
    });
  }

  private minimax(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number {
    this.nodesSearched++;

    // Check timeout
    if (Date.now() - this.startTime > this.maxThinkingTime) {
      return this.evaluatePosition(gameState);
    }

    // Base case
    if (depth === 0 || gameState.isCheckmate || gameState.isStalemate) {
      return this.evaluatePosition(gameState);
    }

    const legalMoves = getAllLegalMoves(gameState, gameState.currentPlayer);
    
    if (legalMoves.length === 0) {
      return this.evaluatePosition(gameState);
    }

    // Limit the number of moves considered at deeper levels
    const movesToConsider = depth <= 2 ? legalMoves.slice(0, Math.min(15, legalMoves.length)) : legalMoves;

    if (isMaximizing) {
      let maxScore = -Infinity;
      
      for (const move of movesToConsider) {
        const newGameState = makeMove(gameState, move);
        const score = this.minimax(newGameState, depth - 1, alpha, beta, false);
        
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        
        if (beta <= alpha) {
          break; // Alpha-beta pruning
        }
      }
      
      return maxScore;
    } else {
      let minScore = Infinity;
      
      for (const move of movesToConsider) {
        const newGameState = makeMove(gameState, move);
        const score = this.minimax(newGameState, depth - 1, alpha, beta, true);
        
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        
        if (beta <= alpha) {
          break; // Alpha-beta pruning
        }
      }
      
      return minScore;
    }
  }

  private evaluatePosition(gameState: GameState): number {
    if (gameState.isCheckmate) {
      return gameState.currentPlayer === 'white' ? -10000 : 10000;
    }
    
    if (gameState.isStalemate) {
      return 0;
    }

    let score = 0;

    // Material evaluation (most important)
    score += this.evaluateMaterial(gameState);
    
    // Position evaluation (less expensive)
    score += this.evaluatePositionalFactors(gameState);
    
    // King safety (simplified)
    if (isInCheck(gameState, 'white')) score -= 50;
    if (isInCheck(gameState, 'black')) score += 50;

    return score;
  }

  private evaluateMaterial(gameState: GameState): number {
    let score = 0;
    
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const piece = gameState.board[x][y];
        if (piece) {
          const value = this.getPieceValue(piece);
          score += piece.color === 'white' ? value : -value;
        }
      }
    }
    
    return score;
  }

  private getPieceValue(piece: Piece): number {
    const values = {
      pawn: 100,
      knight: 320,
      bishop: 330,
      rook: 500,
      queen: 900,
      king: 20000
    };
    return values[piece.type];
  }

  private evaluatePositionalFactors(gameState: GameState): number {
    let score = 0;
    
    // Simplified piece-square tables for key pieces only
    const pawnBonus = [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5,  5, 10, 25, 25, 10,  5,  5],
      [0,  0,  0, 20, 20,  0,  0,  0],
      [5, -5,-10,  0,  0,-10, -5,  5],
      [5, 10, 10,-20,-20, 10, 10,  5],
      [0,  0,  0,  0,  0,  0,  0,  0]
    ];

    // Center control bonus
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]];
    
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const piece = gameState.board[x][y];
        if (piece) {
          let positionValue = 0;
          
          // Pawn structure bonus
          if (piece.type === 'pawn') {
            positionValue = piece.color === 'white' ? pawnBonus[x][y] : pawnBonus[7-x][y];
          }
          
          // Center control bonus for knights and bishops
          if ((piece.type === 'knight' || piece.type === 'bishop') && 
              centerSquares.some(([cx, cy]) => Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1)) {
            positionValue += 20;
          }
          
          score += piece.color === 'white' ? positionValue : -positionValue;
        }
      }
    }
    
    return score * 0.1; // Reduce impact of positional factors
  }
}

export const chessAI = new ChessAIEngine(); 