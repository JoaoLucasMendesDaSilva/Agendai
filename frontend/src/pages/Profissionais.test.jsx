import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Profissionais from './Profissionais';

const profissionaisServiceMock = vi.hoisted(() => ({
  atualizarProfissional: vi.fn(),
  criarProfissional: vi.fn(),
  desativarProfissional: vi.fn(),
  listarProfissionais: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  logout: vi.fn(),
  usuario: { nome: 'Empreendedor Teste' },
}));

vi.mock('../services/profissionaisService', () => profissionaisServiceMock);
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => authMock }));
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));

describe('Profissionais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profissionaisServiceMock.listarProfissionais.mockResolvedValue({
      profissionais: [],
    });
    profissionaisServiceMock.criarProfissional.mockResolvedValue({
      profissional: { id: 1 },
    });
  });

  it('cria um profissional com os dados informados', async () => {
    const user = userEvent.setup();

    render(<Profissionais navigate={vi.fn()} />);

    await screen.findByRole('button', { name: /Salvar profissional/i });
    fireEvent.change(screen.getByLabelText(/Nome do profissional/i), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.change(screen.getByLabelText(/Especialidade/i), {
      target: { value: 'Colorista' },
    });
    fireEvent.change(screen.getByLabelText(/Telefone/i), {
      target: { value: '13999990000' },
    });
    fireEvent.change(screen.getByLabelText(/E-mail/i), {
      target: { value: 'maria@agendai.com' },
    });
    await user.click(
      screen.getByRole('button', { name: /Salvar profissional/i }),
    );

    await waitFor(() => {
      expect(profissionaisServiceMock.criarProfissional).toHaveBeenCalledWith({
        email: 'maria@agendai.com',
        especialidade: 'Colorista',
        nome: 'Maria Silva',
        telefone: '13999990000',
      });
    });
    expect(await screen.findByText(/Profissional criado/i)).toHaveAttribute(
      'role',
      'status',
    );
  });

  it('leva o foco ao formulario ao clicar em novo profissional', async () => {
    const user = userEvent.setup();

    render(<Profissionais navigate={vi.fn()} />);

    const nomeInput = await screen.findByLabelText(/Nome do profissional/i);
    await user.click(
      screen.getByRole('button', { name: /^Novo profissional$/i }),
    );

    expect(nomeInput).toHaveFocus();
  });
});
