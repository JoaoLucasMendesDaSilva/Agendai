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

function listarHorariosReagendamento(token, data) {
  const params = new URLSearchParams({ data });

  return request(
    `/api/publico/agendamentos/${encodeURIComponent(
      token
    )}/horarios-disponiveis?${params.toString()}`,
    { auth: false }
  );
}

function reagendarAgendamentoPublico(token, dataHoraInicio) {
  return request(
    `/api/publico/agendamentos/${encodeURIComponent(token)}/reagendamento`,
    {
      auth: false,
      method: 'PUT',
      body: JSON.stringify({ data_hora_inicio: dataHoraInicio }),
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
  listarHorariosReagendamento,
  listarProfissionaisPublicos,
  listarServicosPublicos,
  reagendarAgendamentoPublico,
};
