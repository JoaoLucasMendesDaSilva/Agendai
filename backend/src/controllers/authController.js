const {
  autenticarUsuario,
  cadastrarUsuario,
  formatarUsuarioPublico,
} = require('../services/authService');

async function cadastrar(req, res, next) {
  try {
    const usuario = await cadastrarUsuario(req.body);

    res.status(201).json({
      mensagem: 'Cadastro realizado com sucesso.',
      usuario,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const resultado = await autenticarUsuario(req.body);

    res.json({
      mensagem: 'Login realizado com sucesso.',
      usuario: resultado.usuario,
      token: resultado.token,
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({
    usuario: formatarUsuarioPublico(req.usuario),
  });
}

module.exports = {
  cadastrar,
  login,
  me,
};
