import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import Cadastro from './Cadastro';

const auth = vi.hoisted(() => ({ cadastrar: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
beforeEach(() => { vi.resetAllMocks(); });

function preencher() {
  for (const [label, value] of [['Nome completo', ' Ana Silva '], ['E-mail', 'ANA@example.com'], ['Senha', 'MinhaSenha123!'], ['Confirmar senha', 'MinhaSenha123!']]) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
  fireEvent.click(screen.getByRole('checkbox'));
}

it('mantém ordem, termos clicáveis e foco no primeiro erro; revalida confirmação ao mudar senha', () => {
  const { container } = render(<Cadastro navigate={vi.fn()} />);
  expect([...container.querySelectorAll('input')].map((input) => input.name)).toEqual(['nome', 'email', 'telefone', 'senha', 'confirmacao', 'documentos_aceitos']);
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(screen.getByLabelText('Nome completo')).toHaveFocus();
  expect(auth.cadastrar).not.toHaveBeenCalled();
  expect(screen.getByText('Aceite os termos e a política para criar sua conta.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
  preencher();
  fireEvent.change(screen.getByLabelText('Senha', { exact: true }), { target: { value: 'OutraSenha123!' } });
  expect(screen.getByLabelText('Confirmar senha')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText('As senhas não conferem.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(auth.cadastrar).not.toHaveBeenCalled();
});

it('mascara fixo e celular, permite apagar e rejeita telefone incompleto', async () => {
  const user = userEvent.setup();
  render(<Cadastro navigate={vi.fn()} />);
  const telefone = screen.getByLabelText(/Telefone/);
  await user.type(telefone, '1333334444');
  expect(telefone).toHaveValue('(13) 3333-4444');
  await user.clear(telefone);
  await user.type(telefone, '13999998888');
  expect(telefone).toHaveValue('(13) 99999-8888');
  await user.keyboard('{Backspace}'.repeat(11));
  expect(telefone).toHaveValue('');
  await user.type(telefone, '133');
  await user.tab();
  expect(telefone).toHaveAttribute('aria-invalid', 'true');
});

it('alterna ambos os campos sem apagar senha e exibe três níveis de força', () => {
  render(<Cadastro navigate={vi.fn()} />);
  const senha = screen.getByLabelText('Senha', { exact: true });
  for (const [value, nivel] of [['abc', 'Fraca'], ['abcdefgh', 'Média'], ['MinhaSenha123!', 'Forte']]) {
    fireEvent.change(senha, { target: { value } });
    expect(screen.getByText(`Força estimada: ${nivel}.`)).toBeVisible();
  }
  for (const [label, campo] of [['senha', senha], ['confirmação de senha', screen.getByLabelText('Confirmar senha')]]) {
    fireEvent.click(screen.getByRole('button', { name: `Mostrar ${label}` }));
    expect(campo).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: `Ocultar ${label}` }));
    expect(campo).toHaveAttribute('type', 'password');
  }
  expect(senha).toHaveValue('MinhaSenha123!');
});

it('normaliza envio, bloqueia repetição e mostra sucesso com acesso ao login', async () => {
  let concluir;
  auth.cadastrar.mockImplementation(() => new Promise((resolve) => { concluir = resolve; }));
  const navigate = vi.fn();
  const { container } = render(<Cadastro navigate={navigate} />);
  preencher();
  fireEvent.change(screen.getByLabelText(/Telefone/), { target: { value: '13999998888' } });
  fireEvent.submit(container.querySelector('form'));
  fireEvent.submit(container.querySelector('form'));
  expect(auth.cadastrar).toHaveBeenCalledTimes(1);
  expect(auth.cadastrar).toHaveBeenCalledWith({ nome: 'Ana Silva', email: 'ana@example.com', telefone: '13999998888', senha: 'MinhaSenha123!', documentos_aceitos: true });
  expect(screen.getByRole('button', { name: 'Criando conta...' })).toBeDisabled();
  expect(screen.getByLabelText('Nome completo')).toBeDisabled();
  await act(async () => concluir({}));
  expect(screen.getByRole('status')).toHaveFocus();
  expect(screen.getByText('Conta criada!')).toBeVisible();
  expect(container.querySelector('input[type="password"]')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Ir para o login' }));
  expect(navigate).toHaveBeenCalledWith('/login');
});

it.each([
  [409, 'Este e-mail já tem uma conta. Entre ou use outro e-mail.'],
  [429, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'],
  [500, 'Não foi possível criar sua conta. Tente novamente em instantes.'],
  [null, 'Não foi possível conectar. Confira sua internet e tente novamente.'],
])('trata erro %s sem expor detalhes; permite tentar novamente', async (status, mensagem) => {
  auth.cadastrar.mockRejectedValue(status ? Object.assign(new Error('segredo interno'), { status }) : new TypeError('Failed to fetch'));
  render(<Cadastro navigate={vi.fn()} />);
  preencher();
  fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(mensagem);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
  expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
  expect(screen.getByLabelText('Nome completo')).toHaveValue(' Ana Silva ');
  expect(auth.cadastrar.mock.calls[0][0].telefone).toBeUndefined();
});
