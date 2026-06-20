const express = require('express');
const negocioController = require('../controllers/negocioController');
const { autenticarToken } = require('../middlewares/authMiddleware');
const {
  processarUploadIdentidade,
} = require('../middlewares/uploadNegocioMiddleware');

const router = express.Router();

router.use(autenticarToken);

router.get('/', negocioController.buscar);
router.post('/', negocioController.criar);
router.put('/:id', negocioController.atualizar);
router.put(
  '/:id/identidade-visual',
  processarUploadIdentidade,
  negocioController.atualizarIdentidade
);

module.exports = router;
