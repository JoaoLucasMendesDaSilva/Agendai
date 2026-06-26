const { getDatabasePool } = require('../config/database');
const {
  removerImagemPorUrl,
  salvarImagens,
} = require('../utils/imageStorage');

const CAMPOS_PROIBIDOS = [
  'id',
  'usuario_id',
  'slug_publico',
  'ativo',
  'created_at',
  'updated_at',
];

const CAMPOS_PERMITIDOS = [
  'nome',
  'descricao',
  'telefone',
  'endereco',
  'cidade',
  'horario_abertura',
  'horario_fechamento',
  'dias_funcionamento',
];

function criarErro(status, mensagem, code) {
  const error = new Error(mensagem);
  error.status = status;
  error.publicMessage = mensagem;

  if (code) {
    error.code = code;
  }

  return error;
}

function verificarCamposProibidos(dados) {
  const camposEnviados = Object.keys(dados || {});
  const campoProibido = camposEnviados.find((campo) =>
    CAMPOS_PROIBIDOS.includes(campo)
  );

  if (campoProibido) {
    throw criarErro(400, 'Campo nao permitido no payload.');
  }

  const campoDesconhecido = camposEnviados.find(
    (campo) => !CAMPOS_PERMITIDOS.includes(campo)
  );

  if (campoDesconhecido) {
    throw criarErro(400, 'Campo desconhecido no payload.');
  }
}

function normalizarTexto(valor) {
  if (valor === undefined) {
    return undefined;
  }

  if (valor === null) {
    return null;
  }

  const texto = String(valor).trim();
  return texto || null;
}

function validarTamanho(campo, valor, maximo) {
  if (valor && valor.length > maximo) {
    throw criarErro(400, `${campo} deve ter no maximo ${maximo} caracteres.`);
  }
}

function normalizarHorario(valor, campo) {
  if (valor === undefined) {
    return undefined;
  }

  const horario = String(valor).trim();
  const match = horario.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);

  if (!match) {
    throw criarErro(400, `${campo} deve estar no formato HH:mm.`);
  }

  return `${match[1]}:${match[2]}:${match[3] || '00'}`;
}

function horarioParaSegundos(horario) {
  const [horas, minutos, segundos] = horario.split(':').map(Number);
  return horas * 3600 + minutos * 60 + segundos;
}

function validarOrdemHorarios(horarioAbertura, horarioFechamento) {
  if (horarioParaSegundos(horarioFechamento) <= horarioParaSegundos(horarioAbertura)) {
    throw criarErro(400, 'Horario de fechamento deve ser maior que abertura.');
  }
}

function normalizarDiasFuncionamento(valor) {
  if (valor === undefined) {
    return undefined;
  }

  if (!Array.isArray(valor)) {
    throw criarErro(400, 'dias_funcionamento deve ser um array.');
  }

  if (valor.length === 0) {
    throw criarErro(400, 'Selecione ao menos um dia de funcionamento.');
  }

  const diasUnicos = new Set(valor);

  if (diasUnicos.size !== valor.length) {
    throw criarErro(400, 'dias_funcionamento nao deve conter dias repetidos.');
  }

  const todosValidos = valor.every(
    (dia) => Number.isInteger(dia) && dia >= 0 && dia <= 6
  );

  if (!todosValidos) {
    throw criarErro(
      400,
      'dias_funcionamento deve conter apenas numeros de 0 a 6.'
    );
  }

  return valor;
}

function parseDiasFuncionamento(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  if (Array.isArray(valor)) {
    return valor;
  }

  try {
    return JSON.parse(valor);
  } catch (err) {
    return null;
  }
}

function formatarNegocio(negocio) {
  if (!negocio) {
    return null;
  }

  return {
    id: negocio.id,
    nome: negocio.nome,
    slug_publico: negocio.slug_publico,
    descricao: negocio.descricao,
    telefone: negocio.telefone,
    endereco: negocio.endereco,
    cidade: negocio.cidade,
    horario_abertura: negocio.horario_abertura,
    horario_fechamento: negocio.horario_fechamento,
    dias_funcionamento: parseDiasFuncionamento(negocio.dias_funcionamento),
    logo_url: negocio.logo_url,
    banner_url: negocio.banner_url,
    ativo: Boolean(negocio.ativo),
  };
}

function criarSlugBase(nome) {
  const slug = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'negocio';
}

async function gerarSlugPublico(nome, idIgnorado = null) {
  const pool = getDatabasePool();
  const base = criarSlugBase(nome);
  let sufixo = 1;

  while (sufixo <= 100) {
    const candidato = sufixo === 1 ? base : `${base}-${sufixo}`;
    const params = [candidato];
    let sql = 'SELECT id FROM negocios WHERE slug_publico = ?';

    if (idIgnorado) {
      sql += ' AND id <> ?';
      params.push(idIgnorado);
    }

    sql += ' LIMIT 1';

    const [linhas] = await pool.execute(sql, params);

    if (linhas.length === 0) {
      return candidato;
    }

    sufixo += 1;
  }

  throw criarErro(409, 'Nao foi possivel gerar um link publico unico.');
}

