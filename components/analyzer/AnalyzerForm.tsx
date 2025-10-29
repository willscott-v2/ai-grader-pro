'use client';

import { useState } from 'react';

interface AnalyzerFormProps {
  onSubmit: (url: string, keyword: string) => void;
  isAnalyzing: boolean;
}

export default function AnalyzerForm({ onSubmit, isAnalyzing }: AnalyzerFormProps) {
  const [url, setUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [urlError, setUrlError] = useState('');

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
    if (validateUrl(url) && keyword.trim()) {
      onSubmit(url, keyword);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl space-y-6">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
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
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isAnalyzing}
          required
        />
        {urlError && (
          <p className="mt-2 text-sm text-red-600">{urlError}</p>
        )}
      </div>

      <div>
        <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
          Target Keyword
        </label>
        <input
          type="text"
          id="keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Nursing Program"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isAnalyzing}
          required
        />
        <p className="mt-2 text-sm text-gray-500">
          Enter the main keyword or phrase you want this page to rank for
        </p>
      </div>

      <button
        type="submit"
        disabled={isAnalyzing || !url || !keyword || !!urlError}
        className="w-full py-3 px-6 text-white font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze Page'}
      </button>
    </form>
  );
}
