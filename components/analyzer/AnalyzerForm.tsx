'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/design-system/button';
import { Input } from '@/components/ui/design-system/input';
import { Label } from '@/components/ui/design-system/label';
import { Card, CardContent } from '@/components/ui/design-system/card';

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
        <Label htmlFor="url" className="mb-2">
          Page URL
        </Label>
        <Input
          type="text"
          id="url"
          variant="glass"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (e.target.value) validateUrl(e.target.value);
          }}
          placeholder="https://example.edu/programs/nursing"
          disabled={isAnalyzing}
          required
        />
        {urlError && (
          <p className="mt-2 text-sm text-[var(--error-red)]">{urlError}</p>
        )}
      </div>

      <div>
        <Label htmlFor="keyword" className="mb-2">
          Target Keyword
        </Label>
        <Input
          type="text"
          id="keyword"
          variant="glass"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Nursing Program"
          disabled={isAnalyzing || schemaOnly}
          required={!schemaOnly}
        />
        <p className="mt-2 text-sm text-[var(--light-gray)]">
          Enter the main keyword or phrase you want this page to rank for
        </p>
      </div>

      {/* Analysis Mode */}
      <Card variant="solid" padding="sm">
        <CardContent>
          <p className="text-sm font-medium mb-2">Analysis Mode</p>
          <div className="flex items-center gap-6 text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={!schemaOnly}
                onChange={() => setSchemaOnly(false)}
                disabled={isAnalyzing}
                className="cursor-pointer"
              />
              <span>Full Analysis</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={schemaOnly}
                onChange={() => setSchemaOnly(true)}
                disabled={isAnalyzing}
                className="cursor-pointer"
              />
              <span>Schema Only</span>
            </label>
          </div>
          {schemaOnly && (
            <p className="mt-2 text-xs text-[var(--muted-text)]">Skips AI engines and keyword expansion. Fast structured data check.</p>
          )}
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={isAnalyzing || !url || (!!urlError) || (!schemaOnly && !keyword)}
        className="w-full"
      >
        {isAnalyzing ? 'Analyzing...' : (schemaOnly ? 'Run Schema Check' : 'Analyze Page')}
      </Button>
    </form>
  );
}
