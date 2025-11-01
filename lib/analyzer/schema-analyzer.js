/**
 * Schema Analysis Module
 * Analyzes JSON-LD schema markup for completeness, appropriateness, and AI-friendliness
 */

/**
 * AI-friendly schema types for content analysis
 */
const AI_FRIENDLY_SCHEMAS = {
  // High priority for AI citations
  high: ['FAQPage', 'QAPage', 'HowTo', 'Course', 'EducationalOrganization', 'CollegeOrUniversity', 'University', 'EducationalOccupationalProgram'],
  // Medium priority
  medium: ['Article', 'WebPage', 'Organization', 'Place', 'Event', 'VideoObject'],
  // Low priority but helpful
  low: ['BreadcrumbList', 'WebSite', 'SearchAction', 'Person'],
};

/**
 * Required fields for common schema types
 */
const SCHEMA_REQUIREMENTS = {
  FAQPage: {
    required: ['@type', 'mainEntity'],
    recommended: ['name', 'description'],
    nestedRequired: { mainEntity: ['@type', 'name', 'acceptedAnswer'] },
  },
  QAPage: {
    required: ['@type', 'mainEntity'],
    recommended: ['name', 'description'],
    nestedRequired: { mainEntity: ['@type', 'name', 'acceptedAnswer', 'answerCount'] },
  },
  HowTo: {
    required: ['@type', 'name', 'step'],
    recommended: ['description', 'totalTime', 'supply', 'tool'],
    nestedRequired: { step: ['@type', 'name', 'text'] },
  },
  Course: {
    required: ['@type', 'name', 'description', 'provider'],
    recommended: ['offers', 'hasCourseInstance', 'aggregateRating'],
    nestedRequired: { provider: ['@type', 'name'] },
  },
  EducationalOrganization: {
    required: ['@type', 'name', 'url'],
    recommended: ['address', 'contactPoint', 'sameAs', 'logo'],
    nestedRequired: {},
  },
  Article: {
    required: ['@type', 'headline', 'author'],
    recommended: ['datePublished', 'dateModified', 'image', 'publisher'],
    nestedRequired: { author: ['@type', 'name'] },
  },
  Organization: {
    required: ['@type', 'name'],
    recommended: ['url', 'logo', 'sameAs', 'contactPoint', 'address'],
    nestedRequired: {},
  },
  CollegeOrUniversity: {
    required: ['@type', 'name', 'url'],
    recommended: ['address', 'logo', 'sameAs', 'telephone', 'areaServed'],
    nestedRequired: {},
  },
  University: {
    required: ['@type', 'name', 'url'],
    recommended: ['address', 'logo', 'sameAs', 'telephone', 'areaServed'],
    nestedRequired: {},
  },
  EducationalOccupationalProgram: {
    required: ['@type', 'name', 'description'],
    recommended: ['provider', 'timeToComplete', 'educationalCredentialAwarded', 'educationalProgramMode'],
    nestedRequired: {},
  },
  VideoObject: {
    required: ['@type', 'name', 'embedUrl'],
    recommended: ['thumbnailUrl', 'uploadDate', 'description'],
    nestedRequired: {},
  },
};

/**
 * Analyze a single schema object
 * @param {Object} schema - JSON-LD schema object
 * @returns {Object} Analysis result
 */
function analyzeSchemaObject(schema) {
  if (!schema || !schema['@type']) {
    return { valid: false, error: 'Missing @type' };
  }

  const schemaType = Array.isArray(schema['@type']) ? schema['@type'][0] : schema['@type'];
  const requirements = SCHEMA_REQUIREMENTS[schemaType];

  if (!requirements) {
    return {
      valid: true,
      type: schemaType,
      priority: getPriority(schemaType),
      completeness: 'unknown',
      note: 'Schema type not in common educational schemas',
    };
  }

  // Check required fields
  const missingRequired = requirements.required.filter(field => !schema[field]);
  const missingRecommended = requirements.recommended.filter(field => !schema[field]);

  // Check nested requirements
  const nestedIssues = [];
  Object.entries(requirements.nestedRequired).forEach(([field, nestedReqs]) => {
    if (schema[field]) {
      const nestedItems = Array.isArray(schema[field]) ? schema[field] : [schema[field]];
      nestedItems.forEach((item, index) => {
        const missing = nestedReqs.filter(req => !item[req]);
        if (missing.length > 0) {
          nestedIssues.push(`${field}[${index}] missing: ${missing.join(', ')}`);
        }
      });
    }
  });

  // Calculate completeness score
  const totalFields = requirements.required.length + requirements.recommended.length;
  const presentFields = totalFields - missingRequired.length - missingRecommended.length;
  const completenessScore = Math.round((presentFields / totalFields) * 100);

  return {
    valid: missingRequired.length === 0,
    type: schemaType,
    priority: getPriority(schemaType),
    completeness: completenessScore,
    missingRequired,
    missingRecommended,
    nestedIssues,
    fieldCount: Object.keys(schema).length,
  };
}

/**
 * Get priority level for schema type
 */
function getPriority(schemaType) {
  if (AI_FRIENDLY_SCHEMAS.high.includes(schemaType)) return 'high';
  if (AI_FRIENDLY_SCHEMAS.medium.includes(schemaType)) return 'medium';
  if (AI_FRIENDLY_SCHEMAS.low.includes(schemaType)) return 'low';
  return 'unknown';
}

