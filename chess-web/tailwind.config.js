/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Theme background colors
    'bg-stone-100', 'bg-stone-700', 'bg-amber-50', 'bg-amber-900', 
    'bg-emerald-50', 'bg-emerald-800', 'bg-slate-100', 'bg-slate-800',
    'bg-white', 'bg-gray-900', 'bg-opacity-20',
    
    // Theme border colors
    'border-stone-800', 'border-amber-950', 'border-emerald-900', 'border-slate-900',
    'border-white', 'border-gray-400', 'border-opacity-30', 'border-opacity-20',
    
    // Theme ring colors
    'ring-stone-600', 'ring-amber-800', 'ring-emerald-700', 'ring-slate-700',
    'ring-white', 'ring-opacity-20', 'ring-opacity-25', 'ring-opacity-30',
    
    // Theme text colors
    'text-gray-50', 'text-gray-900', 'text-amber-50', 'text-amber-950',
    'text-emerald-50', 'text-emerald-950', 'text-slate-50', 'text-slate-900',
    'text-white', 'text-gray-800', 'text-opacity-80',
    
    // Theme coordinate colors
    'text-stone-600', 'text-stone-300', 'text-amber-700', 'text-amber-200',
    'text-emerald-700', 'text-emerald-200', 'text-slate-600', 'text-slate-300',
    'text-gray-200',
    
    // Theme shadow and glass effects
    'drop-shadow-lg', 'drop-shadow-md', 'drop-shadow-xl', 'drop-shadow-2xl',
    'backdrop-blur-sm', 'filter', 'brightness-110', 'brightness-90',
    'shadow-lg', 'shadow-xl', 'shadow-2xl',
    
    // Crystal theme background effects
    'bg-gradient-to-br', 'from-blue-50', 'via-indigo-50', 'to-purple-50',
    'from-white/10', 'via-blue-100/20', 'to-purple-100/10',
    'bg-gradient-radial', 'from-white/30', 'from-blue-200/40', 'from-purple-200/30',
    'to-transparent', 'blur-2xl', 'blur-3xl', 'overflow-hidden',
    
    // Menu animation effects
    'from-indigo-900', 'via-purple-900', 'to-pink-900',
    'from-blue-500/30', 'from-purple-500/40', 'from-pink-500/35',
    'from-blue-500/0', 'via-purple-500/0', 'to-pink-500/0',
    'from-blue-500/10', 'via-purple-500/10', 'to-pink-500/10',
    'from-purple-500/20', 'to-pink-500/20', 'from-purple-500/30', 'to-pink-500/30',
    'bg-gradient-to-r', 'from-white', 'via-blue-200', 'to-purple-200',
    'bg-clip-text', 'text-transparent', 'backdrop-blur-xl', 'rounded-3xl',
    'from-blue-300', 'to-purple-300', 'brightness-110', '-skew-x-12',
    'opacity-5', 'opacity-10', 'opacity-12', 'opacity-15',
    
    // Red theme colors
    'bg-red-50', 'bg-red-800',
    'border-red-900',
    'ring-red-700',
    'text-red-50', 'text-red-950',
    'text-red-700', 'text-red-200',
    
    // Pink theme colors
    'bg-pink-50', 'bg-pink-800',
    'border-pink-900',
    'ring-pink-700',
    'text-pink-50', 'text-pink-950',
    'text-pink-700', 'text-pink-200',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
} 