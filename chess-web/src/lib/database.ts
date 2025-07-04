import { GameAnalysis, MoveAnalysis, PhaseAnalysis } from './types';

// SQL Schema for proper database implementation
export const SQL_SCHEMA = `
-- Game Analysis table
CREATE TABLE IF NOT EXISTS game_analysis (
  id VARCHAR(255) PRIMARY KEY,
  game_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- White player statistics
  accuracy_white REAL NOT NULL,
  brilliant_w INTEGER NOT NULL DEFAULT 0,
  great_w INTEGER NOT NULL DEFAULT 0,
  best_w INTEGER NOT NULL DEFAULT 0,
  mistake_w INTEGER NOT NULL DEFAULT 0,
  miss_w INTEGER NOT NULL DEFAULT 0,
  blunder_w INTEGER NOT NULL DEFAULT 0,
  
  -- Black player statistics  
  accuracy_black REAL NOT NULL,
  brilliant_b INTEGER NOT NULL DEFAULT 0,
  great_b INTEGER NOT NULL DEFAULT 0,
  best_b INTEGER NOT NULL DEFAULT 0,
  mistake_b INTEGER NOT NULL DEFAULT 0,
  miss_b INTEGER NOT NULL DEFAULT 0,
  blunder_b INTEGER NOT NULL DEFAULT 0,
  
  -- Analysis metadata
  cp_series JSONB NOT NULL, -- [{ply:1, cp:23, color:"white"}, ...]
  is_analysis_complete BOOLEAN NOT NULL DEFAULT FALSE,
  analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_game_analysis_game_id (game_id),
  INDEX idx_game_analysis_analyzed_at (analyzed_at)
);

-- Move Analysis table  
CREATE TABLE IF NOT EXISTS move_analysis (
  id SERIAL PRIMARY KEY,
  game_analysis_id VARCHAR(255) NOT NULL,
  ply INTEGER NOT NULL,
  player_color ENUM('white', 'black') NOT NULL,
  
  -- Move data (stored as JSON for flexibility)
  move_data JSONB NOT NULL,
  
  -- Analysis results
  best_move_cp INTEGER NOT NULL,
  played_move_cp INTEGER NOT NULL,
  cp_loss INTEGER NOT NULL,
  quality ENUM('best', 'great', 'mistake', 'miss', 'blunder', 'brilliant') NOT NULL,
  best_move JSONB, -- Stockfish suggested best move
  is_tactical BOOLEAN DEFAULT FALSE,
  phase ENUM('opening', 'middlegame', 'endgame') NOT NULL,
  
  FOREIGN KEY (game_analysis_id) REFERENCES game_analysis(id) ON DELETE CASCADE,
  INDEX idx_move_analysis_game_id (game_analysis_id),
  INDEX idx_move_analysis_ply (ply),
  INDEX idx_move_analysis_quality (quality)
);

-- Phase Analysis table
CREATE TABLE IF NOT EXISTS phase_analysis (
  id SERIAL PRIMARY KEY,
  game_analysis_id VARCHAR(255) NOT NULL,
  phase ENUM('opening', 'middlegame', 'endgame') NOT NULL,
  
  white_accuracy REAL NOT NULL,
  black_accuracy REAL NOT NULL,
  white_rating ENUM('excellent', 'good', 'dubious') NOT NULL,
  black_rating ENUM('excellent', 'good', 'dubious') NOT NULL,
  start_ply INTEGER NOT NULL,
  end_ply INTEGER NOT NULL,
  
  FOREIGN KEY (game_analysis_id) REFERENCES game_analysis(id) ON DELETE CASCADE,
  INDEX idx_phase_analysis_game_id (game_analysis_id),
  INDEX idx_phase_analysis_phase (phase)
);
`;

// In-memory storage for development/demo
class InMemoryAnalysisStorage {
  private analyses: Map<string, GameAnalysis> = new Map();
  private gameIdToAnalysisId: Map<string, string> = new Map();

  async saveAnalysis(analysis: GameAnalysis): Promise<void> {
    const analysisId = this.generateId();
    
    // Store the analysis
    this.analyses.set(analysisId, {
      ...analysis,
      gameId: analysis.gameId
    });
    
    // Map game ID to analysis ID
    this.gameIdToAnalysisId.set(analysis.gameId, analysisId);
    
    console.log(`💾 Saved analysis for game ${analysis.gameId} (ID: ${analysisId})`);
  }

  async getAnalysis(gameId: string): Promise<GameAnalysis | null> {
    const analysisId = this.gameIdToAnalysisId.get(gameId);
    if (!analysisId) {
      return null;
    }
    
    return this.analyses.get(analysisId) || null;
  }

  async deleteAnalysis(gameId: string): Promise<boolean> {
    const analysisId = this.gameIdToAnalysisId.get(gameId);
    if (!analysisId) {
      return false;
    }
    
    this.analyses.delete(analysisId);
    this.gameIdToAnalysisId.delete(gameId);
    
    console.log(`🗑️ Deleted analysis for game ${gameId}`);
    return true;
  }

