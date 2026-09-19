import express from 'express';
import { readFile } from 'node:fs/promises';
import { pool } from './db.js';
import { deleteEntryImages, imagesRouter } from './images.js';
import { exportRouter } from './exportPdf.js';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/api/images', imagesRouter);
app.use('/api/export', exportRouter);

const COLUMNS = 'id, entry_date, title, body, mood, tags, prompt, created_at, updated_at';

// Maps a database row to the entry shape the frontend uses.
function toEntry(row) {
  return {
    id: row.id,
    date: row.entry_date,
    title: row.title,
    body: row.body,
    mood: row.mood,
    tags: row.tags,
    prompt: row.prompt,
    createdAt: row.created_at.getTime(),
    updatedAt: row.updated_at.getTime(),
  };
}

// Editable fields: frontend name -> column name and validator.
const FIELDS = {
  date: { column: 'entry_date', valid: (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) },
  title: { column: 'title', valid: (v) => typeof v === 'string' },
  body: { column: 'body', valid: (v) => typeof v === 'string' },
  mood: { column: 'mood', valid: (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 5) },
  tags: { column: 'tags', valid: (v) => Array.isArray(v) && v.every((t) => typeof t === 'string') },
  prompt: { column: 'prompt', valid: (v) => typeof v === 'string' },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Returns [{ column, value }] for the known fields in `input`, or throws a 400 error.
function pickFields(input) {
  const picked = [];
  for (const [key, value] of Object.entries(input || {})) {
    const field = FIELDS[key];
    if (!field) continue;
    if (!field.valid(value)) {
      const err = new Error(`Invalid value for "${key}".`);
      err.status = 400;
      throw err;
    }
    picked.push({ column: field.column, value });
  }
  return picked;
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

app.get('/api/entries', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM entries ORDER BY entry_date DESC, created_at DESC`
  );
  res.json(rows.map(toEntry));
});

app.post('/api/entries', async (req, res) => {
  const { id } = req.body || {};
  if (typeof id !== 'string' || !UUID_RE.test(id)) return badRequest(res, 'A valid "id" is required.');

  const fields = pickFields(req.body);
  if (!fields.some((f) => f.column === 'entry_date')) return badRequest(res, '"date" is required.');

  const columns = ['id', ...fields.map((f) => f.column)];
  const values = [id, ...fields.map((f) => f.value)];
  const placeholders = values.map((_, i) => `$${i + 1}`);

  try {
    const { rows } = await pool.query(
      `INSERT INTO entries (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING ${COLUMNS}`,
      values
    );
    res.status(201).json(toEntry(rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An entry with this id already exists.' });
      if (err.status === 413) return res.status(413).json({ error: 'Images can be up to 10 MB.' });
    throw err;
  }
});

app.patch('/api/entries/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return badRequest(res, 'Invalid entry id.');

  const fields = pickFields(req.body);
  if (fields.length === 0) return badRequest(res, 'No fields to update.');

  const sets = fields.map((f, i) => `${f.column} = $${i + 1}`);
  const values = [...fields.map((f) => f.value), req.params.id];

  const { rows } = await pool.query(
    `UPDATE entries SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING ${COLUMNS}`,
    values
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Entry not found.' });

  res.json(toEntry(rows[0]));
});

app.delete('/api/entries/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return badRequest(res, 'Invalid entry id.');

  const { rowCount } = await pool.query('DELETE FROM entries WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Entry not found.' });
  await deleteEntryImages(req.params.id);
  res.status(204).end();
});

// Express 5 forwards errors from async handlers here.
app.use((err, req, res, next) => {
  if (err.status === 400) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'The server hit an error. Check the server logs.' });
});

const PORT = Number(process.env.PORT) || 3001;

async function start() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Add it to your .env file.');
    process.exit(1);
  }
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  app.listen(PORT, () => console.log(`Journal API listening on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Could not start the server:', err.message);
  process.exit(1);
});
