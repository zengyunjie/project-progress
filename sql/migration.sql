-- ============================================================
-- Project Progress - Supabase Migration
-- Run this in Supabase SQL Editor:
-- https://vmtmctgcrwzjejqtnngp.supabase.co → SQL Editor
-- ============================================================

-- 1. Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  created_date TEXT NOT NULL,
  deadline TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Seed default categories
INSERT INTO categories (id, name, color) VALUES
  ('new-product', '新产品开发', '#14B8A6'),
  ('daily-order', '日常订单跟进', '#3B82F6'),
  ('temporary', '临时项目', '#F59E0B')
ON CONFLICT (id) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 5. Create anonymous access policy (everyone can read/write)
CREATE POLICY "anon_full_access" ON tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_full_access" ON categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Enable Realtime for both tables
BEGIN;
  -- Drop from publication if exists, then re-add
  ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  ALTER PUBLICATION supabase_realtime ADD TABLE categories;
COMMIT;

-- 7. Create updated_at trigger for tasks
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('tasks', 'categories');
