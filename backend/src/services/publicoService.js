const { getDatabasePool } = require('../config/database');

const CAMPOS_AGENDAMENTO_PROIBIDOS = [
  'id',
  'negocio_id',
  'data_hora_fim',
  'status',
  'created_at',
  'updated_at',
];

const CAMPOS_AGENDAMENTO_PERMITIDOS = [
  'servico_id',
  'profissional_id',
  'cliente_nome',
  'cliente_telefone',
  'cliente_email',
  'data_hora_inicio',
  'observacoes',
];

function criarErro(status, mensagem, code) {
  const error = new Error(mensagem);
  error.status = status;
  error.publicMessage = mensagem;

  if (code) {
    error.code = code;
  }

  return error;
}

function validarIdPositivo(valor, mensagem) {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    throw criarErro(400, mensagem);
  }

  return id;
}

function parseJsonArray(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  if (Array.isArray(valor)) {
    return valor;
  }

  try {
    const json = JSON.parse(valor);
    return Array.isArray(json) ? json : null;
  } catch (err) {
    return null;
  }
}

function formatarDataHora(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');
  const segundo = String(data.getSeconds()).padStart(2, '0');

  return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}`;
}

function converterParaDataLocal(valor) {
  if (valor instanceof Date) {
    return valor;
  }

  if (typeof valor === 'string') {
    return new Date(valor.replace(' ', 'T'));
  }

  return new Date(valor);
}

function validarDataHoraAgendamento(valor) {
  if (
    !valor ||
    !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?$/.test(String(valor))
  ) {
    throw criarErro(400, 'Informe data_hora_inicio em formato válido.');
  }

  const [, anoTexto, mesTexto, diaTexto, horaTexto, minutoTexto, segundoTexto] =
    String(valor).match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/
    );
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);
  const hora = Number(horaTexto);
  const minuto = Number(minutoTexto);
  const segundo = Number(segundoTexto || 0);
  const data = new Date(ano, mes - 1, dia, hora, minuto, segundo, 0);

  if (
    Number.isNaN(data.getTime()) ||
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia ||
    data.getHours() !== hora ||
    data.getMinutes() !== minuto ||
    data.getSeconds() !== segundo
  ) {
    throw criarErro(400, 'Informe data_hora_inicio em formato válido.');
  }

  return data;
}

function validarDataConsulta(valor) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(String(valor))) {
    throw criarErro(400, 'Informe uma data valida no formato YYYY-MM-DD.');
  }

  const [ano, mes, dia] = String(valor).split('-').map(Number);
  const data = new Date(ano, mes - 1, dia, 0, 0, 0, 0);

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    throw criarErro(400, 'Informe uma data valida no formato YYYY-MM-DD.');
  }

  return data;
}

function horarioParaPartes(horario) {
  const [horas, minutos, segundos] = String(horario).split(':').map(Number);
  return {
    horas,
    minutos,
    segundos: segundos || 0,
  };
}

function aplicarHorario(data, horario) {
  const partes = horarioParaPartes(horario);
  return new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    partes.horas,
    partes.minutos,
    partes.segundos,
    0
  );
}

function adicionarMinutos(data, minutos) {
  return new Date(data.getTime() + minutos * 60 * 1000);
}

function haSobreposicao(inicioA, fimA, inicioB, fimB) {
  return inicioA < fimB && fimA > inicioB;
}

function normalizarTexto(valor) {
  if (valor === undefined || valor === null) {
    return null;
  }

  const texto = String(valor).trim();
  return texto || null;
}

function normalizarEmail(valor) {
  const email = normalizarTexto(valor);
  return email ? email.toLowerCase() : null;
}

function validarEmail(email) {
  if (!email) {
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw criarErro(400, 'Informe um e-mail válido.');
  }

  if (email.length > 180) {
    throw criarErro(400, 'E-mail deve ter no maximo 180 caracteres.');
  }
}

function verificarPayloadAgendamento(dados) {
  const camposEnviados = Object.keys(dados || {});
  const campoProibido = camposEnviados.find((campo) =>
    CAMPOS_AGENDAMENTO_PROIBIDOS.includes(campo)
  );

  if (campoProibido) {
    throw criarErro(400, 'Campo nao permitido no payload.');
  }

  const campoDesconhecido = camposEnviados.find(
    (campo) => !CAMPOS_AGENDAMENTO_PERMITIDOS.includes(campo)
  );

  if (campoDesconhecido) {
    throw criarErro(400, 'Campo desconhecido no payload.');
  }
}

function montarDadosAgendamento(dados) {
  verificarPayloadAgendamento(dados);

  const servicoId = validarIdPositivo(
    dados.servico_id,
    'servico_id deve ser um inteiro positivo.'
  );
  const profissionalId = validarIdPositivo(
    dados.profissional_id,
    'profissional_id deve ser um inteiro positivo.'
  );
  const clienteNome = normalizarTexto(dados.cliente_nome);
  const clienteTelefone = normalizarTexto(dados.cliente_telefone);
  const clienteEmail = normalizarEmail(dados.cliente_email);
  const observacoes = normalizarTexto(dados.observacoes);
  const dataHoraInicio = validarDataHoraAgendamento(dados.data_hora_inicio);

  if (!clienteNome) {
    throw criarErro(400, 'Nome do cliente é obrigatório.');
  }

  if (clienteNome.length < 2 || clienteNome.length > 120) {
    throw criarErro(400, 'Nome do cliente deve ter entre 2 e 120 caracteres.');
  }

  if (!clienteTelefone) {
    throw criarErro(400, 'Telefone do cliente é obrigatório.');
  }

  if (clienteTelefone.length > 30) {
    throw criarErro(400, 'Telefone deve ter no maximo 30 caracteres.');
  }

  validarEmail(clienteEmail);

  if (dataHoraInicio <= new Date()) {
    throw criarErro(400, 'Data e hora do agendamento não podem estar no passado.');
  }

  return {
    servicoId,
    profissionalId,
    clienteNome,
    clienteTelefone,
    clienteEmail,
    dataHoraInicio,
    observacoes,
  };
}

function formatarNegocioPublico(negocio) {
  return {
    id: negocio.id,
    nome: negocio.nome,
    slug_publico: negocio.slug_publico,
    descricao: negocio.descricao,
    telefone: negocio.telefone,
    endereco: negocio.endereco,
    cidade: negocio.cidade,
    horario_abertura: negocio.horario_abertura,
    horario_fechamento: negocio.horario_fechamento,
    intervalo_agendamento_minutos: negocio.intervalo_agendamento_minutos,
    dias_funcionamento: parseJsonArray(negocio.dias_funcionamento),
    logo_url: negocio.logo_url,
    banner_url: negocio.banner_url,
  };
}

function formatarServicoPublico(servico) {
  return {
    id: servico.id,
    nome: servico.nome,
    descricao: servico.descricao,
    duracao_minutos: servico.duracao_minutos,
    preco: Number(servico.preco),
  };
}

function formatarProfissionalPublico(profissional) {
  return {
    id: profissional.id,
    nome: profissional.nome,
    especialidade: profissional.especialidade,
  };
}

function formatarAgendamentoPublico(agendamento) {
  return {
    id: agendamento.id,
    servico_id: agendamento.servico_id,
    profissional_id: agendamento.profissional_id,
    cliente_nome: agendamento.cliente_nome,
    cliente_telefone: agendamento.cliente_telefone,
    cliente_email: agendamento.cliente_email,
    data_hora_inicio: formatarDataHora(converterParaDataLocal(agendamento.data_hora_inicio)),
    data_hora_fim: formatarDataHora(converterParaDataLocal(agendamento.data_hora_fim)),
    status: agendamento.status,
    observacoes: agendamento.observacoes,
  };
}

async function buscarNegocioPublico(slugOuId) {
  const pool = getDatabasePool();
  const valor = String(slugOuId || '').trim();
  let sql = `SELECT id, nome, slug_publico, descricao, telefone, endereco, cidade,
      horario_abertura, horario_fechamento, intervalo_agendamento_minutos,
      dias_funcionamento, logo_url, banner_url
    FROM negocios
    WHERE ativo = true AND `;
  const params = [];

  if (/^[1-9]\d*$/.test(valor)) {
    sql += 'id = ?';
    params.push(Number(valor));
  } else {
    sql += 'slug_publico = ?';
    params.push(valor);
  }

  sql += ' LIMIT 1';

  const [negocios] = await pool.execute(sql, params);

  if (negocios.length === 0) {
    throw criarErro(404, 'Negócio não encontrado.');
  }

  return negocios[0];
}

async function buscarServicoAtivoDoNegocio(negocioId, servicoId) {
  const id = validarIdPositivo(servicoId, 'servico_id deve ser um inteiro positivo.');
  const pool = getDatabasePool();
  const [servicos] = await pool.execute(
    `SELECT id, nome, descricao, duracao_minutos, preco
     FROM servicos
     WHERE id = ? AND negocio_id = ? AND ativo = true
     LIMIT 1`,
    [id, negocioId]
  );

  if (servicos.length === 0) {
    throw criarErro(404, 'Serviço não encontrado.');
  }

  return servicos[0];
}

async function buscarServicoAtivoDoNegocioComConexao(
  connection,
  negocioId,
  servicoId
) {
  const id = validarIdPositivo(servicoId, 'servico_id deve ser um inteiro positivo.');
  const [servicos] = await connection.execute(
    `SELECT id, nome, descricao, duracao_minutos, preco
     FROM servicos
     WHERE id = ? AND negocio_id = ? AND ativo = true
     LIMIT 1`,
    [id, negocioId]
  );

  if (servicos.length === 0) {
    throw criarErro(404, 'Serviço não encontrado.');
  }

  return servicos[0];
}

async function buscarProfissionalAtivoDoNegocio(negocioId, profissionalId) {
  const id = validarIdPositivo(
    profissionalId,
    'profissional_id deve ser um inteiro positivo.'
  );
  const pool = getDatabasePool();
  const [profissionais] = await pool.execute(
    `SELECT id, nome, especialidade
     FROM profissionais
     WHERE id = ? AND negocio_id = ? AND ativo = true
     LIMIT 1`,
    [id, negocioId]
  );

  if (profissionais.length === 0) {
    throw criarErro(404, 'Profissional não encontrado.');
  }

  return profissionais[0];
}

async function buscarProfissionalAtivoDoNegocioComConexao(
  connection,
  negocioId,
  profissionalId
) {
  const id = validarIdPositivo(
    profissionalId,
    'profissional_id deve ser um inteiro positivo.'
  );
  const [profissionais] = await connection.execute(
    `SELECT id, nome, especialidade
     FROM profissionais
     WHERE id = ? AND negocio_id = ? AND ativo = true
     LIMIT 1`,
    [id, negocioId]
  );

  if (profissionais.length === 0) {
    throw criarErro(404, 'Profissional não encontrado.');
  }

  return profissionais[0];
}

async function obterNegocio(slugOuId) {
  const negocio = await buscarNegocioPublico(slugOuId);

  return formatarNegocioPublico(negocio);
}

async function listarServicosPublicos(slugOuId) {
  const negocio = await buscarNegocioPublico(slugOuId);
  const pool = getDatabasePool();
  const [servicos] = await pool.execute(
    `SELECT id, nome, descricao, duracao_minutos, preco
     FROM servicos
     WHERE negocio_id = ? AND ativo = true
     ORDER BY nome ASC`,
    [negocio.id]
  );

  return servicos.map(formatarServicoPublico);
}

async function listarProfissionaisPublicos(slugOuId) {
  const negocio = await buscarNegocioPublico(slugOuId);
  const pool = getDatabasePool();
  const [profissionais] = await pool.execute(
    `SELECT id, nome, especialidade
     FROM profissionais
     WHERE negocio_id = ? AND ativo = true
     ORDER BY nome ASC`,
    [negocio.id]
  );

  return profissionais.map(formatarProfissionalPublico);
}

async function listarHorariosDisponiveis(slugOuId, filtros) {
  const negocio = await buscarNegocioPublico(slugOuId);
  const data = validarDataConsulta(filtros.data);
  const servico = await buscarServicoAtivoDoNegocio(
    negocio.id,
    filtros.servico_id
  );
  const profissional = await buscarProfissionalAtivoDoNegocio(
    negocio.id,
    filtros.profissional_id
  );
  const diasFuncionamento = parseJsonArray(negocio.dias_funcionamento);

  if (
    diasFuncionamento &&
    diasFuncionamento.length > 0 &&
    !diasFuncionamento.includes(data.getDay())
  ) {
    return {
      data: filtros.data,
      servico_id: servico.id,
      profissional_id: profissional.id,
      horarios: [],
    };
  }

  const abertura = aplicarHorario(data, negocio.horario_abertura);
  const fechamento = aplicarHorario(data, negocio.horario_fechamento);
  const intervalo = Number(negocio.intervalo_agendamento_minutos) || 30;
  const agora = new Date();
  const pool = getDatabasePool();
  const [agendamentos] = await pool.execute(
    `SELECT data_hora_inicio, data_hora_fim
     FROM agendamentos
     WHERE negocio_id = ?
       AND profissional_id = ?
       AND status IN ('pendente', 'confirmado')
       AND data_hora_inicio < ?
       AND data_hora_fim > ?`,
    [
      negocio.id,
      profissional.id,
      formatarDataHora(fechamento).replace('T', ' '),
      formatarDataHora(abertura).replace('T', ' '),
    ]
  );
  const ocupados = agendamentos.map((agendamento) => ({
    inicio: converterParaDataLocal(agendamento.data_hora_inicio),
    fim: converterParaDataLocal(agendamento.data_hora_fim),
  }));
  const horarios = [];

  for (
    let inicio = new Date(abertura);
    inicio < fechamento;
    inicio = adicionarMinutos(inicio, intervalo)
  ) {
    const fim = adicionarMinutos(inicio, servico.duracao_minutos);

    if (fim > fechamento) {
      continue;
    }

    if (inicio <= agora) {
      continue;
    }

    const conflita = ocupados.some((ocupado) =>
      haSobreposicao(inicio, fim, ocupado.inicio, ocupado.fim)
    );

    if (!conflita) {
      horarios.push({
        data_hora_inicio: formatarDataHora(inicio),
        data_hora_fim: formatarDataHora(fim),
      });
    }
  }

  return {
    data: filtros.data,
    servico_id: servico.id,
    profissional_id: profissional.id,
    horarios,
  };
}

function validarDiaFuncionamento(negocio, data) {
  const diasFuncionamento = parseJsonArray(negocio.dias_funcionamento);

  if (
    diasFuncionamento &&
    diasFuncionamento.length > 0 &&
    !diasFuncionamento.includes(data.getDay())
  ) {
    throw criarErro(400, 'Negócio não atende neste dia.');
  }
}

function validarDentroDoHorario(negocio, inicio, fim) {
  const abertura = aplicarHorario(inicio, negocio.horario_abertura);
  const fechamento = aplicarHorario(inicio, negocio.horario_fechamento);

  if (inicio < abertura || fim > fechamento) {
    throw criarErro(400, 'Horário fora do funcionamento do negócio.');
  }
}

async function criarAgendamentoPublico(slugOuId, dados) {
  const dadosValidados = montarDadosAgendamento(dados);
  const negocio = await buscarNegocioPublico(slugOuId);
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const servico = await buscarServicoAtivoDoNegocioComConexao(
      connection,
      negocio.id,
      dadosValidados.servicoId
    );
    const profissional = await buscarProfissionalAtivoDoNegocioComConexao(
      connection,
      negocio.id,
      dadosValidados.profissionalId
    );
    const dataHoraFim = adicionarMinutos(
      dadosValidados.dataHoraInicio,
      servico.duracao_minutos
    );

    validarDiaFuncionamento(negocio, dadosValidados.dataHoraInicio);
    validarDentroDoHorario(
      negocio,
      dadosValidados.dataHoraInicio,
      dataHoraFim
    );

    const [conflitos] = await connection.execute(
      `SELECT id
       FROM agendamentos
       WHERE negocio_id = ?
         AND profissional_id = ?
         AND status IN ('pendente', 'confirmado')
         AND data_hora_inicio < ?
         AND data_hora_fim > ?
       FOR UPDATE`,
      [
        negocio.id,
        profissional.id,
        formatarDataHora(dataHoraFim).replace('T', ' '),
        formatarDataHora(dadosValidados.dataHoraInicio).replace('T', ' '),
      ]
    );

    if (conflitos.length > 0) {
      throw criarErro(409, 'Horário indisponível para este profissional.');
    }

    const [resultado] = await connection.execute(
      `INSERT INTO agendamentos (
        negocio_id, servico_id, profissional_id, cliente_nome, cliente_telefone,
        cliente_email, data_hora_inicio, data_hora_fim, status, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmado', ?)`,
      [
        negocio.id,
        servico.id,
        profissional.id,
        dadosValidados.clienteNome,
        dadosValidados.clienteTelefone,
        dadosValidados.clienteEmail,
        formatarDataHora(dadosValidados.dataHoraInicio).replace('T', ' '),
        formatarDataHora(dataHoraFim).replace('T', ' '),
        dadosValidados.observacoes,
      ]
    );

    const [agendamentos] = await connection.execute(
      `SELECT id, servico_id, profissional_id, cliente_nome, cliente_telefone,
        cliente_email, data_hora_inicio, data_hora_fim, status, observacoes
       FROM agendamentos
       WHERE id = ?
       LIMIT 1`,
      [resultado.insertId]
    );

    await connection.commit();

    return formatarAgendamentoPublico(agendamentos[0]);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  criarAgendamentoPublico,
  listarHorariosDisponiveis,
  listarProfissionaisPublicos,
  listarServicosPublicos,
  obterNegocio,
};
