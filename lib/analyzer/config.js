export const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY,
  },
  dataforseo: {
    login: process.env.DATAFORSEO_LOGIN,
    password: process.env.DATAFORSEO_PASSWORD,
  },
  serpapi: {
    apiKey: process.env.SERPAPI_API_KEY,
  },
  firecrawl: {
    apiKey: process.env.FIRECRAWL_API_KEY,
  },
  analysis: {
    // Number of prompt variations to generate per keyword
    promptVariations: 5,
    // Number of AI engines to test against
    aiEngines: ['perplexity', 'chatgpt'],
  },
  output: {
    directory: './output',
    formats: ['json', 'markdown', 'csv'],
  },
};

export function validateConfig() {
  const required = ['ANTHROPIC_API_KEY'];
  const recommended = ['PERPLEXITY_API_KEY', 'OPENAI_API_KEY'];

  const missing = required.filter(key => !process.env[key]);
  const missingRecommended = recommended.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (missingRecommended.length > 0) {
    console.warn(`⚠️  Warning: Missing recommended API keys: ${missingRecommended.join(', ')}`);
    console.warn('   Some features may be limited.\n');
  }

  return true;
}
