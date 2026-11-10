import Database from "better-sqlite3";
import pg from "pg";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const isPostgres = Boolean(process.env.DATABASE_URL);
const isProduction = process.env.NODE_ENV === "production";
export const databaseDialect = isPostgres ? "postgres" : "sqlite";

if (isProduction && !isPostgres) {
  throw new Error("DATABASE_URL debe configurarse en producción para usar la base persistente de Neon.");
}

let sqlite;
let pool;

if (isPostgres) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
} else {
  const databasePath = process.env.DATABASE_PATH
    ? resolve(process.env.DATABASE_PATH)
    : resolve(serverDirectory, "data", "roottask.sqlite");
  mkdirSync(dirname(databasePath), { recursive: true });
  sqlite = new Database(databasePath);
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("journal_mode = WAL");
}

function postgresPlaceholders(sql) {
  let parameterIndex = 0;
  return sql.replace(/\?/g, () => `$${++parameterIndex}`);
}

export async function initializeDatabase() {
  if (isPostgres) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        username VARCHAR(40) NOT NULL,
        email VARCHAR(254) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        occupation VARCHAR(20) NOT NULL DEFAULT 'student',
        profession VARCHAR(80) NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(120) NOT NULL,
        category VARCHAR(60) NOT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'in_progress', 'completed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS tasks_user_due_date
        ON tasks(user_id, due_date);
    `);
    return;
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      occupation TEXT NOT NULL DEFAULT 'student',
      profession TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      due_date TEXT NOT NULL,
      reminder_time TEXT,
      completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS tasks_user_due_date
      ON tasks(user_id, due_date);
  `);

  const userColumns = new Set(sqlite.pragma("table_info(users)").map((column) => column.name));
  if (!userColumns.has("occupation")) {
    sqlite.exec("ALTER TABLE users ADD COLUMN occupation TEXT NOT NULL DEFAULT 'student'");
  }
  if (!userColumns.has("profession")) {
    sqlite.exec("ALTER TABLE users ADD COLUMN profession TEXT NOT NULL DEFAULT ''");
  }

  const taskColumns = new Set(sqlite.pragma("table_info(tasks)").map((column) => column.name));
  if (!taskColumns.has("status")) {
    sqlite.exec(`
      ALTER TABLE tasks
      ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed'))
    `);
    sqlite.exec("UPDATE tasks SET status = 'completed' WHERE completed = 1");
  }
}

export async function get(sql, parameters = []) {
  if (isPostgres) {
    const result = await pool.query(postgresPlaceholders(sql), parameters);
    return result.rows[0];
  }
  return sqlite.prepare(sql).get(...parameters);
}

export async function all(sql, parameters = []) {
  if (isPostgres) {
    const result = await pool.query(postgresPlaceholders(sql), parameters);
    return result.rows;
  }
  return sqlite.prepare(sql).all(...parameters);
}

export async function run(sql, parameters = []) {
  if (isPostgres) {
    const statement = /^\s*INSERT\b/i.test(sql) && !/\bRETURNING\b/i.test(sql)
      ? `${sql.trimEnd()} RETURNING id`
      : sql;
    const result = await pool.query(postgresPlaceholders(statement), parameters);
    return {
      changes: result.rowCount,
      lastInsertRowid: result.rows[0]?.id,
    };
  }
  const result = sqlite.prepare(sql).run(...parameters);
  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid,
  };
}

export async function checkDatabase() {
  if (isPostgres) {
    await pool.query("SELECT 1");
  } else {
    sqlite.prepare("SELECT 1").get();
  }
}

export async function closeDatabase() {
  if (isPostgres) {
    await pool.end();
  } else {
    sqlite.close();
  }
}
