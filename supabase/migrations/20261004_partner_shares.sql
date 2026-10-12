-- Accountability Partner: read-only stats sharing via 6-char code

CREATE TABLE IF NOT EXISTS partner_shares (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code        CHAR(6)     UNIQUE NOT NULL,
  stats       JSONB       DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT partner_shares_user_unique UNIQUE (user_id)
);

ALTER TABLE partner_shares ENABLE ROW LEVEL SECURITY;

-- Owner can read and write their own row
CREATE POLICY "partner_shares_owner"
  ON partner_shares FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone authenticated can read any row (lookup by code)
CREATE POLICY "partner_shares_public_read"
  ON partner_shares FOR SELECT
  USING (auth.role() = 'authenticated');

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS partner_shares_code_idx ON partner_shares (code);
