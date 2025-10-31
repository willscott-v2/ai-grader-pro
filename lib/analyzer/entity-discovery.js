import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { config } from './config.js';
import { analyzeSchemas } from './schema-analyzer.js';
import { costTracker } from './cost-tracker.js';
import { extractSchemasWithPuppeteer } from './puppeteer-schema-detector.js';

const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

/**
 * Parse HTML and extract organization data, schemas, and content
 * @param {string} html - Raw HTML content
 * @param {string} url - Page URL
 * @returns {Object} Parsed page data
 */
function parseHtml(html, url) {
  const $ = cheerio.load(html);

  // Extract organization name BEFORE removing footer
  const title = $('title').text().trim();
  const footerText = $('footer').text().replace(/\s+/g, ' ').trim();
  const copyrightText = $('[class*="copyright"], [id*="copyright"]').text().trim();

  // Try to extract organization name and location from various sources
  let organizationName = '';
  let location = { city: null, state: null, region: null };

  // Helpers for host matching
  const pageHost = (() => {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  })();
  const getHost = (u) => {
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
  };
  const sameAsIncludesHost = (sameAs) => {
    if (!sameAs) return false;
    const arr = Array.isArray(sameAs) ? sameAs : [sameAs];
    return arr.some(s => getHost(s) === pageHost);
  };

  // Try JSON-LD first (support all organization schema types) with host gating
  $('script[type^="application/ld+json"]').each((i, el) => {
    try {
      const data = JSON.parse($(el).html());
      const schemaType = Array.isArray(data['@type']) ? data['@type'][0] : data['@type'];

      // Check for any organization-type schema or entities with organization names
      const orgSchemaTypes = [
        'Organization', 'Corporation', 'LocalBusiness', 'EducationalOrganization',
        'CollegeOrUniversity', 'University', 'School', 'HighSchool', 'MiddleSchool', 'ElementarySchool',
        'GovernmentOrganization', 'NGO', 'PerformingGroup', 'SportsTeam',
        'MedicalOrganization', 'Hospital', 'Physician',
        'Store', 'AutoDealer', 'FoodEstablishment', 'Restaurant', 'Hotel', 'LodgingBusiness'
      ];

      if (orgSchemaTypes.includes(schemaType)) {
        const urlHost = getHost(data.url || data['@id'] || '');
        const hostMatches = (urlHost && urlHost === pageHost) || sameAsIncludesHost(data.sameAs);
        if (!hostMatches) {
          // Keep searching for an org that matches this site
        } else {
          organizationName = data.name;
          console.log(`   ✓ Extracted brand from ${schemaType} schema: "${organizationName}"`);

          // Try to extract location from address
          if (data.address) {
            if (typeof data.address === 'string') {
              // Parse address string
              const addressParts = data.address.split(',').map(p => p.trim());
              if (addressParts.length >= 2) {
                location.city = addressParts[addressParts.length - 2];
                location.state = addressParts[addressParts.length - 1];
              }
            } else if (data.address.addressLocality) {
              location.city = data.address.addressLocality;
              location.state = data.address.addressRegion || data.address.addressState;
            }
          }
          return false; // break
        }
      }
      if (data.publisher && data.publisher.name) {
        const pubUrlHost = getHost(data.publisher.url || '');
        const pubMatches = (pubUrlHost && pubUrlHost === pageHost) || sameAsIncludesHost(data.publisher.sameAs);
        if (pubMatches) {
          organizationName = data.publisher.name;
          if (data.publisher.address && data.publisher.address.addressLocality) {
            location.city = data.publisher.address.addressLocality;
            location.state = data.publisher.address.addressRegion || data.publisher.address.addressState;
          }
          return false;
        }
      }
    } catch (e) {
      // Skip
    }
  });

  // Helper to sanitize noisy brand strings often coming from embeds (e.g., Vimeo/YouTube titles)
  const cleanBrand = (raw) => {
    if (!raw) return raw;
    let s = String(raw).trim();
    // Common embed/title noise patterns
    // e.g., "smaller from Maine College of Art & Design on Vimeo" => "Maine College of Art & Design"
    const fromOnMatch = s.match(/(?:^|\b)(?:large|larger|small|smaller)?\s*from\s+(.+?)\s+on\s+.+$/i);
    if (fromOnMatch && fromOnMatch[1]) {
      s = fromOnMatch[1].trim();
    }
    // Remove trailing "on Vimeo/YouTube/..."
    s = s.replace(/\s+on\s+(Vimeo|YouTube|X|Twitter|Instagram).*$/i, '').trim();
    // Strip obvious UI words
    s = s
      .replace(/(?:Site\s*Search|Menu|Home|Website|Video|Vid)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    // If it's excessively long, keep the middle brand-looking part
    if (s.length > 80) {
      s = s.split('|').pop().split('–').pop().split('-').pop().trim();
    }
    return s;
  };

  // If not found, try meta tags
  if (!organizationName) {
    const ogSiteName = cleanBrand($('meta[property="og:site_name"]').attr('content'));
    const twitterSite = cleanBrand($('meta[name="twitter:site"]').attr('content'));
    organizationName = ogSiteName || twitterSite;
    if (organizationName) {
      console.log(`   ✓ Extracted brand from meta tag: "${organizationName}"`);
    }
  }

  // If not found, try title tag (extract after the dash/pipe/hyphen)
  if (!organizationName && title) {
    const titleParts = title.split(/[|\-–—]/);
    if (titleParts.length > 1) {
      // Take the last part and clean it up
      let brandCandidate = cleanBrand(titleParts[titleParts.length - 1].trim());

      // Remove common navigation/UI text that gets pulled in
      brandCandidate = brandCandidate
        .replace(/Site Search/gi, '')
        .replace(/Facebook|Instagram|Twitter|Youtube|LinkedIn|Vimeo/gi, '')
        .replace(/on Vimeo.*/i, '')
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .trim();

      // Only use if we have something substantial left (> 3 chars)
      if (brandCandidate.length > 3) {
        organizationName = brandCandidate;
        console.log(`   ✓ Extracted brand from title tag: "${organizationName}"`);
      }
    }
  }

  // If still not found, try copyright and footer text with multiple patterns
  if (!organizationName && (copyrightText || footerText)) {
    const fullText = copyrightText + ' ' + footerText;

    // Pattern 1: Copyright symbol followed by year and company name
    let match = fullText.match(/©\s*(\d{4}[-\d]*)\s+([A-Z][\w\s&,.-]+?)(?:\.|$|All Rights|Rights Reserved|Inc\.|LLC|Ltd\.|Corporation)/i);
    if (match && match[2] && match[2].trim().length > 2) {
      organizationName = match[2].trim();
    }

    // Pattern 2: "Copyright [year] Company Name"
    if (!organizationName) {
      match = fullText.match(/Copyright\s+(\d{4}[-\d]*)\s+([A-Z][\w\s&,.-]+?)(?:\.|$|All Rights|Rights Reserved|Inc\.|LLC|Ltd\.|Corporation)/i);
      if (match && match[2] && match[2].trim().length > 2) {
        organizationName = match[2].trim();
      }
    }

    // Pattern 3: Look for company suffixes (Inc, LLC, Ltd, Corp) in footer
    if (!organizationName) {
      match = fullText.match(/([A-Z][\w\s&,.-]+?)\s+(Inc\.|LLC|Ltd\.|Corporation|Corp\.|Limited)/i);
      if (match && match[1] && match[1].trim().length > 2) {
        organizationName = (match[1] + ' ' + match[2]).trim();
      }
    }

    if (organizationName) {
      console.log(`   ✓ Extracted brand from copyright/footer: "${organizationName}"`);
    }
  }

  // Extract main content
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const h1 = $('h1').first().text().trim();

  // Extract structured data
  const jsonLd = [];
  // Support attributes like: application/ld+json; charset=utf-8
  const jsonLdScripts = $('script[type^="application/ld+json"]');

  console.log(`   → Found ${jsonLdScripts.length} script[type="application/ld+json"] tags`);

  jsonLdScripts.each((i, el) => {
    try {
      const scriptContent = $(el).html();
      console.log(`   → Script ${i+1} content length: ${scriptContent?.length || 0} chars`);

      const data = JSON.parse(scriptContent);

      // Normalize into an array of schema objects
      const items = Array.isArray(data)
        ? data
        : (data && Array.isArray(data['@graph']))
          ? data['@graph']
          : [data];

      items.forEach(item => {
        if (item && item['@type']) {
          jsonLd.push(item);
        }
      });

      const types = items.map(s => s && s['@type']).filter(Boolean).flat();
      if (types.length > 0) {
        console.log(`   ✓ Found JSON-LD schema: @type = ${Array.isArray(types) ? types.join(', ') : types}`);
      }
    } catch (e) {
      console.warn(`   ⚠ Invalid JSON-LD schema found (skipping): ${e.message}`);
    }
  });

  if (jsonLd.length === 0) {
    console.log(`   ℹ No JSON-LD schemas found on page`);
  }

  // Second pass: if we still don't have a brand, search parsed JSON-LD array for best-matching org
  if (!organizationName && jsonLd.length > 0) {
    const orgSchemaTypes = [
      'CollegeOrUniversity', 'EducationalOrganization', 'Organization', 'LocalBusiness', 'Corporation'
    ];
    const candidates = [];
    const pushCandidate = (obj) => {
      if (!obj || !obj['@type'] || !obj.name) return;
      const t = Array.isArray(obj['@type']) ? obj['@type'][0] : obj['@type'];
      if (!orgSchemaTypes.includes(t)) return;
      const urlHost = getHost(obj.url || obj['@id'] || '');
      const hostMatches = (urlHost && urlHost === pageHost) || sameAsIncludesHost(obj.sameAs);
      candidates.push({ obj, t, score: hostMatches ? 2 : 1 });
    };
    jsonLd.forEach(pushCandidate);
    candidates.sort((a,b) => b.score - a.score || (
      // Prioritize educational org types
      (['CollegeOrUniversity','EducationalOrganization'].includes(b.t) ? 1 : 0) -
      (['CollegeOrUniversity','EducationalOrganization'].includes(a.t) ? 1 : 0)
    ));
    if (candidates.length > 0 && candidates[0].score > 0) {
      organizationName = candidates[0].obj.name;
      console.log(`   ✓ Extracted brand from ${candidates[0].t} schema (post-parse): "${organizationName}"`);
    }
  }

  // Now remove script, style, and other non-content elements before extracting body text
  $('script, style, nav, header, footer, iframe, noscript').remove();

  // Get main text content
  const bodyText = $('body').text()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 15000); // Limit to ~15k chars

  return {
    url,
    title,
    metaDescription,
    h1,
    content: bodyText,
    jsonLd,
    wordCount: bodyText.split(/\s+/).length,
    organizationName: organizationName || null,
    location,
    footerText, // Preserve for Claude analysis if schema didn't have location
  };
}

