const {
  atualizarServico,
  buscarServicoPorId,
  criarServico,
  desativarServico,
  listarServicos,
} = require('../services/servicosService');

async function listar(req, res, next) {
  try {
    const servicos = await listarServicos(req.usuario.id);

    res.json({
      servicos,
    });
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const servico = await buscarServicoPorId(req.usuario.id, req.params.id);

    res.json({
      servico,
    });
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const servico = await criarServico(req.usuario.id, req.body);

    res.status(201).json({
      mensagem: 'Serviço cadastrado com sucesso.',
      servico,
    });
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const servico = await atualizarServico(
      req.usuario.id,
      req.params.id,
      req.body
    );

    res.json({
      mensagem: 'Serviço atualizado com sucesso.',
      servico,
    });
  } catch (err) {
    next(err);
  }
}

async function desativar(req, res, next) {
  try {
    await desativarServico(req.usuario.id, req.params.id);

    res.json({
      mensagem: 'Serviço desativado com sucesso.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  atualizar,
  buscarPorId,
  criar,
  desativar,
  listar,
};
