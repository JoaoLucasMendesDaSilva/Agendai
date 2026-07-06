import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearToken, getToken, request, setToken } from './api';

const TOKEN_KEY = 'tcc_agendamento_token';

describe('armazenamento do token', () => {
  beforeEach(() => {
    clearToken();
  });

  it('mantem o token no navegador quando lembrar estiver ativo', () => {
    setToken('token-persistente', true);

    expect(localStorage.getItem(TOKEN_KEY)).toBe('token-persistente');
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getToken()).toBe('token-persistente');
  });

  it('limita o token a sessao quando lembrar estiver inativo', () => {
    setToken('token-da-sessao', false);

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('token-da-sessao');
    expect(getToken()).toBe('token-da-sessao');
  });
});

describe('erros da API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserva o status HTTP para a interface escolher uma mensagem segura', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ erro: 'Limite excedido.' }),
      ok: false,
      status: 429,
    }));

    await expect(request('/api/auth/login', { auth: false })).rejects.toMatchObject({
      message: 'Limite excedido.',
      status: 429,
    });
  });
});
