import fs from 'fs';
import path from 'path';

/**
 * Generate individual URL Report Card (Option A)
 * @param {Object} analysis - Complete analysis results
 * @returns {Object} Report data
 */
export function generateReportCard(analysis) {
  const { url, keyword, keywordExpansion, aiVisibility, entities } = analysis;

  // Calculate overall grade
  const overallScore = calculateOverallScore({
    aiVisibility: aiVisibility.visibility.score,
    entityScore: entities.entities?.semanticScore?.entityDensity || 0,
    eeatScore: entities.entities?.semanticScore?.eeatScore || 0,
  });

  const grade = getLetterGrade(overallScore);

  // Use organization name from entities if available, otherwise extract from URL
  const institution = entities.pageData?.organizationName || extractInstitutionName(url);

  return {
    institution,
    url,
    keyword,
    generatedDate: new Date().toISOString(),
    overallScore,
    grade,
    sections: {
      aiVisibility: formatAIVisibilitySection(aiVisibility),
      keywordExpansion: formatKeywordExpansionSection(keywordExpansion),
      entities: formatEntitiesSection(entities),
      schema: formatSchemaSection(entities),
      recommendations: generateRecommendations(analysis),
    },
  };
}

/**
 * Generate Keyword Opportunity Matrix (Option B)
 * @param {Array<Object>} analyses - Array of analysis results
 * @returns {Array<Object>} Matrix rows
 */
export function generateOpportunityMatrix(analyses) {
  return analyses.map(analysis => {
    const { url, keyword, aiVisibility, entities, keywordExpansion } = analysis;

    const opportunity = calculateOpportunityScore(analysis);

    // Use organization name from entities if available, otherwise extract from URL
    const institution = entities.pageData?.organizationName || extractInstitutionName(url);

    // Format tested prompts as semicolon-delimited list
    const testedPrompts = keywordExpansion
      ?.map(p => p.prompt)
      .join('; ') || '';

    return {
      institution,
      url,
      keyword,
      currentAIVisibility: aiVisibility.visibility.score,
      citationRate: aiVisibility.visibility.citationRate,
      entityDensity: entities.entities?.semanticScore?.entityDensity || 0,
      eeatScore: entities.entities?.semanticScore?.eeatScore || 0,
      opportunityScore: opportunity.score,
      difficulty: opportunity.difficulty,
      priority: opportunity.priority,
      topAction: opportunity.topAction,
      estimatedEffort: opportunity.effort,
      testedPrompts,
    };
  });
}

/**
 * Export report card as Markdown
 */
