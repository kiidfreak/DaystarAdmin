import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TallyCheckLoader, TallyCheckLoaderAdvanced, TallyCheckSpinner } from '@/components/ui/TallyCheckLoader';

export const LoadingDemo: React.FC = () => {
  return (
    <div className="space-y-8">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="relative">
              <div className="text-lg font-bold text-blue-500">T</div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                <svg className="w-1.5 h-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            Tally Check Loading Animations
          </CardTitle>
          <p className="text-gray-400">
            Beautiful loading animations featuring the Tally Check logo design
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Basic Loader */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Basic Loader</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center space-y-2">
                <TallyCheckLoader size="sm" text="Small" />
              </div>
              <div className="flex flex-col items-center space-y-2">
                <TallyCheckLoader size="md" text="Medium" />
              </div>
              <div className="flex flex-col items-center space-y-2">
                <TallyCheckLoader size="lg" text="Large" />
              </div>
            </div>
          </div>

          {/* Advanced Loader */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Advanced Loader</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center space-y-2">
                <TallyCheckLoaderAdvanced size="sm" text="Small" />
              </div>
              <div className="flex flex-col items-center space-y-2">
                <TallyCheckLoaderAdvanced size="md" text="Medium" />
              </div>
              <div className="flex flex-col items-center space-y-2">
                <TallyCheckLoaderAdvanced size="lg" text="Large" />
              </div>
            </div>
          </div>

          {/* Spinner */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Spinner</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center space-y-2">
                <TallyCheckSpinner size="sm" text="Small" />
              </div>
              <div className="flex flex-col items-center space-y-2">
                <TallyCheckSpinner size="md" text="Medium" />
              </div>
              <div className="flex flex-col items-center space-y-2">
                <TallyCheckSpinner size="lg" text="Large" />
              </div>
            </div>
          </div>

          {/* Usage Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Usage Examples</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Page Loading */}
              <Card className="bg-gradient-to-br from-blue-500/10 to-[#001F3F]/10 border-blue-500/20">
                <CardContent className="p-6">
                  <h4 className="text-white font-semibold mb-4">Page Loading</h4>
                  <div className="flex items-center justify-center h-32">
                    <TallyCheckLoaderAdvanced size="lg" text="Loading Tally Check..." />
                  </div>
                </CardContent>
              </Card>

              {/* Data Loading */}
              <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
                <CardContent className="p-6">
                  <h4 className="text-white font-semibold mb-4">Data Loading</h4>
                  <div className="flex items-center justify-center h-32">
                    <TallyCheckSpinner size="md" text="Fetching data..." />
                  </div>
                </CardContent>
              </Card>

              {/* Form Submission */}
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                <CardContent className="p-6">
                  <h4 className="text-white font-semibold mb-4">Form Submission</h4>
                  <div className="flex items-center justify-center h-32">
                    <TallyCheckLoader size="sm" text="Submitting..." />
                  </div>
                </CardContent>
              </Card>

              {/* Real-time Updates */}
              <Card className="bg-gradient-to-br from-[#001F3F]/10 to-pink-500/10 border-[#001F3F]/20">
                <CardContent className="p-6">
                  <h4 className="text-white font-semibold mb-4">Real-time Updates</h4>
                  <div className="flex items-center justify-center h-32">
                    <TallyCheckLoader size="md" text="Syncing..." />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Animation Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Animation Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Animated "T" with staggered horizontal and vertical bars</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Bouncing checkmark circle with draw animation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Rotating outer ring for continuous motion</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span>Pulsing inner ring for depth effect</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>Animated dots for loading indication</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                  <span>Gradient backgrounds matching brand colors</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 