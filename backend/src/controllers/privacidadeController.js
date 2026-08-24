const {
  criarSolicitacaoPrivacidade,
} = require('../services/privacidadeService');

async function criarSolicitacao(req, res, next) {
  try {
    const solicitacao = await criarSolicitacaoPrivacidade(req.body);
    res.status(201).json({
      mensagem:
        'Solicitacao recebida. Responderemos pelo e-mail informado apos validar sua identidade.',
      solicitacao: {
        id: solicitacao.id,
        status: solicitacao.status,
        tipo: solicitacao.tipo,
      },
    });
  } catch (erro) {
    next(erro);
  }
}

module.exports = { criarSolicitacao };
