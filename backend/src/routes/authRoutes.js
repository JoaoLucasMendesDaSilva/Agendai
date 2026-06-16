const express = require('express');
const authController = require('../controllers/authController');
const { autenticarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/cadastro', authController.cadastrar);
router.post('/login', authController.login);
router.get('/me', autenticarToken, authController.me);

module.exports = router;
