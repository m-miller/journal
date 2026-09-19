import express from 'express';
import { randomUUID } from 'node:crypto';
import { pool } from './db.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

// Identify the real file type from its first bytes rather than trusting the request.
function detectImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 6 && ['GIF87a', 'GIF89a'].includes(buf.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

export const imagesRouter = express.Router();

// Upload: the request body is the raw image file. ?entryId=<uuid> says which entry it belongs to.
imagesRouter.post(
  '/',
  express.raw({ type: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], limit: MAX_IMAGE_BYTES }),
  async (req, res) => {
    const { entryId } = req.query;
    if (typeof entryId !== 'string' || !UUID_RE.test(entryId)) {
      return res.status(400).json({ error: 'A valid entryId is required.' });
    }

    const mimeType = Buffer.isBuffer(req.body) ? detectImageType(req.body) : null;
    if (!mimeType) {
      return res.status(415).json({ error: 'Images must be JPEG, PNG, GIF, or WebP.' });
    }

    const id = randomUUID();
    await pool.query('INSERT INTO images (id, entry_id, mime_type, data) VALUES ($1, $2, $3, $4)', [
      id,
      entryId,
      mimeType,
      req.body,
    ]);
    res.status(201).json({ id, url: `/api/images/${id}` });
  }
);

imagesRouter.get('/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).end();

  const { rows } = await pool.query('SELECT mime_type, data FROM images WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).end();

  res.set({
    'Content-Type': rows[0].mime_type,
    'Cache-Control': 'private, max-age=31536000, immutable', // an image id never changes content
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(rows[0].data);
});

// Deletes the images uploaded to an entry, once that entry has been deleted.
// Skips any image another entry also uses (for example, after copying it across).
export async function deleteEntryImages(entryId) {
  await pool.query(
    `DELETE FROM images i
     WHERE i.entry_id = $1
       AND NOT EXISTS (SELECT 1 FROM entries e WHERE strpos(e.body, i.id::text) > 0)`,
    [entryId]
  );
}