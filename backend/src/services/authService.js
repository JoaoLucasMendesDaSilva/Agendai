const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDatabasePool } = require('../config/database');

const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

function criarErro(status, mensagem, code) {
  const error = new Error(mensagem);
  error.status = status;
  error.publicMessage = mensagem;

  if (code) {
    error.code = code;
  }

  return error;
}

function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatarUsuarioPublico(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone,
  };
}

function validarJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw criarErro(
      500,
      'Erro interno do servidor.',
      'JWT_CONFIG_ERROR'
    );
  }
}

function gerarToken(usuario) {
  validarJwtSecret();

  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );
}

async function cadastrarUsuario(dados) {
  const nome = String(dados.nome || '').trim();
  const email = normalizarEmail(dados.email);
  const senha = String(dados.senha || '');
  const telefone = dados.telefone ? String(dados.telefone).trim() : null;

  if (!nome || !email || !senha) {
    throw criarErro(400, 'Nome, e-mail e senha sao obrigatorios.');
  }

  if (nome.length < 2 || nome.length > 120) {
    throw criarErro(400, 'Nome deve ter entre 2 e 120 caracteres.');
  }

  if (!validarEmail(email)) {
    throw criarErro(400, 'Informe um e-mail valido.');
  }

  if (senha.length < PASSWORD_MIN_LENGTH) {
    throw criarErro(400, 'A senha deve ter pelo menos 8 caracteres.');
  }

  if (telefone && telefone.length > 30) {
    throw criarErro(400, 'Telefone deve ter no maximo 30 caracteres.');
  }

  const pool = getDatabasePool();
  const [usuariosExistentes] = await pool.execute(
    'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
    [email]
  );

  if (usuariosExistentes.length > 0) {
    throw criarErro(409, 'E-mail ja cadastrado.');
  }

  const senhaHash = await bcrypt.hash(senha, BCRYPT_ROUNDS);

  try {
    const [resultado] = await pool.execute(
      'INSERT INTO usuarios (nome, email, senha_hash, telefone) VALUES (?, ?, ?, ?)',
      [nome, email, senhaHash, telefone]
    );

    return formatarUsuarioPublico({
      id: resultado.insertId,
      nome,
      email,
      telefone,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw criarErro(409, 'E-mail ja cadastrado.');
    }

    throw err;
  }
}

async function autenticarUsuario(dados) {
  const email = normalizarEmail(dados.email);
  const senha = String(dados.senha || '');

  if (!email || !senha) {
    throw criarErro(400, 'E-mail e senha sao obrigatorios.');
  }

  const credenciaisInvalidas = () =>
    criarErro(401, 'E-mail ou senha invalidos.');

  const pool = getDatabasePool();
  const [usuarios] = await pool.execute(
    'SELECT id, nome, email, telefone, senha_hash, ativo FROM usuarios WHERE email = ? LIMIT 1',
    [email]
  );

  const usuario = usuarios[0];

  if (!usuario || !usuario.ativo) {
    throw credenciaisInvalidas();
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);

  if (!senhaCorreta) {
    throw credenciaisInvalidas();
  }

  return {
    usuario: formatarUsuarioPublico(usuario),
    token: gerarToken(usuario),
  };
}

async function buscarUsuarioAutenticado(usuarioId) {
  const pool = getDatabasePool();
  const [usuarios] = await pool.execute(
    'SELECT id, nome, email, telefone, ativo FROM usuarios WHERE id = ? LIMIT 1',
    [usuarioId]
  );

  const usuario = usuarios[0];

  if (!usuario || !usuario.ativo) {
    throw criarErro(401, 'Usuario nao encontrado ou inativo.');
  }

  return usuario;
}

module.exports = {
  autenticarUsuario,
  buscarUsuarioAutenticado,
  cadastrarUsuario,
  formatarUsuarioPublico,
};
