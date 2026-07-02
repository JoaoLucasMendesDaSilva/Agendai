function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function obterData(valor) {
  const data = new Date(String(valor || '').replace(' ', 'T'));
  return Number.isNaN(data.getTime()) ? null : data;
}

function criarChaveCliente(agendamento) {
  const telefone = String(agendamento.cliente_telefone || '').replace(/\D/g, '');
  const email = String(agendamento.cliente_email || '').trim().toLowerCase();
  const nome = normalizarTexto(agendamento.cliente_nome);

  return telefone || email || nome;
}

function ordenarPorDataDesc(a, b) {
  const dataA = obterData(a.data_hora_inicio)?.getTime() || 0;
  const dataB = obterData(b.data_hora_inicio)?.getTime() || 0;

  return dataB - dataA;
}

function agruparClientes(agendamentos) {
  const mapaClientes = new Map();

  agendamentos.forEach((agendamento) => {
    const chave = criarChaveCliente(agendamento);

    if (!chave) {
      return;
    }

    if (!mapaClientes.has(chave)) {
      mapaClientes.set(chave, {
        chave,
        nome: agendamento.cliente_nome || 'Cliente sem nome',
        telefone: agendamento.cliente_telefone || '',
        email: agendamento.cliente_email || '',
        agendamentos: [],
        totalAgendamentos: 0,
        primeiroAtendimento: null,
        ultimoAtendimento: null,
      });
    }

    const cliente = mapaClientes.get(chave);
    const dataAtendimento = obterData(agendamento.data_hora_inicio);

    cliente.agendamentos.push(agendamento);
    cliente.totalAgendamentos += 1;
    cliente.nome = cliente.nome || agendamento.cliente_nome || 'Cliente sem nome';
    cliente.telefone = cliente.telefone || agendamento.cliente_telefone || '';
    cliente.email = cliente.email || agendamento.cliente_email || '';

    if (dataAtendimento) {
      if (!cliente.primeiroAtendimento || dataAtendimento < cliente.primeiroAtendimento) {
        cliente.primeiroAtendimento = dataAtendimento;
      }

      if (!cliente.ultimoAtendimento || dataAtendimento > cliente.ultimoAtendimento) {
        cliente.ultimoAtendimento = dataAtendimento;
      }
    }
  });

  return Array.from(mapaClientes.values())
    .map((cliente) => ({
      ...cliente,
      agendamentos: cliente.agendamentos.sort(ordenarPorDataDesc),
    }))
    .sort((a, b) => {
      const dataA = a.ultimoAtendimento?.getTime() || 0;
      const dataB = b.ultimoAtendimento?.getTime() || 0;

      return dataB - dataA;
    });
}

export {
  agruparClientes,
  criarChaveCliente,
  normalizarTexto,
  obterData,
};
