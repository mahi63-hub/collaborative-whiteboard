import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
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
  const result = await query(
    "INSERT INTO boards (owner_id, objects) VALUES ($1, $2) RETURNING id",
    [ownerId, JSON.stringify([])]
  );
  return result.rows[0].id;
}

export async function saveBoard(boardId, ownerId, objects) {
  const result = await query(
    `UPDATE boards
     SET objects = $1, updated_at = NOW()
     WHERE id = $2 AND owner_id = $3
     RETURNING id`,
    [JSON.stringify(objects), boardId, ownerId]
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
