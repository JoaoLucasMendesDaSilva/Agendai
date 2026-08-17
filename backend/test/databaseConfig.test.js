const assert = require('node:assert/strict');
const test = require('node:test');

const { buildDatabaseConfig } = require('../src/config/database');

const REMOTE_DATABASE_URL =
  'postgresql://app_user:example-password@database.example.com:5432/agendai';

function assertDatabaseConfigError(environment, forbiddenValues = []) {
  assert.throws(
    () => buildDatabaseConfig(environment),
    (error) => {
      assert.equal(error.code, 'DB_CONFIG_ERROR');

      for (const value of forbiddenValues) {
        assert.equal(error.message.includes(value), false);
      }

      return true;
    }
  );
}

test('rejeita DATABASE_URL ausente sem expor configuração', () => {
  assertDatabaseConfigError({});
});

test('rejeita DATABASE_URL malformada sem repetir credenciais', () => {
  const credentialMarker = 'credential-marker-that-must-stay-private';

  assertDatabaseConfigError(
    {
      DATABASE_URL: `not-a-postgresql-url-${credentialMarker}`,
    },
    [credentialMarker]
  );
});

test('produção usa TLS verificado por padrão', () => {
  const config = buildDatabaseConfig({
    DATABASE_URL: REMOTE_DATABASE_URL,
    NODE_ENV: 'production',
  });

  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  assert.equal(config.host, 'database.example.com');
  assert.equal(config.user, 'app_user');
  assert.equal(config.database, 'agendai');
  assert.equal(config.port, 5432);
});

test('host remoto usa TLS verificado também fora de produção', () => {
  const config = buildDatabaseConfig({
    DATABASE_URL: REMOTE_DATABASE_URL,
    NODE_ENV: 'development',
  });

  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});

test('loopback fora de produção desabilita TLS por padrão', () => {
  const config = buildDatabaseConfig({
    DATABASE_URL: 'postgresql://local_user:local-password@localhost:5432/agendai',
    NODE_ENV: 'development',
  });

  assert.equal(config.ssl, false);
});

test('loopback em produção mantém TLS verificado por padrão', () => {
  const config = buildDatabaseConfig({
    DATABASE_URL: 'postgresql://local_user:local-password@localhost:5432/agendai',
    NODE_ENV: 'production',
  });

  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});

test('decodifica credenciais e não repassa a URI bruta ao driver', () => {
  const config = buildDatabaseConfig({
    DATABASE_URL:
      'postgresql://app%2Euser:example%40password@database.example.com:5432/agendai',
    DATABASE_SSL_MODE: 'verify-full',
  });

  assert.equal(config.user, 'app.user');
  assert.equal(config.password, 'example@password');
  assert.equal(Object.hasOwn(config, 'connectionString'), false);
});

test('verify-full sempre habilita validação do certificado', () => {
  const config = buildDatabaseConfig({
    DATABASE_URL: REMOTE_DATABASE_URL,
    DATABASE_SSL_MODE: 'verify-full',
    NODE_ENV: 'test',
  });

  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
});

test('repassa CA configurada sem alterar o conteúdo', () => {
  const certificateAuthority = [
    '-----BEGIN CERTIFICATE-----',
    'example-ca-for-tests-only',
    '-----END CERTIFICATE-----',
  ].join('\n');
  const config = buildDatabaseConfig({
    DATABASE_URL: REMOTE_DATABASE_URL,
    DATABASE_SSL_CA: certificateAuthority,
    DATABASE_SSL_MODE: 'verify-full',
  });

  assert.deepEqual(config.ssl, {
    ca: certificateAuthority,
    rejectUnauthorized: true,
  });
});

for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
  test(`permite desabilitar TLS somente no host local ${hostname}`, () => {
    const config = buildDatabaseConfig({
      DATABASE_URL: `postgresql://local_user:local-password@${hostname}:5432/agendai`,
      DATABASE_SSL_MODE: 'disable',
      NODE_ENV: 'development',
    });

    assert.equal(config.host, hostname.replace(/^\[|\]$/g, ''));
    assert.equal(config.ssl, false);
  });
}

test('rejeita TLS desabilitado para host remoto', () => {
  assertDatabaseConfigError({
    DATABASE_URL: REMOTE_DATABASE_URL,
    DATABASE_SSL_MODE: 'disable',
    NODE_ENV: 'development',
  });
});

test('rejeita TLS desabilitado em produção mesmo para loopback', () => {
  assertDatabaseConfigError({
    DATABASE_URL: 'postgresql://local_user:local-password@localhost:5432/agendai',
    DATABASE_SSL_MODE: 'disable',
    NODE_ENV: 'production',
  });
});

for (const parameter of [
  'host',
  'port',
  'ssl',
  'sslcert',
  'sslkey',
  'sslmode',
  'sslnegotiation',
  'sslrootcert',
]) {
  test(`rejeita parâmetro ${parameter} em DATABASE_URL`, () => {
    assertDatabaseConfigError({
      DATABASE_URL: `${REMOTE_DATABASE_URL}?${parameter}=configured-in-url`,
      DATABASE_SSL_MODE: 'verify-full',
    });
  });
}

test('parâmetro host não pode transformar URL loopback em conexão remota', () => {
  assertDatabaseConfigError({
    DATABASE_URL:
      'postgresql://local_user:local-password@localhost:5432/agendai?host=database.example.com',
    DATABASE_SSL_MODE: 'disable',
    NODE_ENV: 'development',
  });
});

test('parâmetro ssl não pode desabilitar a política explícita', () => {
  assertDatabaseConfigError({
    DATABASE_URL: `${REMOTE_DATABASE_URL}?ssl=0`,
    DATABASE_SSL_MODE: 'verify-full',
  });
});

test('rejeita qualquer parâmetro arbitrário na URL', () => {
  assertDatabaseConfigError({
    DATABASE_URL: `${REMOTE_DATABASE_URL}?application_name=agendai`,
    DATABASE_SSL_MODE: 'verify-full',
  });
});

test('rejeita fragmento na URL', () => {
  assertDatabaseConfigError({
    DATABASE_URL: `${REMOTE_DATABASE_URL}#configuracao-ignorada`,
    DATABASE_SSL_MODE: 'verify-full',
  });
});

test('rejeita protocolo que não seja PostgreSQL', () => {
  assertDatabaseConfigError({
    DATABASE_URL: 'https://database.example.com/agendai',
    DATABASE_SSL_MODE: 'verify-full',
  });
});

test('rejeita porta inválida', () => {
  assertDatabaseConfigError({
    DATABASE_URL: 'postgresql://local_user:local-password@localhost:0/agendai',
  });
});

test('rejeita usuário vazio para impedir fallback do driver', () => {
  assertDatabaseConfigError({
    DATABASE_URL:
      'postgresql://:local-password@localhost:5432/agendai',
  });
});

test('rejeita banco vazio para impedir fallback do driver', () => {
  assertDatabaseConfigError({
    DATABASE_URL:
      'postgresql://local_user:local-password@localhost:5432/',
  });
});

test('rejeita modo TLS desconhecido', () => {
  assertDatabaseConfigError({
    DATABASE_URL: REMOTE_DATABASE_URL,
    DATABASE_SSL_MODE: 'prefer',
  });
});
