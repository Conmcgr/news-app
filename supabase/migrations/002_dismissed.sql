-- Add dismissed column to digest_items
ALTER TABLE digest_items ADD COLUMN IF NOT EXISTS dismissed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS digest_items_dismissed_idx ON digest_items (dismissed);
