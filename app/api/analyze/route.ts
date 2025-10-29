import { NextRequest } from 'next/server';

// Helper function to safely convert text to string (JSON.stringify will handle escaping)
function safeString(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text);
}

// Import analyzer modules
// Note: These are CommonJS modules, so we'll need to use dynamic imports
async function runAnalysis(url: string, keyword: string, sendProgress: (message: string, step: string) => void) {
  // Dynamic imports for the analyzer modules
  const { analyzePageEntities } = await import('@/lib/analyzer/entity-discovery.js');
  const { expandKeyword } = await import('@/lib/analyzer/keyword-expander.js');
  const { checkAIVisibility } = await import('@/lib/analyzer/ai-visibility-checker.js');
  const { generateReportCard, exportReportCardMarkdown } = await import('@/lib/analyzer/report-generators.js');

  // Validate URL
  try {
    new URL(url);
  } catch (e) {
    throw new Error(`Invalid URL format: ${url}`);
  }

  // Step 1: Analyze entities
  console.log(`[Analysis] Step 1/3: Starting entity analysis for ${url}`);
  sendProgress('Analyzing page entities and content...', '1/3');
  let entities;
  try {
    entities = await analyzePageEntities(url);
    console.log(`[Analysis] Entity analysis completed:`, {
      namedEntities: (entities as any)?.entities?.namedEntities?.length || 0,
      topics: (entities as any)?.entities?.topics?.length || 0,
      entityScore: (entities as any)?.entities?.semanticScore?.entityDensity || 0
    });
  } catch (error: any) {
    console.error(`[Analysis] Entity analysis failed: ${error.message}`);
    entities = {
      url,
      entities: { semanticScore: { entityDensity: 0, topicCoverage: 0, eeatScore: 0 } },
      error: error.message,
    };
  }

  // Step 2: Expand keyword
  console.log(`[Analysis] Step 2/3: Expanding keyword "${keyword}"`);
  sendProgress('Generating AI-ready search prompts...', '2/3');
  const location = (entities as any).entities?.location || (entities as any).pageData?.location || null;
  let keywordExpansion;
  try {
    keywordExpansion = await expandKeyword(keyword, 5, location);
    console.log(`[Analysis] Generated ${keywordExpansion.length} keyword variations`);
  } catch (error: any) {
    console.error(`[Analysis] Keyword expansion failed: ${error.message}`);
    keywordExpansion = [
      { prompt: `What is ${keyword}?`, intent: 'informational', type: 'what' },
      { prompt: `Best ${keyword}`, intent: 'comparison', type: 'best' },
      { prompt: `How much does ${keyword} cost?`, intent: 'informational', type: 'cost' },
    ];
  }

  // Step 3: Check AI visibility
  console.log(`[Analysis] Step 3/3: Checking AI visibility across ${keywordExpansion.length} prompts`);
  sendProgress('Testing AI visibility across search engines...', '3/3');
  let aiVisibility;
  try {
    aiVisibility = await checkAIVisibility(url, keywordExpansion);
    console.log(`[Analysis] AI visibility check completed:`, {
      score: (aiVisibility as any)?.visibility?.score || 0,
      citationRate: (aiVisibility as any)?.visibility?.citationRate || 0,
      promptsTested: (aiVisibility as any)?.promptResults?.length || 0
    });
  } catch (error: any) {
    console.error(`[Analysis] AI visibility check failed: ${error.message}`);
    aiVisibility = {
      url,
      visibility: { score: 0, citationRate: 0, domainMentionRate: 0 },
      error: error.message,
    };
  }

  // Generate comprehensive analysis object
  const analysis = {
    url,
    keyword,
    keywordExpansion,
    aiVisibility,
    entities,
    timestamp: new Date().toISOString(),
    success: true,
  };

  // Generate comprehensive markdown report matching CLI detail level
  try {
    const aiScore = (aiVisibility as any)?.visibility?.score || 0;
    const entityScore = (entities as any)?.entities?.semanticScore?.entityDensity || 0;
    const topicScore = (entities as any)?.entities?.semanticScore?.topicCoverage || 0;
    const eeatScore = (entities as any)?.entities?.semanticScore?.eeatScore || 0;
    const overallScore = Math.round((aiScore + entityScore + eeatScore) / 3);

    const grade = overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F';
    const gradeEmoji = overallScore >= 90 ? '🎯' : overallScore >= 80 ? '📊' : overallScore >= 70 ? '⚠️' : '🚨';
    const gradeLabel = overallScore >= 90 ? 'Excellent' : overallScore >= 80 ? 'Good' : overallScore >= 70 ? 'Fair' : overallScore >= 60 ? 'Poor' : 'Critical';

    // Extract data with safe defaults
    const namedEntities = (entities as any)?.entities?.namedEntities || [];
    const topics = (entities as any)?.entities?.topics || [];
    const eeatSignals = (entities as any)?.entities?.eeatSignals || {};
    const missingEntities = (entities as any)?.entities?.missingEntities || [];
    const schemaAnalysis = (entities as any)?.entities?.schemaAnalysis || {};
    const pageData = (entities as any)?.pageData || {};

    // Format named entities section
    const namedEntitiesText = namedEntities.length > 0
      ? namedEntities.map((e: any, i: number) => `${i + 1}. **${e.name || e.text}** (${e.type}) - ${e.mentions} mention${e.mentions > 1 ? 's' : ''}`).join('\n')
      : '_No named entities identified_';

    // Format topics section
    const topicsText = topics.length > 0
      ? topics.map((t: any, i: number) => `${i + 1}. **${t.topic}** - ${t.relevance} relevance, ${t.coverage} coverage`).join('\n')
      : '_No topics identified_';

    // Format E-E-A-T signals
    const authorCreds = eeatSignals.authorCredentials?.length > 0 ? eeatSignals.authorCredentials.join(', ') : 'None found';
    const accreditations = eeatSignals.accreditation?.length > 0 ? eeatSignals.accreditation.join(', ') : 'None found';
    const statistics = eeatSignals.statistics?.length > 0 ? eeatSignals.statistics.join(', ') : 'None found';

    // Format missing entities
    const missingEntitiesText = missingEntities.length > 0
      ? missingEntities.map((e: any, i: number) => `${i + 1}. **${e.entity}** - ${e.reason}`).join('\n')
      : '_No critical gaps identified_';

    // Format keyword expansion
    const keywordExpansionText = keywordExpansion.map((k: any, i: number) =>
      `${i + 1}. "${k.prompt}" (${k.intent}, ${k.type})`
    ).join('\n');

    // Calculate intent distribution
    const intentCounts = keywordExpansion.reduce((acc: any, k: any) => {
      acc[k.intent] = (acc[k.intent] || 0) + 1;
      return acc;
    }, {});
    const intentDistribution = Object.entries(intentCounts)
      .map(([intent, count]) => `${intent}: ${count}`)
      .join(', ');

    // Format tested prompts for AI visibility
    const testedPromptsText = keywordExpansion.map((k: any, i: number) =>
      `${i + 1}. **"${k.prompt}"**\n   - Intent: ${k.intent}\n   - Type: ${k.type}`
    ).join('\n\n');

    // Format AI engine results with full detail matching CLI format
    const promptResults = (aiVisibility as any)?.promptResults || [];
    let aiEngineResultsText = '';

    if (promptResults.length > 0) {
      aiEngineResultsText = promptResults.map((result: any, i: number) => {
        const { prompt, checks } = result;
        let resultText = `### Prompt ${i + 1}: "${prompt.prompt}"\n**Intent:** ${prompt.intent} | **Type:** ${prompt.type}\n\n`;

        // Google AI Overview
        if (checks.googleAIOverview) {
          const g = checks.googleAIOverview;
          resultText += `#### Google AI Overview\n`;
          resultText += `- **Cited:** ${g.cited ? '✅ Yes (Position #' + g.position + ')' : '❌ No'}\n`;
          if (g.hasAIOverview !== undefined) {
            resultText += `- **Has AI Overview:** ${g.hasAIOverview ? 'Yes' : 'No'}\n`;
          }
          if (g.totalCitations !== undefined) {
            resultText += `- **Total Citations:** ${g.totalCitations}\n`;
          }

          if (g.overviewText) {
            resultText += `\n**AI Response:**\n> ${safeString(g.overviewText)}\n`;
          }

          if (g.citations && g.citations.length > 0) {
            resultText += `\n**Citations:**\n`;
            const maxCitations = Math.min(5, g.citations.length);
            g.citations.slice(0, maxCitations).forEach((cite: string, idx: number) => {
              resultText += `${idx + 1}. ${safeString(cite)}\n`;
            });
            if (g.citations.length > maxCitations) {
              resultText += `...and ${g.citations.length - maxCitations} more\n`;
            }
          }
          resultText += `\n`;
        }

        // Perplexity AI
        if (checks.perplexity) {
          const p = checks.perplexity;
          resultText += `#### Perplexity AI\n`;
          resultText += `- **Cited:** ${p.cited ? '✅ Yes (Position #' + p.position + ')' : '❌ No'}\n`;
          if (p.totalCitations !== undefined) {
            resultText += `- **Total Citations:** ${p.totalCitations}\n`;
          }

          if (p.response) {
            resultText += `\n**AI Response:**\n> ${safeString(p.response)}\n`;
          }

          if (p.citations && p.citations.length > 0) {
            resultText += `\n**Citations:**\n`;
            const maxCitations = Math.min(5, p.citations.length);
            p.citations.slice(0, maxCitations).forEach((cite: string, idx: number) => {
              resultText += `${idx + 1}. ${safeString(cite)}\n`;
            });
            if (p.citations.length > maxCitations) {
              resultText += `...and ${p.citations.length - maxCitations} more\n`;
            }
          }
          resultText += `\n`;
        }

        // ChatGPT
        if (checks.chatgpt) {
          const c = checks.chatgpt;
          resultText += `#### ChatGPT\n`;
          resultText += `- **Cited:** ${c.cited ? '✅ Yes (Position #' + c.position + ')' : '❌ No'}\n`;
          if (c.totalCitations !== undefined) {
            resultText += `- **Total Citations:** ${c.totalCitations}\n`;
          }

          if (c.response) {
            resultText += `\n**AI Response:**\n> ${safeString(c.response)}\n`;
          }

          if (c.citations && c.citations.length > 0) {
            resultText += `\n**Citations:**\n`;
            const maxCitations = Math.min(5, c.citations.length);
            c.citations.slice(0, maxCitations).forEach((cite: string, idx: number) => {
              resultText += `${idx + 1}. ${safeString(cite)}\n`;
            });
            if (c.citations.length > maxCitations) {
              resultText += `...and ${c.citations.length - maxCitations} more\n`;
            }
          }
          resultText += `\n`;
        }

        return resultText;
      }).join('---\n\n');
    }

    // Schema markup analysis
    const schemaScore = schemaAnalysis.score || 0;
    const schemaTypes = schemaAnalysis.types || [];
    const schemaRecommendations = schemaAnalysis.recommendations || [];

    const schemaTypesText = schemaTypes.length > 0
      ? schemaTypes.map((type: string) => `- ${type}`).join('\n')
      : '- None detected';

    const schemaRecsText = schemaRecommendations.length > 0
      ? schemaRecommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n')
      : '_No specific recommendations_';

    // Generate recommendations based on scores
    const recommendations = [];

    if (aiScore < 50) {
      recommendations.push({
        priority: 'HIGH',
        impact: 'High',
        effort: 'Medium',
        action: 'Improve AI visibility by getting cited in AI search results',
        details: 'Focus on creating authoritative, well-structured content that directly answers common questions in your field.'
      });
    }

    if (entityScore < 60) {
      recommendations.push({
        priority: 'HIGH',
        impact: 'High',
        effort: 'Low',
        action: 'Increase entity density and semantic richness',
        details: 'Add more specific named entities (people, places, organizations) and use them consistently throughout the content.'
      });
    }

    if (eeatScore < 70) {
      recommendations.push({
        priority: 'MEDIUM',
        impact: 'High',
        effort: 'Medium',
        action: 'Strengthen E-E-A-T signals',
        details: 'Add author credentials, citations to authoritative sources, and specific statistics to demonstrate expertise.'
      });
    }

    if (schemaScore < 50) {
      recommendations.push({
        priority: 'MEDIUM',
        impact: 'Medium',
        effort: 'Low',
        action: 'Implement structured data markup',
        details: 'Add JSON-LD schema markup for Organization, WebPage, and relevant content types to help AI understand your content.'
      });
    }

    const recommendationsText = recommendations.length > 0
      ? recommendations.map((rec, i) =>
          `${i + 1}. **[${rec.priority}]** ${rec.action}\n   - **Impact:** ${rec.impact} | **Effort:** ${rec.effort}\n   - ${rec.details}`
        ).join('\n\n')
      : '_No critical recommendations - keep up the good work!_';

    // Extract domain/institution name
    const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
    const institutionName = (entities as any)?.pageData?.organizationName || domain;
    const location = (entities as any)?.entities?.location || (entities as any)?.pageData?.location;
    const locationText = location?.city && location?.state
      ? `${location.city}, ${location.state}${location.region ? ' (' + location.region + ')' : ''}`
      : location?.state || 'Unknown';

    // Count total AI engine queries
    const totalQueries = promptResults.length * ((aiVisibility as any)?.summary?.enginesChecked || 0);
    const totalCitations = promptResults.reduce((sum: number, r: any) => {
      let count = 0;
      if (r.checks.googleAIOverview?.cited) count++;
      if (r.checks.perplexity?.cited) count++;
      if (r.checks.chatgpt?.cited) count++;
      return sum + count;
    }, 0);

    const markdown = `# AI Search Readiness Report Card

**Institution:** ${institutionName}
**Location:** ${locationText}
**URL:** ${url}
**Target Keyword:** ${keyword}
**Generated:** ${new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}

---

## Overall Grade: ${grade} (${overallScore}/100)

${gradeEmoji} **${gradeLabel}** - ${
  overallScore >= 90 ? 'Outstanding AI search readiness!' :
  overallScore >= 80 ? 'Good performance with some room for improvement.' :
  overallScore >= 70 ? 'Fair visibility. Focus on recommendations below.' :
  overallScore >= 60 ? 'Limited presence. Improvements needed.' :
  'Major improvements needed to compete in AI search.'
}

---

## 📊 AI Visibility Score: ${aiScore}/100

Tested across ${totalQueries} AI engine queries. ${totalCitations} citation${totalCitations !== 1 ? 's' : ''} found with ${(aiVisibility as any)?.visibility?.citationRate || 0}% citation rate.

### Citation Performance
- **Citation Rate:** ${(aiVisibility as any)?.visibility?.citationRate || 0}%
- **Domain Mention Rate:** ${(aiVisibility as any)?.visibility?.domainMentionRate || 0}%
- **Average Position:** ${(aiVisibility as any)?.visibility?.averagePosition ? '#' + (aiVisibility as any).visibility.averagePosition : 'Not cited'}


### Tested Prompts
${keywordExpansion.map((k: any, i: number) =>
  `${i + 1}. "${escapeForJson(k.prompt)}" *(${k.intent}, ${k.type})*`
).join('\n')}

---

## 🔑 Keyword Expansion Analysis

**Base Keyword:** ${keyword}

### Generated Search Prompts (${keywordExpansion.length})
${keywordExpansion.map((k: any, i: number) =>
  `${i + 1}. **${k.prompt}**\n   - Intent: ${k.intent}\n   - Type: ${k.type}`
).join('\n\n')}

### Intent Distribution
${Object.entries(intentCounts).map(([intent, count]) => `- ${intent}: ${count}`).join('\n')}

---

## 🎯 Entity & Content Analysis

### Semantic Score: ${Math.round((entityScore + topicScore + eeatScore) / 3)}/100

- **Entity Density:** ${entityScore}/100
- **Topic Coverage:** ${topicScore}/100
- **E-E-A-T Score:** ${eeatScore}/100

### Named Entities (${namedEntities.length})
${namedEntities.length > 0
  ? namedEntities.map((e: any) => `- **${e.name || e.text}** (${e.type}) - ${e.mentions} mention${e.mentions > 1 ? 's' : ''}`).join('\n')
  : '- No entities identified'}

### Key Topics
${topics.length > 0
  ? topics.map((t: any) => `- **${t.topic}** - ${t.relevance} relevance, ${t.coverage} coverage`).join('\n')
  : '- No topics identified'}

### E-E-A-T Signals
- **Author Credentials:** ${eeatSignals.authorCredentials?.length || 0} found
- **Accreditations:** ${eeatSignals.accreditation?.length || 0} mentioned
- **Statistics/Data Points:** ${eeatSignals.statistics?.length || 0} found
- **Expert Quotes:** ${eeatSignals.expertQuotes || 0}
- **Citations:** ${eeatSignals.citations || 0}


### ⚠️ Missing Critical Entities
${missingEntities.length > 0
  ? missingEntities.map((e: any) => `- **${e.entity}** - ${e.reason}`).join('\n')
  : '- No critical gaps identified'}


---

## 🏗️ Schema Markup Analysis

### Schema Score: ${schemaScore}/100

${schemaTypes.length > 0 ? `**Detected schema types:** ${schemaTypes.join(', ')}` : '**No schema markup detected**'}


${schemaRecommendations.length > 0 ? `### 📋 Schema Recommendations

${schemaRecommendations.map((rec: string, i: number) => {
  const priority = schemaScore < 30 ? 'HIGH' : schemaScore < 60 ? 'MEDIUM' : 'LOW';
  return `${i + 1}. **${rec}** (${priority} Priority)`;
}).join('\n\n')}` : ''}

---

## 🚀 Top Recommendations

${recommendations.length > 0 ? recommendations.map((rec, i) =>
  `
### ${i + 1}. ${rec.action} (${rec.priority} Priority)

${i === 0 && aiScore < 50 ? 'Your content is rarely cited by AI search engines. Focus on becoming a more authoritative, citable source.' :
  i === 1 && entityScore < 60 ? 'Your content lacks clear entity signals that AI systems use to understand context.' :
  i === 2 && eeatScore < 70 ? 'Add more expertise, authoritativeness, and trust indicators.' :
  'Address this gap to improve your AI search competitiveness.'}

**Impact:** ${rec.impact} - ${rec.details.split('.')[0]}
**Effort:** ${rec.effort}

**Action Steps:**
${rec.details.includes('Add') ? rec.details.split('Add').slice(1).map((s: string, idx: number) => `${idx + 1}. Add${s.trim()}`).join('\n') : `1. ${rec.details}`}
`
).join('\n\n') : '_Your page shows good AI search readiness. Continue monitoring and optimizing based on the metrics above._'}

---


## 🔍 Detailed AI Engine Results

${aiEngineResultsText || '_No detailed results available_'}

---


---


## Summary

${overallScore >= 70
  ? 'This page demonstrates good AI search readiness. Continue monitoring performance and addressing any remaining gaps.'
  : 'This page needs significant improvement in AI search readiness. Focus on the recommendations above to improve visibility in AI-powered search engines like ChatGPT, Perplexity, and Google AI Overviews.'}

---

*Generated by AI Grader Pro - Powered by Claude AI, Perplexity, and Google AI Overviews*
`;

    return {
      analysis,
      markdown,
    };
  } catch (error: any) {
    console.error('Error generating report:', error);
    // Return a minimal markdown report on error
    return {
      analysis,
      markdown: `# AI Search Readiness Report Card\n\n**URL:** ${url}\n**Keyword:** ${keyword}\n\n## Overall Score: 0/100\n\nAnalysis completed with limited data.\n\n### AI Visibility: ${(aiVisibility as any)?.visibility?.score || 0}/100\n### Entity Density: ${(entities as any)?.entities?.semanticScore?.entityDensity || 0}/100`,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, keyword } = await request.json();

    if (!url || !keyword) {
      return new Response(
        JSON.stringify({ error: 'URL and keyword are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (message: string, step: string) => {
          const data = JSON.stringify({ type: 'progress', message, step });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        try {
          // Run the analysis with progress updates
          const result = await runAnalysis(url, keyword, sendProgress);
          console.log(`[API] Analysis completed successfully, preparing response`);

          // Send the final result with safe JSON stringification
          try {
            console.log(`[API] Stringifying result (markdown length: ${result.markdown?.length || 0} chars)`);
            const data = JSON.stringify({ type: 'result', data: result });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            console.log(`[API] Result sent successfully`);
          } catch (jsonError: any) {
            console.error('[API] JSON stringify error:', jsonError);
            console.error('[API] Error occurred at position:', jsonError.message);
            // If JSON stringification fails, send a simplified version
            const safeResult = {
              ...result,
              markdown: result.markdown ? result.markdown.substring(0, 10000) + '\n\n[Report truncated due to size]' : ''
            };
            console.log(`[API] Sending truncated result instead`);
            const data = JSON.stringify({ type: 'result', data: safeResult });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          controller.close();
        } catch (error: any) {
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message || 'Analysis failed'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
