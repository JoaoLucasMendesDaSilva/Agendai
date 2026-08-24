const { getDatabasePool } = require('../config/database');
const { CAMPOS_PROIBIDOS } = require('../utils/payloadFields');

const CAMPOS_PERMITIDOS = ['nome', 'especialidade', 'telefone', 'email'];

function criarErro(status, mensagem, code) {
  const error = new Error(mensagem);
  error.status = status;
  error.publicMessage = mensagem;

  if (code) {
    error.code = code;
  }

  return error;
}

function verificarCamposPayload(dados) {
  const camposEnviados = Object.keys(dados || {});
  const campoProibido = camposEnviados.find((campo) =>
    CAMPOS_PROIBIDOS.includes(campo)
  );

  if (campoProibido) {
    throw criarErro(400, 'Campo nao permitido no payload.');
  }

  const campoDesconhecido = camposEnviados.find(
    (campo) => !CAMPOS_PERMITIDOS.includes(campo)
  );

  if (campoDesconhecido) {
    throw criarErro(400, 'Campo desconhecido no payload.');
  }
}

function normalizarTexto(valor) {
  if (valor === undefined) {
    return undefined;
  }

  if (valor === null) {
    return null;
  }

  const texto = String(valor).trim();
  return texto || null;
}

function normalizarEmail(valor) {
  const email = normalizarTexto(valor);
  return email ? email.toLowerCase() : email;
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

function validarNome(nome) {
  if (!nome) {
    throw criarErro(400, 'Nome do profissional é obrigatório.');
  }

  if (nome.length < 2 || nome.length > 120) {
    throw criarErro(400, 'Nome deve ter entre 2 e 120 caracteres.');
  }
}

function validarTamanho(campo, valor, maximo) {
  if (valor && valor.length > maximo) {
    throw criarErro(400, `${campo} deve ter no maximo ${maximo} caracteres.`);
  }
}

function validarId(id, mensagem = 'Profissional não encontrado.') {
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    throw criarErro(404, mensagem);
  }

  return idNumerico;
}

function formatarProfissional(profissional) {
  if (!profissional) {
    return null;
  }

  return {
    id: profissional.id,
    nome: profissional.nome,
    especialidade: profissional.especialidade,
    telefone: profissional.telefone,
    email: profissional.email,
    ativo: Boolean(profissional.ativo),
  };
}

async function buscarNegocioIdDoUsuario(usuarioId) {
  const pool = getDatabasePool();
  const { rows: negocios } = await pool.query(
    'SELECT id FROM negocios WHERE usuario_id = $1 AND ativo = true LIMIT 1',
    [usuarioId]
  );

  if (negocios.length === 0) {
    throw criarErro(400, 'Cadastre um negócio antes de criar profissionais.');
  }

  return negocios[0].id;
}

function montarDadosCriacao(dados) {
  verificarCamposPayload(dados);

  const nome = normalizarTexto(dados.nome);
  const especialidade = normalizarTexto(dados.especialidade) || null;
  const telefone = normalizarTexto(dados.telefone) || null;
  const email = normalizarEmail(dados.email) || null;

  validarNome(nome);
  validarTamanho('Especialidade', especialidade, 120);
  validarTamanho('Telefone', telefone, 30);
  validarEmail(email);

  return {
    nome,
    especialidade,
    telefone,
    email,
  };
}

function montarDadosAtualizacao(dados) {
  verificarCamposPayload(dados);

  const camposRecebidos = Object.keys(dados || {});

  if (camposRecebidos.length === 0) {
    throw criarErro(400, 'Informe ao menos um campo para atualizar.');
  }

  const atualizacao = {};

  if (dados.nome !== undefined) {
    const nome = normalizarTexto(dados.nome);
    validarNome(nome);
    atualizacao.nome = nome;
  }

  if (dados.especialidade !== undefined) {
    const especialidade = normalizarTexto(dados.especialidade);
    validarTamanho('Especialidade', especialidade, 120);
    atualizacao.especialidade = especialidade;
  }

  if (dados.telefone !== undefined) {
    const telefone = normalizarTexto(dados.telefone);
    validarTamanho('Telefone', telefone, 30);
    atualizacao.telefone = telefone;
  }

  if (dados.email !== undefined) {
    const email = normalizarEmail(dados.email);
    validarEmail(email);
    atualizacao.email = email;
  }

  return atualizacao;
}

async function listarProfissionais(usuarioId) {
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();
  const { rows: profissionais } = await pool.query(
    `SELECT id, nome, especialidade, telefone, email, ativo
     FROM profissionais
     WHERE negocio_id = $1 AND ativo = true
     ORDER BY nome ASC`,
    [negocioId]
  );

  return profissionais.map(formatarProfissional);
}

async function buscarProfissionalPorId(usuarioId, profissionalId) {
  const id = validarId(profissionalId);
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();
  const { rows: profissionais } = await pool.query(
    `SELECT id, nome, especialidade, telefone, email, ativo
     FROM profissionais
     WHERE id = $1 AND negocio_id = $2 AND ativo = true
     LIMIT 1`,
    [id, negocioId]
  );

  if (profissionais.length === 0) {
    throw criarErro(404, 'Profissional não encontrado.');
  }

  return formatarProfissional(profissionais[0]);
}

async function criarProfissional(usuarioId, dados) {
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const dadosValidados = montarDadosCriacao(dados);
  const pool = getDatabasePool();
  const resultado = await pool.query(
    `INSERT INTO profissionais (negocio_id, nome, especialidade, telefone, email)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      negocioId,
      dadosValidados.nome,
      dadosValidados.especialidade,
      dadosValidados.telefone,
      dadosValidados.email,
    ]
  );

  return buscarProfissionalPorId(usuarioId, resultado.rows[0].id);
}

async function atualizarProfissional(usuarioId, profissionalId, dados) {
  const id = validarId(profissionalId);
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const atualizacao = montarDadosAtualizacao(dados);
  const campos = [];
  const valores = [];

  for (const campo of ['nome', 'especialidade', 'telefone', 'email']) {
    if (atualizacao[campo] !== undefined) {
      campos.push(`${campo} = $${valores.length + 1}`);
      valores.push(atualizacao[campo]);
    }
  }

  if (campos.length === 0) {
    return buscarProfissionalPorId(usuarioId, id);
  }

  const idPlaceholder = `$${valores.length + 1}`;
  valores.push(id);
  const negocioIdPlaceholder = `$${valores.length + 1}`;
  valores.push(negocioId);

  const pool = getDatabasePool();
  const resultado = await pool.query(
    `UPDATE profissionais
     SET ${campos.join(', ')}
     WHERE id = ${idPlaceholder} AND negocio_id = ${negocioIdPlaceholder} AND ativo = true`,
    valores
  );

  if (resultado.rowCount === 0) {
    throw criarErro(404, 'Profissional não encontrado.');
  }

  return buscarProfissionalPorId(usuarioId, id);
}

async function desativarProfissional(usuarioId, profissionalId) {
  const id = validarId(profissionalId);
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();
  const resultado = await pool.query(
    `UPDATE profissionais
     SET ativo = false
     WHERE id = $1 AND negocio_id = $2 AND ativo = true`,
    [id, negocioId]
  );

  if (resultado.rowCount === 0) {
    throw criarErro(404, 'Profissional não encontrado.');
  }
}

module.exports = {
  atualizarProfissional,
  buscarProfissionalPorId,
  criarProfissional,
  desativarProfissional,
  listarProfissionais,
};
