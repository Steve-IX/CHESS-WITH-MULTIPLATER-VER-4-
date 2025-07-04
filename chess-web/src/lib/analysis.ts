import { 
  GameState, 
  Move, 
  MoveAnalysis, 
  GameAnalysis, 
  PlayerStats, 
  PhaseAnalysis, 
  MoveQuality, 
  GamePhase, 
  PhaseRating, 
  AnalysisProgress,
  PlayerColor 
} from './types';
import { stockfishService } from './stockfish';
import { cdnStockfishService } from './stockfish-cdn';
import { makeMove, createInitialBoard } from './chess';

export class GameAnalysisEngine {
  private analysisInProgress: Map<string, boolean> = new Map();
  private progressCallbacks: Map<string, (progress: AnalysisProgress) => void> = new Map();
  private usingFallbackService: boolean = false;

  private getStockfishService() {
    return this.usingFallbackService ? cdnStockfishService : stockfishService;
  }

  private async evaluatePositionWithFallback(fen: string): Promise<any> {
    try {
      return await this.getStockfishService().evaluatePosition(fen);
    } catch (error) {
      if (!this.usingFallbackService) {
        console.warn('⚠️ Main Stockfish service failed, switching to CDN fallback');
        this.usingFallbackService = true;
        return await cdnStockfishService.evaluatePosition(fen);
      }
      throw error;
    }
  }

  public async analyzeGame(
    gameState: GameState,
    gameId: string,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<GameAnalysis> {
    
    if (this.analysisInProgress.get(gameId)) {
      throw new Error('Game analysis already in progress');
    }

    this.analysisInProgress.set(gameId, true);
    
    if (onProgress) {
      this.progressCallbacks.set(gameId, onProgress);
    }

    try {
      const moves = gameState.moveHistory;
      const totalPlies = moves.length;
      
      // Initialize analysis arrays
      const moveAnalyses: MoveAnalysis[] = [];
      const cpSeries: Array<{ ply: number; cp: number; color: PlayerColor }> = [];
      
      // Reconstruct game positions for analysis
      let currentState = this.getInitialGameState();
      
      // Analyze initial position
      const initialFen = this.getStockfishService().gameStateToFEN(currentState);
      const initialEval = await this.evaluatePositionWithFallback(initialFen);
      
      cpSeries.push({
        ply: 0,
        cp: initialEval.score,
        color: 'white'
      });

      // Analyze each move
      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const ply = i + 1;
        const playerColor = i % 2 === 0 ? 'white' : 'black';
        
        // Update progress
        const progress: AnalysisProgress = {
          currentPly: ply,
          totalPlies: totalPlies,
          isAnalyzing: true,
          estimatedTimeRemaining: this.estimateRemainingTime(i, totalPlies)
        };
        
        if (onProgress) {
          onProgress(progress);
        }

        // Get position before move
        const fenBeforeMove = this.getStockfishService().gameStateToFEN(currentState);
        
        // Get best move from current position
        const bestEvaluation = await this.evaluatePositionWithFallback(fenBeforeMove);
        const bestMoveCp = bestEvaluation.score;
        
        // Make the actual move
        currentState = makeMove(currentState, move);
        const fenAfterMove = this.getStockfishService().gameStateToFEN(currentState);
        
        // Get evaluation after the played move
        const playedEvaluation = await this.evaluatePositionWithFallback(fenAfterMove);
        let playedMoveCp = -playedEvaluation.score; // Flip sign for opponent's perspective
        
        // Adjust for player color (positive scores favor white)
        if (playerColor === 'black') {
          playedMoveCp = -playedMoveCp;
        }

        // Calculate centipawn loss
        const cpLoss = Math.abs(bestMoveCp - playedMoveCp);
        
        // Determine move quality
        const quality = this.classifyMoveQuality(
          cpLoss, 
          bestMoveCp, 
          playedMoveCp, 
          playerColor
        );
        
        // Determine game phase
        const phase = this.determineGamePhase(ply, totalPlies);
        
        // Create move analysis
        const moveAnalysis: MoveAnalysis = {
          ply: ply,
          move: move,
          playerColor: playerColor,
          bestMoveCp: bestMoveCp,
          playedMoveCp: playedMoveCp,
          cpLoss: cpLoss,
          quality: quality,
          bestMove: this.getStockfishService().uciToMove(bestEvaluation.bestMove, currentState) || undefined,
          isTactical: this.isTacticalMove(cpLoss, bestMoveCp, playedMoveCp),
          phase: phase
        };
        
        moveAnalyses.push(moveAnalysis);
        
        // Add to CP series
        cpSeries.push({
          ply: ply,
          cp: playerColor === 'white' ? playedMoveCp : -playedMoveCp,
          color: playerColor
        });
      }

      // Calculate player statistics
      const whiteStats = this.calculatePlayerStats(
        moveAnalyses.filter(m => m.playerColor === 'white')
      );
      const blackStats = this.calculatePlayerStats(
        moveAnalyses.filter(m => m.playerColor === 'black')
      );

      // Calculate phase analysis
      const phases = this.calculatePhaseAnalysis(moveAnalyses, totalPlies);

      // Create final analysis
      const gameAnalysis: GameAnalysis = {
        gameId: gameId,
        white: whiteStats,
        black: blackStats,
        phases: phases,
        moves: moveAnalyses,
        cpSeries: cpSeries,
        isAnalysisComplete: true,
        analyzedAt: new Date()
      };

      // Final progress update
      if (onProgress) {
        onProgress({
          currentPly: totalPlies,
          totalPlies: totalPlies,
          isAnalyzing: false
        });
      }

      return gameAnalysis;

    } finally {
      this.analysisInProgress.set(gameId, false);
      this.progressCallbacks.delete(gameId);
    }
  }

