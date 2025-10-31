# Supabase Setup for AI Grader Pro

## Quick Start Guide

Since Docker is not available for local development, we'll set up Supabase in the cloud.

### Step 1: Create a Supabase Project

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in or create an account

2. **Create New Project**
   - Click "New Project"
   - **Organization**: Select or create one
   - **Name**: `ai-grader-pro` (or your preference)
   - **Database Password**: Generate and **save this securely**
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Plan**: Free tier works great to start
   - Click "Create new project"

   ⏱️ Wait 2-3 minutes for project to initialize

### Step 2: Run the Database Migration

1. **Open SQL Editor**
   - In your project dashboard, click **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Run Migration**
   - Open the file: `supabase/migrations/001_initial_schema.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run** (or press `Cmd/Ctrl + Enter`)

   ✅ You should see: "Success. No rows returned"

### Step 3: Configure Authentication

1. **Enable Email Authentication**
   - Go to **Authentication** > **Providers** (left sidebar)
   - Find **Email** in the list
   - Toggle it **ON** if not already enabled

2. **Configure Email Settings**
   - Scroll down to **Email Auth**
   - Enable **"Enable Email Confirmations"** = OFF (for magic links)
   - **"Enable Email Signup"** = ON
   - **"Enable Email Magic Link"** = ON
   - **"Secure Email Change"** = ON (recommended)

3. **Set Redirect URLs**
   - Go to **Authentication** > **URL Configuration**
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add these URLs (one per line):
     ```
     http://localhost:3000/auth/callback
     https://your-production-domain.vercel.app/auth/callback
     ```
   - Click **Save**

### Step 4: Get Your API Keys

1. **Navigate to Settings**
   - Click **Settings** (gear icon) > **API**

2. **Copy These Values**

   You'll need these for your `.env.local` file:

   - **Project URL**:
     - Example: `https://abcdefghijk.supabase.co`
     - Environment variable: `NEXT_PUBLIC_SUPABASE_URL`

   - **anon public key**:
     - Long string starting with `eyJ...`
     - Environment variable: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   - **service_role key**:
     - ⚠️ **Secret** - never commit to git!
     - Long string starting with `eyJ...`
     - Environment variable: `SUPABASE_SERVICE_ROLE_KEY`

### Step 5: Update Environment Variables

1. **Create/Update `.env.local`**

   In your project root, create or update `.env.local`:

   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

   # Existing API Keys (keep these)
   ANTHROPIC_API_KEY=your-existing-key
   OPENAI_API_KEY=your-existing-key
   FIRECRAWL_API_KEY=your-existing-key
   PERPLEXITY_API_KEY=your-existing-key
   ```

2. **Update Vercel Environment Variables** (for production)
   - Go to Vercel Dashboard > Your Project > Settings > Environment Variables
   - Add the same three Supabase variables
   - Click **Save**

### Step 6: Test Authentication

1. **Restart Your Dev Server**
   ```bash
   # If running, stop it
   # Then start fresh
   npm run dev
   ```

2. **Test Magic Link Login**
   - Visit: http://localhost:3000
   - Click **Sign in**
   - Enter your email
   - Click **Send magic link**
   - Check your email inbox (and spam folder)
   - Click the magic link
   - You should be redirected to the dashboard

### Step 7: Setup Domain-Based Whitelist (Recommended)

The system supports **domain-based whitelisting** for easy team access management.

#### Option A: Domain Whitelist (Recommended)

1. **Run the Domain Whitelist Migration**
   - Go to **SQL Editor** > **New Query**
   - Copy contents of `supabase/migrations/002_domain_whitelist.sql`
   - Paste and click **Run**

2. **Whitelist Your Domain(s)**
   - Go to **SQL Editor**
   - Run this query (replace with your domain):
   ```sql
   INSERT INTO whitelisted_domains (domain, description) VALUES
     ('yourcompany.com', 'Company domain'),
     ('contractor.com', 'Contractor domain - optional');
   ```

3. **Make Yourself Admin**
   - Still in **SQL Editor**, run:
   ```sql
   UPDATE profiles
   SET is_admin = true
   WHERE email = 'your-email@yourcompany.com';
   ```

4. **Sync Existing Users** (if any signed up before)
   ```sql
   SELECT * FROM sync_domain_whitelist();
   ```

**How it works:**
- Any user who signs up with an email from a whitelisted domain is automatically whitelisted
- No need to manually approve each user
- Perfect for company domains (e.g., `@yourcompany.com`)

#### Option B: Individual Email Whitelist

If you prefer to whitelist individual users instead:

1. **Via Supabase Dashboard**
   - Go to **Table Editor** > **profiles**
   - Find the user's email
   - Set `is_whitelisted` to `true`
   - Set `is_admin` to `true` (for admins only)
   - Click **Save**

2. **Via SQL**
   ```sql
   UPDATE profiles
   SET is_whitelisted = true, is_admin = true
   WHERE email = 'user@example.com';
   ```

### Step 8: Verify Setup

✅ **Checklist:**
- [ ] Supabase project created
- [ ] Database migration ran successfully
- [ ] Email authentication enabled
- [ ] Redirect URLs configured
- [ ] Environment variables set (local & Vercel)
- [ ] Can sign in with magic link
- [ ] User is whitelisted in profiles table
- [ ] Can access protected routes

## Database Schema

The migrations create these tables:

**profiles**
- User management with individual whitelist
- Fields: `id`, `email`, `full_name`, `is_whitelisted`, `is_admin`
- Auto-whitelisted if email domain is in `whitelisted_domains`

**whitelisted_domains** (Migration 002)
- Domain-based whitelist for automatic user approval
- Fields: `id`, `domain`, `description`, `is_active`
- Example: Add `yourcompany.com` to auto-approve all `@yourcompany.com` emails

**runs**
- Analysis batch/session
- Tracks multiple URL analyses together
- Auto-calculates statistics

**analyses**
- Individual URL + keyword analysis results
- Stores full JSON results
- Linked to a `run`

**analysis_progress**
- Real-time progress updates
- For streaming progress to frontend

**Storage Bucket: `reports`**
- Stores generated markdown reports
- Private access (RLS protected)

## Troubleshooting

### Magic Links Not Arriving
- Check spam/promotions folder
- Verify email provider is configured in **Authentication** > **Email Templates**
- Check **Logs** in Supabase dashboard for errors

### "User not whitelisted" Error
- Make sure you ran Step 7 to whitelist your user
- Check the `profiles` table to verify `is_whitelisted = true`

### Environment Variables Not Loading
- Restart your dev server after changing `.env.local`
- Make sure `.env.local` is in your `.gitignore`
- For Vercel, redeploy after adding variables

### Migration Errors
- Make sure UUID extension is enabled (first line of migration)
- Check for existing tables that might conflict
- Review error message in SQL Editor

## Next Steps

Once Supabase is set up, you can:
1. Re-enable authentication by reverting the revert commit
2. Add more whitelisted users
3. Configure custom email templates
4. Set up database backups
5. Monitor usage in Supabase dashboard

## Security Notes

🔒 **Important:**
- Never commit `.env.local` to git (it's in `.gitignore`)
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- Only whitelist trusted users
- RLS policies protect all user data
- Magic links expire after use
