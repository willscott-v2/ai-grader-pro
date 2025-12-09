-- ============================================================================
-- ADD INDIVIDUAL USERS TO WHITELIST
-- ============================================================================

-- Add abeckman@location3.com to the whitelist
INSERT INTO whitelisted_emails (email, description) VALUES
  ('abeckman@location3.com', 'Approved individual user')
ON CONFLICT (email) DO UPDATE
  SET is_active = true,
      description = 'Approved individual user',
      updated_at = NOW();

-- Add andbeck7@yahoo.com to the whitelist
INSERT INTO whitelisted_emails (email, description) VALUES
  ('andbeck7@yahoo.com', 'Approved individual user')
ON CONFLICT (email) DO UPDATE
  SET is_active = true,
      description = 'Approved individual user',
      updated_at = NOW();

-- If the users already exist, whitelist them now
UPDATE profiles
SET is_whitelisted = true
WHERE LOWER(email) IN ('abeckman@location3.com', 'andbeck7@yahoo.com')
AND is_whitelisted = false;

