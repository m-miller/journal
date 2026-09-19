// Formats a millisecond timestamp using the browser's locale, e.g. "Sep 18, 2026, 2:30 PM".
export function formatTimestamp(ms) {
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// "Created …" always; ", edited …" only once the entry has been changed after creation.
export function describeTimestamps(entry) {
  const created = `Created ${formatTimestamp(entry.createdAt)}`;
  if (entry.updatedAt === entry.createdAt) return created;
  return `${created}, edited ${formatTimestamp(entry.updatedAt)}`;
}
