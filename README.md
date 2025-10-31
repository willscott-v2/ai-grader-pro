# AI Grader Pro

A web-based SEO analysis tool for evaluating higher education websites' visibility in AI search engines (Google AI Overviews, Perplexity, ChatGPT). Built with Next.js 15, Supabase, and TypeScript.

## Overview

AI Grader Pro analyzes how well your webpages perform in AI-powered search results by:

- **Keyword Expansion**: Generates natural AI search prompts from base keywords using Claude
- **AI Visibility Checking**: Tests presence in Google AI Overviews, Perplexity, and ChatGPT
- **Schema Analysis**: Evaluates structured data completeness and AI-friendliness with Puppeteer
- **Entity Discovery**: Extracts E-E-A-T signals, topics, and location data
- **Report Generation**: Creates comprehensive markdown report cards with actionable recommendations
- **Cost Tracking**: Monitors API usage and costs across all AI services

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API Routes with Server-Sent Events (SSE)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (Magic Links with domain-based whitelist)
- **AI Services**: Claude 3.5 Sonnet (Anthropic), GPT-4 (OpenAI), Perplexity AI
- **Schema Detection**: Puppeteer with @sparticuz/chromium (serverless)
- **Web Scraping**: Firecrawl API (optional, for JavaScript-rendered pages)
- **SERP Data**: SerpAPI or DataForSEO (optional, for Google AI Overview checks)
- **Hosting**: Vercel

## Project Structure

```
ai-grader-pro/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth pages (login, callback)
│   ├── (dashboard)/         # Protected dashboard pages
│   └── api/                 # API routes
├── components/              # React components
├── lib/                     # Core logic
│   ├── analyzer/           # Analysis modules (from CLI tool)
│   ├── supabase/           # Supabase clients
│   └── types.ts            # TypeScript types
├── supabase/                # Database
│   ├── migrations/         # SQL migrations
│   └── README.md           # Setup instructions
├── .env.local.example       # Environment template
└── middleware.ts            # Auth middleware
```

## Quick Start

### 1. Prerequisites

**Required Services:**
- [Supabase](https://supabase.com) account (free tier works)
- [Anthropic API](https://console.anthropic.com/) key (Claude 3.5 Sonnet)

**Recommended Services:**
- [OpenAI API](https://platform.openai.com/api-keys) key (for ChatGPT visibility checks)
- [Perplexity API](https://www.perplexity.ai/settings/api) key (for Perplexity visibility checks)

**Optional Services:**
- [Firecrawl API](https://www.firecrawl.dev/) (for JavaScript-heavy sites)
- [SerpAPI](https://serpapi.com/) or [DataForSEO](https://dataforseo.com/) (for Google AI Overview checks)

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Supabase

**Detailed instructions:** [`supabase/README.md`](./supabase/README.md)

**Quick setup:**

1. Create a new Supabase project at https://supabase.com/dashboard
2. In the SQL Editor, run these migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_domain_whitelist.sql`
3. Add your domain to the whitelist:
   ```sql
   INSERT INTO whitelisted_domains (domain, description)
   VALUES ('yourdomain.com', 'Company domain');
   ```
4. Configure authentication:
   - Go to Authentication > Providers
   - Enable Email provider with Magic Links
   - Set Site URL to your domain (or `http://localhost:3000` for dev)
   - Add redirect URLs: `https://yourdomain.com/auth/callback`
5. Get API credentials from Settings > API

### 4. Configure Environment Variables

Copy the example file and add your API keys:

```bash
cp .env.example .env.local
```

**Required variables:**
```bash
# Supabase (from Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic (required for keyword expansion and analysis)
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Optional but recommended:**
```bash
# OpenAI (for ChatGPT visibility checks)
OPENAI_API_KEY=sk-proj-your-key-here

# Perplexity (for Perplexity visibility checks)
PERPLEXITY_API_KEY=pplx-your-key-here

# Firecrawl (for JavaScript-rendered pages)
FIRECRAWL_API_KEY=fc-your-key-here

# SerpAPI or DataForSEO (for Google AI Overview checks)
SERPAPI_API_KEY=your-serpapi-key
# OR
DATAFORSEO_LOGIN=your-login
DATAFORSEO_PASSWORD=your-password
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. First User Setup

1. Go to `/auth/login` and enter your email
2. Check your email for the magic link
3. After logging in, make yourself an admin in Supabase:
   ```sql
   UPDATE profiles
   SET is_admin = true
   WHERE email = 'your-email@yourdomain.com';
   ```
   (Users from whitelisted domains are automatically approved)

## Features

### Authentication & Access Control
- Magic link authentication via Supabase Auth
- Domain-based whitelist (auto-approve users from specific domains)
- Row Level Security (RLS) on all database tables
- Admin panel for user management

### Analysis Capabilities
- **Schema Detection**: Uses Puppeteer to extract JSON-LD structured data (works with GTM-injected schemas)
- **Entity Discovery**: Extracts organizations, locations, topics, and E-E-A-T signals
- **AI Visibility**: Tests presence in Google AI Overviews, Perplexity, and ChatGPT
- **Keyword Expansion**: Generates natural search variations from base keywords
- **Cost Tracking**: Monitors API usage across all services (Anthropic, OpenAI, Perplexity, etc.)

### Real-time Progress
- Server-Sent Events (SSE) for live progress updates
- Detailed step-by-step logging during analysis
- Error handling and recovery

### Reporting
- Comprehensive markdown reports with:
  - Schema analysis and recommendations
  - Entity discovery results
  - AI visibility scores
  - Downloadable markdown files

## Development

### Key Files & Directories

**Core Analysis Logic** (from CLI tool):
- `lib/analyzer/` - All analysis modules
  - `puppeteer-schema-detector.js` - Schema extraction with Puppeteer
  - `entity-discovery.js` - Entity and E-E-A-T extraction
  - `keyword-expander.js` - Keyword variation generation
  - `ai-visibility-checker.js` - AI search presence testing
  - `markdown-reporter.js` - Report generation

**Application Code**:
- `app/` - Next.js pages and API routes
  - `app/api/analyze/route.ts` - Main analysis endpoint (SSE)
  - `app/api/analyze/download/route.ts` - Report download
  - `app/auth/` - Authentication pages
  - `app/page.tsx` - Homepage with analysis form
- `components/` - React components
  - `components/AnalysisForm.tsx` - URL/keyword input
  - `components/ProgressDisplay.tsx` - Real-time progress viewer
  - `components/ui/UserMenu.tsx` - Auth menu
- `lib/supabase/` - Database clients
  - `client.ts` - Browser client
  - `server.ts` - Server client with service role
- `middleware.ts` - Route protection and session refresh
- `supabase/migrations/` - Database schema

### Building for Production

**Vercel Deployment:**

The project is configured for Vercel with:
- Serverless function configuration in `vercel.json` (300s timeout, 3GB memory)
- Puppeteer serverless support via `@sparticuz/chromium`
- Automatic environment variable sync

```bash
# Deploy to Vercel
vercel --prod

# Add environment variables
vercel env add ANTHROPIC_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
# ... etc
```

**Important:** Make sure to update the Supabase redirect URL to your production domain in the Supabase dashboard (Authentication > URL Configuration).

## Documentation

- [Supabase Setup Guide](./supabase/README.md) - Complete database setup
- [Environment Variables](./.env.example) - All API keys and configuration
- [ROADMAP.md](./ROADMAP.md) - Feature roadmap and future plans

## License

Proprietary - Internal use only