export function exportReportCardMarkdown(reportCard, outputDir) {
  const filename = `report-card-${sanitizeFilename(reportCard.institution)}.md`;
  const filepath = path.join(outputDir, filename);

  const location = reportCard.sections.entities.location;
  const locationDisplay = location && (location.city || location.state)
    ? `**Location:** ${location.city ? location.city + ', ' : ''}${location.state || ''}${location.region ? ' (' + location.region + ')' : ''}\n`
    : '';

  const markdown = `# AI Search Readiness Report Card

**Institution:** ${reportCard.institution}
${locationDisplay}**URL:** ${reportCard.url}
**Target Keyword:** ${reportCard.keyword}
**Generated:** ${new Date(reportCard.generatedDate).toLocaleDateString()}

---

## Overall Grade: ${reportCard.grade} (${reportCard.overallScore}/100)

${getGradeInterpretation(reportCard.grade)}

---

## 📊 AI Visibility Score: ${reportCard.sections.aiVisibility.score}/100

${reportCard.sections.aiVisibility.summary}

### Citation Performance
- **Citation Rate:** ${reportCard.sections.aiVisibility.citationRate}%
- **Domain Mention Rate:** ${reportCard.sections.aiVisibility.domainMentionRate}%
${reportCard.sections.aiVisibility.averagePosition ? `- **Average Position:** #${reportCard.sections.aiVisibility.averagePosition}\n` : ''}

### Tested Prompts
${reportCard.sections.aiVisibility.prompts.map((p, i) =>
  `${i + 1}. "${p.prompt}" *(${p.intent}, ${p.type})*`
).join('\n')}

---

## 🔑 Keyword Expansion Analysis

**Base Keyword:** ${reportCard.keyword}

### Generated Search Prompts (${reportCard.sections.keywordExpansion.prompts.length})
${reportCard.sections.keywordExpansion.prompts.map((p, i) =>
  `${i + 1}. **${p.prompt}**\n   - Intent: ${p.intent}\n   - Type: ${p.type}`
).join('\n\n')}

### Intent Distribution
${Object.entries(reportCard.sections.keywordExpansion.intentDistribution)
  .map(([intent, count]) => `- ${intent}: ${count}`)
  .join('\n')}

---

## 🎯 Entity & Content Analysis

### Semantic Score: ${reportCard.sections.entities.semanticScore.overall}/100

- **Entity Density:** ${reportCard.sections.entities.semanticScore.entityDensity}/100
- **Topic Coverage:** ${reportCard.sections.entities.semanticScore.topicCoverage}/100
- **E-E-A-T Score:** ${reportCard.sections.entities.semanticScore.eeatScore}/100

### Named Entities (${reportCard.sections.entities.namedEntities.length})
${reportCard.sections.entities.namedEntities.slice(0, 10).map(e =>
  `- **${e.name}** (${e.type}) - ${e.mentions} mentions`
).join('\n')}

### Key Topics
${reportCard.sections.entities.topics.map(t =>
  `- **${t.topic}** - ${t.relevance} relevance, ${t.coverage} coverage`
).join('\n')}

### E-E-A-T Signals
- **Author Credentials:** ${reportCard.sections.entities.eeatSignals.authorCredentials.length} found
- **Accreditations:** ${reportCard.sections.entities.eeatSignals.accreditation.length} mentioned
- **Statistics/Data Points:** ${reportCard.sections.entities.eeatSignals.statistics.length} found
- **Expert Quotes:** ${reportCard.sections.entities.eeatSignals.expertQuotes}
- **Citations:** ${reportCard.sections.entities.eeatSignals.citations}

${reportCard.sections.entities.missingEntities.length > 0 ? `
### ⚠️ Missing Critical Entities
${reportCard.sections.entities.missingEntities.map(m =>
  `- **${m.entity}** - ${m.reason}`
).join('\n')}
` : ''}

---

## 🏗️ Schema Markup Analysis

### Schema Score: ${reportCard.sections.schema.schemaScore}/100

${reportCard.sections.schema.hasSchema ? `
**Schemas Present (${reportCard.sections.schema.schemaCount}):**
${reportCard.sections.schema.schemasPresent.map(s =>
  `- **${s.type}** - ${s.priority} priority, ${s.completeness}% complete ${s.valid ? '✓' : '⚠️'}`
).join('\n')}

**Schema Quality:**
- High-priority schemas: ${reportCard.sections.schema.priorityCounts.high}
- Average completeness: ${reportCard.sections.schema.avgCompleteness}%
` : '**No schema markup detected**'}

${reportCard.sections.schema.recommendations.length > 0 ? `
### 📋 Schema Recommendations

${reportCard.sections.schema.recommendations.map((rec, i) =>
  `${i + 1}. **${rec.type}** (${rec.priority} Priority)
   - ${rec.reason}`
).join('\n\n')}
` : ''}

---

## 🚀 Top Recommendations

${reportCard.sections.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.title} (${rec.priority} Priority)

${rec.description}

**Impact:** ${rec.impact}
**Effort:** ${rec.effort}

**Action Steps:**
${rec.steps.map((step, j) => `${j + 1}. ${step}`).join('\n')}
`).join('\n')}

---

${reportCard.sections.aiVisibility.promptResults ? `
## 🔍 Detailed AI Engine Results

${reportCard.sections.aiVisibility.promptResults.map((result, i) => {
  const { prompt, checks } = result;

  return `### Prompt ${i + 1}: "${prompt.prompt}"
**Intent:** ${prompt.intent} | **Type:** ${prompt.type}

${checks.googleAIOverview ? `#### Google AI Overview
- **Cited:** ${checks.googleAIOverview.cited ? '✅ Yes' : '❌ No'}${checks.googleAIOverview.position ? ` (Position #${checks.googleAIOverview.position})` : ''}
- **Has AI Overview:** ${checks.googleAIOverview.hasAIOverview ? 'Yes' : 'No'}
- **Total Citations:** ${checks.googleAIOverview.totalCitations || 0}

${checks.googleAIOverview.overviewText ? `**AI Response:**
> ${checks.googleAIOverview.overviewText.substring(0, 500)}${checks.googleAIOverview.overviewText.length > 500 ? '...' : ''}

` : ''}${checks.googleAIOverview.citations && checks.googleAIOverview.citations.length > 0 ? `**Citations:**
${checks.googleAIOverview.citations.slice(0, 5).map((c, idx) => `${idx + 1}. ${c}`).join('\n')}${checks.googleAIOverview.citations.length > 5 ? `\n...and ${checks.googleAIOverview.citations.length - 5} more` : ''}

` : ''}` : ''}${checks.perplexity ? `#### Perplexity AI
- **Cited:** ${checks.perplexity.cited ? '✅ Yes' : '❌ No'}${checks.perplexity.position ? ` (Position #${checks.perplexity.position})` : ''}
- **Total Citations:** ${checks.perplexity.totalCitations || 0}

${checks.perplexity.response ? `**AI Response:**
> ${checks.perplexity.response.substring(0, 500)}${checks.perplexity.response.length > 500 ? '...' : ''}

` : ''}${checks.perplexity.citations && checks.perplexity.citations.length > 0 ? `**Citations:**
${checks.perplexity.citations.slice(0, 5).map((c, idx) => `${idx + 1}. ${c}`).join('\n')}${checks.perplexity.citations.length > 5 ? `\n...and ${checks.perplexity.citations.length - 5} more` : ''}

` : ''}` : ''}${checks.chatgpt ? `#### ChatGPT
- **Cited:** ${checks.chatgpt.cited ? '✅ Yes' : '❌ No'}${checks.chatgpt.position ? ` (Position #${checks.chatgpt.position})` : ''}
- **Total Citations:** ${checks.chatgpt.totalCitations || 0}

${checks.chatgpt.response ? `**AI Response:**
> ${checks.chatgpt.response.substring(0, 500)}${checks.chatgpt.response.length > 500 ? '...' : ''}

` : ''}${checks.chatgpt.citations && checks.chatgpt.citations.length > 0 ? `**Citations:**
${checks.chatgpt.citations.slice(0, 5).map((c, idx) => `${idx + 1}. ${c}`).join('\n')}${checks.chatgpt.citations.length > 5 ? `\n...and ${checks.chatgpt.citations.length - 5} more` : ''}

` : ''}` : ''}---
`;
}).join('\n')}

---
` : ''}

## Summary

This page ${reportCard.overallScore >= 70 ? 'shows strong' : reportCard.overallScore >= 50 ? 'shows moderate' : 'needs significant improvement in'} AI search readiness. Focus on the recommendations above to improve visibility in AI-powered search engines like ChatGPT, Perplexity, and Google AI Overviews.

---

*Generated by AI Strategy Labs Analyzer*
`;

  fs.writeFileSync(filepath, markdown);
  console.log(`✓ Report card saved: ${filepath}`);

  return filepath;
}

