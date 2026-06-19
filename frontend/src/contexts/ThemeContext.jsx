import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'agendai-theme';

function obterTemaInicial() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const temaSalvo = window.localStorage.getItem(STORAGE_KEY);

  if (temaSalvo === 'light' || temaSalvo === 'dark') {
    return temaSalvo;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(obterTemaInicial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      isDark: theme === 'dark',
      theme,
      toggleTheme() {
        setTheme((atual) => (atual === 'dark' ? 'light' : 'dark'));
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider.');
  }

  return context;
}

export { ThemeProvider, useTheme };
