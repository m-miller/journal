import { useState } from 'react';
import MoodPicker from './MoodPicker.jsx';
import TagInput from './TagInput.jsx';
import PromptBar from './PromptBar.jsx';
import RichTextEditor from './RichTextEditor.jsx';
import { describeTimestamps } from '../timestamps.js';

export default function EntryEditor({ entry, onChange, onDelete, onBack, onExport, exporting }) {
  const [showPrompts, setShowPrompts] = useState(false);

  function handleDelete() {
    if (window.confirm('Delete this entry? This cannot be undone.')) onDelete();
  }

  return (
    <article className="editor">
      <div className="editor-toolbar">
        <button type="button" className="back-button" onClick={onBack}>
          All entries
        </button>
        <label className="visually-hidden" htmlFor="entry-date">Entry date</label>
        <input
          id="entry-date"
          type="date"
          className="date-input"
          value={entry.date}
          onChange={(e) => e.target.value && onChange({ date: e.target.value })}
        />
        <button type="button" className="danger" onClick={handleDelete}>
          Delete
        </button>
      </div>

      <p className="entry-timestamps">{describeTimestamps(entry)}</p>

      <label className="visually-hidden" htmlFor="entry-title">Title</label>
      <input
        id="entry-title"
        className="title-input"
        placeholder="Untitled"
        value={entry.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />

      <div className="meta-row">
        <MoodPicker value={entry.mood} onChange={(mood) => onChange({ mood })} />
        <TagInput tags={entry.tags} onChange={(tags) => onChange({ tags })} />
      </div>

      {entry.prompt ? (
        <div className="active-prompt">
          <p>{entry.prompt}</p>
          <button type="button" className="text-button" onClick={() => onChange({ prompt: '' })}>
            Remove prompt
          </button>
        </div>
      ) : showPrompts ? (
        <PromptBar
          useLabel="Use this prompt"
          onUse={(prompt) => {
            onChange({ prompt });
            setShowPrompts(false);
          }}
        />
      ) : (
        <button type="button" className="text-button" onClick={() => setShowPrompts(true)}>
          Add a writing prompt
        </button>
      )}

      <RichTextEditor
        entryId={entry.id}
        value={entry.body}
        onChange={(body) => onChange({ body })}
        autoFocus={!entry.body}
      />

      <p className="saved-note">Saved automatically</p>
    </article>
  );
}
