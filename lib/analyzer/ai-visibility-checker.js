import { config } from './config.js';

/**
 * Check Google AI Overviews using SerpAPI
 */
async function checkWithSerpAPI(prompt, targetUrl) {
  if (!config.serpapi.apiKey) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      api_key: config.serpapi.apiKey,
      q: prompt,
      location: 'United States',
      hl: 'en',
      gl: 'us',
      google_domain: 'google.com',
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`https://serpapi.com/search?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`);
    }

    const data = await response.json();
    let aiOverview = data.ai_overview;

    if (!aiOverview) {
      return {
        hasAIOverview: false,
        reason: 'No AI Overview triggered for this query',
      };
    }

    // Handle page_token - need to fetch expanded content
    if (aiOverview.page_token && !aiOverview.text_blocks) {
      try {
        const expandedParams = new URLSearchParams({
          api_key: config.serpapi.apiKey,
          engine: 'google_ai_overview',
          page_token: aiOverview.page_token,
        });

        const expandedResponse = await fetch(`https://serpapi.com/search?${expandedParams}`);
        if (expandedResponse.ok) {
          const expandedData = await expandedResponse.json();
          aiOverview = expandedData.ai_overview || aiOverview;
        }
      } catch (error) {
        console.warn('   [WARN] Failed to fetch expanded AI Overview:', error.message);
      }
    }

    // Extract text from text_blocks (new SerpAPI structure)
    let overviewText = '';
    if (aiOverview.text_blocks && Array.isArray(aiOverview.text_blocks)) {
      aiOverview.text_blocks.forEach(block => {
        if (block.snippet) {
          overviewText += block.snippet + ' ';
        }
        // Handle nested content in lists
        if (block.list && Array.isArray(block.list)) {
          block.list.forEach(item => {
            if (item.snippet) overviewText += item.snippet + ' ';
          });
        }
      });
      overviewText = overviewText.trim();
    }
    // Fallback to old text field if exists
    if (!overviewText && aiOverview.text) {
      overviewText = aiOverview.text;
    }

    // Extract references/links
    const allReferences = [];
    if (aiOverview.references && Array.isArray(aiOverview.references)) {
      aiOverview.references.forEach(ref => {
        if (ref.link) allReferences.push(ref.link);
      });
    }
    // Fallback to old links structure
    if (allReferences.length === 0 && aiOverview.links && Array.isArray(aiOverview.links)) {
      aiOverview.links.forEach(link => {
        if (link.link) allReferences.push(link.link);
      });
    }

    return {
      hasAIOverview: true,
      overviewText,
      allReferences,
      source: 'SerpAPI',
    };
  } catch (error) {
    console.warn(`SerpAPI unavailable: ${error.message}`);
    return null;
  }
}

/**
 * Check Google AI Overviews using DataForSEO
 */
async function checkWithDataForSEO(prompt, targetUrl) {
  if (!config.dataforseo.login || !config.dataforseo.password) {
    return null;
  }

  try {
    const auth = Buffer.from(`${config.dataforseo.login}:${config.dataforseo.password}`).toString('base64');

    const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keyword: prompt,
        location_code: 2840,
        language_code: 'en',
        device: 'desktop',
        os: 'windows',
        depth: 10,
      }]),
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status_code !== 20000) {
      throw new Error(`DataForSEO error: ${data.status_message}`);
    }

    const result = data.tasks?.[0]?.result?.[0];
    if (!result) {
      return {
        hasAIOverview: false,
        reason: 'No results returned',
      };
    }

    // Look for AI Overview in items
    const aiOverview = result.items?.find(item => item.type === 'ai_overview');

    if (!aiOverview) {
      return {
        hasAIOverview: false,
        reason: 'No AI Overview triggered for this query',
      };
    }


    // Extract text and references
    let overviewText = '';
    const allReferences = [];

    // DataForSEO structure: ai_overview has expanded_element array
    if (aiOverview.expanded_element && Array.isArray(aiOverview.expanded_element)) {
      aiOverview.expanded_element.forEach(element => {
        if (element.type === 'ai_overview_element') {
          if (element.text) overviewText += element.text + ' ';
          if (element.links && Array.isArray(element.links)) {
            element.links.forEach(link => {
              if (link.url) allReferences.push(link.url);
            });
          }
        }
      });
    }

    return {
      hasAIOverview: true,
      overviewText: overviewText.trim(),
      allReferences,
      source: 'DataForSEO',
    };
  } catch (error) {
    console.warn(`DataForSEO unavailable: ${error.message}`);
    return null;
  }
}

