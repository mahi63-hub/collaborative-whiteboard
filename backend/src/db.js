import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

export async function initDb() {
  await query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      google_id TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      objects JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query("ALTER TABLE boards ALTER COLUMN id TYPE TEXT USING id::text");
  await query("CREATE INDEX IF NOT EXISTS boards_owner_id_idx ON boards(owner_id)");
}

export async function upsertUser({ googleId, name, email, image }) {
  const result = await query(
    `INSERT INTO users (google_id, name, email, image)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email)
     DO UPDATE SET google_id = COALESCE(EXCLUDED.google_id, users.google_id), name = EXCLUDED.name, image = EXCLUDED.image
     RETURNING id, name, email, image`,
    [googleId, name, email, image || ""]
  );
  return result.rows[0];
}

export async function createBoard(ownerId) {
  const boardId = crypto.randomUUID();
  const result = await query(
    "INSERT INTO boards (id, owner_id, objects) VALUES ($1, $2, $3) RETURNING id",
    [boardId, ownerId, JSON.stringify([])]
  );
  return result.rows[0].id;
}

export async function saveBoard(boardId, ownerId, objects) {
  const result = await query(
    `INSERT INTO boards (id, owner_id, objects)
     VALUES ($1, $2, $3)
     ON CONFLICT (id)
     DO UPDATE SET objects = EXCLUDED.objects, updated_at = NOW()
     WHERE boards.owner_id = EXCLUDED.owner_id
     RETURNING id`,
    [boardId, ownerId, JSON.stringify(objects)]
  );
  return result.rows[0];
}

export async function loadBoard(boardId, ownerId) {
  const result = await query(
    `SELECT id, objects, updated_at
     FROM boards
     WHERE id = $1 AND owner_id = $2`,
    [boardId, ownerId]
  );
  return result.rows[0];
}

export async function findUserById(id) {
  const result = await query(
    "SELECT id, name, email, image FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0];
}
