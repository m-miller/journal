export const MOODS = [
  { value: 1, label: 'Awful', color: 'var(--mood-1)' },
  { value: 2, label: 'Low', color: 'var(--mood-2)' },
  { value: 3, label: 'Okay', color: 'var(--mood-3)' },
  { value: 4, label: 'Good', color: 'var(--mood-4)' },
  { value: 5, label: 'Great', color: 'var(--mood-5)' },
];

export function getMood(value) {
  return MOODS.find((m) => m.value === value) || null;
}
