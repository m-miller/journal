import { getMood } from '../moods.js';
import { describeTimestamps } from '../timestamps.js';
import { bodyToText } from '../richText.js';

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function preview(entry) {
  if (entry.title.trim()) return entry.title.trim();
  const firstLine = bodyToText(entry.body).trim().split('\n')[0];
  return firstLine || 'Untitled entry';
}

// The date, preview, times and tags shown for each entry in the list.
function EntryItemContent({ entry }) {
  const mood = getMood(entry.mood);
  return (
    <span className="entry-item-content">
      <span className="entry-date">
        {mood && <span className="mood-dot" style={{ background: mood.color }} title={`Mood: ${mood.label}`} />}
        {formatDate(entry.date)}
      </span>
      <span className="entry-preview">{preview(entry)}</span>
      <span className="entry-timestamps">{describeTimestamps(entry)}</span>
      {entry.tags.length > 0 && <span className="entry-tags">{entry.tags.map((t) => `#${t}`).join(' ')}</span>}
    </span>
  );
}

export default function EntryList({
  entries,
  totalCount,
  selectedId,
  onSelect,
  onCreate,
  query,
  onQueryChange,
  tags,
  activeTag,
  onTagChange,
  selecting,
  checkedIds,
  onToggleChecked,
  onStartSelecting,
  onStopSelecting,
  onExportChecked,
  exporting,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <h2 className="app-title">Journal</h2>
        <button type="button" className="primary" onClick={onCreate}>
          New entry
        </button>
      </div>

      <label className="visually-hidden" htmlFor="search">Search entries</label>
      <input
        id="search"
        type="search"
        className="search"
        placeholder="Search entries"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />

      {tags.length > 0 && (
        <div className="tag-filter" role="group" aria-label="Filter by tag">
          {tags.map((tag) => (
            <button
              type="button"
              key={tag}
              className={`chip ${activeTag === tag ? 'chip-active' : ''}`}
              aria-pressed={activeTag === tag}
              onClick={() => onTagChange(activeTag === tag ? null : tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {totalCount > 0 &&
        (selecting ? (
          <div className="export-bar">
            <span className="export-count" aria-live="polite">
              {checkedIds.size} selected
            </span>
            <button
              type="button"
              className="primary"
              onClick={onExportChecked}
              disabled={checkedIds.size === 0 || exporting}
            >
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
            <button type="button" onClick={onStopSelecting} disabled={exporting}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" className="text-button" onClick={onStartSelecting}>
            Select entries to export
          </button>
        ))}

      <ul className="entry-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            {selecting ? (
              <label className={`entry-item entry-item-selectable ${checkedIds.has(entry.id) ? 'entry-item-checked' : ''}`}>
                <input
                  type="checkbox"
                  className="entry-checkbox"
                  checked={checkedIds.has(entry.id)}
                  onChange={() => onToggleChecked(entry.id)}
                />
                <EntryItemContent entry={entry} />
              </label>
            ) : (
              <button
                type="button"
                className={`entry-item ${entry.id === selectedId ? 'entry-item-active' : ''}`}
                onClick={() => onSelect(entry.id)}
              >
                <EntryItemContent entry={entry} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {totalCount === 0 && <p className="list-note">Your entries will appear here.</p>}
      {totalCount > 0 && entries.length === 0 && (
        <p className="list-note">No entries match. Clear the search or tag filter to see all entries.</p>
      )}
    </aside>
  );
}