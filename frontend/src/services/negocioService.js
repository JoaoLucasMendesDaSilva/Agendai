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

function atualizarIdentidadeVisual(id, arquivos) {
  const dados = new FormData();

  if (arquivos.logo) {
    dados.append('logo', arquivos.logo);
  }

  if (arquivos.banner) {
    dados.append('banner', arquivos.banner);
  }

  return request(`/api/negocio/${id}/identidade-visual`, {
    method: 'PUT',
    body: dados,
  });
}

export {
  atualizarIdentidadeVisual,
  atualizarNegocio,
  buscarNegocio,
  criarNegocio,
};