  private classifyMoveQuality(
    cpLoss: number, 
    bestCp: number, 
    playedCp: number, 
    playerColor: PlayerColor
  ): MoveQuality {
    
    // Check for brilliant moves first
    if (this.isBrilliantMove(cpLoss, bestCp, playedCp, playerColor)) {
      return 'brilliant';
    }

    // Standard classification based on centipawn loss
    if (cpLoss <= 50) {
      return 'best';
    } else if (cpLoss <= 150) {
      return 'great';
    } else if (cpLoss <= 300) {
      return 'mistake';
    } else if (cpLoss <= 600) {
      return 'miss';
    } else {
      return 'blunder';
    }
  }

  private isBrilliantMove(
    cpLoss: number, 
    bestCp: number, 
    playedCp: number, 
    playerColor: PlayerColor
  ): boolean {
    // Brilliant: Tactical gain ≥ 300 cp in favor AND found by player
    const tacticalGain = playerColor === 'white' ? playedCp - bestCp : bestCp - playedCp;
    return tacticalGain >= 300 && cpLoss <= 50;
  }

  private isTacticalMove(cpLoss: number, bestCp: number, playedCp: number): boolean {
    return Math.abs(playedCp - bestCp) >= 200;
  }

  private determineGamePhase(ply: number, totalPlies: number): GamePhase {
    if (ply <= 20) {
      return 'opening';
    } else if (ply <= 60) {
      return 'middlegame';
    } else {
      return 'endgame';
    }
  }

  private calculatePlayerStats(moveAnalyses: MoveAnalysis[]): PlayerStats {
    const stats: PlayerStats = {
      accuracy: 0,
      brilliant: 0,
      great: 0,
      best: 0,
      mistake: 0,
      miss: 0,
      blunder: 0
    };

    if (moveAnalyses.length === 0) {
      return stats;
    }

    // Count move qualities
    moveAnalyses.forEach(analysis => {
      switch (analysis.quality) {
        case 'brilliant': stats.brilliant++; break;
        case 'great': stats.great++; break;
        case 'best': stats.best++; break;
        case 'mistake': stats.mistake++; break;
        case 'miss': stats.miss++; break;
        case 'blunder': stats.blunder++; break;
      }
    });

    // Calculate accuracy using Chess.com formula
    const totalCpLoss = moveAnalyses.reduce((sum, analysis) => {
      return sum + Math.min(analysis.cpLoss, 600);
    }, 0);

    const maxPossibleLoss = 600 * moveAnalyses.length;
    stats.accuracy = Math.round((1 - (totalCpLoss / maxPossibleLoss)) * 1000) / 10;

    return stats;
  }

