'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useTransition, ReactNode } from 'react';

// Theme color constants
export const THEME_COLORS = {
  dark: {
    primary: "#4d9de0",   // light blue
    secondary: "#011627", // deep navy
    accent: "#2ec4b6",    // teal accent
    danger: "#ff3366",    // pink highlight
    background: "#011627", // deep navy
    cardBg: "#051e3380",  // translucent navy
    text: "#ffffff",      // white
    muted: "#a0aec0",     // muted gray
  },
  light: {
    primary: "#1a6fb0",   // darker blue
    secondary: "#ffffff", // white
    accent: "#16a699",    // darker teal
    danger: "#e01e5a",    // darker pink
    background: "#f0f5fa", // light blue gray
    cardBg: "#ffffff",    // white
    text: "#1a202c",      // dark gray
    muted: "#4a5568",     // medium gray
  }
} as const;

interface ThemeContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  colors: typeof THEME_COLORS.dark;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Check for user preference or saved setting
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isPending, startTransition] = useTransition();
  
  // On mount, check for saved preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('chess-theme');
    if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  // Defer DOM operations to improve INP
  const updateDOMClasses = useCallback((newTheme: 'dark' | 'light') => {
    // Use requestIdleCallback for non-critical DOM updates if available
    const updateClasses = () => {
      if (newTheme === 'light') {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
      } else {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(updateClasses, { timeout: 100 });
    } else {
      setTimeout(updateClasses, 0);
    }
  }, []);

  // Defer localStorage operations
  const saveThemePreference = useCallback((newTheme: 'dark' | 'light') => {
    // Use requestIdleCallback for localStorage if available
    const saveToStorage = () => {
      try {
        localStorage.setItem('chess-theme', newTheme);
      } catch (error) {
        console.warn('Failed to save theme preference:', error);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(saveToStorage, { timeout: 100 });
    } else {
      setTimeout(saveToStorage, 0);
    }
  }, []);

  // Update body class and save preference when theme changes
  useEffect(() => {
    updateDOMClasses(theme);
    saveThemePreference(theme);
  }, [theme, updateDOMClasses, saveThemePreference]);

  const toggleTheme = useCallback(() => {
    startTransition(() => {
      setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
    });
  }, []);

  // Memoize colors to prevent unnecessary recalculations
  const currentColors = useMemo(() => THEME_COLORS[theme], [theme]);
  
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    theme,
    toggleTheme,
    colors: currentColors,
    isTransitioning: isPending
  }), [theme, toggleTheme, currentColors, isPending]);
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 