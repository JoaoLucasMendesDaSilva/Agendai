const {
  buscarAgendamentoPublicoPorToken,
  buscarDadosNotificacaoPorToken,
  cancelarAgendamentoPublicoPorToken,
  confirmarPresencaPublicaPorToken,
  criarAgendamentoPublico,
  listarHorariosDisponiveis,
  listarHorariosReagendamentoPublico,
  listarProfissionaisPublicos,
  listarServicosPublicos,
  obterNegocio,
  reagendarAgendamentoPublicoPorToken,
} = require('../services/publicoService');
const {
  notificarAgendamentoCancelado,
  notificarAgendamentoConfirmado,
} = require('../services/notificacoes/notificacoesService');

async function tentarNotificar(tipo, token, tokenGerenciamento = token) {
  try {
    const dados = await buscarDadosNotificacaoPorToken(token);
    const notificar =
      tipo === 'cancelamento'
        ? notificarAgendamentoCancelado
        : notificarAgendamentoConfirmado;
    await notificar(dados, { tokenGerenciamento });
  } catch (erro) {
    console.warn('[notificacoes] dados de agendamento indisponíveis', {
      evento: tipo,
      status: Number.isInteger(erro?.status) ? erro.status : undefined,
      tipoErro: erro?.name || 'Error',
    });
  }
}

async function buscarAgendamento(req, res, next) {
  try {
    const agendamento = await buscarAgendamentoPublicoPorToken(req.params.token);

    res.json({ agendamento });
  } catch (err) {
    next(err);
  }
}

async function cancelarAgendamento(req, res, next) {
  try {
    const agendamento = await cancelarAgendamentoPublicoPorToken(
      req.params.token
    );
    if (agendamento.notificacaoNecessaria) {
      void tentarNotificar('cancelamento', req.params.token);
    }

    res.json({
      mensagem: 'Agendamento cancelado com sucesso.',
      agendamento,
    });
  } catch (err) {
    next(err);
  }
}

async function confirmarPresenca(req, res, next) {
  try {
    const resultado = await confirmarPresencaPublicaPorToken(req.params.token);

    res.json({
      mensagem: resultado.jaConfirmado
        ? 'A presença neste agendamento já está confirmada.'
        : 'Presença confirmada com sucesso.',
      agendamento: resultado.agendamento,
    });
  } catch (err) {
    next(err);
  }
}

async function listarHorariosReagendamento(req, res, next) {
  try {
    const resultado = await listarHorariosReagendamentoPublico(
      req.params.token,
      req.query
    );

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function reagendarAgendamento(req, res, next) {
  try {
    const agendamento = await reagendarAgendamentoPublicoPorToken(
      req.params.token,
      req.body
    );

    res.json({
      mensagem: 'Agendamento reagendado com sucesso.',
      agendamento,
    });
  } catch (err) {
    next(err);
  }
}

async function buscarNegocio(req, res, next) {
  try {
    const negocio = await obterNegocio(req.params.slugOuId);

    res.json({
      negocio,
    });
  } catch (err) {
    next(err);
  }
}

async function listarServicos(req, res, next) {
  try {
    const servicos = await listarServicosPublicos(req.params.slugOuId);

    res.json({
      servicos,
    });
  } catch (err) {
    next(err);
  }
}

async function listarProfissionais(req, res, next) {
  try {
    const profissionais = await listarProfissionaisPublicos(req.params.slugOuId);

    res.json({
      profissionais,
    });
  } catch (err) {
    next(err);
  }
}

async function listarHorarios(req, res, next) {
  try {
    const resultado = await listarHorariosDisponiveis(
      req.params.slugOuId,
      req.query
    );

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function criarAgendamento(req, res, next) {
  try {
    const agendamento = await criarAgendamentoPublico(
      req.params.slugOuId,
      req.body
    );
    void tentarNotificar(
      'confirmacao',
      agendamento.token_gerenciamento,
      agendamento.token_gerenciamento
    );

    res.status(201).json({
      mensagem: 'Agendamento criado com sucesso.',
      agendamento,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  buscarAgendamento,
  buscarNegocio,
  cancelarAgendamento,
  confirmarPresenca,
  criarAgendamento,
  listarHorarios,
  listarHorariosReagendamento,
  listarProfissionais,
  listarServicos,
  reagendarAgendamento,
};
