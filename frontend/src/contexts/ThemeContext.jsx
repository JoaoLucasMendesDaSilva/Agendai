import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'agendai-theme';

function obterTemaSalvo() {
  const temaSalvo = window.localStorage.getItem(STORAGE_KEY);
  return temaSalvo === 'light' || temaSalvo === 'dark' ? temaSalvo : null;
}

function obterTemaInicial() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const temaSalvo = obterTemaSalvo();

  if (temaSalvo) {
    return temaSalvo;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(obterTemaInicial);
  const followsSystem = useRef(
    typeof window !== 'undefined' && !obterTemaSalvo(),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (!followsSystem.current) {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (!followsSystem.current) return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event) => {
      if (followsSystem.current) setTheme(event.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  const value = useMemo(
    () => ({
      isDark: theme === 'dark',
      theme,
      toggleTheme() {
        followsSystem.current = false;
        setTheme((atual) => {
          const proximoTema = atual === 'dark' ? 'light' : 'dark';
          window.localStorage.setItem(STORAGE_KEY, proximoTema);
          return proximoTema;
        });
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
