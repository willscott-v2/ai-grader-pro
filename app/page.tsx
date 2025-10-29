'use client';

import { useState } from 'react';
import AnalyzerForm from '@/components/analyzer/AnalyzerForm';
import ProgressDisplay from '@/components/analyzer/ProgressDisplay';
import ResultsDisplay from '@/components/analyzer/ResultsDisplay';

type AppState = 'idle' | 'analyzing' | 'complete' | 'error';

export default function Home() {
  const [state, setState] = useState<AppState>('idle');
  const [progress, setProgress] = useState({ step: '0/3', message: '' });
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (url: string, keyword: string) => {
    setState('analyzing');
    setError('');
    setProgress({ step: '0/3', message: 'Starting analysis...' });

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, keyword }),
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
                  const decodedJson = atob(data.data);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI Grader Pro
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Analyze how well your webpages perform in AI-powered search results.
            Get instant visibility scores and actionable recommendations.
          </p>
        </div>

        {/* Main content area */}
        <div className="flex flex-col items-center space-y-8">
          {/* Form - always visible when not complete */}
          {state !== 'complete' && (
            <AnalyzerForm
              onSubmit={handleAnalyze}
              isAnalyzing={state === 'analyzing'}
            />
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
            <div className="w-full max-w-3xl p-6 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Analysis Failed</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="mt-4 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
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
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>
            Powered by Claude AI, Perplexity, and Google AI Overviews
          </p>
          <p className="mt-2">
            Analysis typically takes 2-3 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
