const DIAS_SEMANA = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

const ETAPAS = ['Serviço', 'Profissional', 'Data e hora', 'Dados', 'Confirmação'];

const ETAPA_DESCRICOES = {
  1: 'Comece escolhendo o atendimento desejado.',
  2: 'Agora escolha quem vai realizar o atendimento.',
  3: 'Consulte os horários livres para a data escolhida.',
  4: 'Preencha seus dados para finalizar.',
  5: 'Seu agendamento foi registrado com sucesso.',
};

function hojeIso() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  });
}

function formatarHorario(dataHora) {
  return String(dataHora || '').slice(11, 16);
}

function formatarData(dataIso) {
  const [ano, mes, dia] = String(dataIso || '').split('-');

  if (!ano || !mes || !dia) {
    return dataIso || 'Data não informada';
  }

  return `${dia}/${mes}/${ano}`;
}

function formatarCidade(cidade) {
  if (String(cidade || '').trim().toLowerCase() === 'cubatao') {
    return 'Cubatão';
  }

  return cidade || '';
}

function formatarTelefoneCabecalho(telefone) {
  const valor = String(telefone || '').trim();
  const digitos = valor.replace(/\D/g, '');

  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }

  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return valor;
}

function normalizarHorario(horario) {
  return String(horario || '').slice(0, 5);
}

function formatarDiasFuncionamento(dias) {
  if (!Array.isArray(dias) || dias.length === 0) {
    return 'Dias não informados';
  }

  return dias
    .map((dia) => DIAS_SEMANA[Number(dia)])
    .filter(Boolean)
    .join(', ');
}

function negocioEstaAberto(negocio) {
  const dias = Array.isArray(negocio?.dias_funcionamento)
    ? negocio.dias_funcionamento.map(Number)
    : [];
  const abertura = normalizarHorario(negocio?.horario_abertura);
  const fechamento = normalizarHorario(negocio?.horario_fechamento);

  if (!dias.length || !abertura || !fechamento) {
    return null;
  }

  const agora = new Date();
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(
    agora.getMinutes(),
  ).padStart(2, '0')}`;

  return (
    dias.includes(agora.getDay()) &&
    horaAtual >= abertura &&
    horaAtual <= fechamento
  );
}

export {
  ETAPA_DESCRICOES,
  ETAPAS,
  formatarCidade,
  formatarData,
  formatarDiasFuncionamento,
  formatarHorario,
  formatarPreco,
  formatarTelefoneCabecalho,
  hojeIso,
  negocioEstaAberto,
  normalizarHorario,
};