  private calculatePhaseAnalysis(moveAnalyses: MoveAnalysis[], totalPlies: number): PhaseAnalysis[] {
    const phases: PhaseAnalysis[] = [];

    // Opening phase (1-20)
    const openingMoves = moveAnalyses.filter(m => m.phase === 'opening');
    if (openingMoves.length > 0) {
      phases.push(this.createPhaseAnalysis('opening', openingMoves, 1, 20));
    }

    // Middlegame phase (21-60)
    const middlegameMoves = moveAnalyses.filter(m => m.phase === 'middlegame');
    if (middlegameMoves.length > 0) {
      phases.push(this.createPhaseAnalysis('middlegame', middlegameMoves, 21, 60));
    }

    // Endgame phase (61+)
    const endgameMoves = moveAnalyses.filter(m => m.phase === 'endgame');
    if (endgameMoves.length > 0) {
      phases.push(this.createPhaseAnalysis('endgame', endgameMoves, 61, totalPlies));
    }

    return phases;
  }

  private createPhaseAnalysis(
    phase: GamePhase,
    phaseMoves: MoveAnalysis[],
    startPly: number,
    endPly: number
  ): PhaseAnalysis {
    const whiteMoves = phaseMoves.filter(m => m.playerColor === 'white');
    const blackMoves = phaseMoves.filter(m => m.playerColor === 'black');

    const whiteStats = this.calculatePlayerStats(whiteMoves);
    const blackStats = this.calculatePlayerStats(blackMoves);

    return {
      phase: phase,
      whiteAccuracy: whiteStats.accuracy,
      blackAccuracy: blackStats.accuracy,
      whiteRating: this.ratePhasePerformance(whiteStats.accuracy),
      blackRating: this.ratePhasePerformance(blackStats.accuracy),
      startPly: startPly,
      endPly: endPly
    };
  }

  private ratePhasePerformance(accuracy: number): PhaseRating {
    if (accuracy > 85) {
      return 'excellent';
    } else if (accuracy > 70) {
      return 'good';
    } else {
      return 'dubious';
    }
  }

  private estimateRemainingTime(currentPly: number, totalPlies: number): number {
    // Estimate ~2 seconds per move analysis
    const remainingMoves = totalPlies - currentPly;
    return remainingMoves * 2000; // milliseconds
  }

  private getInitialGameState(): GameState {
    return {
      board: createInitialBoard(),
      currentPlayer: 'white',
      moveHistory: [],
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      capturedPieces: { white: [], black: [] },
      enPassantTarget: null,
      halfmoveClock: 0,
      fullmoveNumber: 1
    };
  }

  public cancelAnalysis(gameId: string): void {
    this.analysisInProgress.set(gameId, false);
    this.progressCallbacks.delete(gameId);
    stockfishService.stop();
  }

  public isAnalyzing(gameId: string): boolean {
    return this.analysisInProgress.get(gameId) || false;
  }
}

// Export singleton instance
export const gameAnalysisEngine = new GameAnalysisEngine();

// Helper function to queue full analysis on game completion
export async function queueFullAnalysis(
  gameState: GameState,
  gameId: string,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<GameAnalysis> {
  console.log(`🔍 Starting full analysis for game ${gameId}`);
  
  try {
    const analysis = await gameAnalysisEngine.analyzeGame(gameState, gameId, onProgress);
    console.log(`✅ Analysis complete for game ${gameId}`, analysis);
    return analysis;
  } catch (error) {
    console.error(`❌ Analysis failed for game ${gameId}:`, error);
    throw error;
  }
} 