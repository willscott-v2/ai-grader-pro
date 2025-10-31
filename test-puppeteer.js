import { extractSchemasWithPuppeteer } from './lib/analyzer/puppeteer-schema-detector.js';

const url = process.argv[2] || 'https://www.ultimatemedical.edu/program/medical-billing-and-coding/';

console.log(`\n🧪 Testing Puppeteer Schema Detector`);
console.log(`URL: ${url}\n`);

try {
  const result = await extractSchemasWithPuppeteer(url);

  console.log(`\n📊 Results:`);
  console.log(`Success: ${result.success}`);
  console.log(`Schemas found: ${result.count}`);

  if (result.timing) {
    console.log(`\n⏱️  Timing:`);
    console.log(`  Total: ${result.timing.total}ms`);
    console.log(`  Navigation: ${result.timing.navigation}ms`);
    console.log(`  GTM wait: ${result.timing.gtmWait}ms`);
    console.log(`  Extraction: ${result.timing.extraction}ms`);
  }

  if (result.schemas && result.schemas.length > 0) {
    console.log(`\n📋 Schema types found:`);
    result.schemas.forEach((schema, i) => {
      console.log(`  ${i + 1}. ${schema['@type']} (location: ${schema._meta?.location || 'unknown'})`);
    });

    console.log(`\n📄 Full schema data:`);
    console.log(JSON.stringify(result.schemas, null, 2));
  } else {
    console.log(`\n⚠️  No schemas found`);
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }
  }

} catch (error) {
  console.error(`\n❌ Test failed:`, error.message);
  console.error(error.stack);
  process.exit(1);
}
