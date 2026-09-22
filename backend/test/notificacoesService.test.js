const assert = require('node:assert/strict');
const test = require('node:test');

const {
  notificarAgendamentoCancelado,
  notificarAgendamentoConfirmado,
} = require('../src/services/notificacoes/notificacoesService');

const agendamento = {
  negocio_nome: 'Studio Teste',
  servico_nome: 'Corte',
  profissional_nome: 'João',
  cliente_nome: 'Cliente',
  cliente_email: 'cliente@example.com',
  cliente_telefone: '(13) 99999-1111',
  data_hora_inicio: '2099-07-01 08:30:00',
  data_hora_fim: '2099-07-01 09:30:00',
};

function environment(overrides = {}) {
  return {
    NOTIFICACOES_MODE: 'simulado',
    NOTIFICACOES_TIMEOUT_MS: '50',
    NOTIFICACOES_MAX_RETRIES: '1',
    PUBLIC_APP_URL: 'https://agendai.example',
    ...overrides,
  };
}

test('confirmação em modo simulado não chama provedores e é identificável', async () => {
  let chamadas = 0;
  const resultado = await notificarAgendamentoConfirmado(agendamento, {
    environment: environment(),
    fetchImpl: async () => {
      chamadas += 1;
      throw new Error('não deveria chamar a rede');
    },
  });

  assert.deepEqual(
    resultado.resultados.map(({ canal, status }) => ({ canal, status })),
    [
      { canal: 'email', status: 'simulado' },
      { canal: 'whatsapp', status: 'simulado' },
    ]
  );
  assert.equal(chamadas, 0);
});

test('modo real sem credenciais não faz chamadas externas', async () => {
  let chamadas = 0;
  const resultado = await notificarAgendamentoCancelado(agendamento, {
    environment: environment({ NOTIFICACOES_MODE: 'real' }),
    fetchImpl: async () => {
      chamadas += 1;
      return { ok: true, headers: { get: () => null } };
    },
  });

  assert.deepEqual(
    resultado.resultados.map(({ canal, status }) => ({ canal, status })),
    [
      { canal: 'email', status: 'nao_configurado' },
      { canal: 'whatsapp', status: 'nao_configurado' },
    ]
  );
  assert.equal(chamadas, 0);
});

test('provedores reais são chamados uma vez por canal e recebem link público', async () => {
  const chamadas = [];
  const resultado = await notificarAgendamentoConfirmado(agendamento, {
    environment: environment({
      NOTIFICACOES_MODE: 'real',
      SENDGRID_API_KEY: 'key',
      SENDGRID_FROM_EMAIL: 'no-reply@example.com',
      ZAPI_INSTANCE_ID: 'instance',
      ZAPI_INSTANCE_TOKEN: 'token',
      ZAPI_CLIENT_TOKEN: 'client',
    }),
    tokenGerenciamento: 'a'.repeat(64),
    fetchImpl: async (url, options) => {
      chamadas.push({ url, options });
      return { ok: true, headers: { get: () => null } };
    },
  });

  assert.deepEqual(
    resultado.resultados.map(({ canal, status }) => ({ canal, status })),
    [
      { canal: 'email', status: 'enviado' },
      { canal: 'whatsapp', status: 'enviado' },
    ]
  );
  assert.equal(chamadas.length, 2);
  const email = chamadas.find(({ url }) => url.includes('sendgrid'));
  const whatsapp = chamadas.find(({ url }) => url.includes('z-api'));
  assert.match(JSON.parse(email.options.body).content[0].value, /gerenciar-agendamento/);
  assert.equal(JSON.parse(whatsapp.options.body).phone, '5513999991111');
});

test('erro transitório tem no máximo uma nova tentativa e falha é sanitizada', async () => {
  let chamadas = 0;
  const resultado = await notificarAgendamentoConfirmado(agendamento, {
    environment: environment({
      NOTIFICACOES_MODE: 'real',
      NOTIFICACOES_MAX_RETRIES: '1',
      SENDGRID_API_KEY: 'key',
      SENDGRID_FROM_EMAIL: 'no-reply@example.com',
    }),
    fetchImpl: async () => {
      chamadas += 1;
      return { ok: false, status: 500, headers: { get: () => null } };
    },
    sleep: async () => {},
  });

  assert.equal(chamadas, 2);
  const email = resultado.resultados.find(({ canal }) => canal === 'email');
  assert.equal(email.status, 'falhou');
  assert.equal(Object.hasOwn(email.erro, 'mensagem'), false);
});

test('sem destinatários o evento é ignorado sem erro', async () => {
  const resultado = await notificarAgendamentoCancelado(
    { ...agendamento, cliente_email: '', cliente_telefone: '' },
    { environment: environment() }
  );

  assert.deepEqual(resultado.resultados, [
    { evento: 'agendamento_cancelado', canal: 'nenhum', status: 'ignorado' },
  ]);
});
