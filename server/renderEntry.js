import { parseBody } from '../src/richText.js';
import { getMood } from '../src/moods.js';

// Turns journal entries into HTML for the PDF export.

const IMAGE_SRC_RE = /^\/api\/images\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const ALIGNMENTS = ['left', 'center', 'right', 'justify'];
const POSITIONS = ['center', 'wrapLeft', 'wrapRight'];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Image ids used in a stored body, so their data can be loaded in one query.
export function imageIdsIn(body) {
  return [...(body || '').matchAll(/\/api\/images\/([0-9a-f-]{36})/gi)].map((m) => m[1].toLowerCase());
}

function renderText(text, marks = []) {
  let html = escapeHtml(text);
  for (const mark of marks) {
    if (mark.type === 'bold') html = `<strong>${html}</strong>`;
    else if (mark.type === 'italic') html = `<em>${html}</em>`;
    else if (mark.type === 'underline') html = `<u>${html}</u>`;
    else if (mark.type === 'strike') html = `<s>${html}</s>`;
    else if (mark.type === 'code') html = `<code>${html}</code>`;
    else if (mark.type === 'link') {
      const href = mark.attrs?.href || '';
      if (/^(https?:|mailto:)/i.test(href)) html = `<a href="${escapeHtml(href)}">${html}</a>`;
    }
  }
  return html;
}

// ` class="..."` for a block's alignment and first-line indent, or '' if it has neither.
function blockClass(attrs = {}) {
  const classes = [];
  if (ALIGNMENTS.includes(attrs.textAlign) && attrs.textAlign !== 'left') classes.push(`align-${attrs.textAlign}`);
  if (attrs.indent) classes.push('indent');
  return classes.length ? ` class="${classes.join(' ')}"` : '';
}

function renderImage(attrs = {}, imageData) {
  const match = IMAGE_SRC_RE.exec(attrs.src || '');
  const dataUri = match && imageData.get(match[1].toLowerCase());
  if (!dataUri) return '<p class="missing-image">[Image not available]</p>';

  const position = POSITIONS.includes(attrs.position) ? attrs.position : 'left';
  const width = Number(attrs.widthPercent);
  const style = width >= 1 && width <= 100 ? ` style="width: ${width}%"` : '';
  return `<figure class="image position-${position}"${style}><img src="${dataUri}" alt="${escapeHtml(attrs.alt || '')}"></figure>`;
}

function renderNode(node, imageData) {
  const children = () => (node.content || []).map((child) => renderNode(child, imageData)).join('');
  switch (node.type) {
    case 'doc':
      return children();
    case 'text':
      return renderText(node.text || '', node.marks);
    case 'hardBreak':
      return '<br>';
    case 'paragraph':
      return `<p${blockClass(node.attrs)}>${children()}</p>`;
    case 'heading': {
      const level = node.attrs?.level === 3 ? 3 : 2;
      return `<h${level}${blockClass(node.attrs)}>${children()}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${children()}</ul>`;
    case 'orderedList': {
      const start = Number(node.attrs?.start) > 1 ? ` start="${Number(node.attrs.start)}"` : '';
      return `<ol${start}>${children()}</ol>`;
    }
    case 'listItem':
      return `<li>${children()}</li>`;
    case 'blockquote':
      return `<blockquote>${children()}</blockquote>`;
    case 'codeBlock':
      return `<pre><code>${children()}</code></pre>`;
    case 'horizontalRule':
      return '<hr>';
    case 'image':
      return renderImage(node.attrs, imageData);
    default:
      return children();
  }
}

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// `entry` is a database row; `imageData` maps image id -> data URI.
export function renderEntry(entry, imageData) {
  const mood = getMood(entry.mood);
  const meta = [formatDate(entry.entry_date), mood && `Mood: ${mood.label}`].filter(Boolean).join(' · ');
  return `<div class="entry">
<h1>${escapeHtml(entry.title.trim() || 'Untitled entry')}</h1>
<p class="entry-meta">${escapeHtml(meta)}</p>
${renderNode(parseBody(entry.body), imageData)}
</div>`;
}