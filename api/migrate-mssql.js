require('dotenv').config()
const sql = require('mssql')
const questions = require('./questions.json')

const config = {
  server: process.env.MSSQL_SERVER || 'querylab-server-001.database.windows.net',
  database: process.env.MSSQL_DB || 'querylab-sql-001',
  user: process.env.MSSQL_USER || 'querylabadmin',
  password: process.env.MSSQL_PASSWORD,
  options: { encrypt: true, trustServerCertificate: false, enableArithAbort: true },
  connectionTimeout: 30000,
  requestTimeout: 30000,
}

function schemaName(id) {
  return 'q_' + id.replace(/-/g, '_')
}

// T-SQL reserved words that can legally appear as column names in question schemas
const RESERVED = ['plan', 'key', 'level', 'order', 'group', 'user', 'end', 'set', 'column', 'index', 'read', 'write', 'file', 'language', 'value', 'rank', 'percent']

function toTSQL(ddl) {
  let out = ddl
  out = out.replace(/`(\w+)`/g, '[$1]')                        // backticks → brackets
  out = out.replace(/\bIF\s+NOT\s+EXISTS\s+/gi, '')             // remove IF NOT EXISTS
  out = out.replace(/\bNVARCHAR\b/gi, 'NVARCHAR')              // keep as is
  // Use NVARCHAR(450) not MAX so columns can be used in PRIMARY KEY / indexes
  out = out.replace(/\bTEXT\b/gi, 'NVARCHAR(450)')
  out = out.replace(/\bINTEGER\b/gi, 'INT')                    // INTEGER → INT
  out = out.replace(/\bREAL\b/gi, 'FLOAT')                     // REAL → FLOAT
  out = out.replace(/\bBOOLEAN\b/gi, 'BIT')                    // BOOLEAN → BIT
  out = out.replace(/\bTRUE\b/gi, '1')                         // TRUE → 1
  out = out.replace(/\bFALSE\b/gi, '0')                        // FALSE → 0
  out = out.replace(/\bAUTOINCREMENT\b/gi, '')                 // remove AUTOINCREMENT
  out = out.replace(/\bWITHOUT\s+ROWID\b/gi, '')               // remove WITHOUT ROWID
  // Bracket reserved words used as column names (detected by being followed by a SQL type)
  const typePattern = 'N?VARCHAR|INT|BIGINT|FLOAT|REAL|DATE(?:TIME)?|BIT|NUMERIC|DECIMAL|CHAR'
  for (const word of RESERVED) {
    out = out.replace(
      new RegExp(`\\b(${word})\\b(\\s+(?:${typePattern}))`, 'gi'),
      (_, w, rest) => `[${w}]${rest}`
    )
  }
  return out
}

function prefixTables(ddl, schema) {
  let out = ddl
  out = out.replace(/\bCREATE\s+TABLE\s+(?:\[?(\w+)\]?)/gi, (_, t) => `CREATE TABLE [${schema}].[${t}]`)
  out = out.replace(/\bINSERT\s+INTO\s+(?:\[?(\w+)\]?)/gi, (_, t) => `INSERT INTO [${schema}].[${t}]`)
  return out
}

function splitStatements(ddl) {
  const stmts = []
  let cur = '', inStr = false, strChar = ''
  for (let i = 0; i < ddl.length; i++) {
    const c = ddl[i]
    if (inStr) {
      cur += c
      if (c === strChar && ddl[i + 1] === strChar) { cur += ddl[++i] }
      else if (c === strChar) { inStr = false }
    } else if (c === "'" || c === '"') {
      inStr = true; strChar = c; cur += c
    } else if (c === ';') {
      const s = cur.trim(); if (s) stmts.push(s); cur = ''
    } else { cur += c }
  }
  const last = cur.trim(); if (last) stmts.push(last)
  return stmts
}

async function migrate() {
  if (!config.password) { console.error('Set MSSQL_PASSWORD env var'); process.exit(1) }

  console.log('Connecting to Azure SQL...')
  let pool
  try {
    pool = await sql.connect(config)
    console.log('Connected.\n')
  } catch (err) {
    console.error('Connection failed:', err.message)
    process.exit(1)
  }

  let ok = 0, fail = 0

  for (const q of questions) {
    const schema = schemaName(q.id)
    process.stdout.write(`  ${q.id.padEnd(16)} [${schema}] ... `)

    try {
      // Create schema if absent
      await pool.request().query(
        `IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = '${schema}') EXEC('CREATE SCHEMA [${schema}]')`
      )

      // Drop existing tables in schema
      const existing = await pool.request().query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${schema}'`
      )
      for (const { TABLE_NAME } of existing.recordset) {
        await pool.request().query(`DROP TABLE [${schema}].[${TABLE_NAME}]`)
      }

      // Convert SQLite DDL → T-SQL and execute
      const tSql = prefixTables(toTSQL(q.schema), schema)
      const stmts = splitStatements(tSql).filter(s => s.trim())
      for (const stmt of stmts) {
        try {
          await pool.request().query(stmt)
        } catch (err) {
          throw new Error(`Statement failed: ${stmt.substring(0, 100)}\n  → ${err.message}`)
        }
      }

      console.log('OK')
      ok++
    } catch (err) {
      console.log('FAIL')
      console.error(`    ${err.message}`)
      fail++
    }
  }

  console.log(`\nDone: ${ok} OK, ${fail} failed`)
  await pool.close()
}

migrate()
