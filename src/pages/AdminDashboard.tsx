import React, { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Analytics } from '@/components/dashboard/Analytics';
import { StudentsPage } from '@/components/dashboard/StudentsPage';
import { UserManagement } from '@/components/dashboard/UserManagement';
import { BeaconManager } from '@/components/dashboard/BeaconManager';
import { DeviceVerification } from '@/components/dashboard/DeviceVerification';
import { LecturerPresence } from '@/components/dashboard/LecturerPresence';
import { StudentCourseAssignment } from '@/components/dashboard/StudentCourseAssignment';
import { AttendanceAnalytics } from '@/components/dashboard/AttendanceAnalytics';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const { toast } = useToast();

  const userRole = user?.role || 'admin';
  const userName = user?.full_name || 'Admin';

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  };

  const handleGlobalSearch = (searchTerm: string) => {
    setGlobalSearchTerm(searchTerm);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'analytics': return 'System Analytics';
      case 'students': return 'All Students';
      case 'users': return 'User Management';
      case 'beacons': return 'BLE Beacon Manager';
      case 'device-verification': return 'Device Verification';
      case 'lecturer-presence': return 'Lecturer Presence';
      case 'course-assignments': return 'Course Assignments';
      case 'attendance-analytics': return 'Attendance Analytics';
      case 'classes': return 'All Courses';
      case 'alerts': return 'Notifications';
      default: return 'Admin Dashboard';
    }
  };

  const renderDashboardContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4">Welcome, {userName}</h2>
              <p className="text-gray-400">Manage your institution's attendance system</p>
            </div>
            <Analytics />
          </div>
        );
      
      case 'analytics':
        return <Analytics />;
      
      case 'students':
        return <StudentsPage />;
      
      case 'users':
        return <UserManagement />;
      
      case 'beacons':
        return <BeaconManager />;
      
      case 'device-verification':
        return <DeviceVerification />;
      
      case 'lecturer-presence':
        return <LecturerPresence userRole={userRole} userId={user?.id} />;
      
      case 'course-assignments':
        return <StudentCourseAssignment />;
      
      case 'attendance-analytics':
        return <AttendanceAnalytics userRole={userRole} />;
      
      case 'classes':
        return <div className="glass-card p-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">All Courses</h2>
          <p className="text-gray-400">Course management coming soon</p>
        </div>;
      
      case 'alerts':
        return <div className="glass-card p-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Notifications</h2>
          <p className="text-gray-400">System alerts and notifications</p>
        </div>;
      
      default:
        return (
          <div className="glass-card p-12 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">{getPageTitle()}</h2>
            <p className="text-gray-400">This section is coming soon</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar 
        userRole={userRole}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 p-8 overflow-auto">
        <DashboardHeader 
          userRole={userRole} 
          title={getPageTitle()}
          students={[]}
          onApprove={() => {}}
          onReject={() => {}}
          onSearch={handleGlobalSearch}
          activeTab={activeTab}
          onLogout={handleLogout}
        />
        {renderDashboardContent()}
      </div>
    </div>
  );
};

export default AdminDashboard; 