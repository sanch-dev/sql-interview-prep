const sql = require('mssql')

const config = {
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DB,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
  },
  pool: { max: 2, min: 0, idleTimeoutMillis: 10000 },
  connectionTimeout: 15000,
  requestTimeout: 15000,
}

let _pool = null

async function getPool() {
  if (!_pool) _pool = await sql.connect(config)
  return _pool
}

module.exports = { getPool, sql }
