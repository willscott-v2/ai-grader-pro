-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE (User Management with Whitelist)
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  is_whitelisted BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX profiles_email_idx ON profiles(email);
CREATE INDEX profiles_whitelisted_idx ON profiles(is_whitelisted);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (but not whitelist status)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- RUNS TABLE (Analysis Batches)
-- ============================================================================
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Run metadata
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Statistics (updated by triggers)
  total_analyses INTEGER DEFAULT 0,
  completed_analyses INTEGER DEFAULT 0,
  failed_analyses INTEGER DEFAULT 0,

  -- Storage paths
  report_path TEXT,
  export_path TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX runs_user_id_idx ON runs(user_id);
CREATE INDEX runs_status_idx ON runs(status);
CREATE INDEX runs_created_at_idx ON runs(created_at DESC);

-- RLS Policies
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- Users can view their own runs
CREATE POLICY "Users can view own runs"
  ON runs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create runs (if whitelisted)
CREATE POLICY "Whitelisted users can create runs"
  ON runs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_whitelisted = true
    )
  );

-- Users can update their own runs
CREATE POLICY "Users can update own runs"
  ON runs FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- ANALYSES TABLE (Individual URL/Keyword Analyses)
-- ============================================================================
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,

  -- Input
  url TEXT NOT NULL,
  keyword TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Results (JSONB for flexibility)
  entities JSONB,
  schema_analysis JSONB,
  visibility_results JSONB,
  keyword_expansions JSONB,

  -- Scores
  overall_score INTEGER,
  visibility_score INTEGER,
  schema_score INTEGER,
  entity_score INTEGER,

  -- Report
  report_markdown TEXT,
  report_json JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX analyses_run_id_idx ON analyses(run_id);
CREATE INDEX analyses_status_idx ON analyses(status);
CREATE INDEX analyses_url_idx ON analyses(url);
CREATE INDEX analyses_keyword_idx ON analyses(keyword);

-- RLS Policies
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Users can view analyses from their own runs
CREATE POLICY "Users can view own analyses"
  ON analyses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM runs
      WHERE runs.id = analyses.run_id
      AND runs.user_id = auth.uid()
    )
  );

-- System can insert/update (for background processing)
-- Note: In practice, we'll use service role key for background jobs

-- ============================================================================
-- ANALYSIS_PROGRESS TABLE (Real-time Progress Updates)
-- ============================================================================
CREATE TABLE analysis_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,

  -- Progress tracking
  step TEXT NOT NULL,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX analysis_progress_analysis_id_idx ON analysis_progress(analysis_id);
CREATE INDEX analysis_progress_created_at_idx ON analysis_progress(created_at DESC);

-- RLS Policies
ALTER TABLE analysis_progress ENABLE ROW LEVEL SECURITY;

-- Users can view progress for their own analyses
CREATE POLICY "Users can view own analysis progress"
  ON analysis_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analyses
      JOIN runs ON runs.id = analyses.run_id
      WHERE analyses.id = analysis_progress.analysis_id
      AND runs.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_runs_updated_at BEFORE UPDATE ON runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update run statistics when analyses change
CREATE OR REPLACE FUNCTION update_run_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the run's statistics
  UPDATE runs
  SET
    completed_analyses = (
      SELECT COUNT(*) FROM analyses
      WHERE run_id = COALESCE(NEW.run_id, OLD.run_id)
      AND status = 'completed'
    ),
    failed_analyses = (
      SELECT COUNT(*) FROM analyses
      WHERE run_id = COALESCE(NEW.run_id, OLD.run_id)
      AND status = 'failed'
    ),
    total_analyses = (
      SELECT COUNT(*) FROM analyses
      WHERE run_id = COALESCE(NEW.run_id, OLD.run_id)
    )
  WHERE id = COALESCE(NEW.run_id, OLD.run_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_run_stats_on_analysis_change
  AFTER INSERT OR UPDATE OR DELETE ON analyses
  FOR EACH ROW EXECUTE FUNCTION update_run_stats();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false);

-- Storage policies
CREATE POLICY "Users can upload their own reports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get next queued analysis
CREATE OR REPLACE FUNCTION get_next_queued_analysis()
RETURNS TABLE (
  analysis_id UUID,
  run_id UUID,
  url TEXT,
  keyword TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id as analysis_id,
    a.run_id,
    a.url,
    a.keyword
  FROM analyses a
  JOIN runs r ON r.id = a.run_id
  WHERE a.status = 'queued'
  AND r.status IN ('queued', 'running')
  ORDER BY a.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================

-- Uncomment to add a test admin user (replace with your email)
-- INSERT INTO profiles (id, email, full_name, is_whitelisted, is_admin)
-- VALUES (
--   'your-auth-user-id-here',
--   'your-email@example.com',
--   'Admin User',
--   true,
--   true
-- );
