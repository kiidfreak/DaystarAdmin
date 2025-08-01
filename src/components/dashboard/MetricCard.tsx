
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number | React.ReactNode;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = 'neutral',
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200 shadow-sm',
    green: 'text-green-600 bg-green-50 border-green-200 shadow-sm',
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200 shadow-sm',
    red: 'text-red-600 bg-red-50 border-red-200 shadow-sm'
  };

  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500'
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '';
    }
  };

  return (
    <div className="professional-card p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <div className="flex items-center space-x-1">
            <span className={`text-sm font-semibold ${trendColor[trend]}`}>
              {getTrendIcon()}
            </span>
            <span className={`text-sm font-semibold ${trendColor[trend]}`}>
              {change}
            </span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="text-3xl font-bold text-gray-900 leading-tight">
          {value}
        </div>
        <p className="text-gray-600 font-medium text-sm leading-relaxed">
          {title}
        </p>
      </div>
    </div>
  );
};
