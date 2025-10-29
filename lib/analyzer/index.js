#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { validateConfig, config } from './config.js';
import { parseSurveyCSV } from './csv-reader.js';
import { expandKeyword } from './keyword-expander.js';
import { checkAIVisibility } from './ai-visibility-checker.js';
import { analyzePageEntities } from './entity-discovery.js';
import {
  generateReportCard,
  generateOpportunityMatrix,
  exportReportCardMarkdown,
  exportOpportunityMatrixCSV,
} from './report-generators.js';

const SURVEY_CSV_PATH = process.argv[2] || '/Users/willscott/Downloads/Oct 2025 - AI Search Strategy Labs (Responses) - Form Responses 1.csv';
const OUTPUT_DIR = config.output.directory;
const MAX_ENTRIES = parseInt(process.argv[3]) || 5; // Limit for testing

/**
 * Main analysis function
 */
async function analyzeEntry(entry) {
  console.log('\n' + '='.repeat(80));
  console.log(`\n🎓 Analyzing: ${entry.name || 'Anonymous'}`);
  console.log(`   Keyword: "${entry.keyword}"`);
  console.log(`   URL: ${entry.url}\n`);

  try {
    // Validate URL
    try {
      new URL(entry.url);
    } catch (e) {
      throw new Error(`Invalid URL format: ${entry.url}`);
    }

    // Step 1: Analyze entities (moved earlier to get location data)
    console.log('Step 1/3: Analyzing entities and content...');
    let entities;
    try {
      entities = await analyzePageEntities(entry.url);
    } catch (error) {
      console.warn(`   ⚠️  Entity analysis failed: ${error.message}`);
      entities = {
        url: entry.url,
        entities: { semanticScore: { entityDensity: 0, topicCoverage: 0, eeatScore: 0 } },
        error: error.message,
      };
    }

    // Step 2: Expand keyword into prompts (using location from entities)
    console.log('\nStep 2/3: Expanding keyword into AI-ready prompts...');
    const location = entities.entities?.location || entities.pageData?.location || null;
    let keywordExpansion;
    try {
      keywordExpansion = await expandKeyword(entry.keyword, 5, location);
    } catch (error) {
      console.warn(`   ⚠️  Keyword expansion failed, using fallbacks: ${error.message}`);
      // Use fallback prompts
      keywordExpansion = [
        { prompt: `What is ${entry.keyword}?`, intent: 'informational', type: 'what' },
        { prompt: `Best ${entry.keyword}`, intent: 'comparison', type: 'best' },
        { prompt: `How much does ${entry.keyword} cost?`, intent: 'informational', type: 'cost' },
      ];
    }

    // Step 3: Check AI visibility
    console.log('\nStep 3/3: Checking AI visibility...');
    let aiVisibility;
    try {
      aiVisibility = await checkAIVisibility(entry.url, keywordExpansion);
    } catch (error) {
      console.warn(`   ⚠️  AI visibility check failed: ${error.message}`);
      aiVisibility = {
        url: entry.url,
        visibility: { score: 0, citationRate: 0, domainMentionRate: 0 },
        error: error.message,
      };
    }

    // Compile results
    const analysis = {
      ...entry,
      keywordExpansion,
      aiVisibility,
      entities,
      timestamp: new Date().toISOString(),
      success: true,
    };

    console.log('\n✅ Analysis complete!');
    console.log(`   Overall AI Visibility: ${aiVisibility.visibility?.score || 0}/100`);
    console.log(`   Entity Density: ${entities.entities?.semanticScore?.entityDensity || 0}/100`);

    return analysis;
  } catch (error) {
    console.error(`\n❌ Fatal error analyzing ${entry.url}:`, error.message);
    return {
      ...entry,
      error: error.message,
      success: false,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 AI Strategy Labs - SEO Analyzer\n');
  console.log('='.repeat(80));

  try {
    // Validate configuration
    validateConfig();

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      console.log(`✓ Created output directory: ${OUTPUT_DIR}`);
    }

    // Parse survey data
    console.log(`\n📋 Reading survey data from: ${SURVEY_CSV_PATH}`);
    const entries = await parseSurveyCSV(SURVEY_CSV_PATH);

    if (entries.length === 0) {
      console.log('⚠️  No valid entries found in survey data.');
      return;
    }

    // Limit entries for testing
    const entriesToProcess = entries.slice(0, MAX_ENTRIES);
    console.log(`\n📊 Processing ${entriesToProcess.length} of ${entries.length} entries...\n`);

    // Process each entry
    const analyses = [];
    for (let i = 0; i < entriesToProcess.length; i++) {
      console.log(`\n[${i + 1}/${entriesToProcess.length}]`);
      const analysis = await analyzeEntry(entriesToProcess[i]);
      analyses.push(analysis);

      // Save individual analysis
      const analysisFile = path.join(OUTPUT_DIR, `analysis-${i + 1}.json`);
      fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));

      // Rate limiting between entries
      if (i < entriesToProcess.length - 1) {
        console.log('\n⏱️  Waiting 5 seconds before next entry...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📄 Generating Reports...\n');

    // Generate Option A: Individual Report Cards
    console.log('Generating individual report cards...');
    const validAnalyses = analyses.filter(a => !a.error);

    for (const analysis of validAnalyses) {
      const reportCard = generateReportCard(analysis);
      exportReportCardMarkdown(reportCard, OUTPUT_DIR);

      // Also save as JSON
      const jsonFile = path.join(
        OUTPUT_DIR,
        `report-card-${reportCard.institution}.json`
      );
      fs.writeFileSync(jsonFile, JSON.stringify(reportCard, null, 2));
    }

    // Generate Option B: Opportunity Matrix
    console.log('\nGenerating keyword opportunity matrix...');
    const matrix = generateOpportunityMatrix(validAnalyses);
    exportOpportunityMatrixCSV(matrix, OUTPUT_DIR);

    // Also save as JSON
    const matrixJsonFile = path.join(OUTPUT_DIR, 'opportunity-matrix.json');
    fs.writeFileSync(matrixJsonFile, JSON.stringify(matrix, null, 2));

    // Generate summary report
    console.log('\nGenerating summary report...');
    const summary = {
      totalEntries: entries.length,
      processed: entriesToProcess.length,
      successful: validAnalyses.length,
      failed: analyses.filter(a => a.error).length,
      averageScores: {
        aiVisibility: Math.round(
          validAnalyses.reduce((sum, a) => sum + a.aiVisibility.visibility.score, 0) /
          validAnalyses.length
        ),
        entityDensity: Math.round(
          validAnalyses.reduce((sum, a) =>
            sum + (a.entities.entities?.semanticScore?.entityDensity || 0), 0
          ) / validAnalyses.length
        ),
      },
      timestamp: new Date().toISOString(),
    };

    const summaryFile = path.join(OUTPUT_DIR, 'summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Analysis Complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Total Entries: ${summary.totalEntries}`);
    console.log(`   Processed: ${summary.processed}`);
    console.log(`   Successful: ${summary.successful}`);
    console.log(`   Failed: ${summary.failed}`);
    console.log(`\n📈 Average Scores:`);
    console.log(`   AI Visibility: ${summary.averageScores.aiVisibility}/100`);
    console.log(`   Entity Density: ${summary.averageScores.entityDensity}/100`);
    console.log(`\n📁 Reports saved to: ${OUTPUT_DIR}`);
    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
