const express = require('express');
const rateLimit = require('express-rate-limit');
const privacidadeController = require('../controllers/privacidadeController');

const router = express.Router();

router.post(
  '/solicitacoes',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: 'Muitas solicitacoes. Tente novamente mais tarde.' },
  }),
  privacidadeController.criarSolicitacao
);

module.exports = router;
