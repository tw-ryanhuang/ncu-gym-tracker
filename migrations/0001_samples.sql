CREATE TABLE IF NOT EXISTS samples (
 slot TEXT PRIMARY KEY, fetched_at TEXT NOT NULL, local_date TEXT NOT NULL,
 weekday INTEGER NOT NULL, hour INTEGER NOT NULL, minute INTEGER NOT NULL,
 count INTEGER, status TEXT NOT NULL, detail TEXT, source_date TEXT,
 source_age TEXT, body_hash TEXT
);
CREATE INDEX IF NOT EXISTS samples_date ON samples(local_date);
