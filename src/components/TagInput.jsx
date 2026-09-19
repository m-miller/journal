import { useState } from 'react';

function normalize(tag) {
  return tag.trim().replace(/^#/, '').toLowerCase();
}

export default function TagInput({ tags, onChange }) {
  const [draft, setDraft] = useState('');

  function addTag(raw) {
    const tag = normalize(raw);
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setDraft('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="tag-input">
      {tags.map((tag) => (
        <span className="chip" key={tag}>
          #{tag}
          <button
            type="button"
            className="chip-remove"
            aria-label={`Remove tag ${tag}`}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
          >
            ×
          </button>
        </span>
      ))}
      <label className="visually-hidden" htmlFor="tag-draft">Add a tag</label>
      <input
        id="tag-draft"
        value={draft}
        placeholder={tags.length ? 'Add tag' : 'Add tags (press Enter)'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => draft && addTag(draft)}
      />
    </div>
  );
}
