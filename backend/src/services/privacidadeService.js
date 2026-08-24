const { getDatabasePool } = require('../config/database');

const TIPOS_SOLICITACAO = new Set([
  'acesso',
  'correcao',
  'eliminacao',
  'portabilidade',
  'informacao',
  'revogacao',
  'oposicao',
]);

function criarErro(status, mensagem, code) {
  const error = new Error(mensagem);
  error.status = status;
  error.publicMessage = mensagem;
  if (code) error.code = code;
  return error;
}

function normalizarTexto(valor) {
  return String(valor || '').trim();
}

function normalizarEmail(valor) {
  return normalizarTexto(valor).toLowerCase();
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizarNegocioId(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const negocioId = Number(valor);
  if (!Number.isInteger(negocioId) || negocioId <= 0) {
    throw criarErro(400, 'Negocio informado e invalido.');
  }
  return negocioId;
}

function validarSolicitacao(dados) {
  const nome = normalizarTexto(dados?.nome);
  const email = normalizarEmail(dados?.email);
  const tipo = normalizarTexto(dados?.tipo).toLowerCase();
  const mensagem = normalizarTexto(dados?.mensagem);

  if (!nome || !email || !tipo) {
    throw criarErro(400, 'Nome, e-mail e tipo de solicitacao sao obrigatorios.');
  }
  if (nome.length < 2 || nome.length > 120) {
    throw criarErro(400, 'Nome deve ter entre 2 e 120 caracteres.');
  }
  if (!validarEmail(email)) {
    throw criarErro(400, 'Informe um e-mail valido.');
  }
  if (!TIPOS_SOLICITACAO.has(tipo)) {
    throw criarErro(400, 'Tipo de solicitacao invalido.');
  }
  if (mensagem.length > 2000) {
    throw criarErro(400, 'Mensagem deve ter no maximo 2000 caracteres.');
  }

  return {
    email,
    mensagem: mensagem || null,
    negocioId: normalizarNegocioId(dados?.negocio_id),
    nome,
    tipo,
  };
}

async function criarSolicitacaoPrivacidade(dados) {
  const solicitacao = validarSolicitacao(dados);
  const pool = getDatabasePool();

  try {
    const resultado = await pool.query(
      `INSERT INTO solicitacoes_lgpd (
        negocio_id, tipo, nome, email, mensagem
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, tipo, status, created_at`,
      [
        solicitacao.negocioId,
        solicitacao.tipo,
        solicitacao.nome,
        solicitacao.email,
        solicitacao.mensagem,
      ]
    );

    return resultado.rows[0];
  } catch (erro) {
    if (erro.code === '23503') {
      throw criarErro(400, 'Negocio informado e invalido.');
    }
    throw erro;
  }
}

module.exports = {
  TIPOS_SOLICITACAO,
  criarSolicitacaoPrivacidade,
  validarSolicitacao,
};
