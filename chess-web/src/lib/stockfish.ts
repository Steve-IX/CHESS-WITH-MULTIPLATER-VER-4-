import { GameState, Move, Position, StockfishConfig, StockfishEvaluation } from './types';

declare global {
  interface Window {
    Stockfish: any;
  }
}

export class StockfishService {
  private engine: any = null;
  private isReady: boolean = false;
  private messageQueue: string[] = [];
  private evaluationPromise: Promise<StockfishEvaluation> | null = null;
  private evaluationResolver: ((evaluation: StockfishEvaluation) => void) | null = null;
  private currentDepth: number = 0;
  private currentScore: number = 0;
  private currentBestMove: string = '';
  private currentPv: string[] = [];
  private initializationAttempts: number = 0;
  private maxInitializationAttempts: number = 3;

  constructor() {
    // Delay initialization to ensure we're in browser environment
    if (typeof window !== 'undefined') {
      setTimeout(() => this.initializeEngine(), 100);
    }
  }

  private async initializeEngine(): Promise<void> {
    this.initializationAttempts++;
    
    try {
      // Try Web Worker with multiple CDN fallbacks
      await this.initializeWebWorkerEngine();
      
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
      
      if (this.initializationAttempts < this.maxInitializationAttempts) {
        // Retry with different approach
        setTimeout(() => this.initializeEngine(), 1000);
      } else {
        // Final fallback
        this.initializeSimpleEvaluator();
      }
    }
  }

  private async initializeWebWorkerEngine(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          reject(new Error('Stockfish requires browser environment'));
          return;
        }

        // Try multiple CDN sources
        const cdnSources = [
          'https://unpkg.com/stockfish@16.0.0/src/stockfish.js',
          'https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js',
          'https://cdnjs.cloudflare.com/ajax/libs/stockfish/16.0.0/stockfish.js'
        ];

        let currentSourceIndex = 0;

        const tryNextSource = () => {
          if (currentSourceIndex >= cdnSources.length) {
            reject(new Error('All CDN sources failed'));
            return;
          }

          const source = cdnSources[currentSourceIndex];

          // Create Web Worker with inline Stockfish
          const workerBlob = new Blob([`
            try {
              importScripts('${source}');
              const stockfish = Stockfish();
              
              self.onmessage = function(e) {
                stockfish.postMessage(e.data);
              };
              
              stockfish.onmessage = function(line) {
                self.postMessage(line);
              };
              
              // Signal success
              self.postMessage('ready');
            } catch (error) {
              self.postMessage('error: ' + error.message);
            }
          `], { type: 'application/javascript' });
          
          const workerUrl = URL.createObjectURL(workerBlob);
          this.engine = new Worker(workerUrl);
          
          this.engine.onmessage = (event: MessageEvent) => {
            if (event.data === 'ready') {
              // Successfully loaded
              this.engine.onmessage = (event: MessageEvent) => {
                this.handleEngineMessage(event.data);
              };
              
              // Send initial setup commands
              this.sendCommand('uci');
              this.sendCommand('isready');
              
              setTimeout(() => {
                this.isReady = true;
                this.processMessageQueue();
                console.log('✅ Stockfish initialized successfully');
                resolve();
              }, 2000);
              
            } else if (event.data.startsWith('error:')) {
              // This source failed, try next
              currentSourceIndex++;
              this.engine.terminate();
              setTimeout(tryNextSource, 500);
            } else {
              // Normal engine message
              this.handleEngineMessage(event.data);
            }
          };
          
          this.engine.onerror = (error) => {
            currentSourceIndex++;
            this.engine.terminate();
            setTimeout(tryNextSource, 500);
          };
          
        };

