import { request } from './api';

function listarAgendamentos() {
  return request('/api/agendamentos');
}

function atualizarStatusAgendamento(id, status) {
  return request(`/api/agendamentos/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

function cancelarAgendamento(id) {
  return request(`/api/agendamentos/${id}`, {
    method: 'DELETE',
  });
}

export {
  atualizarStatusAgendamento,
  cancelarAgendamento,
  listarAgendamentos,
};
