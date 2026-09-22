import { useState } from 'react';
import { fetchAIPrompt, randomBuiltInPrompt } from '../prompts.js';

// `onDismiss` is optional; when given, a Dismiss button closes the prompt section.
export default function PromptBar({ onUse, useLabel, onDismiss }) {
  const [prompt, setPrompt] = useState(() => randomBuiltInPrompt());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function nextBuiltIn() {
    setError('');
    setPrompt(randomBuiltInPrompt(prompt));
  }

  async function askClaude() {
    setLoading(true);
    setError('');
    try {
      setPrompt(await fetchAIPrompt());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="prompt-bar">
      <p className="prompt-text" aria-live="polite">{prompt}</p>
      <div className="prompt-actions">
        <button type="button" onClick={nextBuiltIn}>Show another</button>
        <button type="button" className="primary" onClick={() => onUse(prompt)}>
          {useLabel}
        </button>
        {onDismiss && (
          <button type="button" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
