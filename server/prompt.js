import express from 'express';

// Model used for generated prompts. Change here if you prefer another Claude model.
const MODEL = 'claude-haiku-4-5-20251001';
const SYSTEM =
  'You write journaling prompts. Reply with exactly one prompt: a single open-ended question or invitation to reflect, under 30 words. No preamble, no quotation marks.';

export const promptRouter = express.Router();

// POST /api/prompt -> { prompt }. The API key stays on the server, and this
// endpoint can only ask for journaling prompts, not make arbitrary Claude requests.
promptRouter.post('/', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'No Anthropic API key is set on the server.' });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: 'user', content: 'Give me one fresh journaling prompt.' }],
    }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('Claude prompt request failed:', response.status, data?.error?.message);
    return res.status(502).json({ error: `Claude didn't return a prompt (error ${response.status}).` });
  }

  const prompt = (data?.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
  if (!prompt) return res.status(502).json({ error: 'Claude returned an empty prompt. Try again.' });

  res.json({ prompt });
});