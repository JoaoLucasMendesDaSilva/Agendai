import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

  it('mantem o FAQ navegavel com o comportamento nativo de detalhes', async () => {
    const user = userEvent.setup();
    render(<LandingPage navigate={vi.fn()} />);

    const pergunta = screen.getByText('O cliente precisa criar uma conta para agendar?');
    const item = pergunta.closest('details');
    expect(item).not.toHaveAttribute('open');

    await user.click(pergunta);

    expect(item).toHaveAttribute('open');
    expect(screen.getByText(/informa apenas os dados necessários/i)).toBeVisible();
  });

  it('oferece login e atalhos no menu compacto', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(<LandingPage navigate={navigate} />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

    const menu = document.getElementById('landing-mobile-menu');
    expect(menu).not.toHaveAttribute('hidden');
    expect(within(menu).getByRole('link', { name: 'O que resolve' })).toHaveAttribute('href', '#recursos');

    await user.keyboard('{Escape}');
    expect(menu).toHaveAttribute('hidden');
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

    await user.click(within(menu).getByRole('link', { name: 'Entrar na minha conta' }));

    expect(navigate).toHaveBeenCalledWith('/login');
    expect(menu).toHaveAttribute('hidden');
  });

  it('marca a secao atual sem substituir as ancoras nativas', () => {
    const intersectionObserverOriginal = window.IntersectionObserver;
    let notificarInterseccao;

    class IntersectionObserverMock {
      constructor(callback) {
        notificarInterseccao = callback;
      }

      observe() {}

      disconnect() {}
    }

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: IntersectionObserverMock,
    });

    try {
      render(<LandingPage navigate={vi.fn()} />);

      const atalhos = screen.getByRole('group', { name: 'Seções da página' });
      const comoFunciona = within(atalhos).getByRole('link', { name: 'Como funciona' });
      expect(comoFunciona).toHaveAttribute('href', '#como-funciona');
      expect(comoFunciona).not.toHaveAttribute('aria-current');

      act(() => notificarInterseccao([{
        isIntersecting: true,
        target: document.getElementById('como-funciona'),
      }]));

      expect(comoFunciona).toHaveAttribute('aria-current', 'location');
    } finally {
      Object.defineProperty(window, 'IntersectionObserver', {
        configurable: true,
        value: intersectionObserverOriginal,
      });
    }
  });

  it('fecha o menu compacto ao clicar fora ou redimensionar a tela', async () => {
    const user = userEvent.setup();
    render(<LandingPage navigate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

    const menu = document.getElementById('landing-mobile-menu');
    expect(menu).not.toHaveAttribute('hidden');

    await user.click(screen.getByRole('heading', {
      name: 'Seu dia inteiro em ordem, antes mesmo do primeiro atendimento.',
    }));

    expect(menu).toHaveAttribute('hidden');

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(menu).not.toHaveAttribute('hidden');

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(menu).toHaveAttribute('hidden');
  });

  it('mantem a rolagem funcional quando matchMedia nao esta disponivel', async () => {
    const user = userEvent.setup();
    const matchMediaOriginal = window.matchMedia;
    const scrollIntoViewOriginal = window.HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      render(<LandingPage navigate={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: 'Ver como funciona' }));

      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: matchMediaOriginal,
      });
      Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: scrollIntoViewOriginal,
      });
    }
  });

  it('nao promete gratuidade sem apresentar condicoes', () => {
    render(<LandingPage navigate={vi.fn()} />);

    expect(screen.queryByText(/grátis/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Criar minha agenda')).toHaveLength(2);
    expect(screen.getByText('O cadastro atual não solicita cartão ou pagamento.')).toBeInTheDocument();
    expect(screen.queryByText(/PWA/i)).not.toBeInTheDocument();
  });

  it('usa capturas reais identificadas da Jota Barber como prova do produto', () => {
    render(<LandingPage navigate={vi.fn()} />);

    expect(screen.getByRole('img', { name: /Dashboard administrativo da Jota Barber/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Página pública real da Jota Barber/i })).toBeInTheDocument();
    expect(screen.getAllByText('Exemplo de negócio configurado no Agendai')).toHaveLength(1);
  });

  it('apresenta os planos do TCC apenas como demonstracao', () => {
    render(<LandingPage navigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Gratuito' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Básico' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Profissional' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rede' })).toBeInTheDocument();
    expect(screen.getByText('R$ 19,90/mês')).toBeInTheDocument();
    expect(screen.getByText('R$ 359,00/ano')).toBeInTheDocument();
    expect(screen.getByText(/Pagamentos e assinaturas não estão implementados\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /assinar|comprar|contratar/i })).not.toBeInTheDocument();
  });

  it('confirma explicitamente o horario ilustrativo e mostra o resumo', () => {
    vi.useFakeTimers();
    render(<LandingPage navigate={vi.fn()} />);

    const horario = screen.getByRole('button', { name: '14:00, Livre' });
    fireEvent.click(horario);

    expect(screen.getByRole('button', { name: '14:00, Solicitado' })).toHaveAttribute('aria-pressed', 'true');
    const confirmar = screen.getByRole('button', { name: 'Confirmar horário' });
    fireEvent.click(confirmar);

    expect(screen.getByRole('button', { name: 'Confirmando…' })).toBeDisabled();

    act(() => vi.advanceTimersByTime(520));

    expect(screen.getByText('Horário confirmado nesta demonstração')).toBeInTheDocument();
    expect(screen.getByText('Corte degradê · 14:00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Escolher outro horário' }));
    expect(screen.getByRole('button', { name: '14:00, Livre' })).toBeInTheDocument();
    vi.useRealTimers();
  });
});
