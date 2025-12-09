'use client';

import { downloadMarkdown, downloadJSON } from '@/lib/download-utils';
import { Button } from '@/components/ui/design-system/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/design-system/card';

interface ResultsDisplayProps {
  data: {
    analysis: any;
    markdown: string;
  };
  onAnalyzeAnother: () => void;
}

function getGradeColor(score: number): string {
  if (score >= 90) return 'text-[var(--success-green)]';
  if (score >= 80) return 'text-[var(--info-blue)]';
  if (score >= 70) return 'text-[var(--orange-light)]';
  if (score >= 60) return 'text-[var(--orange-accent)]';
  return 'text-[var(--error-red)]';
}

function getGradeLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Poor';
  return 'Critical';
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
        <Card variant="glass" padding="sm">
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-[var(--medium-gray)]">Brand:</span>
                <span className="ml-2 text-white">{pageData.organizationName || 'Unknown'}</span>
              </div>
              <div>
                <span className="font-medium text-[var(--medium-gray)]">URL:</span>
                <span className="ml-2 text-white">{analysis.url}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" padding="lg">
          <CardHeader>
            <CardTitle className="text-white text-xl">🏗️ Schema Markup Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-[var(--medium-gray)] mb-1">Schema Score</p>
              <p className="text-3xl font-bold text-[var(--info-blue)]">{schemaAnalysis.schemaScore || schemaAnalysis.score || 0}/100</p>
              <p className="text-sm text-[var(--light-gray)] mt-2">Detected: {(schemaAnalysis.hasSchema || (jsonLd.length > 0)) ? 'Yes' : 'No'} ({jsonLd.length} objects)</p>
            </div>

            {schemaAnalysis.schemasPresent && schemaAnalysis.schemasPresent.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-white mb-2">Detected Schema Types:</p>
                <div className="flex flex-wrap gap-2">
                  {schemaAnalysis.schemasPresent.map((t: any, i: number) => (
                    <span key={i} className="inline-block bg-[var(--info-blue)]/20 text-[var(--info-blue)] border border-[var(--info-blue)]/30 px-3 py-1 rounded-full text-sm">
                      {typeof t === 'string' ? t : t.type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {schemaAnalysis.recommendations && schemaAnalysis.recommendations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-white mb-2">📋 Schema Recommendations:</p>
                <ul className="space-y-2">
                  {schemaAnalysis.recommendations.map((rec: any, i: number) => (
                    <li key={i} className="text-sm text-[var(--light-gray)]">
                      {i + 1}. <strong className="text-white">{rec.type || 'Schema'}</strong>: {rec.reason || rec}
                      <span className="ml-2 text-xs bg-[var(--orange-accent)]/20 text-[var(--orange-accent)] border border-[var(--orange-accent)]/30 px-2 py-1 rounded">
                        {rec.priority || 'MEDIUM'} Priority
                      </span>
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
      <Card variant="glass" padding="sm">
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-[var(--medium-gray)]">Brand:</span>
              <span className="ml-2 text-white">{pageData.organizationName || 'Unknown'}</span>
            </div>
            <div>
              <span className="font-medium text-[var(--medium-gray)]">Location:</span>
              <span className="ml-2 text-white">
                {location?.city && location?.state
                  ? `${location.city}, ${location.state}`
                  : location?.state || 'Unknown'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Grade Card */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Overall Grade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <h2 className={`text-6xl font-bold mb-2 ${getGradeColor(overallScore)}`}>
              {overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F'}
            </h2>
            <p className="text-4xl font-bold text-white mb-1">{overallScore}/100</p>
            <p className="text-xl text-[var(--light-gray)] mb-6">{getGradeLabel(overallScore)}</p>
            <div className="text-sm text-[var(--medium-gray)] space-y-1">
              <p>{analysis.url}</p>
              <p>Keyword: <strong className="text-white">{analysis.keyword}</strong></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Visibility Score */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <CardTitle className="text-white text-xl">📊 AI Visibility Score: {aiVisibility}/100</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-[var(--light-gray)] mb-4">
            Tested across {totalQueries} AI engine queries. {totalCitations} citation{totalCitations !== 1 ? 's' : ''} found with {citationRate}% citation rate.
          </CardDescription>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[var(--info-blue)]/20 border border-[var(--info-blue)]/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-[var(--info-blue)] mb-1">Citation Rate</p>
              <p className="text-3xl font-bold text-white">{citationRate}%</p>
            </div>
            <div className="bg-[var(--success-green)]/20 border border-[var(--success-green)]/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-[var(--success-green)] mb-1">Domain Mention Rate</p>
              <p className="text-3xl font-bold text-white">{domainMentionRate}%</p>
            </div>
            <div className="bg-[var(--orange-accent)]/20 border border-[var(--orange-accent)]/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-[var(--orange-accent)] mb-1">Average Position</p>
              <p className="text-3xl font-bold text-white">
                {averagePosition ? `#${averagePosition}` : 'Not cited'}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-2">Tested Prompts</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--light-gray)]">
              {keywordExpansion.map((k: any, i: number) => (
                <li key={i}>
                  &ldquo;{k.prompt}&rdquo; <span className="italic text-[var(--medium-gray)]">({k.intent}, {k.type})</span>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Keyword Expansion Analysis */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <CardTitle className="text-white text-xl">🔑 Keyword Expansion Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-[var(--light-gray)] mb-4">
            <strong>Base Keyword:</strong> {analysis.keyword}
          </CardDescription>

          <h4 className="font-semibold text-white mb-2">Generated Search Prompts ({keywordExpansion.length})</h4>
          <div className="space-y-3 mb-4">
            {keywordExpansion.map((k: any, i: number) => (
              <div key={i} className="border-l-4 border-[var(--info-blue)] pl-3 py-1">
                <p className="font-medium text-white">{i + 1}. {k.prompt}</p>
                <p className="text-sm text-[var(--light-gray)] mt-1">
                  <span className="inline-block bg-[var(--info-blue)]/20 text-[var(--info-blue)] border border-[var(--info-blue)]/30 px-2 py-1 rounded text-xs mr-2">
                    Intent: {k.intent}
                  </span>
                  <span className="inline-block bg-white/10 text-[var(--light-gray)] border border-white/10 px-2 py-1 rounded text-xs">
                    Type: {k.type}
                  </span>
                </p>
              </div>
            ))}
          </div>

          <div>
            <h4 className="font-semibold text-white mb-2">Intent Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(intentCounts).map(([intent, count]) => (
                <span key={intent} className="bg-white/10 text-[var(--light-gray)] border border-white/10 px-3 py-1 rounded-full text-sm">
                  {intent}: {count as number}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entity & Content Analysis */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <CardTitle className="text-white text-xl">🎯 Entity & Content Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Main Topic Section */}
          {topics.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-[var(--medium-gray)] mb-3 uppercase tracking-wide">Main Topic</h4>
              <div className="bg-white/10 border-2 border-white/20 rounded-lg p-6">
                <p className="text-2xl font-bold text-[var(--orange-accent)]">
                  {topics[0].topic}
                </p>
              </div>
            </div>
          )}

          {/* Entities Section */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-[var(--medium-gray)] mb-4 uppercase tracking-wide">Entities ({namedEntities.length})</h4>
            {namedEntities.length > 0 ? (
              <div className="space-y-4">
                {namedEntities.map((e: any, i: number) => {
                  // Calculate confidence from mentions (more mentions = higher confidence)
                  const maxMentions = Math.max(...namedEntities.map((ne: any) => ne.mentions || 1));
                  const confidence = e.mentions ? Math.round((e.mentions / maxMentions) * 100) : 50;
                  const description = e.description || `${e.type} mentioned ${e.mentions || 0} time${(e.mentions || 0) !== 1 ? 's' : ''} on the page`;
                  
                  return (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/10 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="text-lg font-bold text-white mb-2">{e.name || e.text}</h5>
                          <p className="text-xs font-semibold text-[var(--medium-gray)] uppercase tracking-wide mb-3">Type: {e.type}</p>
                          <p className="text-sm text-[var(--light-gray)] leading-relaxed">{description}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
                        {/* Confidence Badge */}
                        <div className="inline-flex items-center gap-2 bg-[var(--orange-accent)]/20 text-[var(--orange-accent)] border border-[var(--orange-accent)]/30 px-3 py-1.5 rounded-md text-sm font-semibold">
                          <span>Confidence:</span>
                          <span>{confidence}%</span>
                        </div>
                        
                        {/* Sources Badge - placeholder for future enhancement */}
                        {e.sources && Array.isArray(e.sources) && e.sources.length > 0 ? (
                          <div className="inline-flex items-center gap-2 bg-[var(--success-green)]/20 text-[var(--success-green)] border border-[var(--success-green)]/30 px-3 py-1.5 rounded-md text-sm font-semibold">
                            <span>Sources:</span>
                            <span>{e.sources.length}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 bg-white/10 text-[var(--light-gray)] border border-white/10 px-3 py-1.5 rounded-md text-sm">
                            <span>Mentions:</span>
                            <span>{e.mentions || 0}</span>
                          </div>
                        )}
                        
                        {/* Links - placeholder for future enhancement */}
                        {e.links && Array.isArray(e.links) && e.links.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {e.links.map((link: string, idx: number) => (
                              <span key={idx} className="text-xs text-[var(--light-gray)] bg-white/5 border border-white/10 px-2 py-1 rounded">
                                {link}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                <p className="text-[var(--medium-gray)] italic">No entities identified</p>
              </div>
            )}
          </div>

          {/* Overall Semantic Score */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
            <p className="text-sm font-semibold text-[var(--medium-gray)] mb-2">Overall Semantic Score</p>
            <p className="text-4xl font-bold text-white mb-4">
              {Math.round((entityDensity + topicCoverage + eeatScore) / 3)}/100
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[var(--success-green)]/20 border border-[var(--success-green)]/30 rounded-lg p-3 text-center">
                <p className="text-xs font-semibold text-[var(--success-green)] mb-1">Entity Density</p>
                <p className="text-2xl font-bold text-white">{entityDensity}</p>
              </div>
              <div className="bg-[var(--info-blue)]/20 border border-[var(--info-blue)]/30 rounded-lg p-3 text-center">
                <p className="text-xs font-semibold text-[var(--info-blue)] mb-1">Topic Coverage</p>
                <p className="text-2xl font-bold text-white">{topicCoverage}</p>
              </div>
              <div className="bg-[var(--orange-accent)]/20 border border-[var(--orange-accent)]/30 rounded-lg p-3 text-center">
                <p className="text-xs font-semibold text-[var(--orange-accent)] mb-1">E-E-A-T Score</p>
                <p className="text-2xl font-bold text-white">{eeatScore}</p>
              </div>
            </div>
          </div>

          {/* Key Topics Section */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-[var(--medium-gray)] mb-4 uppercase tracking-wide">Key Topics ({topics.length})</h4>
            {topics.length > 0 ? (
              <div className="space-y-3">
                {topics.map((t: any, i: number) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                    <p className="font-semibold text-white mb-2">{t.topic}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${
                        t.relevance === 'high' ? 'bg-[var(--success-green)]/20 text-[var(--success-green)] border border-[var(--success-green)]/30' :
                        t.relevance === 'medium' ? 'bg-[var(--orange-light)]/20 text-[var(--orange-light)] border border-[var(--orange-light)]/30' :
                        'bg-white/10 text-[var(--light-gray)] border border-white/10'
                      }`}>
                        {t.relevance} relevance
                      </span>
                      <span className="text-sm text-[var(--medium-gray)]">
                        {t.coverage} coverage
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
                <p className="text-[var(--medium-gray)] italic">No topics identified</p>
              </div>
            )}
          </div>

          {/* E-E-A-T Signals Section */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-[var(--medium-gray)] mb-4 uppercase tracking-wide">E-E-A-T Signals</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-[var(--info-blue)]/20 border border-[var(--info-blue)]/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-[var(--info-blue)] mb-1">Author Credentials</p>
              <p className="text-2xl font-bold text-white">
                {Array.isArray(eeatSignals.authorCredentials) ? eeatSignals.authorCredentials.length : 0}
              </p>
            </div>
            <div className="bg-[var(--success-green)]/20 border border-[var(--success-green)]/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-[var(--success-green)] mb-1">Accreditations</p>
              <p className="text-2xl font-bold text-white">
                {Array.isArray(eeatSignals.accreditation) ? eeatSignals.accreditation.length : 0}
              </p>
            </div>
            <div className="bg-[var(--info-blue)]/20 border border-[var(--info-blue)]/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-[var(--info-blue)] mb-1">Statistics/Data</p>
              <p className="text-2xl font-bold text-white">
                {Array.isArray(eeatSignals.statistics) ? eeatSignals.statistics.length : 0}
              </p>
            </div>
            <div className="bg-[var(--orange-light)]/20 border border-[var(--orange-light)]/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-[var(--orange-light)] mb-1">Expert Quotes</p>
              <p className="text-2xl font-bold text-white">
                {typeof eeatSignals.expertQuotes === 'number' ? eeatSignals.expertQuotes : 0}
              </p>
            </div>
            <div className="bg-[var(--error-red)]/20 border border-[var(--error-red)]/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-[var(--error-red)] mb-1">Citations</p>
              <p className="text-2xl font-bold text-white">
                {typeof eeatSignals.citations === 'number' ? eeatSignals.citations : 0}
              </p>
            </div>
            </div>
          </div>

          {missingEntities.length > 0 && (
            <div className="mb-6">
              <>
                <h4 className="text-sm font-semibold text-[var(--medium-gray)] mb-4 uppercase tracking-wide">⚠️ Missing Critical Entities</h4>
                <div className="space-y-2">
                  {missingEntities.map((e: any, i: number) => (
                    <div key={i} className="bg-[var(--error-red)]/10 border border-[var(--error-red)]/20 rounded-lg p-4">
                      <p className="text-sm text-white font-semibold mb-1">
                        {typeof e === 'string' ? e : e.entity || JSON.stringify(e)}
                      </p>
                      {e.reason && <p className="text-sm text-[var(--light-gray)]">{e.reason}</p>}
                    </div>
                  ))}
                </div>
              </>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schema Markup Analysis */}
      <Card variant="glass" padding="lg">
        <CardHeader>
          <CardTitle className="text-white text-xl">🏗️ Schema Markup Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-[var(--medium-gray)] mb-1">Schema Score</p>
            <p className="text-3xl font-bold text-[var(--info-blue)]">{schemaScore}/100</p>
          </div>

          {schemaTypes && schemaTypes.length > 0 ? (
            <div className="mb-4">
              <p className="text-sm font-medium text-white mb-2">Detected Schema Types:</p>
              <div className="flex flex-wrap gap-2">
                {schemaTypes.map((type: string, i: number) => (
                  <span key={i} className="inline-block bg-[var(--info-blue)]/20 text-[var(--info-blue)] border border-[var(--info-blue)]/30 px-3 py-1 rounded-full text-sm">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--medium-gray)] mb-4 italic">No schema markup detected</p>
          )}

          {schemaAnalysis.recommendations && Array.isArray(schemaAnalysis.recommendations) && schemaAnalysis.recommendations.length > 0 && (
            <div>
              <p className="text-sm font-medium text-white mb-2">📋 Schema Recommendations:</p>
              <ul className="space-y-2">
                {schemaAnalysis.recommendations.map((rec: any, i: number) => {
                  const recType = typeof rec === 'string' ? 'Schema' : (rec.type || 'Schema');
                  const recReason = typeof rec === 'string' ? rec : (rec.reason || rec.recommendation || rec.text || 'No details provided');
                  const recPriority = typeof rec === 'string' ? 'MEDIUM' : (rec.priority || 'MEDIUM');

                  return (
                    <li key={i} className="text-sm text-[var(--light-gray)]">
                      {i + 1}. <strong className="text-white">{recType}</strong>: {recReason}
                      <span className="ml-2 text-xs bg-[var(--orange-accent)]/20 text-[var(--orange-accent)] border border-[var(--orange-accent)]/30 px-2 py-1 rounded">
                        {recPriority} Priority
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed AI Engine Results */}
      {promptResults.length > 0 && (
        <Card variant="glass" padding="lg">
          <CardHeader>
            <CardTitle className="text-white text-xl">🔍 Detailed AI Engine Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {promptResults.map((result: any, i: number) => (
                <div key={i} className="border-l-4 border-[var(--info-blue)] pl-4">
                  <h4 className="font-semibold text-white mb-1">
                    Prompt {i + 1}: &ldquo;{result.prompt.prompt}&rdquo;
                  </h4>
                  <p className="text-sm text-[var(--light-gray)] mb-3">
                    <strong>Intent:</strong> {result.prompt.intent} | <strong>Type:</strong> {result.prompt.type}
                  </p>

                  <div className="space-y-4">
                    {/* Google AI Overview */}
                    {result.checks.googleAIOverview && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <h5 className="font-semibold text-white mb-2">Google AI Overview</h5>
                        <div className="space-y-1 text-sm mb-2">
                          <p className="text-[var(--light-gray)]">
                            <strong>Cited:</strong>{' '}
                            {result.checks.googleAIOverview.cited ? (
                              <span className="text-[var(--success-green)]">
                                ✅ Yes (Position #{result.checks.googleAIOverview.position})
                                {result.checks.googleAIOverview.matchType && (
                                  <span className={`ml-2 inline-block px-2 py-0.5 rounded text-xs ${
                                    result.checks.googleAIOverview.matchType === 'exact' ? 'bg-[var(--success-green)]/20 text-[var(--success-green)] border border-[var(--success-green)]/30' :
                                    result.checks.googleAIOverview.matchType === 'partial' ? 'bg-[var(--orange-light)]/20 text-[var(--orange-light)] border border-[var(--orange-light)]/30' :
                                    'bg-white/10 text-[var(--light-gray)] border border-white/10'
                                  }`}>
                                    {result.checks.googleAIOverview.matchType === 'exact' ? 'Exact' : result.checks.googleAIOverview.matchType === 'partial' ? 'Partial' : 'None'}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[var(--error-red)]">❌ No</span>
                            )}
                          </p>
                          {result.checks.googleAIOverview.hasAIOverview !== undefined && (
                            <p className="text-[var(--light-gray)]"><strong>Has AI Overview:</strong> {result.checks.googleAIOverview.hasAIOverview ? 'Yes' : 'No'}</p>
                          )}
                          {result.checks.googleAIOverview.totalCitations !== undefined && (
                            <p className="text-[var(--light-gray)]"><strong>Total Citations:</strong> {result.checks.googleAIOverview.totalCitations}</p>
                          )}
                        </div>

                        {result.checks.googleAIOverview.overviewText && (
                          <div className="mb-2">
                            <p className="font-semibold text-sm mb-1 text-white">AI Response:</p>
                            <blockquote className="border-l-2 border-white/20 pl-3 italic text-sm text-[var(--light-gray)]">
                              {result.checks.googleAIOverview.overviewText.substring(0, 300)}
                              {result.checks.googleAIOverview.overviewText.length > 300 ? '...' : ''}
                            </blockquote>
                          </div>
                        )}

                        {result.checks.googleAIOverview.citations && result.checks.googleAIOverview.citations.length > 0 && (
                          <div>
                            <p className="font-semibold text-sm mb-1 text-white">Citations:</p>
                            <ol className="list-decimal list-inside text-xs text-[var(--light-gray)] space-y-1">
                              {result.checks.googleAIOverview.citations.slice(0, 3).map((cite: any, idx: number) => {
                                const isObj = typeof cite === 'object' && cite !== null;
                                const url = isObj ? (cite.url || '') : cite;
                                const match = isObj ? cite.match : undefined;
                                const badge = match === 'exact' ? 'bg-[var(--success-green)]/20 text-[var(--success-green)] border border-[var(--success-green)]/30' :
                                  match === 'partial' ? 'bg-[var(--orange-light)]/20 text-[var(--orange-light)] border border-[var(--orange-light)]/30' :
                                  'bg-white/10 text-[var(--light-gray)] border border-white/10';
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
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <h5 className="font-semibold text-white mb-2">Perplexity AI</h5>
                        <div className="space-y-1 text-sm mb-2">
                          <p className="text-[var(--light-gray)]">
                            <strong>Cited:</strong>{' '}
                            {result.checks.perplexity.cited ? (
                              <span className="text-[var(--success-green)]">
                                ✅ Yes (Position #{result.checks.perplexity.position})
                                {result.checks.perplexity.matchType && (
                                  <span className={`ml-2 inline-block px-2 py-0.5 rounded text-xs ${
                                    result.checks.perplexity.matchType === 'exact' ? 'bg-[var(--success-green)]/20 text-[var(--success-green)] border border-[var(--success-green)]/30' :
                                    result.checks.perplexity.matchType === 'partial' ? 'bg-[var(--orange-light)]/20 text-[var(--orange-light)] border border-[var(--orange-light)]/30' :
                                    'bg-white/10 text-[var(--light-gray)] border border-white/10'
                                  }`}>
                                    {result.checks.perplexity.matchType === 'exact' ? 'Exact' : result.checks.perplexity.matchType === 'partial' ? 'Partial' : 'None'}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[var(--error-red)]">❌ No</span>
                            )}
                          </p>
                          {result.checks.perplexity.totalCitations !== undefined && (
                            <p className="text-[var(--light-gray)]"><strong>Total Citations:</strong> {result.checks.perplexity.totalCitations}</p>
                          )}
                        </div>

                        {result.checks.perplexity.response && (
                          <div className="mb-2">
                            <p className="font-semibold text-sm mb-1 text-white">AI Response:</p>
                            <blockquote className="border-l-2 border-white/20 pl-3 italic text-sm text-[var(--light-gray)]">
                              {result.checks.perplexity.response.substring(0, 300)}
                              {result.checks.perplexity.response.length > 300 ? '...' : ''}
                            </blockquote>
                          </div>
                        )}

                        {result.checks.perplexity.citations && result.checks.perplexity.citations.length > 0 && (
                          <div>
                            <p className="font-semibold text-sm mb-1 text-white">Citations:</p>
                            <ol className="list-decimal list-inside text-xs text-[var(--light-gray)] space-y-1">
                              {result.checks.perplexity.citations.slice(0, 3).map((cite: any, idx: number) => {
                                const isObj = typeof cite === 'object' && cite !== null;
                                const url = isObj ? (cite.url || '') : cite;
                                const match = isObj ? cite.match : undefined;
                                const badge = match === 'exact' ? 'bg-[var(--success-green)]/20 text-[var(--success-green)] border border-[var(--success-green)]/30' :
                                  match === 'partial' ? 'bg-[var(--orange-light)]/20 text-[var(--orange-light)] border border-[var(--orange-light)]/30' :
                                  'bg-white/10 text-[var(--light-gray)] border border-white/10';
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
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <h5 className="font-semibold text-white mb-2">ChatGPT</h5>
                        <div className="space-y-1 text-sm mb-2">
                          <p className="text-[var(--light-gray)]">
                            <strong>Cited:</strong>{' '}
                            {result.checks.chatgpt.cited ? (
                              <span className="text-[var(--success-green)]">
                                ✅ Yes (Position #{result.checks.chatgpt.position})
                                {result.checks.chatgpt.matchType && (
                                  <span className={`ml-2 inline-block px-2 py-0.5 rounded text-xs ${
                                    result.checks.chatgpt.matchType === 'exact' ? 'bg-[var(--success-green)]/20 text-[var(--success-green)] border border-[var(--success-green)]/30' :
                                    result.checks.chatgpt.matchType === 'partial' ? 'bg-[var(--orange-light)]/20 text-[var(--orange-light)] border border-[var(--orange-light)]/30' :
                                    'bg-white/10 text-[var(--light-gray)] border border-white/10'
                                  }`}>
                                    {result.checks.chatgpt.matchType === 'exact' ? 'Exact' : result.checks.chatgpt.matchType === 'partial' ? 'Partial' : 'None'}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[var(--error-red)]">❌ No</span>
                            )}
                          </p>
                          {result.checks.chatgpt.totalCitations !== undefined && (
                            <p className="text-[var(--light-gray)]"><strong>Total Citations:</strong> {result.checks.chatgpt.totalCitations}</p>
                          )}
                        </div>

                        {result.checks.chatgpt.response && (
                          <div className="mb-2">
                            <p className="font-semibold text-sm mb-1 text-white">AI Response:</p>
                            <blockquote className="border-l-2 border-white/20 pl-3 italic text-sm text-[var(--light-gray)]">
                              {result.checks.chatgpt.response.substring(0, 300)}
                              {result.checks.chatgpt.response.length > 300 ? '...' : ''}
                            </blockquote>
                          </div>
                        )}

                        {result.checks.chatgpt.citations && result.checks.chatgpt.citations.length > 0 && (
                          <div>
                            <p className="font-semibold text-sm mb-1 text-white">Citations:</p>
                            <ol className="list-decimal list-inside text-xs text-[var(--light-gray)] space-y-1">
                              {result.checks.chatgpt.citations.slice(0, 3).map((cite: any, idx: number) => {
                                const isObj = typeof cite === 'object' && cite !== null;
                                const url = isObj ? (cite.url || '') : cite;
                                const match = isObj ? cite.match : undefined;
                                const badge = match === 'exact' ? 'bg-[var(--success-green)]/20 text-[var(--success-green)] border border-[var(--success-green)]/30' :
                                  match === 'partial' ? 'bg-[var(--orange-light)]/20 text-[var(--orange-light)] border border-[var(--orange-light)]/30' :
                                  'bg-white/10 text-[var(--light-gray)] border border-white/10';
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
          </CardContent>
        </Card>
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
