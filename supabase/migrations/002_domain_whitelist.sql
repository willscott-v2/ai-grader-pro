-- ============================================================================
-- DOMAIN WHITELIST MIGRATION
-- Adds support for domain-based whitelisting instead of individual emails
-- ============================================================================

-- Create whitelisted_domains table
CREATE TABLE whitelisted_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster domain lookups
CREATE INDEX whitelisted_domains_domain_idx ON whitelisted_domains(domain);
CREATE INDEX whitelisted_domains_active_idx ON whitelisted_domains(is_active);

-- RLS Policies for whitelisted_domains
ALTER TABLE whitelisted_domains ENABLE ROW LEVEL SECURITY;

-- Anyone can read active domains (needed for signup checks)
CREATE POLICY "Anyone can view active whitelisted domains"
  ON whitelisted_domains FOR SELECT
  USING (is_active = true);

-- Only admins can manage domains
CREATE POLICY "Admins can insert domains"
  ON whitelisted_domains FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update domains"
  ON whitelisted_domains FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete domains"
  ON whitelisted_domains FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to check if an email domain is whitelisted
CREATE OR REPLACE FUNCTION is_domain_whitelisted(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  email_domain TEXT;
BEGIN
  -- Extract domain from email (everything after @)
  email_domain := LOWER(SPLIT_PART(user_email, '@', 2));

  -- Check if domain exists and is active
  RETURN EXISTS (
    SELECT 1 FROM whitelisted_domains
    WHERE LOWER(domain) = email_domain
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-whitelist user on profile creation if domain is whitelisted
CREATE OR REPLACE FUNCTION auto_whitelist_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email domain is whitelisted
  IF is_domain_whitelisted(NEW.email) THEN
    NEW.is_whitelisted := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-whitelist on profile creation
CREATE TRIGGER auto_whitelist_profile
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_whitelist_on_signup();

-- ============================================================================
-- UPDATE EXISTING RLS POLICIES
-- ============================================================================

-- Drop and recreate the "Whitelisted users can create runs" policy
-- to use the new domain whitelist check
DROP POLICY IF EXISTS "Whitelisted users can create runs" ON runs;

CREATE POLICY "Whitelisted users can create runs"
  ON runs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (
        is_whitelisted = true
        OR is_domain_whitelisted(email)
      )
    )
  );

-- ============================================================================
-- HELPER FUNCTION TO SYNC EXISTING USERS
-- ============================================================================

-- Function to whitelist all users from whitelisted domains
-- Run this after adding domains to whitelist existing users
CREATE OR REPLACE FUNCTION sync_domain_whitelist()
RETURNS TABLE (
  updated_count INTEGER,
  emails TEXT[]
) AS $$
DECLARE
  updated_emails TEXT[];
  count INTEGER;
BEGIN
  -- Update profiles where domain is whitelisted but user isn't
  WITH updated AS (
    UPDATE profiles
    SET is_whitelisted = true
    WHERE is_whitelisted = false
    AND is_domain_whitelisted(email)
    RETURNING email
  )
  SELECT ARRAY_AGG(email), COUNT(*) INTO updated_emails, count
  FROM updated;

  RETURN QUERY SELECT count, updated_emails;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on domain changes
CREATE TRIGGER update_whitelisted_domains_updated_at
  BEFORE UPDATE ON whitelisted_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EXAMPLE USAGE (commented out)
-- ============================================================================

-- Add whitelisted domains
-- INSERT INTO whitelisted_domains (domain, description) VALUES
--   ('example.com', 'Company domain'),
--   ('contractor.com', 'Contractor domain');

-- Sync existing users from whitelisted domains
-- SELECT * FROM sync_domain_whitelist();

-- Check if specific email is whitelisted
-- SELECT is_domain_whitelisted('user@example.com');
