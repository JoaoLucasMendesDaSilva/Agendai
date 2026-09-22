function criarErroFornecedor(statusCode, transiente) {
  const erro = new Error('Falha ao enviar WhatsApp pelo provedor configurado.');
  erro.statusCode = statusCode;
  erro.transiente = Boolean(transiente);
  return erro;
}

function normalizarTelefone(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');

  if (!digitos) {
    return '';
  }

  return digitos.length >= 12 ? digitos : `55${digitos}`;
}

async function enviarWhatsApp({
  config,
  to,
  message,
  fetchImpl = global.fetch,
}) {
  const telefone = normalizarTelefone(to);

  if (!telefone) {
    const erro = new Error('Número de WhatsApp ausente.');
    erro.transiente = false;
    erro.statusCode = 400;
    throw erro;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const url = `${config.baseUrl}/instances/${encodeURIComponent(
      config.instanceId
    )}/token/${encodeURIComponent(config.instanceToken)}/send-text`;
    const resposta = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Client-Token': config.clientToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: telefone, message }),
      signal: controller.signal,
    });

    if (!resposta.ok) {
      throw criarErroFornecedor(
        resposta.status,
        resposta.status === 408 || resposta.status === 429 || resposta.status >= 500
      );
    }

    return { messageId: null };
  } catch (erro) {
    if (erro.statusCode !== undefined) {
      throw erro;
    }

    const convertido = criarErroFornecedor(undefined, true);
    convertido.timeout = erro?.name === 'AbortError';
    throw convertido;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  enviarWhatsApp,
  normalizarTelefone,
};
