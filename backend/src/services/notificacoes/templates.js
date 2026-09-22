const TIMEZONE_PADRAO = 'America/Sao_Paulo';

function formatarDataHora(valor) {
  const data = valor instanceof Date ? valor : new Date(String(valor).replace(' ', 'T'));

  if (Number.isNaN(data.getTime())) {
    return String(valor || '');
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: process.env.TZ || TIMEZONE_PADRAO,
  }).format(data);
}

function normalizarTexto(valor, fallback = '') {
  return String(valor || fallback).trim();
}

function criarMensagemAgendamento(tipo, agendamento, linkGerenciamento) {
  const cancelado = tipo === 'cancelamento';
  const negocio = normalizarTexto(agendamento.negocio_nome, 'Agendai');
  const servico = normalizarTexto(agendamento.servico_nome, 'serviço');
  const profissional = normalizarTexto(
    agendamento.profissional_nome,
    'profissional'
  );
  const inicio = formatarDataHora(agendamento.data_hora_inicio);
  const fim = formatarDataHora(agendamento.data_hora_fim);
  const assunto = cancelado
    ? `Agendamento cancelado — ${negocio}`
    : `Agendamento confirmado — ${negocio}`;
  const titulo = cancelado ? 'Agendamento cancelado' : 'Agendamento confirmado';
  const linhas = [
    `Olá${agendamento.cliente_nome ? `, ${normalizarTexto(agendamento.cliente_nome)}` : ''}!`,
    '',
    `${titulo}.`,
    `Serviço: ${servico}`,
    `Profissional: ${profissional}`,
    `Data e hora: ${inicio}${fim ? ` até ${fim}` : ''}`,
  ];

  if (linkGerenciamento) {
    linhas.push('', `Gerencie seu agendamento: ${linkGerenciamento}`);
  }

  linhas.push('', `Mensagem enviada por ${negocio}.`);

  return {
    assunto,
    texto: linhas.join('\n'),
    html: linhas
      .map((linha) => (linha ? `<p>${linha.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : '<br>'))
      .join(''),
  };
}

module.exports = {
  criarMensagemAgendamento,
  formatarDataHora,
};