/**
 * Check if a URL appears in Google AI Overviews (tries SerpAPI, falls back to DataForSEO)
 */
async function checkGoogleAIOverviews(prompt, targetUrl) {
  // Try SerpAPI first
  let result = await checkWithSerpAPI(prompt, targetUrl);

  // Fallback to DataForSEO if SerpAPI failed
  if (!result) {
    result = await checkWithDataForSEO(prompt, targetUrl);
  }

  // If both failed
  if (!result) {
    return { available: false, cited: false, reason: 'No API available' };
  }

  // If no AI Overview found
  if (!result.hasAIOverview) {
    return {
      available: true,
      cited: false,
      hasAIOverview: false,
      reason: result.reason,
    };
  }

  // Process the result
  const normalizeUrl = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  const normalizedTarget = normalizeUrl(targetUrl);

  const citedIndex = result.allReferences.findIndex(citation =>
    normalizeUrl(citation).includes(normalizedTarget) ||
    normalizedTarget.includes(normalizeUrl(citation))
  );

  const cited = citedIndex !== -1;
  const position = cited ? citedIndex + 1 : null;

  const domain = new URL(targetUrl).hostname.replace('www.', '');
  const domainMentioned = result.overviewText.toLowerCase().includes(domain.toLowerCase());

  return {
    available: true,
    cited,
    position,
    domainMentioned,
    hasAIOverview: true,
    totalCitations: result.allReferences.length,
    overviewText: result.overviewText.substring(0, 500),
    citations: result.allReferences,
    source: result.source,
  };
}

/**
 * Check if a URL is cited in Perplexity AI response
 * @param {string} prompt - The search query
 * @param {string} targetUrl - URL to check for
 * @returns {Promise<Object>}
 */
async function checkPerplexity(prompt, targetUrl) {
  if (!config.perplexity.apiKey) {
    return { available: false, cited: false, reason: 'No API key' };
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.perplexity.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        return_citations: true,
        return_related_questions: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const citations = data.citations || [];

    // Normalize URLs for comparison
    const normalizeUrl = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const normalizedTarget = normalizeUrl(targetUrl);

    // Check if target URL is in citations
    const citedIndex = citations.findIndex(citation =>
      normalizeUrl(citation).includes(normalizedTarget) ||
      normalizedTarget.includes(normalizeUrl(citation))
    );

    const cited = citedIndex !== -1;
    const position = cited ? citedIndex + 1 : null;

    // Extract domain mentions from content
    const domain = new URL(targetUrl).hostname.replace('www.', '');
    const domainMentioned = content.toLowerCase().includes(domain.toLowerCase());

    return {
      available: true,
      cited,
      position,
      domainMentioned,
      totalCitations: citations.length,
      response: content.substring(0, 500), // First 500 chars
      citations: citations,
    };
  } catch (error) {
    console.error(`Perplexity check error for "${prompt}":`, error.message);
    return { available: true, cited: false, error: error.message };
  }
}

/**
 * Check if a URL is cited in ChatGPT Search response
 * @param {string} prompt - The search query
 * @param {string} targetUrl - URL to check for
 * @returns {Promise<Object>}
 */
async function checkChatGPT(prompt, targetUrl) {
  if (!config.openai.apiKey) {
    return { available: false, cited: false, reason: 'No API key' };
  }

  try {
    // Note: This uses GPT-4 with web browsing capability
    // The actual ChatGPT Search API might have different endpoints
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides accurate information with citations.',
          },
          {
            role: 'user',
            content: `${prompt}\n\nPlease provide sources/citations for your answer.`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Extract URLs from response
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    const foundUrls = content.match(urlRegex) || [];

    // Normalize URLs
    const normalizeUrl = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const normalizedTarget = normalizeUrl(targetUrl);

    // Check for citation
    const citedIndex = foundUrls.findIndex(url =>
      normalizeUrl(url).includes(normalizedTarget) ||
      normalizedTarget.includes(normalizeUrl(url))
    );

    const cited = citedIndex !== -1;
    const position = cited ? citedIndex + 1 : null;

    // Check domain mention
    const domain = new URL(targetUrl).hostname.replace('www.', '');
    const domainMentioned = content.toLowerCase().includes(domain.toLowerCase());

    return {
      available: true,
      cited,
      position,
      domainMentioned,
      totalCitations: foundUrls.length,
      response: content.substring(0, 500),
      citations: foundUrls,
    };
  } catch (error) {
    console.error(`ChatGPT check error for "${prompt}":`, error.message);
    return { available: true, cited: false, error: error.message };
  }
}

