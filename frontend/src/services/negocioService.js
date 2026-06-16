import { request } from './api';

function buscarNegocio() {
  return request('/api/negocio');
}

function criarNegocio(dados) {
  return request('/api/negocio', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

function atualizarNegocio(id, dados) {
  return request(`/api/negocio/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
}

export { atualizarNegocio, buscarNegocio, criarNegocio };