function montarDadosCriacao(dados) {
  verificarCamposProibidos(dados);

  const nome = normalizarTexto(dados.nome);

  if (!nome) {
    throw criarErro(400, 'Nome do negocio e obrigatorio.');
  }

  if (nome.length < 2 || nome.length > 150) {
    throw criarErro(400, 'Nome deve ter entre 2 e 150 caracteres.');
  }

  const descricao = normalizarTexto(dados.descricao) || null;
  const telefone = normalizarTexto(dados.telefone) || null;
  const endereco = normalizarTexto(dados.endereco) || null;
  const cidade = normalizarTexto(dados.cidade) || 'Cubatao';
  const horarioAbertura =
    normalizarHorario(dados.horario_abertura || '08:00', 'horario_abertura') ||
    '08:00:00';
  const horarioFechamento =
    normalizarHorario(dados.horario_fechamento || '18:00', 'horario_fechamento') ||
    '18:00:00';
  const diasFuncionamento = normalizarDiasFuncionamento(dados.dias_funcionamento);

  validarTamanho('Descricao', descricao, 65535);
  validarTamanho('Telefone', telefone, 30);
  validarTamanho('Endereco', endereco, 255);
  validarTamanho('Cidade', cidade, 100);
  validarOrdemHorarios(horarioAbertura, horarioFechamento);

  return {
    nome,
    descricao,
    telefone,
    endereco,
    cidade,
    horarioAbertura,
    horarioFechamento,
    diasFuncionamento: diasFuncionamento === undefined ? null : diasFuncionamento,
  };
}

function montarDadosAtualizacao(dados, negocioAtual) {
  verificarCamposProibidos(dados);

  const camposRecebidos = Object.keys(dados || {});

  if (camposRecebidos.length === 0) {
    throw criarErro(400, 'Informe ao menos um campo para atualizar.');
  }

  const atualizacao = {};

  if (dados.nome !== undefined) {
    const nome = normalizarTexto(dados.nome);

    if (!nome) {
      throw criarErro(400, 'Nome do negocio e obrigatorio.');
    }

    if (nome.length < 2 || nome.length > 150) {
      throw criarErro(400, 'Nome deve ter entre 2 e 150 caracteres.');
    }

    atualizacao.nome = nome;
  }

  for (const [campo, maximo] of [
    ['descricao', 65535],
    ['telefone', 30],
    ['endereco', 255],
    ['cidade', 100],
  ]) {
    if (dados[campo] !== undefined) {
      const valor = normalizarTexto(dados[campo]);
      validarTamanho(campo, valor, maximo);
      atualizacao[campo] = valor;
    }
  }

  if (dados.horario_abertura !== undefined) {
    atualizacao.horario_abertura = normalizarHorario(
      dados.horario_abertura,
      'horario_abertura'
    );
  }

  if (dados.horario_fechamento !== undefined) {
    atualizacao.horario_fechamento = normalizarHorario(
      dados.horario_fechamento,
      'horario_fechamento'
    );
  }

  if (dados.dias_funcionamento !== undefined) {
    atualizacao.dias_funcionamento = normalizarDiasFuncionamento(
      dados.dias_funcionamento
    );
  }

  const horarioAbertura =
    atualizacao.horario_abertura || negocioAtual.horario_abertura;
  const horarioFechamento =
    atualizacao.horario_fechamento || negocioAtual.horario_fechamento;

  validarOrdemHorarios(horarioAbertura, horarioFechamento);

  return atualizacao;
}

async function buscarNegocioDoUsuario(usuarioId) {
  const pool = getDatabasePool();
  const [linhas] = await pool.execute(
    `SELECT id, nome, slug_publico, descricao, telefone, endereco, cidade,
      horario_abertura, horario_fechamento, dias_funcionamento, logo_url,
      banner_url, ativo
     FROM negocios
     WHERE usuario_id = ?
     LIMIT 1`,
    [usuarioId]
  );

  return formatarNegocio(linhas[0]);
}

