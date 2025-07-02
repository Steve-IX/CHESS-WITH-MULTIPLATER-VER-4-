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
  backgroundLight: string;
  backgroundDark: string;
  gridColorLight: string;
  gridColorDark: string;
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
    coordinateDark: 'text-stone-300',
    backgroundLight: '#f0f5fa',
    backgroundDark: '#011627',
    gridColorLight: 'rgba(120, 113, 108, 0.8)',
    gridColorDark: 'rgba(68, 64, 60, 0.6)'
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
    coordinateDark: 'text-amber-200',
    backgroundLight: '#fffbeb',
    backgroundDark: '#451a03',
    gridColorLight: 'rgba(217, 119, 6, 0.7)',
    gridColorDark: 'rgba(120, 53, 15, 0.6)'
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
    coordinateDark: 'text-emerald-200',
    backgroundLight: '#ecfdf5',
    backgroundDark: '#064e3b',
    gridColorLight: 'rgba(5, 150, 105, 0.7)',
    gridColorDark: 'rgba(6, 95, 70, 0.6)'
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
    coordinateDark: 'text-slate-300',
    backgroundLight: '#f8fafc',
    backgroundDark: '#0f172a',
    gridColorLight: 'rgba(71, 85, 105, 0.7)',
    gridColorDark: 'rgba(30, 41, 59, 0.6)'
  },
  {
    id: 'crystal',
    name: 'Crystal Glass',
    description: 'Clear glass with optical refraction and professional elegance',
    lightSquare: 'bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30',
    darkSquare: 'bg-gray-900 bg-opacity-20 backdrop-blur-sm border border-gray-400 border-opacity-20',
    boardBorder: 'border-2 border-white border-opacity-40 shadow-2xl',
    boardRing: 'ring-4 ring-white ring-opacity-30 shadow-lg',
    whitePieceColor: 'text-white',
    blackPieceColor: 'text-gray-800',
    whitePieceShadow: 'drop-shadow-2xl filter brightness-110',
    blackPieceShadow: 'drop-shadow-xl filter brightness-90',
    whitePieceTextShadow: '0 0 10px rgba(255,255,255,0.8), 2px 2px 4px rgba(0,0,0,0.3), -1px -1px 2px rgba(255,255,255,0.5)',
    blackPieceTextShadow: '0 0 8px rgba(0,0,0,0.6), 2px 2px 4px rgba(255,255,255,0.4), -1px -1px 2px rgba(0,0,0,0.8)',
    coordinateLight: 'text-white text-opacity-80',
    coordinateDark: 'text-gray-200',
    backgroundLight: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 25%, #f0f4ff 50%, #fdf4ff 75%, #fef7f0 100%)',
    backgroundDark: 'linear-gradient(135deg, #0c1445 0%, #1e1b4b 25%, #312e81 50%, #4c1d95 75%, #581c87 100%)',
    gridColorLight: 'rgba(147, 197, 253, 0.4)',
    gridColorDark: 'rgba(67, 56, 202, 0.4)'
  }
];

export const getThemeById = (id: string): ChessTheme => {
  return chessThemes.find(theme => theme.id === id) || chessThemes[0];
}; 