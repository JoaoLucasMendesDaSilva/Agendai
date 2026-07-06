import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Servicos from './Servicos';

const servicosServiceMock = vi.hoisted(() => ({
  atualizarServico: vi.fn(),
  criarServico: vi.fn(),
  desativarServico: vi.fn(),
  listarServicos: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  logout: vi.fn(),
  usuario: { nome: 'Empreendedor Teste' },
}));

vi.mock('../services/servicosService', () => servicosServiceMock);
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => authMock }));
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));

describe('Servicos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicosServiceMock.listarServicos.mockResolvedValue({ servicos: [] });
    servicosServiceMock.criarServico.mockResolvedValue({ servico: { id: 1 } });
  });

  it('cria um servico e anuncia a confirmacao', async () => {
    const user = userEvent.setup();

    render(<Servicos navigate={vi.fn()} />);

    await screen.findByRole('button', { name: /Salvar serviço/i });
    await user.type(screen.getByLabelText(/Nome do serviço/i), 'Corte executivo');
    await user.click(screen.getByRole('button', { name: /Salvar serviço/i }));

    await waitFor(() => {
      expect(servicosServiceMock.criarServico).toHaveBeenCalledWith({
        descricao: '',
        duracao_minutos: 30,
        nome: 'Corte executivo',
        preco: 0,
      });
    });
    expect(await screen.findByText(/Serviço criado/i)).toHaveAttribute(
      'role',
      'status',
    );
  });

  it('leva o foco ao formulario ao clicar em novo servico', async () => {
    const user = userEvent.setup();

    render(<Servicos navigate={vi.fn()} />);

    const nomeInput = await screen.findByLabelText(/Nome do serviço/i);
    await user.click(screen.getByRole('button', { name: /^Novo serviço$/i }));

    expect(nomeInput).toHaveFocus();
  });
});
