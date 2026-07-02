import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Negocio from './Negocio';

const negocioServiceMock = vi.hoisted(() => ({
  atualizarIdentidadeVisual: vi.fn(),
  atualizarNegocio: vi.fn(),
  buscarNegocio: vi.fn(),
  criarNegocio: vi.fn(),
}));

const authMock = vi.hoisted(() => ({
  logout: vi.fn(),
  usuario: { nome: 'Empreendedor Teste' },
}));

const themeMock = vi.hoisted(() => ({
  isDark: false,
  toggleTheme: vi.fn(),
}));

vi.mock('../services/negocioService', () => negocioServiceMock);
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authMock,
}));
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => themeMock,
}));

describe('Negocio', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    negocioServiceMock.buscarNegocio.mockResolvedValue({ negocio: null });
    negocioServiceMock.criarNegocio.mockResolvedValue({
      negocio: {
        id: 1,
        nome: 'Studio Teste',
        dias_funcionamento: [1],
      },
    });
  });

  it('nao envia o formulario sem ao menos um dia de funcionamento', async () => {
    const user = userEvent.setup();

    render(<Negocio navigate={vi.fn()} />);

    const botaoSalvar = await screen.findByRole('button', { name: /Salvar/i });
    await user.type(screen.getByLabelText(/Nome/i), 'Studio Teste');

    const checkboxes = screen.getAllByRole('checkbox');
    for (const checkbox of checkboxes.filter((item) => item.checked)) {
      await user.click(checkbox);
    }

    await user.click(botaoSalvar);

    expect(
      await screen.findByText(/Selecione ao menos um dia/i),
    ).toBeInTheDocument();
    expect(negocioServiceMock.criarNegocio).not.toHaveBeenCalled();
  });
});
