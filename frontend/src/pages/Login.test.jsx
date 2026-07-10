import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const authMock = vi.hoisted(() => ({
  login: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authMock,
}));

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.login.mockResolvedValue({ usuario: { id: 1 } });
  });

  it('envia credenciais e a preferencia de manter a sessao', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();

    render(<Login navigate={navigate} />);

    await user.type(screen.getByLabelText('E-mail'), ' Empreendedor@Agendai.com ');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    await user.click(screen.getByRole('checkbox', { name: 'Lembrar de mim' }));
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(authMock.login).toHaveBeenCalledWith(
        { email: 'empreendedor@agendai.com', senha: 'senha-segura' },
        { lembrar: true },
      );
    });
    expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('mostra erros acessiveis e foca o primeiro campo invalido', async () => {
    const user = userEvent.setup();

    render(<Login navigate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    expect(authMock.login).not.toHaveBeenCalled();
  });

  it('permite conferir a senha sem apagar o valor digitado', async () => {
    const user = userEvent.setup();

    render(<Login navigate={vi.fn()} />);
    const senha = screen.getByLabelText('Senha');
    await user.type(senha, 'senha-segura');
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(senha).toHaveAttribute('type', 'text');
    expect(senha).toHaveValue('senha-segura');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeInTheDocument();
  });

  it('explica credenciais invalidas sem expor a mensagem bruta da API', async () => {
    const user = userEvent.setup();
    const erro = Object.assign(new Error('detalhe interno'), { status: 401 });
    authMock.login.mockRejectedValue(erro);

    render(<Login navigate={vi.fn()} />);
    await user.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-incorreta');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail ou senha não conferem. Verifique os dados e tente novamente.',
    );
    expect(screen.queryByText('detalhe interno')).not.toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  it('impede envios repetidos enquanto a autenticacao esta em andamento', async () => {
    const user = userEvent.setup();
    authMock.login.mockImplementation(() => new Promise(() => {}));

    render(<Login navigate={vi.fn()} />);
    await user.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-segura');
    const entrar = screen.getByRole('button', { name: 'Entrar' });
    await user.dblClick(entrar);

    expect(authMock.login).toHaveBeenCalledTimes(1);
    const verificando = screen.getByRole('button', { name: 'Verificando acesso…' });
    expect(verificando).toBeDisabled();
    expect(verificando).toHaveAttribute('aria-busy', 'true');
  });
});
