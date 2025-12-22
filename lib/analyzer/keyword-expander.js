import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { costTracker } from './cost-tracker.js';

const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

/**
 * Check if keyword already contains location information
 * @param {string} keyword
 * @returns {boolean}
 */
function keywordHasLocation(keyword) {
  const locationPatterns = [
    // US states (full names and abbreviations)
    /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new\s+hampshire|new\s+jersey|new\s+mexico|new\s+york|north\s+carolina|north\s+dakota|ohio|oklahoma|oregon|pennsylvania|rhode\s+island|south\s+carolina|south\s+dakota|tennessee|texas|utah|vermont|virginia|washington|west\s+virginia|wisconsin|wyoming)\b/i,
    /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/,
    // Regions
    /\b(midwest|southern|northern|eastern|western|northeast|northwest|southeast|southwest|new\s+england|pacific\s+northwest|bay\s+area)\b/i,
    // County/city indicators
    /\b(county|city|area|region|metro)\b/i,
  ];

  return locationPatterns.some(pattern => pattern.test(keyword));
}

/**
 * Detect audience type from entity analysis results
 * @param {Object} entities - Entity analysis results
 * @returns {Object} - {audienceType, organizationType, signals}
 */
export function detectAudienceType(entities) {
  const signals = [];
  let audienceType = 'general';
  let organizationType = null;

  // Check JSON-LD schema types for organization signals
  const jsonLdTypes = entities?.jsonLdTypes || [];
  const educationalTypes = ['EducationalOrganization', 'CollegeOrUniversity', 'University', 'School', 'HighSchool', 'MiddleSchool', 'ElementarySchool'];
  const healthcareTypes = ['MedicalOrganization', 'Hospital', 'Physician', 'MedicalClinic', 'Dentist'];
  const businessTypes = ['Corporation', 'Organization', 'LocalBusiness', 'Store'];

  if (jsonLdTypes.some(t => educationalTypes.includes(t))) {
    audienceType = 'student';
    organizationType = 'educational';
    signals.push('Educational schema detected');
  } else if (jsonLdTypes.some(t => healthcareTypes.includes(t))) {
    audienceType = 'consumer';
    organizationType = 'healthcare';
    signals.push('Healthcare schema detected');
  } else if (jsonLdTypes.some(t => businessTypes.includes(t))) {
    organizationType = 'business';
  }

  // Check program entities for educational signals
  const programEntities = entities?.programEntities || [];
  const hasDegreeCertificate = programEntities.some(p =>
    ['degree', 'certificate', 'course', 'program'].includes(p.type?.toLowerCase())
  );
  if (hasDegreeCertificate) {
    audienceType = 'student';
    signals.push('Degree/certificate programs detected');
  }

  // Check topics for B2B signals
  const topics = entities?.topics || [];
  const b2bTopics = ['enterprise', 'api', 'integration', 'saas', 'b2b', 'business solutions', 'platform'];
  const hasB2BTopics = topics.some(t =>
    b2bTopics.some(b2b => t.topic?.toLowerCase().includes(b2b))
  );
  if (hasB2BTopics && audienceType === 'general') {
    audienceType = 'b2b';
    signals.push('B2B topics detected');
  }

  // Check page title for educational signals
  const pageTitle = entities?.pageData?.title || '';
  const educationalKeywords = ['university', 'college', 'school', 'academy', 'program', 'degree', 'certificate', 'graduate', 'undergraduate', 'masters', 'phd', 'doctoral', 'enrollment', 'admission'];
  if (educationalKeywords.some(kw => pageTitle.toLowerCase().includes(kw))) {
    if (audienceType === 'general') {
      audienceType = 'student';
      signals.push('Educational keywords in title');
    }
  }

  return { audienceType, organizationType, signals };
}

/**
 * Expands a simple keyword into AI-ready search prompts
 * @param {string} keyword - The base keyword (e.g., "online MBA")
 * @param {number} count - Number of variations to generate
 * @param {Object} location - Optional location data {city, state, region}
 * @param {Object} context - Optional context {audienceType, pageTitle, organizationType}
 * @returns {Promise<Array<{prompt: string, intent: string, type: string}>>}
 */
