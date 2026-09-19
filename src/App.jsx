import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from './storage.js';
import { bodyToText } from './richText.js';
import EntryList from './components/EntryList.jsx';
import EntryEditor from './components/EntryEditor.jsx';
import PromptBar from './components/PromptBar.jsx';
import './App.css';

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Fallback: RFC 4122 version 4 UUID, required by the database's UUID column.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Edits are batched and sent this long after the last keystroke.
const SAVE_DELAY_MS = 500;

export default function App() {
  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(false); // choosing entries to export
  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);

  // id -> { changes, timer } for edits waiting to be sent
  const pendingEdits = useRef(new Map());
  // id -> promise for entries whose create request hasn't finished yet
  const pendingCreates = useRef(new Map());

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      setEntries(await api.fetchEntries());
      setStatus('ready');
    } catch (err) {
      setError(`Couldn't load entries. ${err.message}`);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allTags = useMemo(
    () => [...new Set(entries.flatMap((e) => e.tags))].sort(),
    [entries]
  );

  const visibleEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => {
        if (activeTag && !e.tags.includes(activeTag)) return false;
        if (!q) return true;
        return (
          e.title.toLowerCase().includes(q) ||
          bodyToText(e.body).toLowerCase().includes(q) ||
          e.tags.some((t) => t.includes(q))
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [entries, query, activeTag]);

  const selected = entries.find((e) => e.id === selectedId) || null;

  function createEntry(prompt = '') {
    const now = Date.now();
    const entry = {
      id: newId(),
      date: todayISO(),
      title: '',
      body: '',
      mood: null,
      tags: [],
      prompt,
      createdAt: now,
      updatedAt: now,
    };
    setEntries((prev) => [entry, ...prev]);
    setSelectedId(entry.id);

    const request = api
      .createEntry(entry)
      .catch((err) => {
        setError(`Couldn't save the new entry. ${err.message}`);
        throw err;
      })
      .finally(() => pendingCreates.current.delete(entry.id));
    request.catch(() => {}); // handled above; prevents an unhandled-rejection warning
    pendingCreates.current.set(entry.id, request);
  }

  async function flushEdits(id) {
    const pending = pendingEdits.current.get(id);
    if (!pending) return;
    pendingEdits.current.delete(id);
    try {
      await pendingCreates.current.get(id); // an entry must exist before it can be updated
      await api.updateEntry(id, pending.changes);
    } catch (err) {
      setError(`Couldn't save your changes. ${err.message}`);
    }
  }

  function updateEntry(id, changes) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...changes, updatedAt: Date.now() } : e))
    );

    const pending = pendingEdits.current.get(id) || { changes: {}, timer: null };
    pending.changes = { ...pending.changes, ...changes };
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => flushEdits(id), SAVE_DELAY_MS);
    pendingEdits.current.set(id, pending);
  }

  // Saves any unsent edits to these entries, then downloads them as one PDF.
  async function exportEntries(ids) {
    setExporting(true);
    setError('');
    try {
      await Promise.all(ids.map((id) => flushEdits(id)));
      await api.exportPdf(ids);
      return true;
    } catch (err) {
      setError(`Couldn't export the PDF. ${err.message}`);
      return false;
    } finally {
      setExporting(false);
    }
  }

  function toggleChecked(id) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setCheckedIds(new Set());
  }

  async function exportChecked() {
    const ids = entries.filter((e) => checkedIds.has(e.id)).map((e) => e.id);
    if (ids.length > 0 && (await exportEntries(ids))) stopSelecting();
  }
  function deleteEntry(id) {
    const pending = pendingEdits.current.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      pendingEdits.current.delete(id);
    }

    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelectedId(null);
    setCheckedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    Promise.resolve(pendingCreates.current.get(id))
      .then(() => api.deleteEntry(id))
      .catch((err) => setError(`Couldn't delete the entry; it may reappear after reloading. ${err.message}`));
  }

  return (
    <div className={`app ${selected ? 'has-selection' : ''}`}>
      <EntryList
        entries={visibleEntries}
        totalCount={entries.length}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={() => createEntry()}
        query={query}
        onQueryChange={setQuery}
        tags={allTags}
        activeTag={activeTag}
        onTagChange={setActiveTag}
        selecting={selecting}
        checkedIds={checkedIds}
        onToggleChecked={toggleChecked}
        onStartSelecting={() => setSelecting(true)}
        onStopSelecting={stopSelecting}
        onExportChecked={exportChecked}
        exporting={exporting}
      />

      <main className="main">
        {error && (
          <div className="banner" role="alert">
            <p>{error}</p>
            {status === 'error' ? (
              <button type="button" onClick={load}>Try again</button>
            ) : (
              <button type="button" onClick={() => setError('')}>Dismiss</button>
            )}
          </div>
        )}

        {status === 'loading' ? (
          <p className="list-note">Loading entries…</p>
        ) : status === 'error' ? null : selected ? (
          <EntryEditor
            key={selected.id}
            entry={selected}
            onChange={(changes) => updateEntry(selected.id, changes)}
            onDelete={() => deleteEntry(selected.id)}
            onExport={() => exportEntries([selected.id])}
            exporting={exporting}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="empty">
            <h1>What's on your mind?</h1>
            <p>Start a blank entry from the list, or begin with a prompt.</p>
            <PromptBar onUse={(p) => createEntry(p)} useLabel="Write about this" />
          </div>
        )}
      </main>
    </div>
  );
}
