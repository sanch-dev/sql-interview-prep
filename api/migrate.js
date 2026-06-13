/**
 * One-time migration: loads all question schemas into PostgreSQL.
 * Run once: node migrate.js
 *
 * Each question gets its own PostgreSQL schema named q_<id>
 * (e.g. question e01 → schema q_e01).
 */
require('dotenv').config()
const { Client } = require('pg')
const questions = require('./questions.json')

function schemaName(id) {
  return 'q_' + id.replace(/-/g, '_')
}

// PostgreSQL doesn't support some SQLite DDL quirks — patch them here.
function patchDDL(ddl) {
  return ddl
    // Remove AUTOINCREMENT (SQLite only)
    .replace(/\bAUTOINCREMENT\b/gi, '')
    // SQLite allows unquoted reserved words as column names; PG needs quotes
    // (safe passthrough for our specific schemas — none use reserved names)
    .trim()
}

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  console.log(`Connected to PostgreSQL. Migrating ${questions.length} questions...\n`)

  let ok = 0, fail = 0

  for (const q of questions) {
    const schema = schemaName(q.id)
    try {
      // Drop and recreate the schema so re-running is idempotent
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      await client.query(`CREATE SCHEMA ${schema}`)
      await client.query(`SET search_path = ${schema}`)
      await client.query(patchDDL(q.schema))
      console.log(`  OK  ${q.id}  (schema: ${schema})`)
      ok++
    } catch (err) {
      console.error(`  FAIL ${q.id}: ${err.message}`)
      fail++
    }
  }

  await client.end()
  console.log(`\nMigration complete: ${ok} OK, ${fail} failed.`)
  if (fail > 0) process.exit(1)
}

migrate().catch(err => { console.error(err); process.exit(1) })
