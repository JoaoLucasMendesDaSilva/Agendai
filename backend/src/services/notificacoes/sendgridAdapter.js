function criarErroFornecedor(statusCode, transiente) {
  const erro = new Error('Falha ao enviar e-mail pelo provedor configurado.');
  erro.statusCode = statusCode;
  erro.transiente = Boolean(transiente);
  return erro;
}

async function enviarEmail({ config, to, subject, text, html, fetchImpl = global.fetch }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const resposta = await fetchImpl(`${config.baseUrl}/v3/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: {
          email: config.fromEmail,
          ...(config.fromName ? { name: config.fromName } : {}),
        },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
      signal: controller.signal,
    });

    if (!resposta.ok) {
      throw criarErroFornecedor(
        resposta.status,
        resposta.status === 408 || resposta.status === 429 || resposta.status >= 500
      );
    }

    return { messageId: resposta.headers?.get?.('x-message-id') || null };
  } catch (erro) {
    if (erro.statusCode !== undefined) {
      throw erro;
    }

    const timeoutErro = erro?.name === 'AbortError';
    const convertido = criarErroFornecedor(undefined, true);
    convertido.timeout = timeoutErro;
    throw convertido;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  enviarEmail,
};
