const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME'];

function validateDatabaseEnv() {
  const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

  if (missingVars.length > 0) {
    const error = new Error('Configuracao do banco de dados incompleta.');
    error.code = 'DB_CONFIG_ERROR';
    throw error;
  }

  const dbPort = Number(process.env.DB_PORT);

  if (!Number.isInteger(dbPort) || dbPort <= 0) {
    const error = new Error('Porta do banco de dados invalida.');
    error.code = 'DB_CONFIG_ERROR';
    throw error;
  }
}

let pool;

function getDatabasePool() {
  validateDatabaseEnv();

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      namedPlaceholders: true,
    });
  }

  return pool;
}

async function testDatabaseConnection() {
  const [rows] = await getDatabasePool().query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}

module.exports = {
  getDatabasePool,
  testDatabaseConnection,
};
