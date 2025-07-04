# Chess Master 3.0 - Complete Chess Application

## Features

### Core Chess Gameplay
- Full chess implementation with legal move validation
- Multiple game modes: Local Multiplayer, Computer AI, Online Multiplayer
- Drag & drop piece movement with smooth animations
- Check, checkmate, and stalemate detection
- En passant, castling, and pawn promotion
- Timer modes: 3min, 5min, 10min, custom, or no timer

### AI Opponents
- Multiple difficulty levels (Easy, Medium, Hard)
- Minimax algorithm with alpha-beta pruning
- Position evaluation and piece-square tables

### Game Analysis & Review ⭐ NEW!
- **Stockfish Integration**: Depth 18 analysis for professional-level evaluation
- **Move Quality Classification**: 
  - ⭐ Best (0-50 cp loss)
  - 🔵 Great (51-150 cp loss)  
  - ❓ Mistake (151-300 cp loss)
  - ❌ Miss (301-600 cp loss)
  - ‼️ Blunder (600+ cp loss)
  - 💠 Brilliant (Tactical gain ≥300cp found by player)
- **Accuracy Calculation**: Chess.com formula implementation
- **Phase Analysis**: Opening/Middlegame/Endgame performance breakdown
- **Game Review UI**: Professional Chess.com-style interface with:
  - Player statistics and accuracy ratings
  - Move quality breakdown with visual icons
  - Evaluation chart showing game progression
  - Detailed move-by-move analysis
  - Phase performance indicators (⭐ Excellent, ✅ Good, 🤔 Dubious)

### Online Multiplayer
- Real-time multiplayer with WebSocket
- Room-based matchmaking
- Live game state synchronization
- Chat functionality
- Game invitations and spectator mode

### User Interface
- 8 beautiful themes (Classic, Neo, Glassy, Ocean, Forest, Crystal, Red, Pink)
- Dark/Light mode toggle
- Responsive design for desktop and mobile
- Smooth animations and transitions
- Game Info panel with move history and captured pieces
- Tabbed interface: Game Info / Game Review

### Music & Audio
- Background music player with multiple tracks
- Anime and game soundtracks included
- Volume controls and track selection

## Technical Implementation

### Game Analysis Engine
- **Engine**: Stockfish.js (WebAssembly) at depth 18
- **Analysis Storage**: In-memory database with SQL schema provided
- **Move Classification**: Centipawn loss-based quality system
- **Accuracy Formula**: `100 - (Σ(min(Δ,600)) / (600 * moves)) * 100`
- **Performance**: ~2 seconds per move analysis with full game analysis in 1-3 minutes

### Architecture
- **Frontend**: Next.js 13+ with TypeScript
- **UI**: Tailwind CSS + Framer Motion animations  
- **State Management**: React hooks with optimized re-renders
- **Real-time**: Socket.io for multiplayer functionality
- **Chess Logic**: Custom implementation with full rule validation
- **Analysis**: Stockfish integration with custom evaluation pipeline

## Game Review Usage

1. **Play any game** (local, vs AI, or online)
2. **Complete the game** (checkmate/stalemate)
3. **Analysis triggers automatically** for games 10+ moves
4. **Switch to Game Review tab** in the Game Info panel
5. **Explore your analysis**:
   - View player accuracy and move quality breakdown
   - Check phase performance (opening/middlegame/endgame)
   - Examine the evaluation chart
   - Click on moves for detailed analysis

## Database Schema

```sql
-- Game Analysis Storage
CREATE TABLE game_analysis (
  id VARCHAR(255) PRIMARY KEY,
  game_id VARCHAR(255) NOT NULL UNIQUE,
  accuracy_white REAL NOT NULL,
  accuracy_black REAL NOT NULL,
  brilliant_w INT, great_w INT, best_w INT, 
  mistake_w INT, miss_w INT, blunder_w INT,
  brilliant_b INT, great_b INT, best_b INT,
  mistake_b INT, miss_b INT, blunder_b INT,
  cp_series JSONB NOT NULL,
  is_analysis_complete BOOLEAN DEFAULT FALSE,
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Getting Started

```bash
# Install dependencies
cd chess-web
npm install

# Run development server
npm run dev

# Open browser
http://localhost:3000
```

## Analysis Features in Detail

### Move Quality Classification
The system evaluates each move by comparing the played move with Stockfish's best recommendation:

- **Centipawn Loss**: Difference between best and played move evaluations
- **Brilliant Moves**: Tactical gains ≥300cp that the player found
- **Classification**: Based on Chess.com's proven quality thresholds

### Accuracy Calculation
Uses the industry-standard Chess.com accuracy formula:
- Caps centipawn loss at 600 to prevent single blunders from dominating
- Normalizes across all moves for fair comparison
- Provides percentage rating (0-100%)

### Phase Analysis
Games are divided into three phases:
- **Opening**: Moves 1-20
- **Middlegame**: Moves 21-60  
- **Endgame**: Moves 61+

Each phase gets separate accuracy calculation and performance rating.

## Contributing

This is a comprehensive chess application with professional-grade game analysis. The modular architecture makes it easy to extend with additional features.

### Key Components
- `/lib/stockfish.ts` - Stockfish engine wrapper
- `/lib/analysis.ts` - Game analysis engine  
- `/lib/database.ts` - Analysis storage system
- `/components/GameReview.tsx` - Analysis UI component
- `/components/ChessGame.tsx` - Main game component with integrated analysis

---

**Chess Master 3.0** - Now with professional game analysis powered by Stockfish! 🏆
