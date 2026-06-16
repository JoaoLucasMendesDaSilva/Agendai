const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'tcc_agendamento_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token && options.auth !== false) {
    headers.Authorization = `Bearer ${token}`;
  }

  const { auth, ...fetchOptions } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.mensagem || 'Nao foi possivel concluir a solicitacao.');
  }

  return data;
}

function cadastrarUsuario(dados) {
  return request('/api/auth/cadastro', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

function loginUsuario(dados) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

function buscarSessao() {
  return request('/api/auth/me');
}

export {
  buscarSessao,
  cadastrarUsuario,
  clearToken,
  getToken,
  loginUsuario,
  request,
  setToken,
};
