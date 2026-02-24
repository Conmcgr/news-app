ALTER TABLE user_profile  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE digest_items  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS user_profile_user_id_idx  ON user_profile  (user_id);
CREATE INDEX IF NOT EXISTS digest_items_user_id_idx  ON digest_items  (user_id);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages (user_id);

ALTER TABLE user_profile  ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources       ENABLE ROW LEVEL SECURITY;

-- user_profile: anon only during claim window; authenticated after
CREATE POLICY "up_select"  ON user_profile FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "up_insert"  ON user_profile FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "up_update"  ON user_profile FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id);

-- digest_items: no INSERT for anon/authenticated (agent uses service key)
CREATE POLICY "di_select"  ON digest_items FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "di_update"  ON digest_items FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "di_delete"  ON digest_items FOR DELETE USING (auth.uid() = user_id);

-- chat_messages: direct user_id required on insert
CREATE POLICY "cm_select"  ON chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cm_insert"  ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- sources: global read-only reference data
CREATE POLICY "src_select" ON sources FOR SELECT USING (true);
