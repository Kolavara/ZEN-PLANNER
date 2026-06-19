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
CREATE POLICY "Users manage own data" ON planner_data FOR ALL USING (auth.uid() = user_id);

-- Create a table for managing the music playlist names and URLs
CREATE TABLE planner_playlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE planner_playlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own playlist" ON planner_playlist FOR ALL USING (auth.uid() = user_id);

-- Create a storage bucket for uploaded audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio_tracks', 'audio_tracks', true) ON CONFLICT DO NOTHING;

-- Storage policies for the bucket
CREATE POLICY "Users can upload own audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio_tracks' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own audio" ON storage.objects FOR SELECT USING (bucket_id = 'audio_tracks');
CREATE POLICY "Users can delete own audio" ON storage.objects FOR DELETE USING (bucket_id = 'audio_tracks' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Verify setup
SELECT 'planner_data table created with RLS enabled.' AS status;
