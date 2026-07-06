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
});
