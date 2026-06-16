const jwt = require('jsonwebtoken');
const { buscarUsuarioAutenticado } = require('../services/authService');

function criarErroAutenticacao(mensagem) {
  const error = new Error(mensagem);
  error.status = 401;
  error.publicMessage = mensagem;
  error.code = 'AUTH_ERROR';
  return error;
}

async function autenticarToken(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      throw criarErroAutenticacao('Token nao informado.');
    }

    const [tipo, token] = authorization.split(' ');

    if (tipo !== 'Bearer' || !token) {
      throw criarErroAutenticacao('Token invalido ou expirado.');
    }

    if (!process.env.JWT_SECRET) {
      const error = new Error('JWT_SECRET nao configurado.');
      error.status = 500;
      error.code = 'JWT_CONFIG_ERROR';
      throw error;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await buscarUsuarioAutenticado(payload.id);

    req.usuario = usuario;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(criarErroAutenticacao('Token invalido ou expirado.'));
      return;
    }

    next(err);
  }
}

module.exports = {
  autenticarToken,
};
