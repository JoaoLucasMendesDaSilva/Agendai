import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

function TemaAtual() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme} type="button">{theme}</button>;
}

describe('ThemeProvider', () => {
  let mediaQuery;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    mediaQuery = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    window.matchMedia.mockReturnValue(mediaQuery);
  });

  it('acompanha mudanças do tema do sistema sem preferência salva', () => {
    render(<ThemeProvider><TemaAtual /></ThemeProvider>);

    expect(screen.getByRole('button')).toHaveTextContent('dark');
    act(() => mediaQuery.addEventListener.mock.calls[0][1]({ matches: false }));

    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(localStorage.getItem('agendai-theme')).toBeNull();
  });

  it('mantém a escolha manual acima do tema do sistema', () => {
    localStorage.setItem('agendai-theme', 'light');
    render(<ThemeProvider><TemaAtual /></ThemeProvider>);

    expect(mediaQuery.addEventListener).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveTextContent('light');
  });
});
