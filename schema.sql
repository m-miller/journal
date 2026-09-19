CREATE TABLE IF NOT EXISTS entries (
  id          UUID PRIMARY KEY,
  entry_date  DATE NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  mood        SMALLINT CHECK (mood BETWEEN 1 AND 5),
  tags        TEXT[] NOT NULL DEFAULT '{}',
  prompt      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entries_entry_date_idx ON entries (entry_date DESC);
