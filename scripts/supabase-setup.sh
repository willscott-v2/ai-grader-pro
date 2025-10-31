#!/bin/bash

# Supabase CLI Setup Script
# This script helps you set up Supabase via CLI

set -e  # Exit on error

echo "🚀 Supabase CLI Setup for AI Grader Pro"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project details
PROJECT_REF="tzxuncxyohkpgqlgewxa"
PROJECT_URL="https://tzxuncxyohkpgqlgewxa.supabase.co"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found ($(supabase --version))${NC}"
echo ""

# Check if already linked
if [ -d ".supabase" ]; then
    echo -e "${YELLOW}ℹ Project appears to be already linked${NC}"
    read -p "Do you want to re-link? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping link step..."
    else
        rm -rf .supabase
    fi
fi

# Check for access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${YELLOW}⚠ SUPABASE_ACCESS_TOKEN not found in environment${NC}"
    echo ""
    echo "Please get your access token:"
    echo "1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "2. Click 'Generate new token'"
    echo "3. Copy the token"
    echo ""
    read -p "Enter your Supabase access token: " TOKEN

    if [ -z "$TOKEN" ]; then
        echo -e "${RED}❌ No token provided${NC}"
        exit 1
    fi

    export SUPABASE_ACCESS_TOKEN="$TOKEN"

    # Offer to save to shell config
    echo ""
    read -p "Save token to ~/.zshrc for future use? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "export SUPABASE_ACCESS_TOKEN=\"$TOKEN\"" >> ~/.zshrc
        echo -e "${GREEN}✓ Token saved to ~/.zshrc${NC}"
        echo "Run 'source ~/.zshrc' to load it"
    fi
else
    echo -e "${GREEN}✓ Access token found in environment${NC}"
fi

echo ""
echo "Linking to project: $PROJECT_URL"
echo ""

# Link project
if supabase link --project-ref "$PROJECT_REF"; then
    echo -e "${GREEN}✓ Project linked successfully${NC}"
else
    echo -e "${RED}❌ Failed to link project${NC}"
    exit 1
fi

echo ""
echo "Checking migration status..."
echo ""

# Check migration status
supabase migration list || true

echo ""
echo -e "${YELLOW}Ready to push migrations?${NC}"
echo "This will run:"
echo "  - 001_initial_schema.sql (profiles, runs, analyses, etc.)"
echo "  - 002_domain_whitelist.sql (domain-based whitelist)"
echo ""
read -p "Push migrations now? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Pushing migrations..."

    if supabase db push; then
        echo -e "${GREEN}✓ Migrations applied successfully${NC}"
    else
        echo -e "${RED}❌ Migration failed${NC}"
        echo "You can also run migrations manually via the dashboard SQL Editor"
        exit 1
    fi
else
    echo "Skipping migration push"
    echo "You can run them later with: supabase db push"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Add your domain to whitelist:"
echo "   supabase db execute --project-ref $PROJECT_REF <<SQL"
echo "   INSERT INTO whitelisted_domains (domain, description)"
echo "   VALUES ('yourcompany.com', 'Company domain');"
echo "   SQL"
echo ""
echo "2. Make yourself admin:"
echo "   supabase db execute --project-ref $PROJECT_REF <<SQL"
echo "   UPDATE profiles SET is_admin = true"
echo "   WHERE email = 'your-email@yourcompany.com';"
echo "   SQL"
echo ""
echo "3. Update .env.local with Supabase credentials"
echo ""
echo "4. Re-enable authentication in your app"
echo ""
echo "📖 See CLI_SETUP.md for more details"
echo ""
