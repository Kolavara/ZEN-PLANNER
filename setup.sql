-- ============================================================
-- ZEN PLANNER — Database Setup
-- ============================================================
-- Run this in your Supabase Dashboard:
-- 1. Go to https://supabase.com/dashboard
-- 2. Open your project
-- 3. Navigate to SQL Editor (left sidebar)
-- 4. Click "New Query"
-- 5. Paste this ENTIRE script and click "Run"
-- ============================================================

-- Main data table for all planner content
CREATE TABLE IF NOT EXISTS planner_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    page_id TEXT NOT NULL,
    field_id TEXT NOT NULL,
    content TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, page_id, field_id)
);

-- Performance index for page-level queries
CREATE INDEX IF NOT EXISTS idx_planner_user_page
    ON planner_data(user_id, page_id);

-- Enable Row Level Security
ALTER TABLE planner_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: each user can only access their own data
CREATE POLICY "Users manage own data" ON planner_data
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Verify setup
SELECT 'planner_data table created with RLS enabled.' AS status;
