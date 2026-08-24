import { request } from './api';

function criarSolicitacaoPrivacidade(dados) {
  return request('/api/privacidade/solicitacoes', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(dados),
  });
}

export { criarSolicitacaoPrivacidade };
