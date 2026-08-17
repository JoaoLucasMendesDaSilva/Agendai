const { Pool } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

let pool;

function getDatabasePool() {
  if (!process.env.DATABASE_URL) {
    const error = new Error("DATABASE_URL não configurada.");
    error.code = "DB_CONFIG_ERROR";
    throw error;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  return pool;
}

async function testDatabaseConnection() {
  const result = await getDatabasePool().query("SELECT 1 AS ok");
  return result.rows[0].ok === 1;
}

module.exports = {
  getDatabasePool,
  testDatabaseConnection,
};