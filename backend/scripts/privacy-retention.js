const { loadDatabaseEnvironment } = require('../src/config/database');
const {
  anonimizarAgendamentosVencidos,
  excluirSolicitacoesConcluidasVencidas,
  lerDiasRetencao,
} = require('../src/services/retencaoPrivacidadeService');

async function main(argv = process.argv.slice(2)) {
  if (!argv.includes('--confirm-retention')) {
    process.stderr.write('Erro: confirme a execucao com --confirm-retention.\n');
    return 1;
  }

  loadDatabaseEnvironment();
  const agendamentosDias = lerDiasRetencao(
    process.env.LGPD_AGENDAMENTOS_RETENCAO_DIAS,
    730,
    'LGPD_AGENDAMENTOS_RETENCAO_DIAS'
  );
  const solicitacoesDias = lerDiasRetencao(
    process.env.LGPD_SOLICITACOES_RETENCAO_DIAS,
    1825,
    'LGPD_SOLICITACOES_RETENCAO_DIAS'
  );
  const agendamentos = await anonimizarAgendamentosVencidos({
    diasRetencao: agendamentosDias,
  });
  const solicitacoes = await excluirSolicitacoesConcluidasVencidas({
    diasRetencao: solicitacoesDias,
  });
  process.stdout.write(
    `Retencao concluida: ${agendamentos} agendamento(s) anonimizados; ${solicitacoes} solicitacao(oes) excluidas.\n`
  );
  return 0;
}

if (require.main === module) {
  main().then((code) => {
    process.exitCode = code;
  }).catch(() => {
    process.stderr.write('Erro: a rotina de retencao falhou com seguranca.\n');
    process.exitCode = 1;
  });
}

module.exports = { main };
