# Supabase CLI Setup Guide

This guide will help you set up Supabase using the CLI instead of the web dashboard.

## Prerequisites

- Supabase CLI installed ✅ (you have v2.34.3)
- Supabase project created ✅ (https://tzxuncxyohkpgqlgewxa.supabase.co)

## Step 1: Get Your Access Token

1. **Open your browser and go to:**
   https://supabase.com/dashboard/account/tokens

2. **Generate a new access token:**
   - Click "Generate new token"
   - Give it a name like "CLI Access"
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

3. **Save the token securely** - you'll need it for the next step

## Step 2: Login to Supabase CLI

Run this command with your token:

```bash
supabase login --token YOUR_ACCESS_TOKEN_HERE
```

Or set it as an environment variable (recommended):

```bash
# Add to your ~/.zshrc or ~/.bashrc
export SUPABASE_ACCESS_TOKEN="your-token-here"

# Then reload your shell
source ~/.zshrc  # or source ~/.bashrc
```

## Step 3: Link Your Project

Once logged in, link to your cloud project:

```bash
supabase link --project-ref tzxuncxyohkpgqlgewxa
```

This will:
- Connect your local project to the cloud
- Create `.supabase/` directory with config
- Enable you to push migrations via CLI

## Step 4: Push Migrations

Now you can run your migrations via CLI instead of manually in the dashboard:

```bash
# Push all migrations to your cloud database
supabase db push
```

This will:
1. Run `001_initial_schema.sql` (if not already run)
2. Run `002_domain_whitelist.sql` (domain-based whitelist)
3. Show you what was executed

## Step 5: Verify Migrations

Check which migrations have been applied:

```bash
supabase migration list
```

## Step 6: Add Whitelisted Domain

Now add your domain via CLI:

```bash
# Connect to your database
supabase db reset --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.tzxuncxyohkpgqlgewxa.supabase.co:5432/postgres"

# Or use SQL directly
supabase db execute --project-ref tzxuncxyohkpgqlgewxa <<SQL
INSERT INTO whitelisted_domains (domain, description) VALUES
  ('yourcompany.com', 'Company domain');
SQL
```

**Alternative:** Use the database password from your project settings:

```bash
# Get your database password from:
# https://supabase.com/dashboard/project/tzxuncxyohkpgqlgewxa/settings/database

# Then run SQL:
psql "postgresql://postgres:[YOUR-DB-PASSWORD]@db.tzxuncxyohkpgqlgewxa.supabase.co:5432/postgres" <<SQL
INSERT INTO whitelisted_domains (domain, description) VALUES
  ('yourcompany.com', 'Company domain');

-- Make yourself admin
UPDATE profiles
SET is_admin = true
WHERE email = 'your-email@yourcompany.com';
SQL
```

## Quick Reference Commands

### Project Management

```bash
# Check project status
supabase status

# View project details
supabase projects list

# Get database URL
supabase db url
```

### Migration Management

```bash
# Create a new migration
supabase migration new migration_name

# Push all pending migrations
supabase db push

# List applied migrations
supabase migration list

# Pull remote schema changes (if edited via dashboard)
supabase db pull
```

### Database Operations

```bash
# Run SQL directly
supabase db execute --project-ref tzxuncxyohkpgqlgewxa <<SQL
SELECT * FROM whitelisted_domains;
SQL

# Dump remote database
supabase db dump --project-ref tzxuncxyohkpgqlgewxa

# Generate TypeScript types from database
supabase gen types typescript --project-ref tzxuncxyohkpgqlgewxa > lib/database.types.ts
```

## Common Tasks via CLI

### Add a Whitelisted Domain

```bash
supabase db execute --project-ref tzxuncxyohkpgqlgewxa <<SQL
INSERT INTO whitelisted_domains (domain, description) VALUES
  ('contractor.com', 'Approved contractor');
SQL
```

### Whitelist a User

```bash
supabase db execute --project-ref tzxuncxyohkpgqlgewxa <<SQL
UPDATE profiles
SET is_whitelisted = true
WHERE email = 'user@example.com';
SQL
```

### Sync Domain Whitelist

```bash
supabase db execute --project-ref tzxuncxyohkpgqlgewxa <<SQL
SELECT * FROM sync_domain_whitelist();
SQL
```

### View All Users

```bash
supabase db execute --project-ref tzxuncxyohkpgqlgewxa <<SQL
SELECT email, is_whitelisted, is_admin, created_at
FROM profiles
ORDER BY created_at DESC;
SQL
```

## Troubleshooting

### "Access token not provided"

Run `supabase login --token YOUR_TOKEN` or set `SUPABASE_ACCESS_TOKEN` environment variable.

### "Project not linked"

Run `supabase link --project-ref tzxuncxyohkpgqlgewxa`

### "Database connection failed"

Make sure your database password is correct. Get it from:
https://supabase.com/dashboard/project/tzxuncxyohkpgqlgewxa/settings/database

### Migrations already applied in dashboard

If you already ran migrations via the SQL Editor in the dashboard, the CLI will detect them and skip. You can verify with:

```bash
supabase migration list
```

## Using Dashboard vs CLI

You can use **both** interchangeably:

- **Dashboard SQL Editor**: Quick one-off queries, viewing data
- **CLI**: Version-controlled migrations, automation, scripting

Both methods work with the same database!

## Next Steps

After setup via CLI:

1. ✅ Migrations are applied
2. ✅ Domain whitelist is configured
3. ✅ You're set as admin
4. 🔄 Re-enable authentication in the app (revert the revert commit)
5. 🚀 Deploy to Vercel with environment variables

## Advanced: Generate TypeScript Types

For type-safe database queries:

```bash
# Generate types from your database schema
supabase gen types typescript --project-ref tzxuncxyohkpgqlgewxa > lib/supabase/database.types.ts

# Use in your code:
import { Database } from '@/lib/supabase/database.types';
```

This gives you full TypeScript autocomplete for your database!