/**
 * Fetch page using standard HTTP (fast, no JavaScript)
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function fetchWithFetch(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Strategy-Labs/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return parseHtml(html, url);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return {
      url,
      error: error.message,
      content: '',
    };
  }
}

/**
 * Fetch page using Firecrawl (fast, reliable, renders JavaScript)
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function fetchWithFirecrawl(url) {
  try {
    if (!config.firecrawl.apiKey) {
      console.log(`   ℹ Firecrawl API key not configured, skipping`);
      return null;
    }

    console.log(`   → Fetching with Firecrawl v2...`);

    // Retry up to 3 times on 5xx/transient errors
    const maxAttempts = 3;
    let lastError = null;
    let data = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.firecrawl.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            // Request both rawHtml (preserve head) and html (rendered DOM)
            formats: ['rawHtml', 'html'],
            actions: [
              { type: 'wait', milliseconds: 12000 + attempt * 3000 },
              // Gentle scroll to trigger lazy scripts
              { type: 'scroll', direction: 'down' },
              { type: 'wait', milliseconds: 1000 }
            ],
            timeout: 70000,
            blockAds: false,
            onlyMainContent: false,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const message = `Firecrawl API error: ${response.status} - ${errorText}`;
          // Retry on 5xx
          if (response.status >= 500 && response.status < 600 && attempt < maxAttempts) {
            console.warn(`   ⚠ ${message}. Retrying (${attempt}/${maxAttempts})...`);
            await new Promise(r => setTimeout(r, attempt * 1000));
            continue;
          }
          throw new Error(message);
        }

        data = await response.json();
        break;
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          console.warn(`   ⚠ Firecrawl request failed (attempt ${attempt}/${maxAttempts}): ${err.message}`);
          await new Promise(r => setTimeout(r, attempt * 1000));
          continue;
        }
      }
    }

    if (!data) {
      throw lastError || new Error('Firecrawl failed with no response');
    }

    if (!data.success) {
      throw new Error(`Firecrawl failed: ${data.error || 'Unknown error'}`);
    }

    // Prefer rendered html, fallback to rawHtml
    const html = data.data?.html || data.data?.rawHtml;

    if (!html) {
      console.error(`   ✗ Firecrawl response keys:`, Object.keys(data));
      if (data.data) {
        console.error(`   ✗ data.data keys:`, Object.keys(data.data));
      }
      console.error(`   ✗ Response preview:`, JSON.stringify(data).substring(0, 500));
      throw new Error('Firecrawl response missing rawHtml content');
    }

    console.log(`   ✓ Firecrawl fetch successful (${html.length} chars)`);

    // Optional: Save first Firecrawl HTML to file for inspection (enable with ANALYZER_DEBUG=1)
    if (process.env.ANALYZER_DEBUG === '1' && !global.__firecrawlDebugSaved) {
      try {
        const fs = await import('node:fs');
        const debugPath = '/tmp/firecrawl-debug.html';
        fs.writeFileSync(debugPath, html);
        console.log(`   → DEBUG: Saved Firecrawl HTML to ${debugPath}`);
      } catch (e) {
        // Non-fatal in serverless/ESM contexts
      }
      global.__firecrawlDebugSaved = true;
    }

    return parseHtml(html, url);
  } catch (error) {
    console.error(`   ✗ Firecrawl failed for ${url}:`, error.message);
    return null;  // Signal to fallback to original data
  }
}

/**
 * Fetch and parse page content (hybrid approach)
 * Tries fast fetch first, falls back to Firecrawl if needed
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function fetchPageContent(url) {
  try {
    // Try fast fetch first
    const data = await fetchWithFetch(url);

    // Check if we should retry with Firecrawl
    const hasNoSchemas = !data.jsonLd || data.jsonLd.length === 0;
    const hasNoOrgName = !data.organizationName;

    // Check if brand name looks incomplete (likely from domain/title fallback)
    const brandLooksIncomplete = data.organizationName && (
      data.organizationName.length < 5 ||  // Very short names are likely incomplete
      data.organizationName.split(' ').length === 1 ||  // Single word (likely domain)
      /^[a-z]+$/.test(data.organizationName)  // All lowercase (likely domain)
    );

    const shouldUseFirecrawl = (hasNoSchemas || hasNoOrgName || brandLooksIncomplete) && !data.error;

    if (shouldUseFirecrawl) {
      const reason = hasNoSchemas ? 'No schemas' :
                     hasNoOrgName ? 'No brand name' :
                     'Brand name looks incomplete';
      console.log(`   ℹ ${reason} in static HTML, retrying with Firecrawl...`);

      const firecrawlData = await fetchWithFirecrawl(url);

      // If Firecrawl succeeded, check if we got schemas
      if (firecrawlData && !firecrawlData.error) {
        const firecrawlHasSchemas = firecrawlData.jsonLd && firecrawlData.jsonLd.length > 0;

        if (firecrawlHasSchemas) {
          console.log(`   ✓ Firecrawl fetch successful with ${firecrawlData.jsonLd.length} schemas`);
          return firecrawlData;
        }

        // Firecrawl succeeded but still no schemas - try Puppeteer for GTM-injected schemas
        if (hasNoSchemas) {
          console.log(`   ℹ No schemas found with Firecrawl, trying Puppeteer for GTM-injected schemas...`);

          try {
            const puppeteerResult = await extractSchemasWithPuppeteer(url);

            if (puppeteerResult.success && puppeteerResult.schemas.length > 0) {
              console.log(`   ✓ Puppeteer found ${puppeteerResult.schemas.length} schemas (GTM-injected)`);

              // Merge Puppeteer schemas into Firecrawl data
              firecrawlData.jsonLd = puppeteerResult.schemas;
              firecrawlData.schemaSource = 'puppeteer';
              firecrawlData.puppeteerTiming = puppeteerResult.timing;

              return firecrawlData;
            } else {
              console.log(`   ℹ Puppeteer found no schemas either`);
            }
          } catch (puppeteerError) {
            console.error(`   ⚠ Puppeteer failed:`, puppeteerError.message);
          }
        }

        console.log(`   ✓ Using Firecrawl data (no Puppeteer fallback needed)`);
        return firecrawlData;
      } else {
        console.log(`   ℹ Firecrawl failed or not configured`);
        // If schemas missing, try Puppeteer directly for GTM-injected schemas
        if (hasNoSchemas) {
          console.log(`   ℹ Trying Puppeteer for GTM-injected schemas...`);
          try {
            const puppeteerResult = await extractSchemasWithPuppeteer(url);
            if (puppeteerResult.success && puppeteerResult.schemas.length > 0) {
              console.log(`   ✓ Puppeteer found ${puppeteerResult.schemas.length} schemas (GTM-injected)`);
              return {
                ...data,
                jsonLd: puppeteerResult.schemas,
                schemaSource: 'puppeteer',
                puppeteerTiming: puppeteerResult.timing,
              };
            } else {
              console.log(`   ℹ Puppeteer found no schemas either`);
            }
          } catch (puppeteerError) {
            console.error(`   ⚠ Puppeteer failed:`, puppeteerError.message);
          }
        }
        console.log(`   ✓ Using original fetch data`);
        return data;
      }
    }

    return data;
  } catch (error) {
    console.error(`Error in fetchPageContent for ${url}:`, error.message);
    return {
      url,
      error: error.message,
      content: '',
    };
  }
}

/**
 * Discover entities and semantic topics from page content
 * @param {Object} pageData - Page content data
 * @returns {Promise<Object>}
 */
