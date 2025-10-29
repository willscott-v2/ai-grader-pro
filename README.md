# AI Grader Pro

A web-based SEO analysis tool for evaluating higher education websites' visibility in AI search engines (Google AI Overviews, Perplexity, ChatGPT). Built with Next.js 14, Supabase, and TypeScript.

## Overview

AI Grader Pro analyzes how well your webpages perform in AI-powered search results by:

- **Keyword Expansion**: Generates natural AI search prompts from base keywords
- **AI Visibility Checking**: Tests presence in Google AI Overviews, Perplexity, and ChatGPT
- **Schema Analysis**: Evaluates structured data completeness and AI-friendliness
- **Entity Discovery**: Extracts E-E-A-T signals, topics, and location data
- **Report Generation**: Creates comprehensive report cards with actionable recommendations

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Vercel Cron
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (Magic Links)
- **AI Services**: Claude (Anthropic), GPT-4 (OpenAI), Perplexity AI
- **SERP Data**: SerpAPI or DataForSEO
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

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Supabase

Follow the detailed instructions in [`supabase/README.md`](./supabase/README.md):

1. Create a new Supabase project
2. Run the migration (`supabase/migrations/001_initial_schema.sql`)
3. Configure authentication (enable Magic Links)
4. Get your API credentials

### 3. Configure Environment

Copy the example file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `PERPLEXITY_API_KEY`
- `SERPAPI_API_KEY`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. First User Setup

1. Sign up with your email at `/auth/login`
2. Check your email for magic link
3. In Supabase dashboard, go to Table Editor > profiles
4. Find your user and set:
   - `is_whitelisted` = `true`
   - `is_admin` = `true`

## Current Status

**Phase 1 Complete:**
- Next.js project initialized with TypeScript and Tailwind
- Core dependencies installed
- Supabase schema designed and documented
- Environment configuration setup
- Basic file structure created
- TypeScript types defined
- Supabase client utilities created
- Auth middleware configured

**Next Steps:**
1. Create authentication UI (login page, callback handler)
2. Build dashboard layout and navigation
3. Implement "Create Run" form
4. Build API routes for runs and analyses
5. Create background queue processor
6. Add real-time progress with SSE
7. Build report viewer components

## Development

See the project structure above for organization. Key files:

- `lib/types.ts` - All TypeScript interfaces
- `lib/supabase/client.ts` - Browser client
- `lib/supabase/server.ts` - Server client (includes service role)
- `middleware.ts` - Auth and route protection
- `supabase/migrations/` - Database schema

## Documentation

- [Supabase Setup Guide](./supabase/README.md)
- [Environment Variables](./.env.local.example)

## License

Proprietary - Internal use only
