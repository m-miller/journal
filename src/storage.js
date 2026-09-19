// All persistence lives here. The app talks to the Express API in /server,
// which stores entries in PostgreSQL.

const BASE = '/api/entries';

async function request(path = '', options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    let message = '';
    try {
      message = (await res.json()).error || '';
    } catch {
      // response body was not JSON
    }
    throw new Error(message || `Request failed (error ${res.status}).`);
  }

  return res.status === 204 ? null : res.json();
}

export function fetchEntries() {
  return request();
}

export function createEntry(entry) {
  return request('', { method: 'POST', body: JSON.stringify(entry) });
}

export function updateEntry(id, changes) {
  return request(`/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}

export function deleteEntry(id) {
  return request(`/${id}`, { method: 'DELETE' });
}

// Uploads an image file for an entry. Returns { id, url }.
export async function uploadImage(entryId, file) {
  const res = await fetch(`/api/images?entryId=${encodeURIComponent(entryId)}`, {
    method: 'POST',
    headers: { 'content-type': file.type },
    body: file,
  });

  if (!res.ok) {
    let message = '';
    try {
      message = (await res.json()).error || '';
    } catch {
      // response body was not JSON
    }
    throw new Error(message || `Upload failed (error ${res.status}).`);
  }
  return res.json();
}

// Asks the server for a PDF of the given entries and downloads it.
export async function exportPdf(ids) {
  const res = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    let message = '';
    try {
      message = (await res.json()).error || '';
    } catch {
      // response body was not JSON
    }
    throw new Error(message || `Export failed (error ${res.status}).`);
  }

  const fileName =
    /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || 'journal.pdf';
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
