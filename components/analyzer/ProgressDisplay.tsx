'use client';

import { Card, CardContent } from '@/components/ui/design-system/card';
import { LoadingSpinner } from '@/components/ui/design-system/loading-spinner';

interface ProgressDisplayProps {
  step: string;
  message: string;
}

export default function ProgressDisplay({ step, message }: ProgressDisplayProps) {
  return (
    <Card variant="glass" padding="md" className="w-full max-w-3xl">
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <LoadingSpinner size="md" color="orange" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              Step {step}
            </p>
            <p className="text-lg text-white">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-[var(--orange-accent)] h-2 rounded-full transition-all duration-500"
              style={{
                width: step === '1/3' ? '33%' : step === '2/3' ? '66%' : step === 'schema' ? '50%' : '100%'
              }}
            />
          </div>
        </div>
        <p className="mt-3 text-sm text-white/80">
          This usually takes 2-3 minutes. Please don't close this page.
        </p>
      </CardContent>
    </Card>
  );
}
