
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
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
    blue: 'text-sky-blue bg-sky-blue/20 border-sky-blue/30',
    green: 'text-green-400 bg-green-500/20 border-green-500/30',
    yellow: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    red: 'text-red-400 bg-red-500/20 border-red-500/30'
  };

  const trendColor = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  };

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl border ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <span className={`text-sm font-medium ${trendColor[trend]}`}>
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{change}
          </span>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
        <p className="text-gray-400 text-sm">{title}</p>
      </div>
    </div>
  );
};
