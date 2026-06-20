const multer = require('multer');

const TIPOS_DECLARADOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 2,
  },
  fileFilter(req, file, callback) {
    if (!TIPOS_DECLARADOS_PERMITIDOS.has(file.mimetype)) {
      callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      return;
    }

    callback(null, true);
  },
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
]);

function criarErroUpload(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  erro.publicMessage = mensagem;
  return erro;
}

function processarUploadIdentidade(req, res, next) {
  upload(req, res, (erro) => {
    if (!erro) {
      next();
      return;
    }

    if (erro.code === 'LIMIT_FILE_SIZE') {
      next(criarErroUpload(413, 'A imagem excede o limite de tamanho permitido.'));
      return;
    }

    if (erro.code === 'LIMIT_FILE_COUNT') {
      next(criarErroUpload(400, 'Envie no maximo uma logo e um banner.'));
      return;
    }

    if (erro.code === 'LIMIT_UNEXPECTED_FILE') {
      next(
        criarErroUpload(
          400,
          'Envie apenas arquivos PNG, JPG, JPEG ou WEBP nos campos logo e banner.'
        )
      );
      return;
    }

    next(criarErroUpload(400, 'Nao foi possivel processar as imagens.'));
  });
}

module.exports = {
  processarUploadIdentidade,
};

