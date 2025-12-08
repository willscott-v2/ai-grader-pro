-- ============================================================================
-- INDIVIDUAL EMAIL WHITELIST
-- Allows whitelisting specific emails (not entire domains)
-- ============================================================================

-- Create whitelisted_emails table for pre-approved individual emails
CREATE TABLE whitelisted_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX whitelisted_emails_email_idx ON whitelisted_emails(LOWER(email));
CREATE INDEX whitelisted_emails_active_idx ON whitelisted_emails(is_active);

-- RLS Policies for whitelisted_emails
ALTER TABLE whitelisted_emails ENABLE ROW LEVEL SECURITY;

-- Anyone can read active emails (needed for signup checks)
CREATE POLICY "Anyone can view active whitelisted emails"
  ON whitelisted_emails FOR SELECT
  USING (is_active = true);

-- Only admins can manage emails
CREATE POLICY "Admins can insert emails"
  ON whitelisted_emails FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update emails"
  ON whitelisted_emails FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete emails"
  ON whitelisted_emails FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to check if an individual email is whitelisted
CREATE OR REPLACE FUNCTION is_email_whitelisted(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM whitelisted_emails
    WHERE LOWER(email) = LOWER(user_email)
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the auto_whitelist_on_signup function to check both domains AND individual emails
CREATE OR REPLACE FUNCTION auto_whitelist_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email domain is whitelisted OR if individual email is whitelisted
  IF is_domain_whitelisted(NEW.email) OR is_email_whitelisted(NEW.email) THEN
    NEW.is_whitelisted := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on email changes
CREATE TRIGGER update_whitelisted_emails_updated_at
  BEFORE UPDATE ON whitelisted_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add awray@pacific.edu to the whitelist
INSERT INTO whitelisted_emails (email, description) VALUES
  ('awray@pacific.edu', 'Approved individual user');

-- If the user already exists, whitelist them now
UPDATE profiles
SET is_whitelisted = true
WHERE LOWER(email) = 'awray@pacific.edu'
AND is_whitelisted = false;
