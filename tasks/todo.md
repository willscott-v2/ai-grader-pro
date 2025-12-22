# Task: Make Prompt Generation Context-Aware

## Problem
The keyword expander generates prompts as if the user is a consumer looking for services (e.g., "What's the cost and is it covered by insurance?") when it should recognize educational contexts and generate student-focused prompts (e.g., "What's the tuition and are scholarships available?").

## Root Cause
- `expandKeyword()` only receives: keyword, count, location
- But rich context is already available from entity analysis:
  - `programEntities` (degree, certificate, course types)
  - `jsonLdTypes` (e.g., EducationalOrganization, CollegeOrUniversity)
  - `topics` with relevance info
  - `pageData` with organization name and title

## Solution
Pass additional context to `expandKeyword()` so Claude can generate appropriate prompts based on the audience type.

---

## Todo List

- [x] **1. Add context parameter to `expandKeyword()` function**
  - Add optional `context` parameter with: `audienceType`, `pageTitle`, `organizationType`
  - File: `lib/analyzer/keyword-expander.js`

- [x] **2. Detect audience type from entity analysis**
  - Look for signals like: EducationalOrganization schema, degree/certificate programs, etc.
  - Define audience types: `student`, `consumer`, `b2b`, `general`
  - File: `lib/analyzer/keyword-expander.js` (added `detectAudienceType()` function)

- [x] **3. Update prompt generation to use context**
  - Modify Claude's system prompt to adapt language based on audience type
  - Student: tuition, financial aid, enrollment, curriculum, career outcomes
  - Consumer: cost, insurance, treatment, services
  - B2B: pricing, contracts, integration, enterprise features
  - File: `lib/analyzer/keyword-expander.js`

- [x] **4. Update callers to pass context**
  - Update `lib/analyzer/index.js` (CLI)
  - Update `app/api/analyze/route.ts` (web API)

- [x] **5. Test and deploy to Git/Vercel**
  - Build successful
  - Deploying...

---

## Review

### Changes Made

1. **lib/analyzer/keyword-expander.js**
   - Added `detectAudienceType(entities)` function that analyzes:
     - JSON-LD schema types (EducationalOrganization, MedicalOrganization, etc.)
     - Program entities (degree, certificate, course)
     - Topics (B2B indicators like enterprise, API, integration)
     - Page title keywords (university, college, graduate, etc.)
   - Returns `{ audienceType, organizationType, signals }`
   - Added 4th parameter `context` to `expandKeyword()`
   - Added audience-specific prompt instructions for:
     - **Student**: tuition, financial aid, enrollment, curriculum, career outcomes
     - **B2B**: pricing, enterprise plans, integration, ROI
     - **Healthcare consumer**: cost, insurance, treatment, outcomes

2. **lib/analyzer/index.js** (CLI)
   - Import `detectAudienceType` from keyword-expander
   - Call `detectAudienceType()` after entity analysis
   - Pass context to `expandKeyword()`
   - Log detected audience type

3. **app/api/analyze/route.ts** (Web API)
   - Import `detectAudienceType` from keyword-expander
   - Call `detectAudienceType()` after entity analysis
   - Pass context to `expandKeyword()`
   - Log detected audience type

### Files Modified
- `lib/analyzer/keyword-expander.js`
- `lib/analyzer/index.js`
- `app/api/analyze/route.ts`

### Expected Behavior
For a URL like `onlinepim.pharmacy.ufl.edu` (educational program):
- **Before**: "What's the cost and is it covered by insurance?"
- **After**: "What's the tuition and are scholarships available?"

The system will detect educational signals from:
- Schema types (EducationalOrganization, CollegeOrUniversity)
- Program entities (degree, certificate)
- Title keywords (university, program, graduate)
