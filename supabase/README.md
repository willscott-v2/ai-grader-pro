# Supabase Setup

## Prerequisites
- A Supabase account (https://supabase.com)
- Supabase CLI (optional, for local development)

## Setup Steps

### 1. Create a New Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name**: `ai-grader-pro` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start

### 2. Run the Migration

1. In your Supabase project dashboard, go to the **SQL Editor**
2. Click "New Query"
3. Copy the contents of `migrations/001_initial_schema.sql`
4. Paste into the SQL Editor
5. Click "Run" or press Cmd/Ctrl + Enter

### 3. Configure Authentication

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Enable **Email** provider
3. Configure **Magic Link** settings:
   - Enable "Email Magic Link"
   - Set "Confirmation URL" to: `http://localhost:3000/auth/callback` (development)
   - For production, use: `https://your-domain.com/auth/callback`

### 4. Setup Access Control

Since this is an internal tool, you need to control who can access it.

**Option A: Domain-Based Whitelist (Recommended)**

Run migration `002_domain_whitelist.sql` to enable automatic approval by email domain:

1. Run the migration in SQL Editor
2. Add your domain(s):
```sql
INSERT INTO whitelisted_domains (domain, description) VALUES
  ('yourcompany.com', 'Company domain'),
  ('contractor.com', 'Approved contractor');
```
3. Make yourself admin:
```sql
UPDATE profiles
SET is_admin = true
WHERE email = 'your-email@yourcompany.com';
```
4. Sync existing users (if any):
```sql
SELECT * FROM sync_domain_whitelist();
```

**How it works:** Anyone who signs up with an email from a whitelisted domain is automatically approved. Perfect for company domains like `@yourcompany.com`.

📖 **See:** `DOMAIN_MANAGEMENT.md` for complete domain management guide.

**Option B: Manual User Whitelist**

If you prefer to approve users individually:

```sql
-- Whitelist specific users
UPDATE profiles
SET is_whitelisted = true, is_admin = true
WHERE email = 'your-email@example.com';

-- Or multiple users
UPDATE profiles
SET is_whitelisted = true
WHERE email IN (
  'user1@example.com',
  'user2@example.com'
);
```

### 5. Get Your API Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy these values for your `.env.local`:
   - **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role**: `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### 6. Setup Storage Bucket (Should be automatic)

The migration creates a `reports` bucket automatically. Verify in:
- Supabase dashboard > **Storage**
- You should see a bucket named `reports`
- It should have RLS policies enabled

### 7. Test the Connection

Run the Next.js app and try to:
1. Sign in with magic link
2. Check if your profile appears in the database
3. Whitelist yourself (step 4 above)
4. Create a test run

## Database Schema Overview

### Tables

**profiles**
- User management with whitelist
- Links to `auth.users`
- Fields: `is_whitelisted`, `is_admin`

**runs**
- Analysis batch/session
- Tracks overall progress
- Auto-calculates statistics via triggers

**analyses**
- Individual URL + keyword analysis
- Stores all results in JSONB
- Related to a `run`

**analysis_progress**
- Real-time progress updates
- For SSE streaming to frontend

### Row Level Security (RLS)

All tables have RLS enabled:
- Users can only see their own data
- Admins can see all profiles
- Background jobs use service role key (bypasses RLS)

## Local Development with Supabase CLI (Optional)

If you want to run Supabase locally:

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Initialize project
supabase init

# Start local Supabase
supabase start

# Run migrations
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > lib/database.types.ts
```

## Troubleshooting

### Magic Links Not Working
- Check email provider settings in Authentication
- Verify confirmation URL is correct
- Check spam folder
- For development, use `http://localhost:3000/auth/callback`

### RLS Policy Errors
- Make sure user is signed in (`auth.uid()` exists)
- Check if user is whitelisted in profiles table
- Background jobs should use `SUPABASE_SERVICE_ROLE_KEY`

### Migration Errors
- Make sure UUID extension is enabled
- Run migrations in order
- Check for existing tables/conflicts

## Security Notes

1. **Never commit** `SUPABASE_SERVICE_ROLE_KEY` to git
2. Keep whitelist tight - only trusted internal users
3. RLS policies protect all user data
4. Magic links expire after use
5. Storage bucket is private (not public)
