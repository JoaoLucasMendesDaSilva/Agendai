import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';

const agendamentosServiceMock = vi.hoisted(() => ({
  listarAgendamentos: vi.fn(),
}));

const negocioServiceMock = vi.hoisted(() => ({
  buscarNegocio: vi.fn(),
}));

const profissionaisServiceMock = vi.hoisted(() => ({
  listarProfissionais: vi.fn(),
}));

const servicosServiceMock = vi.hoisted(() => ({
  listarServicos: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  logout: vi.fn(),
  usuario: { nome: 'Empreendedor Teste' },
}));

const chartMock = vi.hoisted(() => ({
  Chart: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
  })),
}));

vi.mock('../components/DashboardShell', () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => authMock }));
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));
vi.mock('../services/agendamentosService', () => agendamentosServiceMock);
vi.mock('../services/negocioService', () => negocioServiceMock);
vi.mock('../services/profissionaisService', () => profissionaisServiceMock);
vi.mock('../services/servicosService', () => servicosServiceMock);
vi.mock('chart.js/auto', () => chartMock);

async function renderizarDashboard() {
  const navigate = vi.fn();
  const { rerender } = render(<Dashboard navigate={navigate} />);

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: 'Gerar relatório PDF' }),
    ).toBeEnabled();
  });

  return {
    fim: screen.getByLabelText('Fim'),
    inicio: screen.getByLabelText('Início'),
    rerenderizar: () => rerender(<Dashboard navigate={navigate} />),
  };
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agendamentosServiceMock.listarAgendamentos.mockResolvedValue({
      agendamentos: [],
    });
    negocioServiceMock.buscarNegocio.mockResolvedValue({ negocio: null });
    profissionaisServiceMock.listarProfissionais.mockResolvedValue({
      profissionais: [],
    });
    servicosServiceMock.listarServicos.mockResolvedValue({ servicos: [] });
  });

  it('atualiza o inicio do periodo e preserva o fim', async () => {
    const user = userEvent.setup();
    const { fim, inicio, rerenderizar } = await renderizarDashboard();
    const fimInicial = fim.value;

    await user.clear(inicio);
    await user.type(inicio, '2026-07-01');
    rerenderizar();

    expect(inicio).toHaveValue('2026-07-01');
    expect(inicio).toHaveAttribute('value', '2026-07-01');
    expect(fim).toHaveValue(fimInicial);
  });

  it('atualiza o fim do periodo e preserva o inicio', async () => {
    const user = userEvent.setup();
    const { fim, inicio, rerenderizar } = await renderizarDashboard();
    const inicioInicial = inicio.value;

    await user.clear(fim);
    await user.type(fim, '2026-07-31');
    rerenderizar();

    expect(fim).toHaveValue('2026-07-31');
    expect(fim).toHaveAttribute('value', '2026-07-31');
    expect(inicio).toHaveValue(inicioInicial);
  });
});
