declare module 'stockfish.js' {
  interface StockfishEngine {
    postMessage(command: string): void;
    onmessage: ((message: string) => void) | null;
  }
  
  const Stockfish: () => StockfishEngine;
  export default Stockfish;
}

declare module 'stockfish' {
  interface StockfishEngine {
    postMessage(command: string): void;
    onmessage: ((message: string) => void) | null;
  }
  
  const Stockfish: () => StockfishEngine;
  export default Stockfish;
} 