export async function expandKeyword(keyword, count = 5, location = null, context = null) {
  // Determine if we should add location context
  const hasLocation = keywordHasLocation(keyword);
  const shouldAddLocation = !hasLocation && location && (location.city || location.state);

  let locationContext = '';
  if (shouldAddLocation) {
    locationContext = `\nBusiness Location: ${location.city ? location.city + ', ' : ''}${location.state || ''}${location.region ? ' (' + location.region + ')' : ''}`;
  }

  // Build audience-specific context
  let audienceContext = '';
  const audienceType = context?.audienceType || 'general';

  if (audienceType === 'student') {
    audienceContext = `
AUDIENCE CONTEXT: This is an EDUCATIONAL program targeting prospective students.
Generate questions a prospective student would ask when researching educational programs.
Use student-focused language like:
- tuition, financial aid, scholarships (NOT "cost covered by insurance")
- enrollment, admission requirements, application deadlines
- curriculum, courses, program structure
- career outcomes, job placement, alumni success
- accreditation, rankings, program reputation
- online vs in-person, flexible scheduling
- faculty expertise, research opportunities`;
  } else if (audienceType === 'b2b') {
    audienceContext = `
AUDIENCE CONTEXT: This is a B2B product/service targeting business decision-makers.
Generate questions a business buyer would ask when evaluating solutions.
Use business-focused language like:
- pricing, enterprise plans, volume discounts
- integration, API, compatibility
- implementation, onboarding, support
- ROI, case studies, customer success
- security, compliance, data privacy
- scalability, performance, reliability`;
  } else if (audienceType === 'consumer' && context?.organizationType === 'healthcare') {
    audienceContext = `
AUDIENCE CONTEXT: This is a HEALTHCARE service targeting patients/consumers.
Generate questions a patient would ask when seeking healthcare services.
Use patient-focused language like:
- cost, insurance coverage, payment plans
- treatment process, what to expect
- qualifications, credentials, experience
- outcomes, success rates, patient reviews
- appointments, availability, locations`;
  }

  const prompt = `You are an expert in search intent and SEO marketing.

Given this keyword: "${keyword}"${locationContext}
${audienceContext}

Generate ${count} natural question variations that users would ask AI search engines (ChatGPT, Perplexity, Google AI Overviews, etc.).

IMPORTANT: It is currently late 2025. If you include a year in questions, use 2025 or 2026, NOT 2024.

${shouldAddLocation ? `LOCATION CONTEXT: Since the keyword doesn't include location but the business is located in ${location.city || location.state}, generate a mix of prompts:
- Some should include city-level location ("${keyword} in ${location.city}")
- Some should include state-level location ("${keyword} in ${location.state}" or "${location.state} ${keyword}")
- Some should reference the region if relevant ("${location.region || ''} ${keyword}")
- Keep most prompts generic without location for broader reach

Balance between 40% location-specific and 60% generic prompts.` : 'Generate generic prompts without adding location context.'}

For each question, classify the search intent as one of:
- informational: seeking information or learning
- navigational: looking for a specific business or website
- comparison: comparing options
- transactional: ready to purchase or take action

Also classify the question type:
- what: general information questions
- how: process or mechanism questions
- best: seeking recommendations
- cost: pricing questions
- worth: value/ROI questions
- comparison: comparing programs

Return ONLY a valid JSON array with this exact structure:
[
  {
    "prompt": "the full question here",
    "intent": "informational|navigational|comparison|transactional",
    "type": "what|how|best|cost|worth|comparison"
  }
]

Make the questions diverse and natural. Focus on questions that would trigger AI Overviews or detailed AI responses.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    // Track API cost
    costTracker.trackAnthropic(message.usage);

    const response = message.content[0].text;

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Claude response');
    }

    const expansions = JSON.parse(jsonMatch[0]);

    console.log(`✓ Expanded "${keyword}" into ${expansions.length} prompts`);

    return expansions;
  } catch (error) {
    console.error(`Error expanding keyword "${keyword}":`, error.message);

    // Fallback: generate basic variations
    return [
      { prompt: `What is ${keyword}?`, intent: 'informational', type: 'what' },
      { prompt: `How much does ${keyword} cost?`, intent: 'informational', type: 'cost' },
      { prompt: `What are the best ${keyword} programs?`, intent: 'comparison', type: 'best' },
      { prompt: `Is ${keyword} worth it?`, intent: 'informational', type: 'worth' },
      { prompt: `How do I choose ${keyword}?`, intent: 'comparison', type: 'how' },
    ];
  }
}

/**
 * Batch expand multiple keywords
 * @param {Array<string>} keywords
 * @returns {Promise<Object>} Map of keyword -> expansions
 */
export async function expandKeywordsBatch(keywords) {
  const results = {};

  for (const keyword of keywords) {
    if (!keyword || keyword.trim() === '') continue;

    results[keyword] = await expandKeyword(keyword);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}
