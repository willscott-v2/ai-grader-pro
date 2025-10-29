#!/usr/bin/env node

/**
 * Test script for individual modules
 */

import { validateConfig } from './config.js';
import { expandKeyword } from './keyword-expander.js';
import { checkAIVisibility } from './ai-visibility-checker.js';
import { analyzePageEntities } from './entity-discovery.js';

async function testKeywordExpansion() {
  console.log('\n🧪 Testing Keyword Expansion...\n');

  const testKeywords = [
    'online MBA',
    'data analytics degree',
    'weekend MBA program',
  ];

  for (const keyword of testKeywords) {
    console.log(`\nTesting: "${keyword}"`);
    const expansions = await expandKeyword(keyword, 3);
    console.log('Result:');
    expansions.forEach((exp, i) => {
      console.log(`  ${i + 1}. ${exp.prompt}`);
      console.log(`     Intent: ${exp.intent}, Type: ${exp.type}`);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function testAIVisibility() {
  console.log('\n🧪 Testing AI Visibility Check...\n');

  const testUrl = 'https://online.wisc.edu/ultimate-guide-online-business-degrees/';
  const testPrompts = [
    { prompt: 'What are the best online business degree programs?', intent: 'comparison', type: 'best' },
    { prompt: 'How much does an online business degree cost?', intent: 'informational', type: 'cost' },
  ];

  const result = await checkAIVisibility(testUrl, testPrompts);
  console.log('\nResult:');
  console.log(JSON.stringify(result.summary, null, 2));
}

async function testEntityDiscovery() {
  console.log('\n🧪 Testing Entity Discovery...\n');

  const testUrl = 'https://online.wisc.edu/ultimate-guide-online-business-degrees/';

  const result = await analyzePageEntities(testUrl);
  console.log('\nResult:');
  console.log('Named Entities:', result.entities?.namedEntities?.length || 0);
  console.log('Topics:', result.entities?.topics?.length || 0);
  console.log('Semantic Scores:', result.entities?.semanticScore);
}

async function main() {
  console.log('\n🚀 AI Strategy Labs - Module Tests\n');
  console.log('='.repeat(80));

  try {
    validateConfig();

    const args = process.argv.slice(2);
    const test = args[0];

    if (!test || test === 'keyword') {
      await testKeywordExpansion();
    }

    if (!test || test === 'visibility') {
      await testAIVisibility();
    }

    if (!test || test === 'entities') {
      await testEntityDiscovery();
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Tests complete!\n');

  } catch (error) {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  }
}

main();
