import React from 'react';
import { cn } from '@/lib/utils';
import { TallyCheckLoader, TallyCheckLoaderAdvanced, TallyCheckSpinner } from './TallyCheckLoader';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'purple' | 'green' | 'white';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  text,
  className
}) => {
  // Use Tally Check loader for blue color, fallback to original for others
  if (color === 'blue') {
    return <TallyCheckLoader size={size} text={text} className={className} />;
  }

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const colorClasses = {
    blue: 'border-sky-blue',
    purple: 'border-[#001F3F]',
    green: 'border-green-400',
    white: 'border-white'
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className={cn(
        'animate-spin rounded-full border-2 border-t-transparent',
        sizeClasses[size],
        colorClasses[color]
      )} />
      {text && (
        <p className="text-gray-400 mt-3 text-sm">{text}</p>
      )}
    </div>
  );
};

// Full page loading component
export const PageLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001F3F] via-[#1E3A5F] to-[#001F3F] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" color="purple" text={text} />
        </div>
      </div>
    </div>
  );
};

// Card loading component
export const CardLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="glass-card p-12 text-center">
      <TallyCheckLoaderAdvanced size="lg" text={text} />
    </div>
  );
};

// Skeleton loading for content
export const ContentSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-white/10 rounded animate-pulse"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}; 