'use client';

import { useState } from 'react';

interface AnalyzerFormProps {
  onSubmit: (url: string, keyword: string, schemaOnly: boolean) => void;
  isAnalyzing: boolean;
}

export default function AnalyzerForm({ onSubmit, isAnalyzing }: AnalyzerFormProps) {
  const [url, setUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [urlError, setUrlError] = useState('');
  const [schemaOnly, setSchemaOnly] = useState(false);

  const validateUrl = (value: string) => {
    if (!value) {
      setUrlError('');
      return false;
    }
    try {
      new URL(value);
      setUrlError('');
      return true;
    } catch (e) {
      setUrlError('Please enter a valid URL (including http:// or https://)');
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrl(url)) return;
    if (!schemaOnly && !keyword.trim()) return;
    onSubmit(url, keyword, schemaOnly);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl space-y-6">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Page URL
        </label>
        <input
          type="text"
          id="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (e.target.value) validateUrl(e.target.value);
          }}
          placeholder="https://example.edu/programs/nursing"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          disabled={isAnalyzing}
          required
        />
        {urlError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{urlError}</p>
        )}
      </div>

      <div>
        <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Target Keyword
        </label>
        <input
          type="text"
          id="keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Nursing Program"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          disabled={isAnalyzing || schemaOnly}
          required={!schemaOnly}
        />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Enter the main keyword or phrase you want this page to rank for
        </p>
      </div>

      {/* Analysis Mode */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Analysis Mode</p>
        <div className="flex items-center gap-6 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={!schemaOnly}
              onChange={() => setSchemaOnly(false)}
              disabled={isAnalyzing}
            />
            <span className="text-gray-800 dark:text-gray-100">Full Analysis</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={schemaOnly}
              onChange={() => setSchemaOnly(true)}
              disabled={isAnalyzing}
            />
            <span className="text-gray-800 dark:text-gray-100">Schema Only</span>
          </label>
        </div>
        {schemaOnly && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Skips AI engines and keyword expansion. Fast structured data check.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isAnalyzing || !url || (!!urlError) || (!schemaOnly && !keyword)}
        className="w-full py-3 px-6 text-white font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isAnalyzing ? 'Analyzing...' : (schemaOnly ? 'Run Schema Check' : 'Analyze Page')}
      </button>
    </form>
  );
}
