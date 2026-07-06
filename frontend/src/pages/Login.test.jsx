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

    await user.type(screen.getByLabelText('E-mail'), 'empreendedor@agendai.com');
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
});
