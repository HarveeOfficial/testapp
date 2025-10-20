import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: {
    background: string;
    text: string;
    textSecondary: string;
    border: string;
    card: string;
    primary: string;
    danger: string;
  };
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#666666',
    border: '#e0e0e0',
    card: '#f5f5f5',
    primary: '#007AFF',
    danger: '#ff3b30',
  },
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#999999',
    border: '#333333',
    card: '#25292e',
    primary: '#0a84ff',
    danger: '#ff453a',
  },
};

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('theme.mode');
      if (saved) {
        setIsDarkMode(saved === 'dark');
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading theme preference:', error);
      setIsLoaded(true);
    }
  };

  const saveThemePreference = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('theme.mode', mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newMode: ThemeMode = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    saveThemePreference(newMode);
  };

  const setThemeMode = (mode: ThemeMode) => {
    setIsDarkMode(mode === 'dark');
    saveThemePreference(mode);
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  // Return null until theme is loaded to prevent flash of wrong theme
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
