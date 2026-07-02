function obterData(agendamento) {
  const data = new Date(agendamento.data_hora_inicio);
  return Number.isNaN(data.getTime()) ? null : data;
}

function criarChaveCliente(agendamento) {
  const telefone = String(agendamento.cliente_telefone || '').replace(/\D/g, '');
  const email = String(agendamento.cliente_email || '').trim().toLowerCase();
  const nome = String(agendamento.cliente_nome || '').trim().toLowerCase();

  return telefone || email || nome;
}

function contarClientesUnicos(agendamentos) {
  const clientes = new Set();

  agendamentos.forEach((agendamento) => {
    const chave = criarChaveCliente(agendamento);

    if (chave) {
      clientes.add(chave);
    }
  });

  return clientes.size;
}

function filtrarAgendamentosPorPeriodo(agendamentos, inicio, fim) {
  const dataInicio = new Date(`${inicio}T00:00:00`);
  const dataFim = new Date(`${fim}T23:59:59`);

  return agendamentos.filter((agendamento) => {
    const data = obterData(agendamento);
    return data && data >= dataInicio && data <= dataFim;
  });
}

export {
  contarClientesUnicos,
  criarChaveCliente,
  filtrarAgendamentosPorPeriodo,
  obterData,
};
