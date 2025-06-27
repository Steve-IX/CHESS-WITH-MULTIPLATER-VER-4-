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
    
    // Theme border colors
    'border-stone-800', 'border-amber-950', 'border-emerald-900', 'border-slate-900',
    
    // Theme ring colors
    'ring-stone-600', 'ring-amber-800', 'ring-emerald-700', 'ring-slate-700',
    'ring-opacity-20', 'ring-opacity-25', 'ring-opacity-30',
    
    // Theme text colors
    'text-gray-50', 'text-gray-900', 'text-amber-50', 'text-amber-950',
    'text-emerald-50', 'text-emerald-950', 'text-slate-50', 'text-slate-900',
    
    // Theme coordinate colors
    'text-stone-600', 'text-stone-300', 'text-amber-700', 'text-amber-200',
    'text-emerald-700', 'text-emerald-200', 'text-slate-600', 'text-slate-300',
    
    // Theme shadow classes
    'drop-shadow-lg', 'drop-shadow-md',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} 