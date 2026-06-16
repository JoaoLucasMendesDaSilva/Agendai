const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const { testDatabaseConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origem nao permitida pelo CORS'));
    },
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      erro: 'Muitas requisicoes. Tente novamente em alguns minutos.',
    },
  })
);

app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mensagem: 'API do sistema de agendamento em funcionamento',
    ambiente: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/db-health', async (req, res, next) => {
  try {
    await testDatabaseConnection();

    res.json({
      status: 'ok',
      mensagem: 'Conexao com o banco de dados em funcionamento.',
    });
  } catch (err) {
    err.status = 503;
    err.publicMessage = 'Nao foi possivel conectar ao banco de dados.';
    next(err);
  }
});

app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota nao encontrada.',
  });
});

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;

  if (process.env.NODE_ENV !== 'production') {
    console.error({
      codigo: err.code,
      status: statusCode,
      metodo: req.method,
      rota: req.originalUrl,
    });
  }

  const publicErrorMessage =
    err.publicMessage ||
    (statusCode >= 500
      ? 'Erro interno do servidor.'
      : err.message || 'Nao foi possivel processar a requisicao.');

  res.status(statusCode).json({
    erro: publicErrorMessage,
  });
});

module.exports = app;