/**
 * Calculate AI visibility score based on multiple checks
 * @param {Array<Object>} results - Array of check results
 * @returns {Object}
 */
function calculateVisibilityScore(results) {
  const validResults = results.filter(r => r.available && !r.error);

  if (validResults.length === 0) {
    return {
      score: 0,
      citationRate: 0,
      averagePosition: null,
      domainMentionRate: 0,
      insights: 'No valid results available',
    };
  }

  const citedCount = validResults.filter(r => r.cited).length;
  const citationRate = (citedCount / validResults.length) * 100;

  const positions = validResults.filter(r => r.position).map(r => r.position);
  const averagePosition = positions.length > 0
    ? positions.reduce((a, b) => a + b, 0) / positions.length
    : null;

  const domainMentions = validResults.filter(r => r.domainMentioned).length;
  const domainMentionRate = (domainMentions / validResults.length) * 100;

  // Calculate overall score (0-100)
  let score = 0;
  score += citationRate * 0.6; // 60% weight on citations
  score += domainMentionRate * 0.2; // 20% weight on domain mentions

  // Position bonus (if cited in top 3)
  if (averagePosition && averagePosition <= 3) {
    score += 20; // 20% bonus for top 3 positions
  } else if (averagePosition && averagePosition <= 5) {
    score += 10; // 10% bonus for top 5
  }

  score = Math.min(score, 100);

  return {
    score: Math.round(score),
    citationRate: Math.round(citationRate),
    averagePosition: averagePosition ? Math.round(averagePosition * 10) / 10 : null,
    domainMentionRate: Math.round(domainMentionRate),
    totalChecks: validResults.length,
    citedCount,
  };
}

/**
 * Check URL visibility across AI engines for multiple prompts
 * @param {string} url - Target URL
 * @param {Array<Object>} prompts - Array of {prompt, intent, type} objects
 * @returns {Promise<Object>}
 */
export async function checkAIVisibility(url, prompts) {
  console.log(`\n🔍 Checking AI visibility for ${url}`);
  console.log(`   Testing ${prompts.length} prompts across AI engines...\n`);

  const results = [];

  for (const promptObj of prompts) {
    const { prompt } = promptObj;
    console.log(`   → "${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}"`);

    const checks = {};

    // Check Google AI Overviews (tries SerpAPI, falls back to DataForSEO)
    if (config.serpapi.apiKey || (config.dataforseo.login && config.dataforseo.password)) {
      checks.googleAIOverview = await checkGoogleAIOverviews(prompt, url);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
    }

    // Check Perplexity
    if (config.perplexity.apiKey) {
      checks.perplexity = await checkPerplexity(prompt, url);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }

    // Check ChatGPT
    if (config.openai.apiKey) {
      checks.chatgpt = await checkChatGPT(prompt, url);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }

    results.push({
      prompt: promptObj,
      checks,
      timestamp: new Date().toISOString(),
    });

    // Show quick results
    const googleResult = checks.googleAIOverview?.cited ? '✓' : checks.googleAIOverview?.hasAIOverview === false ? '○' : '✗';
    const perplexityResult = checks.perplexity?.cited ? '✓' : '✗';
    const chatgptResult = checks.chatgpt?.cited ? '✓' : '✗';
    console.log(`      Google: ${googleResult}  Perplexity: ${perplexityResult}  ChatGPT: ${chatgptResult}`);
  }

  // Flatten results for scoring
  const allChecks = results.flatMap(r => Object.values(r.checks));
  const visibility = calculateVisibilityScore(allChecks);

  console.log(`\n✓ AI Visibility Score: ${visibility.score}/100`);
  console.log(`   Citation Rate: ${visibility.citationRate}%`);
  console.log(`   Domain Mention Rate: ${visibility.domainMentionRate}%`);
  if (visibility.averagePosition) {
    console.log(`   Average Position: #${visibility.averagePosition}`);
  }

  return {
    url,
    visibility,
    promptResults: results,
    summary: {
      totalPrompts: prompts.length,
      enginesChecked: Object.keys(results[0]?.checks || {}).length,
      ...visibility,
    },
  };
}
