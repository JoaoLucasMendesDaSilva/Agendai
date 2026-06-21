const express = require('express');
const publicoController = require('../controllers/publicoController');

const router = express.Router();

router.get('/agendamentos/:token', publicoController.buscarAgendamento);
router.put(
  '/agendamentos/:token/confirmacao',
  publicoController.confirmarPresenca
);
router.delete('/agendamentos/:token', publicoController.cancelarAgendamento);
router.get('/negocio/:slugOuId', publicoController.buscarNegocio);
router.get('/negocio/:slugOuId/servicos', publicoController.listarServicos);
router.get(
  '/negocio/:slugOuId/profissionais',
  publicoController.listarProfissionais
);
router.get(
  '/negocio/:slugOuId/horarios-disponiveis',
  publicoController.listarHorarios
);
router.post(
  '/negocio/:slugOuId/agendamentos',
  publicoController.criarAgendamento
);

module.exports = router;