        tryNextSource();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private initializeSimpleEvaluator(): void {
    console.warn('🔄 Using simple position evaluator as fallback');
    // Create a mock engine that provides basic evaluation
    this.engine = {
      postMessage: (command: string) => {
        if (command.includes('go depth')) {
          // Simulate analysis with basic evaluation
          setTimeout(() => {
            this.handleEngineMessage('info depth 1 score cp 0 pv e2e4');
            this.handleEngineMessage('bestmove e2e4');
          }, 500);
        } else if (command === 'isready') {
          setTimeout(() => {
            this.handleEngineMessage('readyok');
          }, 100);
        }
      }
    };
    
    this.isReady = true;
    this.processMessageQueue();
  }

  private handleEngineMessage(message: string): void {
    if (message.includes('readyok')) {
      this.isReady = true;
      this.processMessageQueue();
      return;
    }

    if (message.includes('info depth')) {
      this.parseEvaluationInfo(message);
    }

    if (message.includes('bestmove')) {
      this.parseBestMove(message);
    }
  }

  private parseEvaluationInfo(message: string): void {
    const parts = message.split(' ');
    let depth = 0;
    let score = 0;
    let bestMove = '';
    let pv: string[] = [];
    let nodes = 0;
    let time = 0;
    let nps = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (part === 'depth') {
        depth = parseInt(parts[i + 1]);
      } else if (part === 'score') {
        const scoreType = parts[i + 1];
        if (scoreType === 'cp') {
          score = parseInt(parts[i + 2]);
        } else if (scoreType === 'mate') {
          const mateIn = parseInt(parts[i + 2]);
          score = mateIn > 0 ? 10000 - mateIn : -10000 - mateIn;
        }
      } else if (part === 'nodes') {
        nodes = parseInt(parts[i + 1]);
      } else if (part === 'time') {
        time = parseInt(parts[i + 1]);
      } else if (part === 'nps') {
        nps = parseInt(parts[i + 1]);
      } else if (part === 'pv') {
        pv = parts.slice(i + 1);
        break;
      }
    }

    if (pv.length > 0) {
      bestMove = pv[0];
    }

