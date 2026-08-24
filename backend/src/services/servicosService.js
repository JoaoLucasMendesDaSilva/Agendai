const { getDatabasePool } = require('../config/database');
const { CAMPOS_PROIBIDOS } = require('../utils/payloadFields');

const CAMPOS_PERMITIDOS = ['nome', 'descricao', 'duracao_minutos', 'preco'];

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

function validarNome(nome) {
  if (!nome) {
    throw criarErro(400, 'Nome do serviço é obrigatório.');
  }

  if (nome.length < 2 || nome.length > 120) {
    throw criarErro(400, 'Nome deve ter entre 2 e 120 caracteres.');
  }
}

function validarDescricao(descricao) {
  if (descricao && descricao.length > 65535) {
    throw criarErro(400, 'Descricao deve ter no maximo 65535 caracteres.');
  }
}

function normalizarDuracao(valor, obrigatorio = false) {
  if (valor === undefined) {
    if (obrigatorio) {
      throw criarErro(400, 'Duração do serviço é obrigatória.');
    }

    return undefined;
  }

  const duracao = Number(valor);

  if (!Number.isInteger(duracao) || duracao <= 0) {
    throw criarErro(400, 'Duração deve ser um número inteiro maior que zero.');
  }

  return duracao;
}

function normalizarPreco(valor, obrigatorio = false) {
  if (valor === undefined) {
    if (obrigatorio) {
      return 0;
    }

    return undefined;
  }

  const preco = Number(valor);

  if (!Number.isFinite(preco) || preco < 0) {
    throw criarErro(400, 'Preço deve ser um número maior ou igual a zero.');
  }

  return Number(preco.toFixed(2));
}

function validarId(id, mensagem = 'Serviço não encontrado.') {
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    throw criarErro(404, mensagem);
  }

  return idNumerico;
}

function formatarServico(servico) {
  if (!servico) {
    return null;
  }

  return {
    id: servico.id,
    nome: servico.nome,
    descricao: servico.descricao,
    duracao_minutos: servico.duracao_minutos,
    preco: Number(servico.preco),
    ativo: Boolean(servico.ativo),
  };
}

async function buscarNegocioIdDoUsuario(usuarioId) {
  const pool = getDatabasePool();
  const { rows: negocios } = await pool.query(
    'SELECT id FROM negocios WHERE usuario_id = $1 AND ativo = true LIMIT 1',
    [usuarioId]
  );

  if (negocios.length === 0) {
    throw criarErro(400, 'Cadastre um negócio antes de criar serviços.');
  }

  return negocios[0].id;
}

function montarDadosCriacao(dados) {
  verificarCamposPayload(dados);

  const nome = normalizarTexto(dados.nome);
  const descricao = normalizarTexto(dados.descricao) || null;
  const duracaoMinutos = normalizarDuracao(dados.duracao_minutos, true);
  const preco = normalizarPreco(dados.preco, true);

  validarNome(nome);
  validarDescricao(descricao);

  return {
    nome,
    descricao,
    duracaoMinutos,
    preco,
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

  if (dados.descricao !== undefined) {
    const descricao = normalizarTexto(dados.descricao);
    validarDescricao(descricao);
    atualizacao.descricao = descricao;
  }

  if (dados.duracao_minutos !== undefined) {
    atualizacao.duracao_minutos = normalizarDuracao(dados.duracao_minutos);
  }

  if (dados.preco !== undefined) {
    atualizacao.preco = normalizarPreco(dados.preco);
  }

  return atualizacao;
}

async function listarServicos(usuarioId) {
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();
  const { rows: servicos } = await pool.query(
    `SELECT id, nome, descricao, duracao_minutos, preco, ativo
     FROM servicos
     WHERE negocio_id = $1 AND ativo = true
     ORDER BY nome ASC`,
    [negocioId]
  );

  return servicos.map(formatarServico);
}

async function buscarServicoPorId(usuarioId, servicoId) {
  const id = validarId(servicoId);
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();
  const { rows: servicos } = await pool.query(
    `SELECT id, nome, descricao, duracao_minutos, preco, ativo
     FROM servicos
     WHERE id = $1 AND negocio_id = $2 AND ativo = true
     LIMIT 1`,
    [id, negocioId]
  );

  if (servicos.length === 0) {
    throw criarErro(404, 'Serviço não encontrado.');
  }

  return formatarServico(servicos[0]);
}

async function criarServico(usuarioId, dados) {
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const dadosValidados = montarDadosCriacao(dados);
  const pool = getDatabasePool();
  const resultado = await pool.query(
    `INSERT INTO servicos (negocio_id, nome, descricao, duracao_minutos, preco)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      negocioId,
      dadosValidados.nome,
      dadosValidados.descricao,
      dadosValidados.duracaoMinutos,
      dadosValidados.preco,
    ]
  );

  return buscarServicoPorId(usuarioId, resultado.rows[0].id);
}

async function atualizarServico(usuarioId, servicoId, dados) {
  const id = validarId(servicoId);
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const atualizacao = montarDadosAtualizacao(dados);
  const campos = [];
  const valores = [];

  for (const campo of ['nome', 'descricao', 'duracao_minutos', 'preco']) {
    if (atualizacao[campo] !== undefined) {
      campos.push(`${campo} = $${valores.length + 1}`);
      valores.push(atualizacao[campo]);
    }
  }

  if (campos.length === 0) {
    return buscarServicoPorId(usuarioId, id);
  }

  const idPlaceholder = `$${valores.length + 1}`;
  valores.push(id);
  const negocioIdPlaceholder = `$${valores.length + 1}`;
  valores.push(negocioId);

  const pool = getDatabasePool();
  const resultado = await pool.query(
    `UPDATE servicos
     SET ${campos.join(', ')}
     WHERE id = ${idPlaceholder} AND negocio_id = ${negocioIdPlaceholder} AND ativo = true`,
    valores
  );

  if (resultado.rowCount === 0) {
    throw criarErro(404, 'Serviço não encontrado.');
  }

  return buscarServicoPorId(usuarioId, id);
}

async function desativarServico(usuarioId, servicoId) {
  const id = validarId(servicoId);
  const negocioId = await buscarNegocioIdDoUsuario(usuarioId);
  const pool = getDatabasePool();
  const resultado = await pool.query(
    `UPDATE servicos
     SET ativo = false
     WHERE id = $1 AND negocio_id = $2 AND ativo = true`,
    [id, negocioId]
  );

  if (resultado.rowCount === 0) {
    throw criarErro(404, 'Serviço não encontrado.');
  }
}

module.exports = {
  atualizarServico,
  buscarServicoPorId,
  criarServico,
  desativarServico,
  listarServicos,
};
