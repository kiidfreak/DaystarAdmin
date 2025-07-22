
import React from 'react';
import { LecturerOverview } from './LecturerOverview';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Attendance Reports</h2>
        <p className="text-gray-400 mb-6">
          Comprehensive overview of lecturer attendance and student engagement metrics.
        </p>
      </div>
      
      <LecturerOverview />
    </div>
  );
};