export async function discoverEntities(pageData) {
  if (pageData.error) {
    return {
      entities: [],
      topics: [],
      error: pageData.error,
    };
  }

  const prompt = `You are an expert in semantic SEO and entity analysis for higher education content.

Analyze this webpage and extract key entities and topics that would be important for AI search engines.

URL: ${pageData.url}
Title: ${pageData.title}
Meta Description: ${pageData.metaDescription}
H1: ${pageData.h1}

Content (first 5000 chars):
${pageData.content.substring(0, 5000)}

Extract the following:

1. **Named Entities** - Specific people, places, organizations, programs
2. **Program Entities** - Degree programs, certificates, courses mentioned
3. **Key Topics** - Main subject areas and themes
4. **E-E-A-T Signals** - Expertise, authority, trust indicators found
5. **Missing Entities** - Important entities competitors likely have but this page lacks
6. **Location** - City, state, and region where this institution is located (look for addresses, "located in", etc.)

Return ONLY valid JSON in this exact format:
{
  "namedEntities": [
    {"name": "entity name", "type": "person|organization|location", "mentions": number}
  ],
  "programEntities": [
    {"name": "program name", "type": "degree|certificate|course", "mentions": number}
  ],
  "topics": [
    {"topic": "topic name", "relevance": "high|medium|low", "coverage": "comprehensive|partial|minimal"}
  ],
  "eeatSignals": {
    "authorCredentials": ["list of credentials found"],
    "accreditation": ["list of accreditations mentioned"],
    "statistics": ["key stats/numbers found"],
    "expertQuotes": number,
    "citations": number
  },
  "missingEntities": [
    {"entity": "entity name", "reason": "why it should be present"}
  ],
  "semanticScore": {
    "entityDensity": number (0-100),
    "topicCoverage": number (0-100),
    "eeatScore": number (0-100)
  },
  "location": {
    "city": "city name or null",
    "state": "state name or null",
    "region": "region like 'Southern California', 'Midwest', 'New England' or null"
  }
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    // Track API cost
    costTracker.trackAnthropic(message.usage);

    const response = message.content[0].text;

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Claude response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    console.log(`✓ Discovered ${analysis.namedEntities?.length || 0} named entities`);
    console.log(`✓ Identified ${analysis.topics?.length || 0} key topics`);
    console.log(`✓ Entity Density Score: ${analysis.semanticScore?.entityDensity || 0}/100`);

    // Merge location: prefer schema data, fallback to Claude's analysis
    const finalLocation = {
      city: pageData.location?.city || analysis.location?.city || null,
      state: pageData.location?.state || analysis.location?.state || null,
      region: pageData.location?.region || analysis.location?.region || null,
    };

    if (finalLocation.city || finalLocation.state) {
      console.log(`✓ Detected location: ${finalLocation.city ? finalLocation.city + ', ' : ''}${finalLocation.state || ''}`);
    }

    // Analyze schema markup
    const schemaAnalysis = analyzeSchemas(pageData.jsonLd);

    return {
      ...analysis,
      location: finalLocation,
      wordCount: pageData.wordCount,
      hasJsonLd: pageData.jsonLd.length > 0,
      jsonLdTypes: pageData.jsonLd.map(schema => schema['@type']).filter(Boolean),
      schemaAnalysis,
      pageData: {
        title: pageData.title,
        metaDescription: pageData.metaDescription,
        h1: pageData.h1,
        wordCount: pageData.wordCount,
        organizationName: pageData.organizationName,
        location: finalLocation,
      },
    };
  } catch (error) {
    console.error(`Error analyzing entities for ${pageData.url}:`, error.message);
    return {
      entities: [],
      topics: [],
      error: error.message,
    };
  }
}

/**
 * Full entity analysis including page fetch
 * @param {string} url
 * @returns {Promise<Object>}
 */
export async function analyzePageEntities(url) {
  console.log(`\n📊 Analyzing entities for ${url}`);

  const pageData = await fetchPageContent(url);

  if (pageData.error) {
    console.error(`   ✗ Failed to fetch page: ${pageData.error}`);
    return { url, error: pageData.error };
  }

  console.log(`   ✓ Fetched ${pageData.wordCount} words`);

  const entities = await discoverEntities(pageData);

  return {
    url,
    pageData: {
      title: pageData.title,
      metaDescription: pageData.metaDescription,
      h1: pageData.h1,
      wordCount: pageData.wordCount,
      organizationName: pageData.organizationName,
      location: pageData.location,
    },
    entities,
  };
}

/**
 * Fast path: fetch page and return only JSON-LD schemas and analysis
 * @param {string} url
 * @returns {Promise<{url: string, jsonLd: Array, schemaAnalysis: object, pageData: object}>}
 */
export async function fetchAndAnalyzeSchemas(url) {
  const pageData = await fetchPageContent(url);
  if (pageData.error) {
    return { url, error: pageData.error, jsonLd: [], schemaAnalysis: { hasSchema: false, schemaScore: 0 }, pageData: {} };
  }

  const schemaAnalysis = analyzeSchemas(pageData.jsonLd);

  return {
    url,
    jsonLd: pageData.jsonLd,
    schemaAnalysis,
    pageData: {
      title: pageData.title,
      metaDescription: pageData.metaDescription,
      h1: pageData.h1,
      wordCount: pageData.wordCount,
      organizationName: pageData.organizationName,
      location: pageData.location,
    },
  };
}
