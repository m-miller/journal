import express from 'express';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { pool } from './db.js';
import { imageIdsIn, renderEntry } from './renderEntry.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ENTRIES = 500;
const CSS = await readFile(new URL('./pdf.css', import.meta.url), 'utf8');

// Only these outside requests are allowed while rendering: the app's fonts.
// Everything else (other than the page's own data: images) is blocked.
const ALLOWED_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const FONTS_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=Public+Sans:wght@400;500&display=swap" rel="stylesheet">';

const FOOTER = `<div style="width: 100%; text-align: center; font: 9px Helvetica, Arial, sans-serif; color: #5b6878;">
  <span class="pageNumber"></span></div>`;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function fileNameFor(entries) {
  if (entries.length === 1) {
    const base = (entries[0].title.trim() || entries[0].entry_date).replace(/[^\p{L}\p{N} _-]+/gu, '').trim().slice(0, 80);
    return `${base || 'journal-entry'}.pdf`;
  }
  return `journal-${entries.length}-entries.pdf`;
}

async function buildPdf(bodyHtml, title) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
${FONTS_LINK}<style>${CSS}</style></head><body>${bodyHtml}</body></html>`;

  const browser = await puppeteer.launch({
    // Chrome's sandbox can't run as the root user (e.g. in some Docker setups).
    args: process.getuid?.() === 0 ? ['--no-sandbox'] : [],
  });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.startsWith('data:')) return request.continue();
      const host = URL.canParse(url) ? new URL(url).hostname : '';
      return ALLOWED_HOSTS.includes(host) ? request.continue() : request.abort();
    });

    // If the fonts can't be reached (e.g. offline), the PDF uses the fallback fonts.
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });

    return await page.pdf({
      format: 'Letter', // or 'Letter'
      printBackground: true,
      margin: { top: '2cm', bottom: '2cm', left: '2.2cm', right: '2.2cm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: FOOTER,
    });
  } finally {
    await browser.close();
  }
}

export const exportRouter = express.Router();

// POST /api/export/pdf  { ids: [entry ids] }  ->  one PDF, entries oldest first, each on a new page.
exportRouter.post('/pdf', async (req, res) => {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Choose at least one entry to export.' });
  if (ids.length > MAX_ENTRIES) return res.status(400).json({ error: `You can export up to ${MAX_ENTRIES} entries at once.` });
  if (!ids.every((id) => typeof id === 'string' && UUID_RE.test(id))) return res.status(400).json({ error: 'Invalid entry id.' });

  const { rows: entries } = await pool.query(
    `SELECT id, entry_date, title, body, mood FROM entries
     WHERE id = ANY($1::uuid[])
     ORDER BY entry_date ASC, created_at ASC`,
    [ids]
  );
  if (entries.length === 0) return res.status(404).json({ error: 'Those entries no longer exist.' });

  const imageIds = [...new Set(entries.flatMap((e) => imageIdsIn(e.body)))];
  const imageData = new Map();
  if (imageIds.length > 0) {
    const { rows } = await pool.query('SELECT id, mime_type, data FROM images WHERE id = ANY($1::uuid[])', [imageIds]);
    for (const row of rows) imageData.set(row.id, `data:${row.mime_type};base64,${row.data.toString('base64')}`);
  }

  const bodyHtml = entries.map((entry) => renderEntry(entry, imageData)).join('\n');
  const title = entries.length === 1 ? entries[0].title.trim() || 'Journal entry' : 'Journal';

  let pdf;
  try {
    pdf = await buildPdf(bodyHtml, title);
  } catch (err) {
    console.error('PDF export failed:', err);
    return res.status(500).json({ error: "The PDF couldn't be created. Check the server logs." });
  }

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${fileNameFor(entries)}"`,
  });
  res.send(Buffer.from(pdf));
});