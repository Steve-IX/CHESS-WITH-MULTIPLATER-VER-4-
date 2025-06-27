export interface ChessTheme {
  id: string;
  name: string;
  description: string;
  lightSquare: string;
  darkSquare: string;
  boardBorder: string;
  boardRing: string;
  whitePieceColor: string;
  blackPieceColor: string;
  whitePieceShadow: string;
  blackPieceShadow: string;
  whitePieceTextShadow: string;
  blackPieceTextShadow: string;
  coordinateLight: string;
  coordinateDark: string;
}

export const chessThemes: ChessTheme[] = [
  {
    id: 'classic',
    name: 'Classic Stone',
    description: 'Traditional stone colors with excellent contrast',
    lightSquare: 'bg-stone-100',
    darkSquare: 'bg-stone-700',
    boardBorder: 'border-stone-800',
    boardRing: 'ring-2 ring-stone-600 ring-opacity-20',
    whitePieceColor: 'text-gray-50',
    blackPieceColor: 'text-gray-900',
    whitePieceShadow: 'drop-shadow-lg',
    blackPieceShadow: 'drop-shadow-md',
    whitePieceTextShadow: '2px 2px 0px #374151, -1px -1px 0px #374151, 1px -1px 0px #374151, -1px 1px 0px #374151',
    blackPieceTextShadow: '2px 2px 0px #f9fafb, -1px -1px 0px #f9fafb, 1px -1px 0px #f9fafb, -1px 1px 0px #f9fafb',
    coordinateLight: 'text-stone-600',
    coordinateDark: 'text-stone-300'
  },
  {
    id: 'mahogany',
    name: 'Mahogany Wood',
    description: 'Rich mahogany wood tones for a luxurious feel',
    lightSquare: 'bg-amber-50',
    darkSquare: 'bg-amber-900',
    boardBorder: 'border-amber-950',
    boardRing: 'ring-2 ring-amber-800 ring-opacity-30',
    whitePieceColor: 'text-amber-50',
    blackPieceColor: 'text-amber-950',
    whitePieceShadow: 'drop-shadow-lg',
    blackPieceShadow: 'drop-shadow-md',
    whitePieceTextShadow: '2px 2px 0px #451a03, -1px -1px 0px #451a03, 1px -1px 0px #451a03, -1px 1px 0px #451a03',
    blackPieceTextShadow: '2px 2px 0px #fffbeb, -1px -1px 0px #fffbeb, 1px -1px 0px #fffbeb, -1px 1px 0px #fffbeb',
    coordinateLight: 'text-amber-700',
    coordinateDark: 'text-amber-200'
  },
  {
    id: 'emerald',
    name: 'Emerald Elite',
    description: 'Sophisticated emerald and cream combination',
    lightSquare: 'bg-emerald-50',
    darkSquare: 'bg-emerald-800',
    boardBorder: 'border-emerald-900',
    boardRing: 'ring-2 ring-emerald-700 ring-opacity-25',
    whitePieceColor: 'text-emerald-50',
    blackPieceColor: 'text-emerald-950',
    whitePieceShadow: 'drop-shadow-lg',
    blackPieceShadow: 'drop-shadow-md',
    whitePieceTextShadow: '2px 2px 0px #064e3b, -1px -1px 0px #064e3b, 1px -1px 0px #064e3b, -1px 1px 0px #064e3b',
    blackPieceTextShadow: '2px 2px 0px #ecfdf5, -1px -1px 0px #ecfdf5, 1px -1px 0px #ecfdf5, -1px 1px 0px #ecfdf5',
    coordinateLight: 'text-emerald-700',
    coordinateDark: 'text-emerald-200'
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep midnight blue with silver accents',
    lightSquare: 'bg-slate-100',
    darkSquare: 'bg-slate-800',
    boardBorder: 'border-slate-900',
    boardRing: 'ring-2 ring-slate-700 ring-opacity-30',
    whitePieceColor: 'text-slate-50',
    blackPieceColor: 'text-slate-900',
    whitePieceShadow: 'drop-shadow-lg',
    blackPieceShadow: 'drop-shadow-md',
    whitePieceTextShadow: '2px 2px 0px #0f172a, -1px -1px 0px #0f172a, 1px -1px 0px #0f172a, -1px 1px 0px #0f172a',
    blackPieceTextShadow: '2px 2px 0px #f8fafc, -1px -1px 0px #f8fafc, 1px -1px 0px #f8fafc, -1px 1px 0px #f8fafc',
    coordinateLight: 'text-slate-600',
    coordinateDark: 'text-slate-300'
  }
];

export const getThemeById = (id: string): ChessTheme => {
  return chessThemes.find(theme => theme.id === id) || chessThemes[0];
}; 