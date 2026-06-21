const {
  buscarAgendamentoPublicoPorToken,
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