/**
 * Export opportunity matrix as CSV
 */
export function exportOpportunityMatrixCSV(matrix, outputDir) {
  const filename = 'keyword-opportunity-matrix.csv';
  const filepath = path.join(outputDir, filename);

  const headers = [
    'Institution',
    'URL',
    'Keyword',
    'Current AI Visibility',
    'Citation Rate %',
    'Entity Density',
    'E-E-A-T Score',
    'Opportunity Score',
    'Difficulty',
    'Priority',
    'Top Action',
    'Estimated Effort',
    'Tested Prompts',
  ];

  const rows = matrix.map(row => [
    row.institution,
    row.url,
    row.keyword,
    row.currentAIVisibility,
    row.citationRate,
    row.entityDensity,
    row.eeatScore,
    row.opportunityScore,
    row.difficulty,
    row.priority,
    row.topAction,
    row.estimatedEffort,
    row.testedPrompts,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  fs.writeFileSync(filepath, csv);
  console.log(`✓ Opportunity matrix saved: ${filepath}`);

  return filepath;
}

// Helper functions

function calculateOverallScore({ aiVisibility, entityScore, eeatScore }) {
  return Math.round(
    aiVisibility * 0.5 +      // 50% weight on AI visibility
    entityScore * 0.3 +       // 30% weight on entity density
    eeatScore * 0.2           // 20% weight on E-E-A-T
  );
}

function getLetterGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getGradeInterpretation(grade) {
  const interpretations = {
    'A': '✅ **Excellent** - Your content is highly optimized for AI search engines.',
    'B': '👍 **Good** - Strong foundation with room for minor improvements.',
    'C': '⚠️ **Fair** - Moderate optimization; several improvements recommended.',
    'D': '⚡ **Needs Work** - Significant gaps in AI search readiness.',
    'F': '🚨 **Critical** - Major improvements needed to compete in AI search.',
  };
  return interpretations[grade] || '';
}

function extractInstitutionName(url) {
  try {
    const domain = new URL(url).hostname;
    // Extract institution name from domain (e.g., wisc.edu -> University of Wisconsin)
    return domain.replace('www.', '').split('.')[0];
  } catch {
    return 'Unknown Institution';
  }
}

function formatAIVisibilitySection(aiVisibility) {
  const v = aiVisibility.visibility;
  return {
    score: v.score,
    citationRate: v.citationRate,
    domainMentionRate: v.domainMentionRate,
    averagePosition: v.averagePosition,
    summary: `Tested across ${v.totalChecks} AI engine queries. ${v.citedCount} citations found with ${v.citationRate}% citation rate.`,
    prompts: aiVisibility.promptResults.map(r => r.prompt),
    promptResults: aiVisibility.promptResults, // Include full results with AI responses
  };
}

function formatKeywordExpansionSection(expansions) {
  const intentCounts = {};
  expansions.forEach(exp => {
    intentCounts[exp.intent] = (intentCounts[exp.intent] || 0) + 1;
  });

  return {
    prompts: expansions,
    intentDistribution: intentCounts,
  };
}

function formatEntitiesSection(entities) {
  if (entities.error) {
    return {
      error: entities.error,
      semanticScore: { overall: 0, entityDensity: 0, topicCoverage: 0, eeatScore: 0 },
      namedEntities: [],
      topics: [],
      eeatSignals: {
        authorCredentials: [],
        accreditation: [],
        statistics: [],
        expertQuotes: 0,
        citations: 0,
      },
      missingEntities: [],
      location: null,
    };
  }

  const e = entities.entities;
  return {
    semanticScore: {
      overall: Math.round((e.semanticScore.entityDensity + e.semanticScore.topicCoverage + e.semanticScore.eeatScore) / 3),
      ...e.semanticScore,
    },
    namedEntities: e.namedEntities || [],
    topics: e.topics || [],
    eeatSignals: e.eeatSignals || {},
    missingEntities: e.missingEntities || [],
    location: e.location || entities.pageData?.location || null,
  };
}

function formatSchemaSection(entities) {
  if (entities.error || !entities.entities?.schemaAnalysis) {
    return {
      hasSchema: false,
      schemaScore: 0,
      schemaCount: 0,
      schemasPresent: [],
      priorityCounts: { high: 0, medium: 0, low: 0 },
      avgCompleteness: 0,
      recommendations: [
        { priority: 'HIGH', type: 'FAQPage', reason: 'Add FAQ schema for AI citations' },
        { priority: 'HIGH', type: 'Course', reason: 'Add Course schema for educational content' },
      ],
    };
  }

  return entities.entities.schemaAnalysis;
}

function generateRecommendations(analysis) {
  const recommendations = [];
  const { aiVisibility, entities } = analysis;

  // Recommendation based on AI visibility
  if (aiVisibility.visibility.score < 50) {
    recommendations.push({
      title: 'Improve AI Citation Presence',
      priority: 'HIGH',
      description: 'Your content is rarely cited by AI search engines. Focus on becoming a more authoritative, citable source.',
      impact: 'High - Directly increases AI search visibility',
      effort: 'Medium - Requires content restructuring',
      steps: [
        'Add specific statistics and data points that AI can cite',
        'Structure content with clear Q&A sections',
        'Include expert quotes and attributions',
        'Add FAQ schema markup',
      ],
    });
  }

  // Recommendation based on entity density
  if (entities.entities?.semanticScore?.entityDensity < 60) {
    recommendations.push({
      title: 'Enhance Entity Coverage',
      priority: 'HIGH',
      description: 'Your content lacks clear entity signals that AI systems use to understand context.',
      impact: 'High - Improves AI comprehension',
      effort: 'Low - Quick content additions',
      steps: [
        'Clearly mention program names, credentials, and accreditations',
        'Add institution name and location throughout content',
        'Include faculty names and credentials',
        'Reference specific courses or curriculum details',
      ],
    });
  }

  // Recommendation based on E-E-A-T
  if (entities.entities?.semanticScore?.eeatScore < 60) {
    recommendations.push({
      title: 'Strengthen E-E-A-T Signals',
      priority: 'MEDIUM',
      description: 'Add more expertise, authoritativeness, and trust indicators.',
      impact: 'Medium - Builds credibility with AI',
      effort: 'Medium - Requires gathering credentials',
      steps: [
        'Add author bios with credentials for all content',
        'Display accreditation badges prominently',
        'Include student outcome statistics',
        'Add external citations to authoritative sources',
      ],
    });
  }

  // Recommendation for missing entities
  if (entities.entities?.missingEntities?.length > 0) {
    recommendations.push({
      title: 'Address Content Gaps',
      priority: 'MEDIUM',
      description: `Your content is missing ${entities.entities.missingEntities.length} key entities that competitors include.`,
      impact: 'Medium - Closes competitive gaps',
      effort: 'Low - Add specific mentions',
      steps: entities.entities.missingEntities.slice(0, 5).map(m =>
        `Add content about: ${m.entity}`
      ),
    });
  }

  return recommendations.slice(0, 4); // Top 4 recommendations
}

function calculateOpportunityScore(analysis) {
  const { aiVisibility, entities } = analysis;

  const currentVisibility = aiVisibility.visibility?.score || 0;
  const citationRate = aiVisibility.visibility?.citationRate || 0;
  const entityDensity = entities.entities?.semanticScore?.entityDensity || 0;
  const eeatScore = entities.entities?.semanticScore?.eeatScore || 0;
  const topicCoverage = entities.entities?.semanticScore?.topicCoverage || 0;

  const schemaAnalysis = entities.entities?.schemaAnalysis;
  const hasSchema = schemaAnalysis?.hasSchema || false;
  const schemaScore = schemaAnalysis?.schemaScore || 0;
  const missingEntities = entities.entities?.missingEntities || [];

  // Calculate opportunity score
  const gap = 100 - currentVisibility;
  const potential = (entityDensity + eeatScore) / 2;
  const opportunityScore = Math.round(gap * 0.6 + potential * 0.4);

  // Determine weakest areas
  const weaknesses = [];
  if (entityDensity < 60) weaknesses.push('entities');
  if (eeatScore < 60) weaknesses.push('eeat');
  if (!hasSchema || schemaScore < 50) weaknesses.push('schema');
  if (citationRate === 0 && currentVisibility < 30) weaknesses.push('citations');
  if (topicCoverage < 60) weaknesses.push('topics');

  // Generate intelligent action based on specific weaknesses
  let topAction = '';
  let effort = 'Medium';
  let difficulty = 'Medium';
  let priority = 'Medium';

  // High visibility - maintenance mode
  if (currentVisibility >= 70) {
    topAction = 'Maintain and refresh content regularly';
    effort = 'Low';
    difficulty = 'Low';
    priority = 'Low';
  }
  // Low visibility, missing schema
  else if (currentVisibility < 30 && weaknesses.includes('schema')) {
    if (weaknesses.includes('eeat')) {
      topAction = 'Add FAQ schema, author credentials, and statistics';
      effort = 'Medium';
      difficulty = 'Low';
      priority = 'High';
    } else {
      topAction = 'Implement schema markup (FAQ, Course, Organization)';
      effort = 'Low';
      difficulty = 'Low';
      priority = 'High';
    }
  }
  // Low visibility, has schema but weak content
  else if (currentVisibility < 30 && hasSchema && weaknesses.includes('entities')) {
    topAction = 'Increase entity density with program names and credentials';
    effort = 'Low';
    difficulty = 'Low';
    priority = 'High';
  }
  // Low visibility, weak E-E-A-T
  else if (currentVisibility < 30 && weaknesses.includes('eeat')) {
    topAction = 'Add authoritative citations, statistics, and expert quotes';
    effort = 'Medium';
    difficulty = 'Medium';
    priority = 'High';
  }
  // Low visibility, multiple weaknesses
  else if (currentVisibility < 30 && weaknesses.length >= 3) {
    topAction = 'Complete content overhaul with schema and E-E-A-T signals';
    effort = 'High';
    difficulty = 'High';
    priority = 'Medium';
  }
  // Medium visibility with missing entities
  else if (currentVisibility >= 30 && currentVisibility < 70 && missingEntities.length > 0) {
    topAction = `Address content gaps (missing ${missingEntities.length} key entities)`;
    effort = 'Low';
    difficulty = 'Low';
    priority = 'Medium';
  }
  // Medium visibility with citation issues
  else if (currentVisibility >= 30 && currentVisibility < 70 && citationRate < 20) {
    topAction = 'Optimize for citation-worthy content (add data and quotes)';
    effort = 'Medium';
    difficulty = 'Medium';
    priority = 'Medium';
  }
  // Schema exists but incomplete
  else if (hasSchema && schemaScore < 70) {
    topAction = 'Enhance existing schema completeness and add FAQ';
    effort = 'Low';
    difficulty = 'Low';
    priority = 'Medium';
  }
  // General optimization
  else {
    topAction = 'Optimize content structure and semantic depth';
    effort = 'Medium';
    difficulty = 'Medium';
    priority = 'Medium';
  }

  return {
    score: opportunityScore,
    difficulty,
    priority,
    effort,
    topAction,
  };
}

function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}
