import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';

const themeMock = vi.hoisted(() => ({
  isDark: false,
  toggleTheme: vi.fn(),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => themeMock,
}));

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mantem respostas fechadas fora da arvore de acessibilidade', async () => {
    const user = userEvent.setup();
    render(<LandingPage navigate={vi.fn()} />);

    const pergunta = screen.getByRole('button', {
      name: 'O cliente precisa criar uma conta para agendar?',
    });
    expect(pergunta).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: pergunta.textContent })).not.toBeInTheDocument();

    await user.click(pergunta);

    expect(pergunta).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: pergunta.textContent })).toBeVisible();
  });

  it('oferece login e atalhos no menu compacto', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(<LandingPage navigate={navigate} />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

    const menu = document.getElementById('landing-mobile-menu');
    expect(menu).not.toHaveAttribute('hidden');
    expect(within(menu).getByRole('button', { name: 'O que resolve' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(menu).toHaveAttribute('hidden');
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

    await user.click(within(menu).getByRole('button', { name: 'Entrar na minha conta' }));

    expect(navigate).toHaveBeenCalledWith('/login');
    expect(menu).toHaveAttribute('hidden');
  });

  it('nao promete gratuidade sem apresentar condicoes', () => {
    render(<LandingPage navigate={vi.fn()} />);

    expect(screen.queryByText(/grátis/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Criar minha agenda')).toHaveLength(2);
    expect(screen.getByText('O cadastro atual não solicita cartão ou pagamento.')).toBeInTheDocument();
  });
});
