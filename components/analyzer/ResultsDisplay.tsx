'use client';

import { downloadMarkdown, downloadJSON } from '@/lib/download-utils';

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
      {/* Institution Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Institution:</span>
            <span className="ml-2 text-gray-900">{pageData.organizationName || 'Unknown'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Location:</span>
            <span className="ml-2 text-gray-900">
              {location?.city && location?.state
                ? `${location.city}, ${location.state}`
                : location?.state || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Overall Grade Card */}
      <div className={`${gradeInfo.bgColor} border-2 border-gray-300 rounded-lg p-8 text-center`}>
        <h2 className="text-4xl font-bold mb-2">
          <span className={gradeInfo.color}>Grade: {gradeInfo.grade}</span>
        </h2>
        <p className="text-2xl font-semibold text-gray-700">{overallScore}/100</p>
        <p className="text-lg mt-2">
          {gradeInfo.emoji} <span className="font-medium">{gradeInfo.label}</span>
        </p>
        <p className="text-sm text-gray-600 mt-4">{analysis.url}</p>
        <p className="text-sm text-gray-600">Keyword: <strong>{analysis.keyword}</strong></p>
      </div>

      {/* AI Visibility Score */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">📊 AI Visibility Score: {aiVisibility}/100</h3>
        <p className="text-sm text-gray-600 mb-4">
          Tested across {totalQueries} AI engine queries. {totalCitations} citation{totalCitations !== 1 ? 's' : ''} found with {citationRate}% citation rate.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Citation Rate</p>
            <p className="text-2xl font-bold text-blue-600">{citationRate}%</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Domain Mention Rate</p>
            <p className="text-2xl font-bold text-green-600">{domainMentionRate}%</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-600">Average Position</p>
            <p className="text-2xl font-bold text-purple-600">
              {averagePosition ? `#${averagePosition}` : 'Not cited'}
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Tested Prompts</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            {keywordExpansion.map((k: any, i: number) => (
              <li key={i}>
                &ldquo;{k.prompt}&rdquo; <span className="italic text-gray-500">({k.intent}, {k.type})</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Keyword Expansion Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">🔑 Keyword Expansion Analysis</h3>
        <p className="text-sm text-gray-600 mb-4">
          <strong>Base Keyword:</strong> {analysis.keyword}
        </p>

        <h4 className="font-semibold text-gray-900 mb-2">Generated Search Prompts ({keywordExpansion.length})</h4>
        <div className="space-y-3 mb-4">
          {keywordExpansion.map((k: any, i: number) => (
            <div key={i} className="border-l-4 border-blue-500 pl-3 py-1">
              <p className="font-medium text-gray-900">{i + 1}. {k.prompt}</p>
              <p className="text-sm text-gray-600">
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                  Intent: {k.intent}
                </span>
                <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                  Type: {k.type}
                </span>
              </p>
            </div>
          ))}
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Intent Distribution</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(intentCounts).map(([intent, count]) => (
              <span key={intent} className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm">
                {intent}: {count as number}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Entity & Content Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Entity & Content Analysis</h3>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-600 mb-2">Semantic Score</p>
          <p className="text-3xl font-bold text-gray-900">
            {Math.round((entityDensity + topicCoverage + eeatScore) / 3)}/100
          </p>
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <p className="text-gray-600">Entity Density</p>
              <p className="font-bold text-green-600">{entityDensity}/100</p>
            </div>
            <div>
              <p className="text-gray-600">Topic Coverage</p>
              <p className="font-bold text-blue-600">{topicCoverage}/100</p>
            </div>
            <div>
              <p className="text-gray-600">E-E-A-T Score</p>
              <p className="font-bold text-purple-600">{eeatScore}/100</p>
            </div>
          </div>
        </div>

        <h4 className="font-semibold text-gray-900 mb-2">Named Entities ({namedEntities.length})</h4>
        <ul className="space-y-2 mb-4">
          {namedEntities.length > 0 ? (
            namedEntities.map((e: any, i: number) => (
              <li key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span>
                  <strong>{e.name || e.text}</strong> <span className="text-gray-500">({e.type})</span>
                </span>
                <span className="text-sm text-gray-600">{e.mentions} mention{e.mentions > 1 ? 's' : ''}</span>
              </li>
            ))
          ) : (
            <li className="text-gray-500 italic">No entities identified</li>
          )}
        </ul>

        <h4 className="font-semibold text-gray-900 mb-2">Key Topics</h4>
        <ul className="space-y-2 mb-4">
          {topics.length > 0 ? (
            topics.map((t: any, i: number) => (
              <li key={i} className="py-2 border-b border-gray-100">
                <p className="font-medium text-gray-900">{t.topic}</p>
                <p className="text-sm text-gray-600">
                  <span className={`inline-block px-2 py-1 rounded text-xs mr-2 ${
                    t.relevance === 'high' ? 'bg-green-100 text-green-800' :
                    t.relevance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-700'
                  }`}>{t.relevance} relevance</span>
                  <span className="text-gray-500">{t.coverage} coverage</span>
                </p>
              </li>
            ))
          ) : (
            <li className="text-gray-500 italic">No topics identified</li>
          )}
        </ul>

        <h4 className="font-semibold text-gray-900 mb-2">E-E-A-T Signals</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
          <div className="bg-blue-50 rounded p-2">
            <p className="text-gray-600">Author Credentials</p>
            <p className="font-bold text-blue-600">
              {Array.isArray(eeatSignals.authorCredentials) ? eeatSignals.authorCredentials.length : 0} found
            </p>
          </div>
          <div className="bg-green-50 rounded p-2">
            <p className="text-gray-600">Accreditations</p>
            <p className="font-bold text-green-600">
              {Array.isArray(eeatSignals.accreditation) ? eeatSignals.accreditation.length : 0} mentioned
            </p>
          </div>
          <div className="bg-purple-50 rounded p-2">
            <p className="text-gray-600">Statistics/Data</p>
            <p className="font-bold text-purple-600">
              {Array.isArray(eeatSignals.statistics) ? eeatSignals.statistics.length : 0} found
            </p>
          </div>
          <div className="bg-yellow-50 rounded p-2">
            <p className="text-gray-600">Expert Quotes</p>
            <p className="font-bold text-yellow-600">
              {typeof eeatSignals.expertQuotes === 'number' ? eeatSignals.expertQuotes : 0}
            </p>
          </div>
          <div className="bg-red-50 rounded p-2">
            <p className="text-gray-600">Citations</p>
            <p className="font-bold text-red-600">
              {typeof eeatSignals.citations === 'number' ? eeatSignals.citations : 0}
            </p>
          </div>
        </div>

        {missingEntities.length > 0 && (
          <>
            <h4 className="font-semibold text-gray-900 mb-2">⚠️ Missing Critical Entities</h4>
            <ul className="space-y-2">
              {missingEntities.map((e: any, i: number) => (
                <li key={i} className="text-sm">
                  <strong className="text-gray-900">
                    {typeof e === 'string' ? e : e.entity || JSON.stringify(e)}
                  </strong>
                  {e.reason && <span className="text-gray-600"> - {e.reason}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Schema Markup Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">🏗️ Schema Markup Analysis</h3>
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">Schema Score</p>
          <p className="text-3xl font-bold text-blue-600">{schemaAnalysis.score || 0}/100</p>
        </div>

        {schemaAnalysis.types && schemaAnalysis.types.length > 0 ? (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Detected Schema Types:</p>
            <div className="flex flex-wrap gap-2">
              {schemaAnalysis.types.map((type: string, i: number) => (
                <span key={i} className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
                  {type}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4 italic">No schema markup detected</p>
        )}

        {schemaAnalysis.recommendations && Array.isArray(schemaAnalysis.recommendations) && schemaAnalysis.recommendations.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">📋 Schema Recommendations:</p>
            <ul className="space-y-2">
              {schemaAnalysis.recommendations.map((rec: any, i: number) => {
                const recText = typeof rec === 'string' ? rec : rec.recommendation || rec.text || JSON.stringify(rec);
                return (
                  <li key={i} className="text-sm text-gray-700">
                    {i + 1}. <strong>{recText}</strong>
                    <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      {(schemaAnalysis.score || 0) < 30 ? 'HIGH' : (schemaAnalysis.score || 0) < 60 ? 'MEDIUM' : 'LOW'} Priority
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
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🔍 Detailed AI Engine Results</h3>
          <div className="space-y-6">
            {promptResults.map((result: any, i: number) => (
              <div key={i} className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold text-gray-900 mb-1">
                  Prompt {i + 1}: &ldquo;{result.prompt.prompt}&rdquo;
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Intent:</strong> {result.prompt.intent} | <strong>Type:</strong> {result.prompt.type}
                </p>

                <div className="space-y-4">
                  {/* Google AI Overview */}
                  {result.checks.googleAIOverview && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-semibold text-gray-900 mb-2">Google AI Overview</h5>
                      <div className="space-y-1 text-sm mb-2">
                        <p>
                          <strong>Cited:</strong>{' '}
                          {result.checks.googleAIOverview.cited ? (
                            <span className="text-green-600">✅ Yes (Position #{result.checks.googleAIOverview.position})</span>
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
                          <blockquote className="border-l-2 border-gray-300 pl-3 italic text-sm text-gray-700">
                            {result.checks.googleAIOverview.overviewText.substring(0, 300)}
                            {result.checks.googleAIOverview.overviewText.length > 300 ? '...' : ''}
                          </blockquote>
                        </div>
                      )}

                      {result.checks.googleAIOverview.citations && result.checks.googleAIOverview.citations.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm mb-1">Citations:</p>
                          <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
                            {result.checks.googleAIOverview.citations.slice(0, 3).map((cite: string, idx: number) => (
                              <li key={idx} className="truncate">{cite}</li>
                            ))}
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
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-semibold text-gray-900 mb-2">Perplexity AI</h5>
                      <div className="space-y-1 text-sm mb-2">
                        <p>
                          <strong>Cited:</strong>{' '}
                          {result.checks.perplexity.cited ? (
                            <span className="text-green-600">✅ Yes (Position #{result.checks.perplexity.position})</span>
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
                          <blockquote className="border-l-2 border-gray-300 pl-3 italic text-sm text-gray-700">
                            {result.checks.perplexity.response.substring(0, 300)}
                            {result.checks.perplexity.response.length > 300 ? '...' : ''}
                          </blockquote>
                        </div>
                      )}

                      {result.checks.perplexity.citations && result.checks.perplexity.citations.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm mb-1">Citations:</p>
                          <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
                            {result.checks.perplexity.citations.slice(0, 3).map((cite: string, idx: number) => (
                              <li key={idx} className="truncate">{cite}</li>
                            ))}
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
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-semibold text-gray-900 mb-2">ChatGPT</h5>
                      <div className="space-y-1 text-sm mb-2">
                        <p>
                          <strong>Cited:</strong>{' '}
                          {result.checks.chatgpt.cited ? (
                            <span className="text-green-600">✅ Yes (Position #{result.checks.chatgpt.position})</span>
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
                          <blockquote className="border-l-2 border-gray-300 pl-3 italic text-sm text-gray-700">
                            {result.checks.chatgpt.response.substring(0, 300)}
                            {result.checks.chatgpt.response.length > 300 ? '...' : ''}
                          </blockquote>
                        </div>
                      )}

                      {result.checks.chatgpt.citations && result.checks.chatgpt.citations.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm mb-1">Citations:</p>
                          <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
                            {result.checks.chatgpt.citations.slice(0, 3).map((cite: string, idx: number) => (
                              <li key={idx} className="truncate">{cite}</li>
                            ))}
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
        <button
          onClick={() => downloadMarkdown(markdown, analysis.url)}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          📄 Download Full Report (.md)
        </button>
        <button
          onClick={() => downloadJSON(analysis, analysis.url)}
          className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          💾 Download Raw Data (.json)
        </button>
      </div>

      {/* Analyze Another Button */}
      <button
        onClick={onAnalyzeAnother}
        className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
      >
        🔄 Analyze Another Page
      </button>
    </div>
  );
}
