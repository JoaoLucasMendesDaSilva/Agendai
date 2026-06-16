const express = require('express');
const servicosController = require('../controllers/servicosController');
const { autenticarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(autenticarToken);

router.get('/', servicosController.listar);
router.post('/', servicosController.criar);
router.get('/:id', servicosController.buscarPorId);
router.put('/:id', servicosController.atualizar);
router.delete('/:id', servicosController.desativar);

module.exports = router;
