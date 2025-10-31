# Domain Whitelist Management Guide

This guide explains how to manage domain-based whitelisting for AI Grader Pro.

## Overview

Domain whitelisting allows you to automatically approve users based on their email domain. For example, if you add `yourcompany.com` to the whitelist, anyone who signs up with an `@yourcompany.com` email will automatically be granted access.

## Quick Commands

### View All Whitelisted Domains

```sql
SELECT domain, description, is_active, created_at
FROM whitelisted_domains
ORDER BY created_at DESC;
```

### Add a Domain

```sql
INSERT INTO whitelisted_domains (domain, description)
VALUES ('yourcompany.com', 'Company employees');
```

### Add Multiple Domains

```sql
INSERT INTO whitelisted_domains (domain, description) VALUES
  ('yourcompany.com', 'Main company domain'),
  ('contractor.com', 'Approved contractor'),
  ('agency.com', 'Partner agency');
```

### Deactivate a Domain (without deleting)

```sql
UPDATE whitelisted_domains
SET is_active = false
WHERE domain = 'contractor.com';
```

### Reactivate a Domain

```sql
UPDATE whitelisted_domains
SET is_active = true
WHERE domain = 'contractor.com';
```

### Remove a Domain Permanently

```sql
DELETE FROM whitelisted_domains
WHERE domain = 'contractor.com';
```

⚠️ **Note:** This doesn't remove existing users, only prevents new signups from that domain.

## Managing Existing Users

### Sync Existing Users After Adding Domain

If users signed up before you whitelisted their domain, run this to whitelist them retroactively:

```sql
SELECT * FROM sync_domain_whitelist();
```

This returns:
- `updated_count`: Number of users newly whitelisted
- `emails`: Array of emails that were whitelisted

### Check if a Specific Email Would Be Whitelisted

```sql
SELECT is_domain_whitelisted('user@example.com');
```

Returns `true` or `false`.

### View All Users from a Specific Domain

```sql
SELECT email, is_whitelisted, is_admin, created_at
FROM profiles
WHERE email LIKE '%@yourcompany.com'
ORDER BY created_at DESC;
```

### Whitelist All Users from a Domain Manually

If the trigger isn't working or for existing users:

```sql
UPDATE profiles
SET is_whitelisted = true
WHERE email LIKE '%@yourcompany.com'
AND is_whitelisted = false;
```

## Admin Management

### Make Someone an Admin

```sql
UPDATE profiles
SET is_admin = true
WHERE email = 'admin@yourcompany.com';
```

### Remove Admin Access

```sql
UPDATE profiles
SET is_admin = false
WHERE email = 'former-admin@yourcompany.com';
```

### View All Admins

```sql
SELECT email, is_whitelisted, created_at
FROM profiles
WHERE is_admin = true
ORDER BY created_at;
```

## User Management

### Manually Whitelist a Specific User

Even if their domain isn't whitelisted:

```sql
UPDATE profiles
SET is_whitelisted = true
WHERE email = 'special-user@external.com';
```

### Revoke Access from a User

```sql
UPDATE profiles
SET is_whitelisted = false
WHERE email = 'user@example.com';
```

⚠️ **Note:** User can't create new runs but can still see their existing data.

### Remove a User Completely

```sql
-- This will cascade delete all their runs, analyses, etc.
DELETE FROM profiles
WHERE email = 'user@example.com';
```

⚠️ **Warning:** This permanently deletes all user data!

## Bulk Operations

### Whitelist Multiple Specific Users

```sql
UPDATE profiles
SET is_whitelisted = true
WHERE email IN (
  'user1@example.com',
  'user2@example.com',
  'user3@example.com'
);
```

### Remove Access from Multiple Users

```sql
UPDATE profiles
SET is_whitelisted = false
WHERE email IN (
  'contractor1@temp.com',
  'contractor2@temp.com'
);
```

## Reporting & Analytics

### Count Users by Domain

