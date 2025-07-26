import React from 'react';

interface TallyCheckLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const TallyCheckLoader: React.FC<TallyCheckLoaderProps> = ({ 
  size = 'md', 
  text = 'Loading...',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Background circle */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full animate-pulse"></div>
        
        {/* Animated "T" */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Horizontal bar of T */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-2 bg-white rounded-full animate-bounce"></div>
            {/* Vertical stem of T */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-6 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
        
        {/* Animated checkmark circle */}
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-white rounded-full animate-ping">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Checkmark */}
            <svg 
              className="w-2 h-2 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3}
                d="M5 13l4 4L19 7"
                className="animate-draw"
              />
            </svg>
          </div>
        </div>
        
        {/* Rotating ring */}
        <div className="absolute inset-0 border-2 border-white/30 rounded-full animate-spin"></div>
      </div>
      
      {text && (
        <div className={`text-center ${textSizes[size]}`}>
          <p className="text-white font-medium">{text}</p>
          <div className="flex justify-center space-x-1 mt-2">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced version with more sophisticated animations
export const TallyCheckLoaderAdvanced: React.FC<TallyCheckLoaderProps> = ({ 
  size = 'md', 
  text = 'Loading...',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Main container with gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl shadow-lg animate-pulse"></div>
        
        {/* Animated "T" with staggered animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Horizontal bar of T */}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-2 bg-white rounded-full shadow-lg"
              style={{
                animation: 'slideInHorizontal 1.5s ease-in-out infinite'
              }}
            ></div>
            {/* Vertical stem of T */}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-8 bg-white rounded-full shadow-lg"
              style={{
                animation: 'slideInVertical 1.5s ease-in-out infinite 0.3s'
              }}
            ></div>
          </div>
        </div>
        
        {/* Animated checkmark circle with bounce */}
        <div 
          className="absolute bottom-1 right-1 w-5 h-5 bg-white rounded-full shadow-lg"
          style={{
            animation: 'checkmarkBounce 2s ease-in-out infinite'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Checkmark with draw animation */}
            <svg 
              className="w-3 h-3 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{
                animation: 'drawCheckmark 2s ease-in-out infinite 0.5s'
              }}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3}
                d="M5 13l4 4L19 7"
                className="opacity-0"
                style={{
                  animation: 'fadeInCheckmark 2s ease-in-out infinite 0.8s'
                }}
              />
            </svg>
          </div>
        </div>
        
        {/* Rotating outer ring */}
        <div 
          className="absolute inset-0 border-2 border-white/40 rounded-2xl"
          style={{
            animation: 'rotateRing 3s linear infinite'
          }}
        ></div>
        
        {/* Pulsing inner ring */}
        <div 
          className="absolute inset-2 border border-white/20 rounded-xl"
          style={{
            animation: 'pulseRing 2s ease-in-out infinite'
          }}
        ></div>
      </div>
      
      {text && (
        <div className={`text-center ${textSizes[size]}`}>
          <p className="text-white font-medium animate-pulse">{text}</p>
          <div className="flex justify-center space-x-1 mt-2">
            <div 
              className="w-1.5 h-1.5 bg-blue-500 rounded-full"
              style={{ animation: 'dotBounce 1.4s ease-in-out infinite' }}
            ></div>
            <div 
              className="w-1.5 h-1.5 bg-blue-500 rounded-full"
              style={{ animation: 'dotBounce 1.4s ease-in-out infinite 0.2s' }}
            ></div>
            <div 
              className="w-1.5 h-1.5 bg-blue-500 rounded-full"
              style={{ animation: 'dotBounce 1.4s ease-in-out infinite 0.4s' }}
            ></div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes slideInHorizontal {
          0%, 100% { transform: translate(-50%, -50%) scaleX(0); opacity: 0; }
          50% { transform: translate(-50%, -50%) scaleX(1); opacity: 1; }
        }
        
        @keyframes slideInVertical {
          0%, 100% { transform: translate(-50%, -50%) scaleY(0); opacity: 0; }
          50% { transform: translate(-50%, -50%) scaleY(1); opacity: 1; }
        }
        
        @keyframes checkmarkBounce {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.1) translateY(-2px); }
        }
        
        @keyframes drawCheckmark {
          0%, 100% { stroke-dasharray: 0 20; }
          50% { stroke-dasharray: 20 0; }
        }
        
        @keyframes fadeInCheckmark {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        @keyframes rotateRing {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulseRing {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

// Simple spinner version
export const TallyCheckSpinner: React.FC<TallyCheckLoaderProps> = ({ 
  size = 'md', 
  text,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Spinning T */}
        <div className="absolute inset-0 animate-spin">
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <div className="relative">
              <div className="w-4 h-1 bg-white rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Checkmark overlay */}
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full flex items-center justify-center">
          <svg className="w-1.5 h-1.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      
      {text && (
        <span className="ml-3 text-white font-medium">{text}</span>
      )}
    </div>
  );
}; 