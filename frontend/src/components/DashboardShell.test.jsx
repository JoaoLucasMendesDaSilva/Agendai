import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardShell from './DashboardShell';

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));

vi.mock('../services/negocioService', () => ({
  buscarNegocio: vi.fn().mockResolvedValue({ negocio: null }),
}));

describe('DashboardShell', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    });
  });

  it('recolhe e expande a sidebar pelo botao de controle', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DashboardShell
        currentPath="/dashboard"
        navigate={vi.fn()}
        onLogout={vi.fn()}
        usuario={{ nome: 'João' }}
      >
        <p>Conteúdo</p>
      </DashboardShell>,
    );

    await user.click(screen.getByRole('button', { name: 'Recolher menu lateral' }));
    expect(container.querySelector('.app-shell')).toHaveClass('is-sidebar-collapsed');

    await user.click(screen.getByRole('button', { name: 'Expandir menu lateral' }));
    expect(container.querySelector('.app-shell')).not.toHaveClass('is-sidebar-collapsed');
  });

  it('retira o overlay fechado da navegacao por teclado no mobile', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    const user = userEvent.setup();
    const { container, unmount } = render(
      <DashboardShell
        currentPath="/dashboard"
        navigate={vi.fn()}
        onLogout={vi.fn()}
        usuario={{ nome: 'João' }}
      >
        <p>Conteúdo</p>
      </DashboardShell>,
    );
    const overlay = container.querySelector('.sidebar-overlay');

    expect(overlay).toHaveAttribute('tabindex', '-1');
    const menuButton = screen.getByRole('button', { name: 'Abrir menu' });
    await user.click(menuButton);
    expect(overlay).toHaveAttribute('tabindex', '0');
    expect(document.body).toHaveStyle({ overflow: 'hidden' });
    expect(screen.getByRole('button', { name: 'Voltar para a página inicial' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(overlay).toHaveAttribute('tabindex', '-1');
    expect(menuButton).toHaveFocus();

    await user.click(menuButton);

    await user.click(overlay);
    expect(overlay).toHaveAttribute('tabindex', '-1');
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' });

    unmount();
  });

  it('fecha o menu de perfil com Escape', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DashboardShell
        currentPath="/dashboard"
        navigate={vi.fn()}
        onLogout={vi.fn()}
        usuario={{ nome: 'João' }}
      >
        <p>Conteúdo</p>
      </DashboardShell>,
    );

    await user.click(container.querySelector('.topbar-user'));
    expect(screen.getByRole('button', { name: 'Configurar negócio' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Configurar negócio' })).not.toBeInTheDocument();
  });
});
