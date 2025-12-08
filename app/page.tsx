'use client';

import { useState } from 'react';
import AnalyzerForm from '@/components/analyzer/AnalyzerForm';
import ProgressDisplay from '@/components/analyzer/ProgressDisplay';
import ResultsDisplay from '@/components/analyzer/ResultsDisplay';
import UserMenu from '@/components/ui/UserMenu';
import { Button } from '@/components/ui/design-system/button';
import { Card } from '@/components/ui/design-system/card';

type AppState = 'idle' | 'analyzing' | 'complete' | 'error';

export default function Home() {
  const [state, setState] = useState<AppState>('idle');
  const [progress, setProgress] = useState({ step: '0/3', message: '' });
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (url: string, keyword: string, schemaOnly: boolean) => {
    setState('analyzing');
    setError('');
    setProgress({ step: schemaOnly ? 'schema' : '0/3', message: schemaOnly ? 'Extracting structured data (JSON-LD)...' : 'Starting analysis...' });

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, keyword, schemaOnly }),
      });

      if (!response.ok) {
        throw new Error('Analysis request failed');
      }

      // Handle Server-Sent Events
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to read response');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                setProgress({ step: data.step, message: data.message });
              } else if (data.type === 'result') {
                // Decode Base64-encoded result if present
                let resultData = data.data;
                if (data.encoded && typeof data.data === 'string') {
                  // Use TextDecoder for proper UTF-8 handling (supports emojis)
                  const binaryString = atob(data.data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const decodedJson = new TextDecoder('utf-8').decode(bytes);
                  resultData = JSON.parse(decodedJson);
                }
                setResults(resultData);
                setState('complete');
              } else if (data.type === 'error') {
                setError(data.error);
                setState('error');
              }
            } catch (parseError) {
              console.error('Failed to parse SSE line:', line, parseError);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis');
      setState('error');
    }
  };

  const handleReset = () => {
    setState('idle');
    setResults(null);
    setError('');
    setProgress({ step: '0/3', message: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--lighter-blue)] to-[var(--dark-blue)]">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <header className="header mb-12">
          <div className="container">
            <div className="header-content">
              <div className="logo-section">
                <h1 className="text-5xl font-bold text-white mb-4">
                  AI Grader Pro
                </h1>
                <div className="tagline">
                  AI Search Readiness Analyzer
                </div>
                <div className="header-description">
                  <p>Analyze how well your webpages perform in AI-powered search results. Get instant visibility scores, entity analysis, and actionable recommendations.</p>
                </div>
              </div>
              <div className="flex items-center justify-end">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <div className="flex flex-col items-center space-y-8">
          {/* Form - always visible when not complete */}
          {state !== 'complete' && (
            <Card variant="glass" padding="lg" className="w-full max-w-3xl">
              <AnalyzerForm
                onSubmit={handleAnalyze}
                isAnalyzing={state === 'analyzing'}
              />
            </Card>
          )}

          {/* Progress indicator */}
          {state === 'analyzing' && (
            <ProgressDisplay
              step={progress.step}
              message={progress.message}
            />
          )}

          {/* Error message */}
          {state === 'error' && (
            <Card variant="solid" padding="md" className="w-full max-w-3xl border-2 border-[var(--error-red)]">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-[var(--error-red)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--error-red)]">Analysis Failed</h3>
                  <p className="text-[var(--error-red)]">{error}</p>
                </div>
              </div>
              <Button
                onClick={handleReset}
                variant="destructive"
                className="mt-4"
              >
                Try Again
              </Button>
            </Card>
          )}

          {/* Results */}
          {state === 'complete' && results && (
            <ResultsDisplay
              data={results}
              onAnalyzeAnother={handleReset}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="footer mt-16">
          <div className="container">
            <p>
              Powered by Claude AI, Perplexity, and Google AI Overviews
            </p>
            <p className="mt-2">
              Analysis typically takes 2-3 minutes
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
