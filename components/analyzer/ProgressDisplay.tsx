'use client';

interface ProgressDisplayProps {
  step: string;
  message: string;
}

export default function ProgressDisplay({ step, message }: ProgressDisplayProps) {
  return (
    <div className="w-full max-w-3xl p-6 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            Step {step}
          </p>
          <p className="text-lg text-blue-800">
            {message}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{
              width: step === '1/3' ? '33%' : step === '2/3' ? '66%' : '100%'
            }}
          />
        </div>
      </div>
      <p className="mt-3 text-sm text-blue-700">
        This usually takes 2-3 minutes. Please don't close this page.
      </p>
    </div>
  );
}
