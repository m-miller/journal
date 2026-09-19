// Entry bodies are saved as the editor's JSON document, serialized to a string.
// Older entries are plain text; they are converted when opened and saved in the
// new format on their first edit.

function plainTextToDoc(text) {
  return {
    type: 'doc',
    content: text.split('\n').map((line) =>
      line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' }
    ),
  };
}

// Returns an editor document for any stored body (JSON string, plain text, or empty).
export function parseBody(body) {
  if (!body) return { type: 'doc', content: [{ type: 'paragraph' }] };
  try {
    const parsed = JSON.parse(body);
    if (parsed && parsed.type === 'doc') return parsed;
  } catch {
    // not JSON, so it's an older plain-text entry
  }
  return plainTextToDoc(body);
}

export function serializeDoc(doc) {
  return JSON.stringify(doc);
}

function collectLines(node, lines) {
  if (!node.content) return;
  const isTextBlock = node.content.some((c) => c.type === 'text' || c.type === 'hardBreak');
  if (isTextBlock) {
    lines.push(node.content.map((c) => (c.type === 'text' ? c.text : c.type === 'hardBreak' ? '\n' : '')).join(''));
    return;
  }
  node.content.forEach((child) => collectLines(child, lines));
}

// Plain text of a stored body, one line per paragraph, heading, or list item.
// Used for search and list previews.
export function bodyToText(body) {
  const lines = [];
  collectLines(parseBody(body), lines);
  return lines.join('\n');
}
