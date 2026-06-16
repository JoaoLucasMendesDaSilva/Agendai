const express = require('express');
const negocioController = require('../controllers/negocioController');
const { autenticarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(autenticarToken);

router.get('/', negocioController.buscar);
router.post('/', negocioController.criar);
router.put('/:id', negocioController.atualizar);

module.exports = router;
