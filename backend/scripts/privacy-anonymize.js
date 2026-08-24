const { loadDatabaseEnvironment } = require('../src/config/database');
const { anonimizarTitular } = require('../src/services/retencaoPrivacidadeService');

function valorArgumento(argv, nome) {
  const prefixo = `--${nome}=`;
  const argumento = argv.find((item) => item.startsWith(prefixo));
  return argumento ? argumento.slice(prefixo.length) : '';
}

async function main(argv = process.argv.slice(2)) {
  if (!argv.includes('--confirm-anonymize')) {
    process.stderr.write('Erro: confirme a execucao com --confirm-anonymize.\n');
    return 1;
  }

  loadDatabaseEnvironment();
  const alterados = await anonimizarTitular({
    negocioId: valorArgumento(argv, 'negocio-id'),
    email: valorArgumento(argv, 'email'),
  });
  process.stdout.write(`Anonimizacao concluida: ${alterados} agendamento(s) alterado(s).\n`);
  return 0;
}

if (require.main === module) {
  main().then((code) => {
    process.exitCode = code;
  }).catch(() => {
    process.stderr.write('Erro: a anonimização falhou com seguranca.\n');
    process.exitCode = 1;
  });
}

module.exports = { main, valorArgumento };
