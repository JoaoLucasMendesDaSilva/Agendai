const { getDatabasePool } = require('../config/database');

function criarErro(mensagem) {
  const error = new Error(mensagem);
  error.code = 'PRIVACY_RETENTION_ERROR';
  return error;
}

function lerDiasRetencao(valor, padrao, nome) {
  const dias = Number(valor || padrao);
  if (!Number.isInteger(dias) || dias < 30 || dias > 3650) {
    throw criarErro(`${nome} deve ser um inteiro entre 30 e 3650 dias.`);
  }
  return dias;
}

function normalizarContato(valor) {
  return String(valor || '').trim().toLowerCase();
}

async function anonimizarAgendamentosVencidos({ diasRetencao }) {
  const pool = getDatabasePool();
  const resultado = await pool.query(
    `UPDATE agendamentos
     SET cliente_nome = 'Dados excluidos',
         cliente_telefone = NULL,
         cliente_email = NULL,
         observacoes = NULL,
         token_publico_hash = NULL
     WHERE data_hora_fim < (CURRENT_TIMESTAMP - ($1 * INTERVAL '1 day'))
       AND status IN ('cancelado', 'concluido')
       AND (
         cliente_telefone IS NOT NULL
         OR cliente_email IS NOT NULL
         OR observacoes IS NOT NULL
         OR cliente_nome <> 'Dados excluidos'
       )`,
    [diasRetencao]
  );
  return resultado.rowCount;
}

async function excluirSolicitacoesConcluidasVencidas({ diasRetencao }) {
  const pool = getDatabasePool();
  const resultado = await pool.query(
    `DELETE FROM solicitacoes_lgpd
     WHERE concluida_at < (CURRENT_TIMESTAMP - ($1 * INTERVAL '1 day'))
       AND status IN ('concluida', 'recusada')`,
    [diasRetencao]
  );
  return resultado.rowCount;
}

async function anonimizarTitular({ negocioId, email }) {
  const id = Number(negocioId);
  const emailNormalizado = normalizarContato(email);
  if (!Number.isInteger(id) || id <= 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
    throw criarErro('Informe negocio_id e e-mail validos para anonimizar os dados.');
  }

  const pool = getDatabasePool();
  const resultado = await pool.query(
    `UPDATE agendamentos
     SET cliente_nome = 'Dados excluidos',
         cliente_telefone = NULL,
         cliente_email = NULL,
         observacoes = NULL,
         token_publico_hash = NULL
     WHERE negocio_id = $1
       AND LOWER(TRIM(cliente_email)) = $2`,
    [id, emailNormalizado]
  );
  return resultado.rowCount;
}

module.exports = {
  anonimizarAgendamentosVencidos,
  anonimizarTitular,
  criarErro,
  excluirSolicitacoesConcluidasVencidas,
  lerDiasRetencao,
};
