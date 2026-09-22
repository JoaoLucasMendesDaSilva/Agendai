const {
  atualizarStatusAgendamento,
  buscarAgendamentoPorId,
  buscarDadosNotificacao,
  cancelarAgendamento,
  listarAgendamentos,
  listarAgendamentosHoje,
} = require('../services/agendamentosService');
const {
  notificarAgendamentoCancelado,
} = require('../services/notificacoes/notificacoesService');

async function tentarNotificarCancelamento(usuarioId, agendamentoId) {
  try {
    const dados = await buscarDadosNotificacao(usuarioId, agendamentoId);
    await notificarAgendamentoCancelado(dados);
  } catch (erro) {
    console.warn('[notificacoes] dados de cancelamento indisponíveis', {
      status: Number.isInteger(erro?.status) ? erro.status : undefined,
      tipo: erro?.name || 'Error',
    });
  }
}

async function listar(req, res, next) {
  try {
    const agendamentos = await listarAgendamentos(req.usuario.id);

    res.json({
      agendamentos,
    });
  } catch (err) {
    next(err);
  }
}

async function listarHoje(req, res, next) {
  try {
    const agendamentos = await listarAgendamentosHoje(req.usuario.id);

    res.json({
      agendamentos,
    });
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const agendamento = await buscarAgendamentoPorId(
      req.usuario.id,
      req.params.id
    );

    res.json({
      agendamento,
    });
  } catch (err) {
    next(err);
  }
}

async function atualizarStatus(req, res, next) {
  try {
    const agendamento = await atualizarStatusAgendamento(
      req.usuario.id,
      req.params.id,
      req.body
    );

    if (agendamento.status === 'cancelado' && agendamento.notificacaoNecessaria) {
      void tentarNotificarCancelamento(req.usuario.id, req.params.id);
    }

    res.json({
      mensagem: 'Status do agendamento atualizado com sucesso.',
      agendamento,
    });
  } catch (err) {
    next(err);
  }
}

async function cancelar(req, res, next) {
  try {
    const canceladoAgora = await cancelarAgendamento(
      req.usuario.id,
      req.params.id
    );

    if (canceladoAgora) {
      void tentarNotificarCancelamento(req.usuario.id, req.params.id);
    }

    res.json({
      mensagem: 'Agendamento cancelado com sucesso.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  atualizarStatus,
  buscarPorId,
  cancelar,
  listar,
  listarHoje,
};