/**
 * Analyze all schemas on a page
 * @param {Array} jsonLdSchemas - Array of JSON-LD schema objects
 * @returns {Object} Comprehensive schema analysis
 */
export function analyzeSchemas(jsonLdSchemas) {
  if (!jsonLdSchemas || jsonLdSchemas.length === 0) {
    return {
      hasSchema: false,
      schemaScore: 0,
      recommendations: [
        {
          priority: 'HIGH',
          type: 'FAQPage',
          reason: 'Add FAQ schema for common questions - highly beneficial for AI citations',
        },
        {
          priority: 'HIGH',
          type: 'Course or EducationalOrganization',
          reason: 'Add educational schema to establish expertise and authority',
        },
        {
          priority: 'MEDIUM',
          type: 'Article',
          reason: 'Add Article schema with author credentials for E-E-A-T signals',
        },
      ],
    };
  }

  // Expand nested schemas (e.g., WebPage.hasPart, mainEntity, video)
  const expanded = [];
  jsonLdSchemas.forEach(s => {
    if (!s || typeof s !== 'object') return;
    expanded.push(s);
    const pushNested = (node) => {
      if (!node) return;
      const list = Array.isArray(node) ? node : [node];
      list.forEach(item => {
        if (item && typeof item === 'object' && item['@type']) expanded.push(item);
      });
    };
    pushNested(s.hasPart);
    pushNested(s.mainEntity);
    pushNested(s.video);
  });

  const analyses = expanded.map(analyzeSchemaObject);

  // Count by priority
  const priorityCounts = {
    high: analyses.filter(a => a.priority === 'high').length,
    medium: analyses.filter(a => a.priority === 'medium').length,
    low: analyses.filter(a => a.priority === 'low').length,
  };

  // Find missing high-priority schemas
  const presentTypes = analyses.map(a => a.type);
  const missingHighPriority = AI_FRIENDLY_SCHEMAS.high.filter(
    type => !presentTypes.includes(type)
  );

  // Calculate overall schema score
  let schemaScore = 0;

  // Base points for having any schema
  schemaScore += 20;

  // Points for high-priority schemas (30 points max)
  schemaScore += Math.min(priorityCounts.high * 15, 30);

  // Points for medium-priority schemas (20 points max)
  schemaScore += Math.min(priorityCounts.medium * 10, 20);

  // Points for completeness (30 points max)
  const avgCompleteness = analyses
    .filter(a => typeof a.completeness === 'number')
    .reduce((sum, a) => sum + a.completeness, 0) / analyses.length || 0;
  schemaScore += Math.round((avgCompleteness / 100) * 30);

  schemaScore = Math.min(schemaScore, 100);

  // Generate recommendations
  const recommendations = [];

  // Missing high-priority schemas
  missingHighPriority.forEach(type => {
    const reason = getRecommendationReason(type);
    recommendations.push({
      priority: 'HIGH',
      type,
      reason,
    });
  });

  // Incomplete schemas
  analyses.forEach(analysis => {
    if (analysis.missingRequired && analysis.missingRequired.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: analysis.type,
        reason: `Complete required fields: ${analysis.missingRequired.join(', ')}`,
      });
    }
    if (analysis.missingRecommended && analysis.missingRecommended.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        type: analysis.type,
        reason: `Add recommended fields: ${analysis.missingRecommended.join(', ')}`,
      });
    }
    if (analysis.nestedIssues && analysis.nestedIssues.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        type: analysis.type,
        reason: `Fix nested structure: ${analysis.nestedIssues[0]}`,
      });
    }
  });

  return {
    hasSchema: true,
    schemaCount: jsonLdSchemas.length,
    schemaScore,
    schemasPresent: analyses.map(a => ({
      type: a.type,
      priority: a.priority,
      completeness: a.completeness,
      valid: a.valid,
    })),
    priorityCounts,
    avgCompleteness: Math.round(avgCompleteness),
    missingHighPriority,
    recommendations: recommendations.slice(0, 5), // Top 5 recommendations
    details: analyses,
  };
}

/**
 * Get recommendation reason for missing schema type
 */
function getRecommendationReason(schemaType) {
  const reasons = {
    FAQPage: 'Highly beneficial for AI citations - structure common questions with clear answers',
    QAPage: 'Great for AI visibility - use for dedicated Q&A content pages',
    HowTo: 'Excellent for step-by-step guides and process content',
    Course: 'Essential for course/program pages - helps AI understand educational offerings',
    EducationalOrganization: 'Establishes organizational authority and expertise',
    Article: 'Adds E-E-A-T signals with author and publish date information',
    Organization: 'Provides basic organizational context and contact information',
  };

  return reasons[schemaType] || `Adding ${schemaType} schema would improve structured data coverage`;
}

/**
 * Generate schema implementation guide
 */
export function generateSchemaGuide(schemaType) {
  const guides = {
    FAQPage: {
      description: 'Add FAQ schema for question/answer content',
      example: `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What programs do you offer?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "We offer bachelor's and master's degrees in..."
    }
  }]
}`,
      priority: 'HIGH',
      benefit: 'Dramatically increases chances of appearing in AI Overview citations',
    },
    Course: {
      description: 'Add Course schema for degree/certificate programs',
      example: `{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Online MBA",
  "description": "Flexible MBA program for working professionals",
  "provider": {
    "@type": "EducationalOrganization",
    "name": "University Name"
  }
}`,
      priority: 'HIGH',
      benefit: 'Helps AI understand your educational offerings and improves program visibility',
    },
  };

  return guides[schemaType] || null;
}
