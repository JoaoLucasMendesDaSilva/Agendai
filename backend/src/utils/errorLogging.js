function criarRegistroErroSeguro(error, request, status) {
  return {
    codigo: error?.code || 'INTERNAL_ERROR',
    status,
    metodo: request?.method || 'UNKNOWN',
  };
}

module.exports = {
  criarRegistroErroSeguro,
};
