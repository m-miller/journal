export const BUILT_IN_PROMPTS = [
  'What took up most of your attention today, and did it deserve it?',
  'Describe a small moment from today you would like to remember.',
  'What is something you are avoiding right now? What makes it hard?',
  'Who made your day a little better recently, and how?',
  'What would you tell yourself from a year ago?',
  'What drained your energy this week, and what restored it?',
  'Write about a place where you feel most like yourself.',
  'What is a belief you have changed your mind about?',
  'What are you looking forward to, even slightly?',
  'Describe how you are feeling right now without naming the emotion.',
  'What did you learn today, however small?',
  'What would make tomorrow feel like a good day?',
  'Write about something you did well recently that no one noticed.',
  'What is a question you keep coming back to lately?',
  'What does rest look like for you right now?',
  'Describe a conversation you keep replaying. What would you say differently?',
  'What are three things you can see, hear, and feel right now?',
  'What is one thing you want to let go of this month?',
];

export function randomBuiltInPrompt(exclude) {
  const pool = BUILT_IN_PROMPTS.filter((p) => p !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Model used for generated prompts. Change here if you prefer another Claude model.
const MODEL = 'claude-haiku-4-5-20251001';

export async function fetchAIPrompt() {
  const res = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      system:
        'You write journaling prompts. Reply with exactly one prompt: a single open-ended question or invitation to reflect, under 30 words. No preamble, no quotation marks.',
      messages: [{ role: 'user', content: 'Give me one fresh journaling prompt.' }],
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data?.error?.message || '';
    } catch {
      // response body was not JSON
    }
    throw new Error(`Claude didn't return a prompt (error ${res.status}). ${detail}`.trim());
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!text) throw new Error('Claude returned an empty prompt. Try again.');
  return text;
}
