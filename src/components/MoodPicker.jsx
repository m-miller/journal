import { MOODS } from '../moods.js';

export default function MoodPicker({ value, onChange }) {
  return (
    <div className="mood-picker" role="group" aria-label="Mood">
      {MOODS.map((mood) => (
        <button
          type="button"
          key={mood.value}
          className={`mood-option ${value === mood.value ? 'mood-option-active' : ''}`}
          style={{ '--mood-color': mood.color }}
          aria-pressed={value === mood.value}
          onClick={() => onChange(value === mood.value ? null : mood.value)}
        >
          <span className="mood-dot" aria-hidden="true" />
          {mood.label}
        </button>
      ))}
    </div>
  );
}
