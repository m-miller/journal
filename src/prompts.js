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
// Asks the server for a Claude-generated prompt (see server/prompt.js).
export async function fetchAIPrompt() {
  const res = await fetch('/api/prompt', { method: 'POST' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Claude didn't return a prompt (error ${res.status}).`);
  return data.prompt;
}