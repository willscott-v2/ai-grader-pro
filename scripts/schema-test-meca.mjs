#!/usr/bin/env node

// Schema test script focusing on GTM-injected JSON-LD (e.g., meca.edu)
// Usage: node scripts/schema-test-meca.mjs [url]

const DEFAULT_URL = 'https://meca.edu/academics/animation-and-game-art/';

async function main() {
  const url = process.argv[2] || DEFAULT_URL;
  console.log(`\nTesting schema extraction for: ${url}`);

  try {
    const { extractSchemasWithPuppeteer } = await import('../lib/analyzer/puppeteer-schema-detector.js');
    const res = await extractSchemasWithPuppeteer(url);
    console.log(`\nPuppeteer success: ${res.success} | schemas: ${res.count}`);
    if (res.schemas?.length) {
      const types = res.schemas.map(s => s && s['@type']).filter(Boolean);
      console.log('Types:', types);
      console.log('\nFirst schema:');
      console.log(JSON.stringify(res.schemas[0], null, 2));
      return;
    }
  } catch (e) {
    console.error('Puppeteer path failed:', e.message);
  }

  try {
    const { fetchAndAnalyzeSchemas } = await import('../lib/analyzer/entity-discovery.js');
    const res = await fetchAndAnalyzeSchemas(url);
    console.log(`\nFallback (fetch/firecrawl) schemas: ${res.jsonLd?.length || 0}`);
    if (res.jsonLd?.length) {
      console.log('Types:', (res.schemaAnalysis?.schemasPresent || []).map(s => s.type));
      console.log('\nFirst schema:');
      console.log(JSON.stringify(res.jsonLd[0], null, 2));
    } else {
      console.log('No schemas detected via fallback. Ensure FIRECRAWL_API_KEY is set or run where Chrome is available.');
    }
  } catch (e) {
    console.error('Fallback path failed:', e.message);
    process.exit(1);
  }
}

main();


