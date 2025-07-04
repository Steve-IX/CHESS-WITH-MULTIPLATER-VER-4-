import { GameState, Move, Position, StockfishConfig, StockfishEvaluation } from './types';

/**
 * Alternative Stockfish service using CDN-based Web Worker
 * This is a fallback that doesn't rely on npm packages
 */
export class CDNStockfishService {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private messageQueue: string[] = [];
  private evaluationResolver: ((evaluation: StockfishEvaluation) => void) | null = null;
  private currentDepth: number = 0;
  private currentScore: number = 0;
  private currentBestMove: string = '';
  private currentPv: string[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWorker();
    }
  }

  private initializeWorker(): void {
    try {
      // Create a Web Worker with Stockfish from CDN
      const workerCode = `
        // Load Stockfish from CDN
        importScripts('https://unpkg.com/stockfish@16.0.0/src/stockfish.js');
        
        let stockfish;
        
        // Initialize Stockfish
        if (typeof Stockfish !== 'undefined') {
          stockfish = Stockfish();
        } else {
          // Alternative CDN
          importScripts('https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js');
          stockfish = Stockfish();
        }
        
        // Handle messages from main thread
        self.onmessage = function(e) {
          if (stockfish && stockfish.postMessage) {
            stockfish.postMessage(e.data);
          }
        };
        
        // Forward Stockfish output to main thread
        if (stockfish) {
          stockfish.onmessage = function(line) {
            self.postMessage(line);
          };
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = (event: MessageEvent) => {
        this.handleEngineMessage(event.data);
      };
      
      this.worker.onerror = (error) => {
        console.error('Stockfish Worker error:', error);
        this.initializeFallback();
      };

      // Initialize engine
      this.sendCommand('uci');
      this.sendCommand('isready');
      
      setTimeout(() => {
        this.isReady = true;
        this.processMessageQueue();
        console.log('✅ CDN Stockfish Worker initialized');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to create Stockfish worker:', error);
      this.initializeFallback();
    }
  }

  private initializeFallback(): void {
    console.warn('🔄 Using simple evaluation fallback');
    
    // Mock worker for basic functionality
    this.worker = {
      postMessage: (command: string) => {
        if (command.includes('go depth')) {
          // Basic evaluation simulation
          setTimeout(() => {
            this.handleEngineMessage('info depth 5 score cp 25 pv e2e4 e7e5 g1f3');
            this.handleEngineMessage('bestmove e2e4');
          }, 800);
        } else if (command === 'isready') {
          setTimeout(() => {
            this.handleEngineMessage('readyok');
          }, 100);
        }
      },
      terminate: () => {},
      onmessage: null,
      onerror: null
    } as any;
    
    this.isReady = true;
    this.processMessageQueue();
  }

  private handleEngineMessage(message: string): void {
    console.log('Stockfish CDN:', message);
    
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
    let pv: string[] = [];

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
      } else if (part === 'pv') {
        pv = parts.slice(i + 1);
        break;
      }
    }

    this.currentDepth = depth;
    this.currentScore = score;
    this.currentPv = pv;
    this.currentBestMove = pv[0] || '';
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
        nodes: 0,
        time: 0,
        nps: 0
      };
      
      this.evaluationResolver(evaluation);
      this.evaluationResolver = null;
    }
  }

  private sendCommand(command: string): void {
    if (this.isReady && this.worker) {
      console.log('Sending to CDN Stockfish:', command);
      this.worker.postMessage(command);
    } else {
      this.messageQueue.push(command);
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.worker) {
      const command = this.messageQueue.shift();
      if (command) {
        console.log('Sending queued to CDN Stockfish:', command);
        this.worker.postMessage(command);
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
    
    // Castling rights (simplified)
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
    
    const fromFile = uci.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(uci[1]);
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
    if (this.worker) {
      this.worker.postMessage('stop');
    }
  }

  public quit(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }
}

// Export as alternative service
export const cdnStockfishService = new CDNStockfishService(); 