```sql
SELECT
  SPLIT_PART(email, '@', 2) as domain,
  COUNT(*) as user_count,
  SUM(CASE WHEN is_whitelisted THEN 1 ELSE 0 END) as whitelisted_count,
  SUM(CASE WHEN is_admin THEN 1 ELSE 0 END) as admin_count
FROM profiles
GROUP BY domain
ORDER BY user_count DESC;
```

### View User Activity

```sql
SELECT
  p.email,
  p.is_whitelisted,
  COUNT(DISTINCT r.id) as total_runs,
  COUNT(DISTINCT a.id) as total_analyses,
  MAX(r.created_at) as last_activity
FROM profiles p
LEFT JOIN runs r ON r.user_id = p.id
LEFT JOIN analyses a ON a.run_id = r.id
GROUP BY p.id, p.email, p.is_whitelisted
ORDER BY last_activity DESC;
```

### Find Inactive Users

Users who signed up but never created a run:

```sql
SELECT
  email,
  is_whitelisted,
  created_at,
  NOW() - created_at as signed_up_ago
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM runs WHERE runs.user_id = profiles.id
)
ORDER BY created_at DESC;
```

## Best Practices

### 1. **Start with Your Main Domain**

```sql
-- First admin setup
INSERT INTO whitelisted_domains (domain, description)
VALUES ('yourcompany.com', 'Main company domain');

-- Make yourself admin
UPDATE profiles
SET is_admin = true, is_whitelisted = true
WHERE email = 'you@yourcompany.com';
```

### 2. **Add Contractor Domains Temporarily**

```sql
-- Add contractor
INSERT INTO whitelisted_domains (domain, description)
VALUES ('contractor.com', 'Project ABC - until Dec 2025');

-- Later: deactivate instead of deleting (keeps audit trail)
UPDATE whitelisted_domains
SET is_active = false
WHERE domain = 'contractor.com';
```

### 3. **Regular Audits**

Run monthly to check access:

```sql
-- View all active domains and user counts
SELECT
  wd.domain,
  wd.description,
  wd.is_active,
  COUNT(p.id) as user_count
FROM whitelisted_domains wd
LEFT JOIN profiles p ON SPLIT_PART(p.email, '@', 2) = wd.domain
GROUP BY wd.id, wd.domain, wd.description, wd.is_active
ORDER BY wd.is_active DESC, user_count DESC;
```

### 4. **Designate Multiple Admins**

Don't rely on a single admin:

```sql
-- Make 2-3 trusted users admins
UPDATE profiles
SET is_admin = true
WHERE email IN (
  'admin1@yourcompany.com',
  'admin2@yourcompany.com'
);
```

## Security Notes

🔒 **Important:**

1. **Domain Verification**: The system only checks email domain, not actual email ownership. Use trusted email providers.

2. **Admin Powers**: Admins can:
   - Add/remove domains
   - View all user data
   - Cannot: Impersonate users or see their passwords (none stored anyway)

3. **Revocation**: Deactivating a domain only prevents *new* signups. Existing users remain active until manually revoked.

4. **Service Role**: These SQL commands must be run in Supabase SQL Editor or with service role key. Regular users cannot manage domains via the UI.

## Troubleshooting

### User Can't Create Runs Despite Whitelisted Domain

Check their profile:

```sql
SELECT email, is_whitelisted, is_admin
FROM profiles
WHERE email = 'user@example.com';
```

If `is_whitelisted` is `false`, manually fix:

```sql
UPDATE profiles
SET is_whitelisted = true
WHERE email = 'user@example.com';
```

### Domain Trigger Not Working

The auto-whitelist trigger runs on INSERT only. For existing users, run:

```sql
SELECT * FROM sync_domain_whitelist();
```

### Want to Disable Domain Whitelist

To require manual approval for all users:

```sql
-- Deactivate all domains
UPDATE whitelisted_domains
SET is_active = false;

-- Or drop the trigger entirely
DROP TRIGGER IF EXISTS auto_whitelist_profile ON profiles;
```

To re-enable:

```sql
-- Reactivate domains
UPDATE whitelisted_domains
SET is_active = true;

-- Recreate trigger (from migration 002)
CREATE TRIGGER auto_whitelist_profile
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_whitelist_on_signup();
```
