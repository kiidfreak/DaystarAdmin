import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import Analytics from '@/components/dashboard/Analytics';
import MetricCard from '@/components/dashboard/MetricCard';
import LiveClasses from '@/components/dashboard/LiveClasses';
import ReportsPage from '@/components/dashboard/ReportsPage';
import StudentsPage from '@/components/dashboard/StudentsPage';
import { Users, BookOpen, BarChart3 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

const AdminDashboard: React.FC = () => {
  const { user } = useUser();
  const userRole = user?.role || 'admin';
  const userName = user?.full_name || 'Admin';

  // Example metric data
  const metrics = [
    { title: 'Total Students', value: 100, icon: Users, color: 'blue' },
    { title: 'Total Courses', value: 12, icon: BookOpen, color: 'green' },
    { title: 'Attendance Rate', value: '92%', icon: BarChart3, color: 'yellow' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar userRole={userRole} activeTab="dashboard" onTabChange={() => {}} onLogout={() => {}} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <DashboardHeader
          userRole={userRole}
          title={`Welcome, ${userName}`}
          students={[]}
          onApprove={() => {}}
          onReject={() => {}}
          onSearch={() => {}}
          activeTab="dashboard"
          onLogout={() => {}}
        />
        <main style={{ padding: '2rem', flex: 1 }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Admin Dashboard</h1>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            {metrics.map((metric, idx) => (
              <MetricCard
                key={idx}
                title={metric.title}
                value={metric.value}
                icon={metric.icon}
                color={metric.color}
              />
            ))}
            <Analytics />
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <LiveClasses />
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <ReportsPage />
          </div>
          <div>
            <StudentsPage />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard; 