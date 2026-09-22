const { criarMensagemAgendamento } = require('./templates');
const { enviarEmail } = require('./sendgridAdapter');
const { enviarWhatsApp } = require('./zapiAdapter');

const MODOS = new Set(['simulado', 'real', 'desativado']);
function inteiroLimitado(valor, padrao, maximo) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 0
    ? Math.min(numero, maximo)
    : padrao;
}

function obterConfiguracao(environment = process.env) {
  const modo = String(environment.NOTIFICACOES_MODE || 'simulado')
    .trim()
    .toLowerCase();

  return {
    mode: MODOS.has(modo) ? modo : 'simulado',
    timeoutMs: inteiroLimitado(environment.NOTIFICACOES_TIMEOUT_MS, 5000, 15000),
    maxRetries: inteiroLimitado(environment.NOTIFICACOES_MAX_RETRIES, 1, 2),
    publicAppUrl: String(environment.PUBLIC_APP_URL || '').trim().replace(/\/$/, ''),
    sendgrid: {
      baseUrl: 'https://api.sendgrid.com',
      apiKey: String(environment.SENDGRID_API_KEY || '').trim(),
      fromEmail: String(environment.SENDGRID_FROM_EMAIL || '').trim(),
      fromName: String(environment.SENDGRID_FROM_NAME || '').trim(),
    },
    zapi: {
      baseUrl: 'https://api.z-api.io',
      instanceId: String(environment.ZAPI_INSTANCE_ID || '').trim(),
      instanceToken: String(environment.ZAPI_INSTANCE_TOKEN || '').trim(),
      clientToken: String(environment.ZAPI_CLIENT_TOKEN || '').trim(),
    },
  };
}

function possuiConfiguracaoEmail(config) {
  return Boolean(config.apiKey && config.fromEmail);
}

function possuiConfiguracaoWhatsApp(config) {
  return Boolean(config.instanceId && config.instanceToken && config.clientToken);
}

function criarLinkGerenciamento(config, token) {
  if (!config.publicAppUrl || !token) {
    return '';
  }

  return `${config.publicAppUrl}/gerenciar-agendamento/${encodeURIComponent(token)}`;
}

function erroSanitizado(erro) {
  return {
    tipo: erro?.name || 'Error',
    status: Number.isInteger(erro?.statusCode) ? erro.statusCode : undefined,
    transiente: Boolean(erro?.transiente),
    timeout: Boolean(erro?.timeout),
  };
}

function registrarResultado(resultado) {
  const payload = {
    evento: resultado.evento,
    canal: resultado.canal,
    status: resultado.status,
  };

  if (resultado.erro) {
    payload.erro = resultado.erro;
  }

  if (resultado.status === 'simulado') {
    console.info('[notificacoes] envio simulado', payload);
  } else if (resultado.status === 'falhou' || resultado.status === 'nao_configurado') {
    console.warn('[notificacoes] envio não concluído', payload);
  }
}

async function aguardar(ms, sleep) {
  if (typeof sleep === 'function') {
    await sleep(ms);
  } else {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function executarComTentativas(enviar, config, dependencias = {}) {
  let tentativa = 0;

  while (true) {
    try {
      return await enviar();
    } catch (erro) {
      if (!erro.transiente || tentativa >= config.maxRetries) {
        throw erro;
      }

      tentativa += 1;
      await aguardar(50 * tentativa, dependencias.sleep);
    }
  }
}

async function enviarCanal({ evento, canal, agendamento, mensagem, config, dependencias }) {
  if (config.mode === 'desativado') {
    const resultado = { evento, canal, status: 'desativado' };
    registrarResultado(resultado);
    return resultado;
  }

  if (config.mode === 'simulado') {
    const resultado = { evento, canal, status: 'simulado' };
    registrarResultado(resultado);
    return resultado;
  }

  const configurado =
    canal === 'email'
      ? possuiConfiguracaoEmail(config.sendgrid)
      : possuiConfiguracaoWhatsApp(config.zapi);

  if (!configurado) {
    const resultado = { evento, canal, status: 'nao_configurado' };
    registrarResultado(resultado);
    return resultado;
  }

  try {
    if (canal === 'email') {
      await executarComTentativas(
        () =>
          enviarEmail({
            config: { ...config.sendgrid, timeoutMs: config.timeoutMs },
            to: agendamento.cliente_email,
            subject: mensagem.assunto,
            text: mensagem.texto,
            html: mensagem.html,
            fetchImpl: dependencias.fetchImpl,
          }),
        config,
        dependencias
      );
    } else {
      await executarComTentativas(
        () =>
          enviarWhatsApp({
            config: { ...config.zapi, timeoutMs: config.timeoutMs },
            to: agendamento.cliente_telefone,
            message: mensagem.texto,
            fetchImpl: dependencias.fetchImpl,
          }),
        config,
        dependencias
      );
    }

    const resultado = { evento, canal, status: 'enviado' };
    registrarResultado(resultado);
    return resultado;
  } catch (erro) {
    const resultado = {
      evento,
      canal,
      status: 'falhou',
      erro: erroSanitizado(erro),
    };
    registrarResultado(resultado);
    return resultado;
  }
}

async function notificarEvento(tipo, agendamento, opcoes = {}) {
  const config = obterConfiguracao(opcoes.environment || process.env);
  const evento = tipo === 'cancelamento' ? 'agendamento_cancelado' : 'agendamento_confirmado';
  const linkGerenciamento = criarLinkGerenciamento(config, opcoes.tokenGerenciamento);
  const mensagem = criarMensagemAgendamento(tipo, agendamento, linkGerenciamento);
  const canais = [];

  if (agendamento?.cliente_email) {
    canais.push('email');
  }

  if (agendamento?.cliente_telefone) {
    canais.push('whatsapp');
  }

  if (canais.length === 0) {
    const resultado = { evento, canal: 'nenhum', status: 'ignorado' };
    registrarResultado(resultado);
    return { evento, resultados: [resultado] };
  }

  const resultados = await Promise.all(
    canais.map((canal) =>
      enviarCanal({
        evento,
        canal,
        agendamento,
        mensagem,
        config,
        dependencias: opcoes,
      })
    )
  );

  return { evento, resultados };
}

function notificarAgendamentoConfirmado(agendamento, opcoes) {
  return notificarEvento('confirmacao', agendamento, opcoes);
}

function notificarAgendamentoCancelado(agendamento, opcoes) {
  return notificarEvento('cancelamento', agendamento, opcoes);
}

module.exports = {
  notificarAgendamentoCancelado,
  notificarAgendamentoConfirmado,
  notificarEvento,
  obterConfiguracao,
  erroSanitizado,
};
