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

-- Images inside entries. The entry's body links to them as /api/images/<id>.
-- entry_id records which entry the image was uploaded to (used for cleanup).
CREATE TABLE IF NOT EXISTS images (
  id          UUID PRIMARY KEY,
  entry_id    UUID NOT NULL,
  mime_type   TEXT NOT NULL,
  data        BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS images_entry_id_idx ON images (entry_id);
