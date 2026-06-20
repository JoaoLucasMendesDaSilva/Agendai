const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')
);
const NEGOCIOS_DIR = path.join(UPLOAD_ROOT, 'negocios');

function criarErro(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  erro.publicMessage = mensagem;
  return erro;
}

function identificarImagem(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  ) {
    return { extensao: 'png', mime: 'image/png' };
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { extensao: 'jpg', mime: 'image/jpeg' };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { extensao: 'webp', mime: 'image/webp' };
  }

  return null;
}

function validarArquivo(arquivo, tipo) {
  if (!arquivo) {
    return null;
  }

  const limite = tipo === 'logo' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;

  if (arquivo.size > limite) {
    throw criarErro(
      413,
      tipo === 'logo'
        ? 'A logo deve ter no maximo 5 MB.'
        : 'O banner deve ter no maximo 10 MB.'
    );
  }

  const imagem = identificarImagem(arquivo.buffer);

  if (!imagem || imagem.mime !== arquivo.mimetype) {
    throw criarErro(400, 'Arquivo de imagem invalido ou formato nao permitido.');
  }

  return {
    arquivo,
    extensao: imagem.extensao,
    tipo,
  };
}

async function salvarImagens({ logo, banner }) {
  const imagens = [validarArquivo(logo, 'logo'), validarArquivo(banner, 'banner')]
    .filter(Boolean);

  if (imagens.length === 0) {
    throw criarErro(400, 'Selecione uma logo ou um banner para enviar.');
  }

  await fs.mkdir(NEGOCIOS_DIR, { recursive: true });

  const salvas = [];

  try {
    for (const imagem of imagens) {
      const nomeArquivo = `${imagem.tipo}-${crypto.randomUUID()}.${imagem.extensao}`;
      const caminho = path.join(NEGOCIOS_DIR, nomeArquivo);
      await fs.writeFile(caminho, imagem.arquivo.buffer, { flag: 'wx' });
      salvas.push({
        tipo: imagem.tipo,
        caminho,
        url: `/uploads/negocios/${nomeArquivo}`,
      });
    }

    return salvas;
  } catch (erro) {
    await Promise.allSettled(salvas.map((imagem) => fs.unlink(imagem.caminho)));
    throw erro;
  }
}

async function removerImagemPorUrl(url) {
  const prefixo = '/uploads/negocios/';

  if (!url || !url.startsWith(prefixo)) {
    return;
  }

  const nomeArquivo = path.basename(url);
  const caminho = path.resolve(NEGOCIOS_DIR, nomeArquivo);

  if (path.dirname(caminho) !== path.resolve(NEGOCIOS_DIR)) {
    return;
  }

  try {
    await fs.unlink(caminho);
  } catch (erro) {
    if (erro.code !== 'ENOENT') {
      console.error({ codigo: erro.code, operacao: 'remover_imagem_antiga' });
    }
  }
}

module.exports = {
  UPLOAD_ROOT,
  removerImagemPorUrl,
  salvarImagens,
};