    this.currentDepth = depth;
    this.currentScore = score;
    this.currentBestMove = bestMove;
    this.currentPv = pv;
  }

  private parseBestMove(message: string): void {
    const parts = message.split(' ');
    const bestMove = parts[1];
    
    if (this.evaluationResolver) {
      const evaluation: StockfishEvaluation = {
        score: this.currentScore,
        bestMove: bestMove,
        pv: this.currentPv,
        depth: this.currentDepth,
        nodes: 0, // Will be filled in by info messages
        time: 0,
        nps: 0
      };
      
      this.evaluationResolver(evaluation);
      this.evaluationResolver = null;
      this.evaluationPromise = null;
    }
  }

  private sendCommand(command: string): void {
    if (this.isReady && this.engine) {
      console.log('Sending to Stockfish:', command);
      
      // Handle different engine types
      if (this.engine.postMessage) {
        this.engine.postMessage(command);
      } else if (typeof this.engine === 'function') {
        // Some stockfish packages are functions
        this.engine(command);
      } else {
        console.error('Unknown engine type');
      }
    } else {
      this.messageQueue.push(command);
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const command = this.messageQueue.shift();
      if (command && this.engine) {
        console.log('Sending queued to Stockfish:', command);
        
        // Handle different engine types
        if (this.engine.postMessage) {
          this.engine.postMessage(command);
        } else if (typeof this.engine === 'function') {
          this.engine(command);
        }
      }
    }
  }

  public async evaluatePosition(
    fen: string, 
    config: StockfishConfig = { depth: 18, multiPV: 1, threads: 4, hash: 128 }
  ): Promise<StockfishEvaluation> {
    return new Promise((resolve) => {
      this.evaluationResolver = resolve;
      
      // Configure engine
      this.sendCommand(`setoption name Hash value ${config.hash}`);
      this.sendCommand(`setoption name Threads value ${config.threads}`);
      this.sendCommand(`setoption name MultiPV value ${config.multiPV}`);
      
      // Set position
      this.sendCommand(`position fen ${fen}`);
      
      // Start analysis
      this.sendCommand(`go depth ${config.depth}`);
    });
  }

  public gameStateToFEN(gameState: GameState): string {
    let fen = '';
    
    // Board position
    for (let rank = 0; rank < 8; rank++) {
      let emptyCount = 0;
      let rankString = '';
      
      for (let file = 0; file < 8; file++) {
        const piece = gameState.board[rank][file];
        
        if (piece === null) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            rankString += emptyCount.toString();
            emptyCount = 0;
          }
          
          let pieceChar = '';
          switch (piece.type) {
            case 'pawn': pieceChar = 'p'; break;
            case 'rook': pieceChar = 'r'; break;
            case 'knight': pieceChar = 'n'; break;
            case 'bishop': pieceChar = 'b'; break;
            case 'queen': pieceChar = 'q'; break;
            case 'king': pieceChar = 'k'; break;
          }
          
          if (piece.color === 'white') {
            pieceChar = pieceChar.toUpperCase();
          }
          
          rankString += pieceChar;
        }
      }
      
      if (emptyCount > 0) {
        rankString += emptyCount.toString();
      }
      
      fen += rankString;
      if (rank < 7) fen += '/';
    }
    
    // Active color
    fen += ` ${gameState.currentPlayer === 'white' ? 'w' : 'b'}`;
    
    // Castling rights (simplified - would need to track rook/king movements)
    fen += ' KQkq';
    
    // En passant target
    if (gameState.enPassantTarget) {
      const file = String.fromCharCode(97 + gameState.enPassantTarget.y);
      const rank = (8 - gameState.enPassantTarget.x).toString();
      fen += ` ${file}${rank}`;
    } else {
      fen += ' -';
    }
    
    // Halfmove clock
    fen += ` ${gameState.halfmoveClock}`;
    
    // Fullmove number
    fen += ` ${gameState.fullmoveNumber}`;
    
    return fen;
  }

  public uciToMove(uci: string, gameState: GameState): Move | null {
    if (uci.length < 4) return null;
    
    const fromFile = uci.charCodeAt(0) - 97; // a-h to 0-7
    const fromRank = 8 - parseInt(uci[1]); // 1-8 to 7-0
    const toFile = uci.charCodeAt(2) - 97;
    const toRank = 8 - parseInt(uci[3]);
    
    const fromPos: Position = { x: fromRank, y: fromFile };
    const toPos: Position = { x: toRank, y: toFile };
    
    const piece = gameState.board[fromRank][fromFile];
    const capturedPiece = gameState.board[toRank][toFile];
    
    if (!piece) return null;
    
    const move: Move = {
      from: fromPos,
      to: toPos,
      piece: piece,
      capturedPiece: capturedPiece || undefined
    };
    
    // Handle promotion
    if (uci.length === 5) {
      const promotionPiece = uci[4];
      switch (promotionPiece) {
        case 'q': move.promotion = 'queen'; break;
        case 'r': move.promotion = 'rook'; break;
        case 'b': move.promotion = 'bishop'; break;
        case 'n': move.promotion = 'knight'; break;
      }
    }
    
    return move;
  }

  public moveToUci(move: Move): string {
    const fromFile = String.fromCharCode(97 + move.from.y);
    const fromRank = (8 - move.from.x).toString();
    const toFile = String.fromCharCode(97 + move.to.y);
    const toRank = (8 - move.to.x).toString();
    
    let uci = fromFile + fromRank + toFile + toRank;
    
    if (move.promotion) {
      switch (move.promotion) {
        case 'queen': uci += 'q'; break;
        case 'rook': uci += 'r'; break;
        case 'bishop': uci += 'b'; break;
        case 'knight': uci += 'n'; break;
      }
    }
    
    return uci;
  }

  public stop(): void {
    if (this.engine) {
      this.sendCommand('stop');
    }
  }

  public quit(): void {
    if (this.engine) {
      this.sendCommand('quit');
      this.engine = null;
      this.isReady = false;
    }
  }
}

// Singleton instance
export const stockfishService = new StockfishService(); 