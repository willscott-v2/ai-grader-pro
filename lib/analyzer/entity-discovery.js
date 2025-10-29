import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';
import { config } from './config.js';
import { analyzeSchemas } from './schema-analyzer.js';

const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey,
});

/**
 * Fetch and parse page content
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function fetchPageContent(url) {
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
    const $ = cheerio.load(html);

    // Extract organization name BEFORE removing footer
    const title = $('title').text().trim();
    const footerText = $('footer').text().replace(/\s+/g, ' ').trim();
    const copyrightText = $('[class*="copyright"], [id*="copyright"]').text().trim();

    // Try to extract organization name and location from various sources
    let organizationName = '';
    let location = { city: null, state: null, region: null };

    // Try JSON-LD first
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data['@type'] === 'Organization' || data['@type'] === 'EducationalOrganization') {
          organizationName = data.name;

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
        if (data.publisher && data.publisher.name) {
          organizationName = data.publisher.name;
          if (data.publisher.address) {
            if (data.publisher.address.addressLocality) {
              location.city = data.publisher.address.addressLocality;
              location.state = data.publisher.address.addressRegion || data.publisher.address.addressState;
            }
          }
          return false;
        }
      } catch (e) {
        // Skip
      }
    });

    // If not found, try title tag (extract before the dash/pipe/hyphen)
    if (!organizationName && title) {
      const titleParts = title.split(/[|\-–—]/);
      if (titleParts.length > 1) {
        organizationName = titleParts[titleParts.length - 1].trim();
      }
    }

    // If still not found, try copyright text
    if (!organizationName && (copyrightText || footerText)) {
      const copyrightMatch = (copyrightText + ' ' + footerText).match(/©.*?(\d{4})[\s,]+([\w\s]+?)(?:\.|$|All Rights|Rights Reserved)/i);
      if (copyrightMatch && copyrightMatch[2]) {
        organizationName = copyrightMatch[2].trim();
      }
    }

    // Remove script, style, and other non-content elements
    $('script, style, nav, header, footer, iframe, noscript').remove();

    // Extract main content
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').first().text().trim();

    // Get main text content
    const bodyText = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 15000); // Limit to ~15k chars

    // Extract structured data
    const jsonLd = [];
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).html());
        jsonLd.push(data);
      } catch (e) {
        // Skip invalid JSON-LD
      }
    });

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
    },
    entities,
  };
}