async function criarNegocio(usuarioId, dados) {
  const pool = getDatabasePool();
  const [negociosExistentes] = await pool.execute(
    'SELECT id FROM negocios WHERE usuario_id = ? LIMIT 1',
    [usuarioId]
  );

  if (negociosExistentes.length > 0) {
    throw criarErro(409, 'Usuario ja possui negocio cadastrado.');
  }

  const dadosValidados = montarDadosCriacao(dados);
  const slugPublico = await gerarSlugPublico(dadosValidados.nome);

  const [resultado] = await pool.execute(
    `INSERT INTO negocios (
      usuario_id, nome, slug_publico, descricao, telefone, endereco, cidade,
      horario_abertura, horario_fechamento, dias_funcionamento
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuarioId,
      dadosValidados.nome,
      slugPublico,
      dadosValidados.descricao,
      dadosValidados.telefone,
      dadosValidados.endereco,
      dadosValidados.cidade,
      dadosValidados.horarioAbertura,
      dadosValidados.horarioFechamento,
      dadosValidados.diasFuncionamento === null
        ? null
        : JSON.stringify(dadosValidados.diasFuncionamento),
    ]
  );

  const [linhas] = await pool.execute(
    `SELECT id, nome, slug_publico, descricao, telefone, endereco, cidade,
      horario_abertura, horario_fechamento, dias_funcionamento, logo_url,
      banner_url, ativo
     FROM negocios
     WHERE id = ? AND usuario_id = ?
     LIMIT 1`,
    [resultado.insertId, usuarioId]
  );

  return formatarNegocio(linhas[0]);
}

async function atualizarNegocio(usuarioId, negocioId, dados) {
  const id = Number(negocioId);

  if (!Number.isInteger(id) || id <= 0) {
    throw criarErro(404, 'Negócio não encontrado.');
  }

  const pool = getDatabasePool();
  const [linhas] = await pool.execute(
    `SELECT id, nome, slug_publico, descricao, telefone, endereco, cidade,
      horario_abertura, horario_fechamento, dias_funcionamento, logo_url,
      banner_url, ativo
     FROM negocios
     WHERE id = ? AND usuario_id = ?
     LIMIT 1`,
    [id, usuarioId]
  );

  const negocioAtual = linhas[0];

  if (!negocioAtual) {
    throw criarErro(404, 'Negócio não encontrado.');
  }

  const atualizacao = montarDadosAtualizacao(dados, negocioAtual);
  const campos = [];
  const valores = [];

  if (atualizacao.nome !== undefined) {
    campos.push('nome = ?');
    valores.push(atualizacao.nome);
    campos.push('slug_publico = ?');
    valores.push(await gerarSlugPublico(atualizacao.nome, id));
  }

  for (const campo of ['descricao', 'telefone', 'endereco', 'cidade']) {
    if (atualizacao[campo] !== undefined) {
      campos.push(`${campo} = ?`);
      valores.push(atualizacao[campo]);
    }
  }

  if (atualizacao.horario_abertura !== undefined) {
    campos.push('horario_abertura = ?');
    valores.push(atualizacao.horario_abertura);
  }

  if (atualizacao.horario_fechamento !== undefined) {
    campos.push('horario_fechamento = ?');
    valores.push(atualizacao.horario_fechamento);
  }

  if (atualizacao.dias_funcionamento !== undefined) {
    campos.push('dias_funcionamento = ?');
    valores.push(JSON.stringify(atualizacao.dias_funcionamento));
  }

  if (campos.length === 0) {
    return formatarNegocio(negocioAtual);
  }

  valores.push(id, usuarioId);

  const [resultado] = await pool.execute(
    `UPDATE negocios SET ${campos.join(', ')} WHERE id = ? AND usuario_id = ?`,
    valores
  );

  if (resultado.affectedRows === 0) {
    throw criarErro(404, 'Negócio não encontrado.');
  }

  const [negociosAtualizados] = await pool.execute(
    `SELECT id, nome, slug_publico, descricao, telefone, endereco, cidade,
      horario_abertura, horario_fechamento, dias_funcionamento, logo_url,
      banner_url, ativo
     FROM negocios
     WHERE id = ? AND usuario_id = ?
     LIMIT 1`,
    [id, usuarioId]
  );

  return formatarNegocio(negociosAtualizados[0]);
}

async function atualizarIdentidadeVisual(usuarioId, negocioId, arquivos) {
  const id = Number(negocioId);

  if (!Number.isInteger(id) || id <= 0) {
    throw criarErro(404, 'Negocio nao encontrado.');
  }

  const pool = getDatabasePool();
  const [linhas] = await pool.execute(
    `SELECT id, logo_url, banner_url
     FROM negocios
     WHERE id = ? AND usuario_id = ?
     LIMIT 1`,
    [id, usuarioId]
  );
  const negocioAtual = linhas[0];

  if (!negocioAtual) {
    throw criarErro(404, 'Negocio nao encontrado.');
  }

  const imagensSalvas = await salvarImagens(arquivos);
  const atualizacoes = [];
  const valores = [];

  for (const imagem of imagensSalvas) {
    atualizacoes.push(`${imagem.tipo}_url = ?`);
    valores.push(imagem.url);
  }

  valores.push(id, usuarioId);

  try {
    const [resultado] = await pool.execute(
      `UPDATE negocios
       SET ${atualizacoes.join(', ')}
       WHERE id = ? AND usuario_id = ?`,
      valores
    );

    if (resultado.affectedRows === 0) {
      throw criarErro(404, 'Negocio nao encontrado.');
    }
  } catch (erro) {
    await Promise.allSettled(
      imagensSalvas.map((imagem) => removerImagemPorUrl(imagem.url))
    );
    throw erro;
  }

  await Promise.allSettled(
    imagensSalvas.map((imagem) =>
      removerImagemPorUrl(negocioAtual[`${imagem.tipo}_url`])
    )
  );

  return buscarNegocioDoUsuario(usuarioId);
}

module.exports = {
  atualizarIdentidadeVisual,
  atualizarNegocio,
  buscarNegocioDoUsuario,
  criarNegocio,
};
