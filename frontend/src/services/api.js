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
  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers };

  if (!isFormData && options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

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
    throw new Error(
      data.erro || data.mensagem || 'Erro ao comunicar com o servidor.'
    );
  }

  return data;
}

function resolverAssetUrl(assetPath) {
  if (!assetPath) {
    return '';
  }

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  return `${API_URL}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`;
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
  resolverAssetUrl,
  setToken,
};
