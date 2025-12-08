'use client';

import { downloadMarkdown, downloadJSON } from '@/lib/download-utils';
import { Button } from '@/components/ui/design-system/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/design-system/card';

interface ResultsDisplayProps {
  data: {
    analysis: any;
    markdown: string;
  };
  onAnalyzeAnother: () => void;
}

function getGradeScore(score: number): { grade: string; color: string; bgColor: string; emoji: string; label: string } {
  if (score >= 90) return { grade: 'A', color: 'text-green-700', bgColor: 'bg-green-100', emoji: '🎯', label: 'Excellent' };
  if (score >= 80) return { grade: 'B', color: 'text-blue-700', bgColor: 'bg-blue-100', emoji: '📊', label: 'Good' };
  if (score >= 70) return { grade: 'C', color: 'text-yellow-700', bgColor: 'bg-yellow-100', emoji: '⚠️', label: 'Fair' };
  if (score >= 60) return { grade: 'D', color: 'text-orange-700', bgColor: 'bg-orange-100', emoji: '🚨', label: 'Poor' };
  return { grade: 'F', color: 'text-red-700', bgColor: 'bg-red-100', emoji: '🚨', label: 'Critical' };
}

export default function ResultsDisplay({ data, onAnalyzeAnother }: ResultsDisplayProps) {
  const { analysis, markdown } = data;

  // Schema-only view: just show schema analysis section and basic header
  if (analysis?.schemaOnly) {
    const schemaAnalysis = (data as any).schemaAnalysis || {};
    const pageData = (data as any).pageData || {};
    const jsonLd = (data as any).jsonLd || [];

    return (
      <div className="w-full max-w-6xl space-y-6">
        <Card variant="solid" padding="sm">
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-[var(--muted-text)]">Brand:</span>
                <span className="ml-2">{pageData.organizationName || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium text-[var(--muted-text)]">URL:</span>
                <span className="ml-2">{analysis.url}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="solid" padding="md">
          <CardHeader>
            <CardTitle>🏗️ Schema Markup Analysis</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Schema Score</p>
            <p className="text-3xl font-bold text-blue-600">{schemaAnalysis.schemaScore || schemaAnalysis.score || 0}/100</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Detected: {(schemaAnalysis.hasSchema || (jsonLd.length > 0)) ? 'Yes' : 'No'} ({jsonLd.length} objects)</p>
          </div>

          {schemaAnalysis.schemasPresent && schemaAnalysis.schemasPresent.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Detected Schema Types:</p>
              <div className="flex flex-wrap gap-2">
                {schemaAnalysis.schemasPresent.map((t: any, i: number) => (
                  <span key={i} className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                    {typeof t === 'string' ? t : t.type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {schemaAnalysis.recommendations && schemaAnalysis.recommendations.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">📋 Schema Recommendations:</p>
              <ul className="space-y-2">
                {schemaAnalysis.recommendations.map((rec: any, i: number) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-200">
                    {i + 1}. <strong>{rec.type || 'Schema'}</strong>: {rec.reason || rec}
                    <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">{rec.priority || 'MEDIUM'} Priority</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={() => downloadMarkdown(markdown, analysis.url)}
            variant="default"
            className="flex-1"
          >
            📄 Download Schema Report (.md)
          </Button>
          <Button
            onClick={() => downloadJSON(data, analysis.url)}
            variant="success"
            className="flex-1"
          >
            💾 Download Raw Data (.json)
          </Button>
        </div>

        <Button
          onClick={onAnalyzeAnother}
          variant="secondary"
          className="w-full"
        >
          🔄 Analyze Another Page
        </Button>
      </div>
    );
  }

  const aiVisibility = analysis.aiVisibility?.visibility?.score || 0;
  const entityDensity = analysis.entities?.entities?.semanticScore?.entityDensity || 0;
  const topicCoverage = analysis.entities?.entities?.semanticScore?.topicCoverage || 0;
  const eeatScore = analysis.entities?.entities?.semanticScore?.eeatScore || 0;
  const overallScore = Math.round((aiVisibility + entityDensity + eeatScore) / 3);

  const gradeInfo = getGradeScore(overallScore);

  const namedEntities = analysis.entities?.entities?.namedEntities || [];
  const topics = analysis.entities?.entities?.topics || [];
  const keywordExpansion = analysis.keywordExpansion || [];
  const citationRate = analysis.aiVisibility?.visibility?.citationRate || 0;
  const domainMentionRate = analysis.aiVisibility?.visibility?.domainMentionRate || 0;
  const averagePosition = analysis.aiVisibility?.visibility?.averagePosition;
  const schemaAnalysis = analysis.entities?.entities?.schemaAnalysis || {};
  const schemaScore = schemaAnalysis.schemaScore ?? schemaAnalysis.score ?? 0;
  const schemaTypes: string[] = (schemaAnalysis.schemasPresent || schemaAnalysis.types || [])
    .map((t: any) => (typeof t === 'string' ? t : t.type));
  const eeatSignals = analysis.entities?.entities?.eeatSignals || {};
  const missingEntities = analysis.entities?.entities?.missingEntities || [];
  const promptResults = analysis.aiVisibility?.promptResults || [];
  const pageData = analysis.entities?.pageData || {};
  const location = analysis.entities?.entities?.location || analysis.entities?.pageData?.location;

  // Calculate total queries and citations
  const totalQueries = promptResults.length * (analysis.aiVisibility?.summary?.enginesChecked || 0);
  const totalCitations = promptResults.reduce((sum: number, r: any) => {
    let count = 0;
    if (r.checks.googleAIOverview?.cited) count++;
    if (r.checks.perplexity?.cited) count++;
    if (r.checks.chatgpt?.cited) count++;
    return sum + count;
  }, 0);

  // Intent distribution
  const intentCounts = keywordExpansion.reduce((acc: any, k: any) => {
    acc[k.intent] = (acc[k.intent] || 0) + 1;
    return acc;
  }, {});

  return (
      <div className="w-full max-w-6xl space-y-6">
      {/* Brand Header */}
        <Card variant="solid" padding="sm">
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-[var(--muted-text)]">Brand:</span>
                <span className="ml-2">{pageData.organizationName || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium text-[var(--muted-text)]">Location:</span>
                <span className="ml-2">
                  {location?.city && location?.state
                    ? `${location.city}, ${location.state}`
                    : location?.state || 'Unknown'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Overall Grade Card */}
      <div className={`${gradeInfo.bgColor} dark:bg-opacity-30 border-4 ${
        overallScore >= 90 ? 'border-green-400' :
        overallScore >= 80 ? 'border-blue-400' :
        overallScore >= 70 ? 'border-yellow-400' :
        overallScore >= 60 ? 'border-orange-400' :
        'border-red-400'
      } rounded-xl p-8 text-center shadow-lg`}>
        <h2 className="text-5xl font-bold mb-3">
          <span className={`${gradeInfo.color} dark:${
            overallScore >= 90 ? 'text-green-400' :
            overallScore >= 80 ? 'text-blue-400' :
            overallScore >= 70 ? 'text-yellow-400' :
            overallScore >= 60 ? 'text-orange-400' :
            'text-red-400'
          }`}>Grade: {gradeInfo.grade}</span>
        </h2>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{overallScore}/100</p>
        <p className="text-2xl mt-3">
          {gradeInfo.emoji} <span className="font-semibold">{gradeInfo.label}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-6">{analysis.url}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">Keyword: <strong className="text-gray-900 dark:text-white">{analysis.keyword}</strong></p>
      </div>

      {/* AI Visibility Score */}
      <div className="bg-white dark:bg-gray-900 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 shadow-md">
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 -m-6 mb-4 p-4 rounded-t-lg">
          <h3 className="text-2xl font-bold text-white">📊 AI Visibility Score: {aiVisibility}/100</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Tested across {totalQueries} AI engine queries. {totalCitations} citation{totalCitations !== 1 ? 's' : ''} found with {citationRate}% citation rate.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-lg p-4 shadow-md">
            <p className="text-sm font-semibold text-blue-100">Citation Rate</p>
            <p className="text-3xl font-bold text-white">{citationRate}%</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-lg p-4 shadow-md">
            <p className="text-sm font-semibold text-green-100">Domain Mention Rate</p>
            <p className="text-3xl font-bold text-white">{domainMentionRate}%</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-lg p-4 shadow-md">
            <p className="text-sm font-semibold text-purple-100">Average Position</p>
            <p className="text-3xl font-bold text-white">
              {averagePosition ? `#${averagePosition}` : 'Not cited'}
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Tested Prompts</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-gray-200">
            {keywordExpansion.map((k: any, i: number) => (
              <li key={i}>
                &ldquo;{k.prompt}&rdquo; <span className="italic text-gray-500 dark:text-gray-400">({k.intent}, {k.type})</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Keyword Expansion Analysis */}
      <div className="bg-white dark:bg-gray-900 border-2 border-green-200 dark:border-green-800 rounded-lg p-6 shadow-md">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 -m-6 mb-4 p-4 rounded-t-lg">
          <h3 className="text-2xl font-bold text-white">🔑 Keyword Expansion Analysis</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <strong>Base Keyword:</strong> {analysis.keyword}
        </p>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Generated Search Prompts ({keywordExpansion.length})</h4>
        <div className="space-y-3 mb-4">
          {keywordExpansion.map((k: any, i: number) => (
            <div key={i} className="border-l-4 border-blue-500 pl-3 py-1">
              <p className="font-medium text-gray-900 dark:text-gray-100">{i + 1}. {k.prompt}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                  Intent: {k.intent}
                </span>
                <span className="inline-block bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1 rounded text-xs">
                  Type: {k.type}
                </span>
              </p>
            </div>
          ))}
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Intent Distribution</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(intentCounts).map(([intent, count]) => (
              <span key={intent} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-1 rounded text-sm">
                {intent}: {count as number}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Entity & Content Analysis */}
      <div className="bg-white dark:bg-gray-900 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-6 shadow-md">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 -m-6 mb-4 p-4 rounded-t-lg">
          <h3 className="text-2xl font-bold text-white">🎯 Entity & Content Analysis</h3>
        </div>

        <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 mb-4 shadow-md border-2 border-gray-300 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Overall Semantic Score</p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white">
            {Math.round((entityDensity + topicCoverage + eeatScore) / 3)}/100
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-green-100">Entity Density</p>
              <p className="text-2xl font-bold text-white">{entityDensity}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-blue-100">Topic Coverage</p>
              <p className="text-2xl font-bold text-white">{topicCoverage}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-purple-100">E-E-A-T Score</p>
              <p className="text-2xl font-bold text-white">{eeatScore}</p>
            </div>
          </div>
        </div>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Named Entities ({namedEntities.length})</h4>
        <ul className="space-y-2 mb-4">
          {namedEntities.length > 0 ? (
            namedEntities.map((e: any, i: number) => (
              <li key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span>
                  <strong className="text-gray-900 dark:text-gray-100">{e.name || e.text}</strong> <span className="text-gray-500 dark:text-gray-400">({e.type})</span>
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{e.mentions} mention{e.mentions > 1 ? 's' : ''}</span>
              </li>
            ))
          ) : (
            <li className="text-gray-500 dark:text-gray-400 italic">No entities identified</li>
          )}
        </ul>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Key Topics</h4>
        <ul className="space-y-2 mb-4">
          {topics.length > 0 ? (
            topics.map((t: any, i: number) => (
              <li key={i} className="py-2 border-b border-gray-100">
                <p className="font-medium text-gray-900 dark:text-gray-100">{t.topic}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className={`inline-block px-2 py-1 rounded text-xs mr-2 ${
                    t.relevance === 'high' ? 'bg-green-100 text-green-800' :
                    t.relevance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                  }`}>{t.relevance} relevance</span>
                  <span className="text-gray-500 dark:text-gray-400">{t.coverage} coverage</span>
                </p>
              </li>
            ))
          ) : (
            <li className="text-gray-500 dark:text-gray-400 italic">No topics identified</li>
          )}
        </ul>

        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-lg">E-E-A-T Signals</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-700 rounded-lg p-3 shadow">
            <p className="text-xs font-semibold text-blue-100">Author Credentials</p>
            <p className="text-2xl font-bold text-white">
              {Array.isArray(eeatSignals.authorCredentials) ? eeatSignals.authorCredentials.length : 0}
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-400 to-green-500 dark:from-green-600 dark:to-green-700 rounded-lg p-3 shadow">
            <p className="text-xs font-semibold text-green-100">Accreditations</p>
            <p className="text-2xl font-bold text-white">
              {Array.isArray(eeatSignals.accreditation) ? eeatSignals.accreditation.length : 0}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-400 to-purple-500 dark:from-purple-600 dark:to-purple-700 rounded-lg p-3 shadow">
            <p className="text-xs font-semibold text-purple-100">Statistics/Data</p>
            <p className="text-2xl font-bold text-white">
              {Array.isArray(eeatSignals.statistics) ? eeatSignals.statistics.length : 0}
            </p>
          </div>
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 dark:from-yellow-600 dark:to-yellow-700 rounded-lg p-3 shadow">
            <p className="text-xs font-semibold text-yellow-100">Expert Quotes</p>
            <p className="text-2xl font-bold text-white">
              {typeof eeatSignals.expertQuotes === 'number' ? eeatSignals.expertQuotes : 0}
            </p>
          </div>
          <div className="bg-gradient-to-br from-red-400 to-red-500 dark:from-red-600 dark:to-red-700 rounded-lg p-3 shadow">
            <p className="text-xs font-semibold text-red-100">Citations</p>
            <p className="text-2xl font-bold text-white">
              {typeof eeatSignals.citations === 'number' ? eeatSignals.citations : 0}
            </p>
          </div>
        </div>

        {missingEntities.length > 0 && (
          <>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">⚠️ Missing Critical Entities</h4>
            <ul className="space-y-2">
              {missingEntities.map((e: any, i: number) => (
                <li key={i} className="text-sm">
                  <strong className="text-gray-900 dark:text-gray-100">
                    {typeof e === 'string' ? e : e.entity || JSON.stringify(e)}
                  </strong>
                  {e.reason && <span className="text-gray-600 dark:text-gray-400"> - {e.reason}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Schema Markup Analysis */}
      <div className="bg-white dark:bg-gray-900 border-2 border-orange-200 dark:border-orange-800 rounded-lg p-6 shadow-md">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 -m-6 mb-4 p-4 rounded-t-lg">
          <h3 className="text-2xl font-bold text-white">🏗️ Schema Markup Analysis</h3>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Schema Score</p>
          <p className="text-3xl font-bold text-blue-600">{schemaScore}/100</p>
        </div>

        {schemaTypes && schemaTypes.length > 0 ? (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Detected Schema Types:</p>
            <div className="flex flex-wrap gap-2">
              {schemaTypes.map((type: string, i: number) => (
                <span key={i} className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                  {type}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 italic">No schema markup detected</p>
        )}

        {schemaAnalysis.recommendations && Array.isArray(schemaAnalysis.recommendations) && schemaAnalysis.recommendations.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">📋 Schema Recommendations:</p>
            <ul className="space-y-2">
              {schemaAnalysis.recommendations.map((rec: any, i: number) => {
                // Handle both string and object formats
                const recType = typeof rec === 'string' ? 'Schema' : (rec.type || 'Schema');
                const recReason = typeof rec === 'string' ? rec : (rec.reason || rec.recommendation || rec.text || 'No details provided');
                const recPriority = typeof rec === 'string' ? 'MEDIUM' : (rec.priority || 'MEDIUM');

                return (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-200">
                    {i + 1}. <strong>{recType}</strong>: {recReason}
                    <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      {recPriority} Priority
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Detailed AI Engine Results */}
      {promptResults.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg p-6 shadow-md">
          <div className="bg-gradient-to-r from-indigo-500 to-blue-500 -m-6 mb-4 p-4 rounded-t-lg">
            <h3 className="text-2xl font-bold text-white">🔍 Detailed AI Engine Results</h3>
          </div>
          <div className="space-y-6">
            {promptResults.map((result: any, i: number) => (
              <div key={i} className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Prompt {i + 1}: &ldquo;{result.prompt.prompt}&rdquo;
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <strong>Intent:</strong> {result.prompt.intent} | <strong>Type:</strong> {result.prompt.type}
                </p>

                <div className="space-y-4">
                  {/* Google AI Overview */}
                  {result.checks.googleAIOverview && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Google AI Overview</h5>
                      <div className="space-y-1 text-sm mb-2">
                        <p>
                          <strong>Cited:</strong>{' '}
                          {result.checks.googleAIOverview.cited ? (
                            <span className="text-green-600">
                              ✅ Yes (Position #{result.checks.googleAIOverview.position})
                              {result.checks.googleAIOverview.matchType && (
                                <span className={`ml-2 inline-block px-2 py-0.5 rounded text-xs ${result.checks.googleAIOverview.matchType === 'exact' ? 'bg-green-100 text-green-800' : result.checks.googleAIOverview.matchType === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                                  {result.checks.googleAIOverview.matchType === 'exact' ? 'Exact' : result.checks.googleAIOverview.matchType === 'partial' ? 'Partial' : 'None'}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-red-600">❌ No</span>
                          )}
                        </p>
                        {result.checks.googleAIOverview.hasAIOverview !== undefined && (
                          <p><strong>Has AI Overview:</strong> {result.checks.googleAIOverview.hasAIOverview ? 'Yes' : 'No'}</p>
                        )}
                        {result.checks.googleAIOverview.totalCitations !== undefined && (
                          <p><strong>Total Citations:</strong> {result.checks.googleAIOverview.totalCitations}</p>
                        )}
                      </div>

                      {result.checks.googleAIOverview.overviewText && (
                        <div className="mb-2">
                          <p className="font-semibold text-sm mb-1">AI Response:</p>
                          <blockquote className="border-l-2 border-gray-300 dark:border-gray-700 pl-3 italic text-sm text-gray-700 dark:text-gray-300">
                            {result.checks.googleAIOverview.overviewText.substring(0, 300)}
                            {result.checks.googleAIOverview.overviewText.length > 300 ? '...' : ''}
                          </blockquote>
                        </div>
                      )}

                      {result.checks.googleAIOverview.citations && result.checks.googleAIOverview.citations.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm mb-1">Citations:</p>
                          <ol className="list-decimal list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {result.checks.googleAIOverview.citations.slice(0, 3).map((cite: any, idx: number) => {
                              const isObj = typeof cite === 'object' && cite !== null;
                              const url = isObj ? (cite.url || '') : cite;
                              const match = isObj ? cite.match : undefined;
                              const badge = match === 'exact' ? 'bg-green-100 text-green-800' : match === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700';
                              const label = match === 'exact' ? 'Exact' : match === 'partial' ? 'Partial' : undefined;
                              return (
                                <li key={idx} className="truncate">
                                  <span className="truncate inline-block max-w-full align-middle">{url}</span>
                                  {label && (
                                    <span className={`ml-2 inline-block px-2 py-0.5 rounded ${badge}`}>{label}</span>
                                  )}
                                </li>
                              );
                            })}
                            {result.checks.googleAIOverview.citations.length > 3 && (
                              <li className="italic">...and {result.checks.googleAIOverview.citations.length - 3} more</li>
                            )}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Perplexity AI */}
                  {result.checks.perplexity && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Perplexity AI</h5>
                      <div className="space-y-1 text-sm mb-2">
                        <p>
                          <strong>Cited:</strong>{' '}
                          {result.checks.perplexity.cited ? (
                            <span className="text-green-600">
                              ✅ Yes (Position #{result.checks.perplexity.position})
                              {result.checks.perplexity.matchType && (
                                <span className={`ml-2 inline-block px-2 py-0.5 rounded text-xs ${result.checks.perplexity.matchType === 'exact' ? 'bg-green-100 text-green-800' : result.checks.perplexity.matchType === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                                  {result.checks.perplexity.matchType === 'exact' ? 'Exact' : result.checks.perplexity.matchType === 'partial' ? 'Partial' : 'None'}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-red-600">❌ No</span>
                          )}
                        </p>
                        {result.checks.perplexity.totalCitations !== undefined && (
                          <p><strong>Total Citations:</strong> {result.checks.perplexity.totalCitations}</p>
                        )}
                      </div>

                      {result.checks.perplexity.response && (
                        <div className="mb-2">
                          <p className="font-semibold text-sm mb-1">AI Response:</p>
                          <blockquote className="border-l-2 border-gray-300 dark:border-gray-700 pl-3 italic text-sm text-gray-700 dark:text-gray-300">
                            {result.checks.perplexity.response.substring(0, 300)}
                            {result.checks.perplexity.response.length > 300 ? '...' : ''}
                          </blockquote>
                        </div>
                      )}

                      {result.checks.perplexity.citations && result.checks.perplexity.citations.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm mb-1">Citations:</p>
                          <ol className="list-decimal list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {result.checks.perplexity.citations.slice(0, 3).map((cite: any, idx: number) => {
                              const isObj = typeof cite === 'object' && cite !== null;
                              const url = isObj ? (cite.url || '') : cite;
                              const match = isObj ? cite.match : undefined;
                              const badge = match === 'exact' ? 'bg-green-100 text-green-800' : match === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700';
                              const label = match === 'exact' ? 'Exact' : match === 'partial' ? 'Partial' : undefined;
                              return (
                                <li key={idx} className="truncate">
                                  <span className="truncate inline-block max-w-full align-middle">{url}</span>
                                  {label && (
                                    <span className={`ml-2 inline-block px-2 py-0.5 rounded ${badge}`}>{label}</span>
                                  )}
                                </li>
                              );
                            })}
                            {result.checks.perplexity.citations.length > 3 && (
                              <li className="italic">...and {result.checks.perplexity.citations.length - 3} more</li>
                            )}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ChatGPT */}
                  {result.checks.chatgpt && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">ChatGPT</h5>
                      <div className="space-y-1 text-sm mb-2">
                        <p>
                          <strong>Cited:</strong>{' '}
                          {result.checks.chatgpt.cited ? (
                            <span className="text-green-600">
                              ✅ Yes (Position #{result.checks.chatgpt.position})
                              {result.checks.chatgpt.matchType && (
                                <span className={`ml-2 inline-block px-2 py-0.5 rounded text-xs ${result.checks.chatgpt.matchType === 'exact' ? 'bg-green-100 text-green-800' : result.checks.chatgpt.matchType === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                                  {result.checks.chatgpt.matchType === 'exact' ? 'Exact' : result.checks.chatgpt.matchType === 'partial' ? 'Partial' : 'None'}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-red-600">❌ No</span>
                          )}
                        </p>
                        {result.checks.chatgpt.totalCitations !== undefined && (
                          <p><strong>Total Citations:</strong> {result.checks.chatgpt.totalCitations}</p>
                        )}
                      </div>

                      {result.checks.chatgpt.response && (
                        <div className="mb-2">
                          <p className="font-semibold text-sm mb-1">AI Response:</p>
                          <blockquote className="border-l-2 border-gray-300 dark:border-gray-700 pl-3 italic text-sm text-gray-700 dark:text-gray-300">
                            {result.checks.chatgpt.response.substring(0, 300)}
                            {result.checks.chatgpt.response.length > 300 ? '...' : ''}
                          </blockquote>
                        </div>
                      )}

                      {result.checks.chatgpt.citations && result.checks.chatgpt.citations.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm mb-1">Citations:</p>
                          <ol className="list-decimal list-inside text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {result.checks.chatgpt.citations.slice(0, 3).map((cite: any, idx: number) => {
                              const isObj = typeof cite === 'object' && cite !== null;
                              const url = isObj ? (cite.url || '') : cite;
                              const match = isObj ? cite.match : undefined;
                              const badge = match === 'exact' ? 'bg-green-100 text-green-800' : match === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700';
                              const label = match === 'exact' ? 'Exact' : match === 'partial' ? 'Partial' : undefined;
                              return (
                                <li key={idx} className="truncate">
                                  <span className="truncate inline-block max-w-full align-middle">{url}</span>
                                  {label && (
                                    <span className={`ml-2 inline-block px-2 py-0.5 rounded ${badge}`}>{label}</span>
                                  )}
                                </li>
                              );
                            })}
                            {result.checks.chatgpt.citations.length > 3 && (
                              <li className="italic">...and {result.checks.chatgpt.citations.length - 3} more</li>
                            )}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Download Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => downloadMarkdown(markdown, analysis.url)}
          variant="default"
          className="flex-1"
        >
          📄 Download Full Report (.md)
        </Button>
        <Button
          onClick={() => downloadJSON(analysis, analysis.url)}
          variant="success"
          className="flex-1"
        >
          💾 Download Raw Data (.json)
        </Button>
      </div>

      {/* Analyze Another Button */}
      <Button
        onClick={onAnalyzeAnother}
        variant="secondary"
        className="w-full"
      >
        🔄 Analyze Another Page
      </Button>
    </div>
  );
}
