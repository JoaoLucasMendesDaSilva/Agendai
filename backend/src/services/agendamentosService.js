const { getDatabasePool } = require('../config/database');

const STATUS_PERMITIDOS = ['pendente', 'confirmado', 'cancelado', 'concluido'];
const STATUS_ATIVOS = ['pendente', 'confirmado'];
const CAMPOS_STATUS_PERMITIDOS = ['status'];

function criarErro(status, mensagem, code) {
  const error = new Error(mensagem);
  error.status = status;
  error.publicMessage = mensagem;

  if (code) {
    error.code = code;
  }

  return error;
}

function validarId(id) {
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    throw criarErro(404, 'Agendamento não encontrado.');
  }

  return idNumerico;
}

function formatarDataHora(data) {
  const valor = data instanceof Date ? data : new Date(String(data).replace(' ', 'T'));
  const ano = valor.getFullYear();
  const mes = String(valor.getMonth() + 1).padStart(2, '0');
  const dia = String(valor.getDate()).padStart(2, '0');
  const hora = String(valor.getHours()).padStart(2, '0');
  const minuto = String(valor.getMinutes()).padStart(2, '0');
  const segundo = String(valor.getSeconds()).padStart(2, '0');

  return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}`;
}

function formatarAgendamento(agendamento) {
  return {
    id: agendamento.id,
    negocio_id: agendamento.negocio_id,
    servico_id: agendamento.servico_id,
    servico_nome: agendamento.servico_nome,
    profissional_id: agendamento.profissional_id,
    profissional_nome: agendamento.profissional_nome,
    cliente_nome: agendamento.cliente_nome,
    cliente_telefone: agendamento.cliente_telefone,
    cliente_email: agendamento.cliente_email,
    data_hora_inicio: formatarDataHora(agendamento.data_hora_inicio),
    data_hora_fim: formatarDataHora(agendamento.data_hora_fim),
    status: agendamento.status,
    observacoes: agendamento.observacoes,
  };
}

async function buscarNegocioIdDoUsuario(usuarioId) {
  const pool = getDatabasePool();
  const { rows: negocios } = await pool.query(
    'SELECT id FROM negocios WHERE usuario_id = $1 AND ativo = true LIMIT 1',
    [usuarioId]
  );

  if (negocios.length === 0) {
    throw criarErro(400, 'Cadastre um negócio antes de consultar agendamentos.');
  }

  return negocios[0].id;
}

function consultaAgendamentosBase() {
  return `SELECT
      a.id,
      a.negocio_id,
      a.servico_id,
      s.nome AS servico_nome,
      a.profissional_id,
      p.nome AS profissional_nome,
      a.cliente_nome,
      a.cliente_telefone,
      a.cliente_email,
      a.data_hora_inicio,
      a.data_hora_fim,
      a.status,
      a.observacoes
    FROM agendamentos a
    INNER JOIN servicos s ON s.id = a.servico_id
    INNER JOIN profissionais p ON p.id = a.profissional_id`;
}

async function listarAgendamentos(usuarioId) {
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();
  const { rows: agendamentos } = await pool.query(
    `${consultaAgendamentosBase()}
     WHERE a.negocio_id = $1
     ORDER BY a.data_hora_inicio ASC`,
    [negocioId]
  );

  return agendamentos.map(formatarAgendamento);
}

async function listarAgendamentosHoje(usuarioId) {
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const hoje = new Date();
  const inicio = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
    0,
    0,
    0,
    0
  );
  const fim = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate() + 1,
    0,
    0,
    0,
    0
  );
  const pool = getDatabasePool();
  const { rows: agendamentos } = await pool.query(
    `${consultaAgendamentosBase()}
     WHERE a.negocio_id = $1
       AND a.data_hora_inicio >= $2
       AND a.data_hora_inicio < $3
     ORDER BY a.data_hora_inicio ASC`,
    [
      negocioId,
      formatarDataHora(inicio).replace('T', ' '),
      formatarDataHora(fim).replace('T', ' '),
    ]
  );

  return agendamentos.map(formatarAgendamento);
}

async function buscarAgendamentoPorId(usuarioId, agendamentoId) {
  const id = validarId(agendamentoId);
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();
  const { rows: agendamentos } = await pool.query(
    `${consultaAgendamentosBase()}
     WHERE a.id = $1 AND a.negocio_id = $2
     LIMIT 1`,
    [id, negocioId]
  );

  if (agendamentos.length === 0) {
    throw criarErro(404, 'Agendamento não encontrado.');
  }

  return formatarAgendamento(agendamentos[0]);
}

function validarPayloadStatus(dados) {
  const campos = Object.keys(dados || {});
  const campoInvalido = campos.find(
    (campo) => !CAMPOS_STATUS_PERMITIDOS.includes(campo)
  );

  if (campoInvalido) {
    throw criarErro(400, 'Campo nao permitido no payload.');
  }

  const status = String(dados?.status || '').trim().toLowerCase();

  if (!STATUS_PERMITIDOS.includes(status)) {
    throw criarErro(400, 'Status inválido.');
  }

  return status;
}

function statusEhAtivo(status) {
  return STATUS_ATIVOS.includes(status);
}

function traduzirErroConflitoDeAgendamento(erro) {
  if (
    erro.code === '23P01' &&
    erro.constraint === 'ex_agendamentos_profissional_periodo_ativo'
  ) {
    return criarErro(409, 'Horario indisponivel para este profissional.');
  }

  return erro;
}

async function buscarAgendamentoParaAtualizacaoStatus(pool, id, negocioId) {
  const { rows: agendamentos } = await pool.query(
    `SELECT id, profissional_id, data_hora_inicio, data_hora_fim, status
     FROM agendamentos
     WHERE id = $1 AND negocio_id = $2
     LIMIT 1`,
    [id, negocioId]
  );

  if (agendamentos.length === 0) {
    throw criarErro(404, 'Agendamento nÃ£o encontrado.');
  }

  return agendamentos[0];
}

async function rejeitarConflitoStatusAtivo(pool, negocioId, agendamento) {
  const { rows: conflitos } = await pool.query(
    `SELECT id
     FROM agendamentos
     WHERE negocio_id = $1
       AND profissional_id = $2
       AND id <> $3
       AND status IN ('pendente', 'confirmado')
       AND data_hora_inicio < $4
       AND data_hora_fim > $5
     LIMIT 1`,
    [
      negocioId,
      agendamento.profissional_id,
      agendamento.id,
      agendamento.data_hora_fim,
      agendamento.data_hora_inicio,
    ]
  );

  if (conflitos.length > 0) {
    throw criarErro(409, 'Horario indisponivel para este profissional.');
  }
}

async function atualizarStatusAgendamento(usuarioId, agendamentoId, dados) {
  const id = validarId(agendamentoId);
  const status = validarPayloadStatus(dados);
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();

  if (statusEhAtivo(status)) {
    const agendamentoAtual = await buscarAgendamentoParaAtualizacaoStatus(
      pool,
      id,
      negocioId
    );
    await rejeitarConflitoStatusAtivo(pool, negocioId, agendamentoAtual);
  }

  let resultado;

  try {
    resultado = await pool.query(
      'UPDATE agendamentos SET status = $1 WHERE id = $2 AND negocio_id = $3',
      [status, id, negocioId]
    );
  } catch (erro) {
    throw traduzirErroConflitoDeAgendamento(erro);
  }

  if (resultado.rowCount === 0) {
    throw criarErro(404, 'Agendamento não encontrado.');
  }

  return buscarAgendamentoPorId(usuarioId, id);
}

async function cancelarAgendamento(usuarioId, agendamentoId) {
  const id = validarId(agendamentoId);
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();
  const resultado = await pool.query(
    "UPDATE agendamentos SET status = 'cancelado' WHERE id = $1 AND negocio_id = $2",
    [id, negocioId]
  );

  if (resultado.rowCount === 0) {
    throw criarErro(404, 'Agendamento não encontrado.');
  }
}

module.exports = {
  atualizarStatusAgendamento,
  buscarAgendamentoPorId,
  cancelarAgendamento,
  listarAgendamentos,
  listarAgendamentosHoje,
};