  async listAnalyses(limit: number = 50, offset: number = 0): Promise<GameAnalysis[]> {
    const allAnalyses = Array.from(this.analyses.values());
    
    // Sort by analyzed date (newest first)
    allAnalyses.sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime());
    
    return allAnalyses.slice(offset, offset + limit);
  }

  async getAnalysisStats(): Promise<{
    totalAnalyses: number;
    averageAccuracyWhite: number;
    averageAccuracyBlack: number;
    mostCommonMistakes: { quality: string; count: number }[];
  }> {
    const analyses = Array.from(this.analyses.values());
    
    if (analyses.length === 0) {
      return {
        totalAnalyses: 0,
        averageAccuracyWhite: 0,
        averageAccuracyBlack: 0,
        mostCommonMistakes: []
      };
    }

    const totalAccuracyWhite = analyses.reduce((sum, a) => sum + a.white.accuracy, 0);
    const totalAccuracyBlack = analyses.reduce((sum, a) => sum + a.black.accuracy, 0);

    // Count move qualities across all games
    const qualityCounts: Record<string, number> = {};
    analyses.forEach(analysis => {
      analysis.moves.forEach(move => {
        qualityCounts[move.quality] = (qualityCounts[move.quality] || 0) + 1;
      });
    });

    const mostCommonMistakes = Object.entries(qualityCounts)
      .filter(([quality]) => ['mistake', 'miss', 'blunder'].includes(quality))
      .map(([quality, count]) => ({ quality, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAnalyses: analyses.length,
      averageAccuracyWhite: Math.round((totalAccuracyWhite / analyses.length) * 10) / 10,
      averageAccuracyBlack: Math.round((totalAccuracyBlack / analyses.length) * 10) / 10,
      mostCommonMistakes
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Clear all data (for testing)
  async clear(): Promise<void> {
    this.analyses.clear();
    this.gameIdToAnalysisId.clear();
    console.log('🧹 Cleared all analysis data');
  }
}

// Database interface for future SQL implementation
export interface AnalysisDatabase {
  saveAnalysis(analysis: GameAnalysis): Promise<void>;
  getAnalysis(gameId: string): Promise<GameAnalysis | null>;
  deleteAnalysis(gameId: string): Promise<boolean>;
  listAnalyses(limit?: number, offset?: number): Promise<GameAnalysis[]>;
  getAnalysisStats(): Promise<{
    totalAnalyses: number;
    averageAccuracyWhite: number;
    averageAccuracyBlack: number;
    mostCommonMistakes: { quality: string; count: number }[];
  }>;
  clear(): Promise<void>;
}

// SQL Database implementation (for future use)
export class SQLAnalysisDatabase implements AnalysisDatabase {
  constructor(private connectionString: string) {
    // This would initialize the SQL connection
    console.log('🗄️ SQL Database initialized (placeholder)');
  }

  async saveAnalysis(analysis: GameAnalysis): Promise<void> {
    // TODO: Implement SQL INSERT statements
    console.log('📝 Would save to SQL database:', analysis.gameId);
  }

  async getAnalysis(gameId: string): Promise<GameAnalysis | null> {
    // TODO: Implement SQL SELECT with JOINs
    console.log('🔍 Would fetch from SQL database:', gameId);
    return null;
  }

  async deleteAnalysis(gameId: string): Promise<boolean> {
    // TODO: Implement SQL DELETE CASCADE
    console.log('🗑️ Would delete from SQL database:', gameId);
    return false;
  }

  async listAnalyses(limit: number = 50, offset: number = 0): Promise<GameAnalysis[]> {
    // TODO: Implement SQL SELECT with LIMIT/OFFSET
    console.log('📄 Would list from SQL database');
    return [];
  }

  async getAnalysisStats(): Promise<any> {
    // TODO: Implement SQL aggregation queries
    console.log('📊 Would get stats from SQL database');
    return {
      totalAnalyses: 0,
      averageAccuracyWhite: 0,
      averageAccuracyBlack: 0,
      mostCommonMistakes: []
    };
  }

  async clear(): Promise<void> {
    // TODO: Implement SQL TRUNCATE
    console.log('🧹 Would clear SQL database');
  }
}

// Export singleton instance (using in-memory for now)
export const analysisDatabase: AnalysisDatabase = new InMemoryAnalysisStorage();

// Helper functions for common database operations
export async function saveGameAnalysis(analysis: GameAnalysis): Promise<void> {
  await analysisDatabase.saveAnalysis(analysis);
}

export async function getGameAnalysis(gameId: string): Promise<GameAnalysis | null> {
  return await analysisDatabase.getAnalysis(gameId);
}

export async function deleteGameAnalysis(gameId: string): Promise<boolean> {
  return await analysisDatabase.deleteAnalysis(gameId);
}

export async function listRecentAnalyses(limit: number = 10): Promise<GameAnalysis[]> {
  return await analysisDatabase.listAnalyses(limit, 0);
} 