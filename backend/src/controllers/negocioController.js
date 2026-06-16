const {
  atualizarNegocio,
  buscarNegocioDoUsuario,
  criarNegocio,
} = require('../services/negocioService');

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
  atualizar,
  buscar,
  criar,
};
