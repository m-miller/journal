import { useState } from 'react';
import { fetchAIPrompt, randomBuiltInPrompt } from '../prompts.js';

export default function PromptBar({ onUse, useLabel }) {
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
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
