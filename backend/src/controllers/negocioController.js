const {
  atualizarIdentidadeVisual,
  atualizarNegocio,
  buscarNegocioDoUsuario,
  criarNegocio,
} = require('../services/negocioService');

async function atualizarIdentidade(req, res, next) {
  try {
    const negocio = await atualizarIdentidadeVisual(
      req.usuario.id,
      req.params.id,
      {
        logo: req.files?.logo?.[0],
        banner: req.files?.banner?.[0],
      }
    );

    res.json({
      mensagem: 'Identidade visual atualizada com sucesso.',
      negocio,
    });
  } catch (err) {
    next(err);
  }
}

async function buscar(req, res, next) {
  try {
    const negocio = await buscarNegocioDoUsuario(req.usuario.id);

    res.json({
      negocio,
    });
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const negocio = await criarNegocio(req.usuario.id, req.body);

    res.status(201).json({
      mensagem: 'Negocio cadastrado com sucesso.',
      negocio,
    });
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const negocio = await atualizarNegocio(
      req.usuario.id,
      req.params.id,
      req.body
    );

    res.json({
      mensagem: 'Negocio atualizado com sucesso.',
      negocio,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  atualizarIdentidade,
  atualizar,
  buscar,
  criar,
};
