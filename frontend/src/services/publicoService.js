import { request } from './api';

function buscarNegocioPublico(slugOuId) {
  return request(`/api/publico/negocio/${encodeURIComponent(slugOuId)}`, {
    auth: false,
  });
}

function listarServicosPublicos(slugOuId) {
  return request(
    `/api/publico/negocio/${encodeURIComponent(slugOuId)}/servicos`,
    {
      auth: false,
    }
  );
}

function listarProfissionaisPublicos(slugOuId) {
  return request(
    `/api/publico/negocio/${encodeURIComponent(slugOuId)}/profissionais`,
    {
      auth: false,
    }
  );
}

function listarHorariosDisponiveis(slugOuId, filtros) {
  const params = new URLSearchParams({
    data: filtros.data,
    servico_id: String(filtros.servico_id),
    profissional_id: String(filtros.profissional_id),
  });

  return request(
    `/api/publico/negocio/${encodeURIComponent(
      slugOuId
    )}/horarios-disponiveis?${params.toString()}`,
    {
      auth: false,
    }
  );
}

function criarAgendamentoPublico(slugOuId, dados) {
  return request(
    `/api/publico/negocio/${encodeURIComponent(slugOuId)}/agendamentos`,
    {
      auth: false,
      method: 'POST',
      body: JSON.stringify(dados),
    }
  );
}

function buscarAgendamentoPublico(token) {
  return request(`/api/publico/agendamentos/${encodeURIComponent(token)}`, {
    auth: false,
  });
}

function cancelarAgendamentoPublico(token) {
  return request(`/api/publico/agendamentos/${encodeURIComponent(token)}`, {
    auth: false,
    method: 'DELETE',
  });
}

function confirmarPresencaPublica(token) {
  return request(
    `/api/publico/agendamentos/${encodeURIComponent(token)}/confirmacao`,
    {
      auth: false,
      method: 'PUT',
    }
  );
}

export {
  buscarAgendamentoPublico,
  buscarNegocioPublico,
  cancelarAgendamentoPublico,
  confirmarPresencaPublica,
  criarAgendamentoPublico,
  listarHorariosDisponiveis,
  listarProfissionaisPublicos,
  listarServicosPublicos,
};
