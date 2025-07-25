import React, { useState, useEffect } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { useUser } from '@/contexts/UserContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AttendanceTable } from '@/components/dashboard/AttendanceTable';
import { QRGenerator } from '@/components/dashboard/QRGenerator';
import { LecturerOverview } from '@/components/dashboard/LecturerOverview';
import { ClassesOverview } from '@/components/dashboard/ClassesOverview';
import { ReportsPage } from '@/components/dashboard/ReportsPage';
import { SessionManager } from '@/components/dashboard/SessionManager';
import { BeaconManager } from '@/components/dashboard/BeaconManager';
import { UserManagement } from '@/components/dashboard/UserManagement';
import { Analytics } from '@/components/dashboard/Analytics';
import { LiveClasses } from '@/components/dashboard/LiveClasses';
import { LecturerLiveAttendance } from '@/components/dashboard/LecturerLiveAttendance';
import { StudentsPage } from '@/components/dashboard/StudentsPage';
import { StudentCourseAssignment } from '@/components/dashboard/StudentCourseAssignment';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { Users, Calendar, Clock, Monitor, Bell, Grid2X2, Bluetooth, BookOpen, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTodayAttendance, useDashboardStats, useUpdateAttendanceStatus } from '@/hooks/use-api';
import { CardLoading } from '@/components/ui/LoadingSpinner';
import type { Database } from '@/lib/supabase';

type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'] & {
  users: {
    id: string;
    full_name: string;
    email: string;
  } | null;
};

const Index = () => {
  const { user, login, logout } = useUser();
  const [userRole, setUserRole] = useState(user?.role || '');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present'>('all');
  const { toast } = useToast();

  // Fetch real data from Supabase
  const { data: attendanceData, isLoading: attendanceLoading } = useTodayAttendance();
  const { data: stats, isLoading: statsLoading } = useDashboardStats(userRole, user?.id);
  const updateAttendanceStatus = useUpdateAttendanceStatus();

  // Keep user role in sync with context
  useEffect(() => {
    if (user) {
      setUserRole(user.role);
    } else {
      setUserRole('');
    }
  }, [user]);

  const handleLogin = async (email: string, password: string, role: string) => {
    const result = await login(email, password, role);
    if (!result.success) {
      toast({
        title: "Login Failed",
        description: result.error || "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    setUserRole('');
    setActiveTab('dashboard');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  };

  const handleApprove = (attendanceId: string) => {
    updateAttendanceStatus.mutate({ id: attendanceId, status: 'verified' });
  };

  const handleReject = (attendanceId: string) => {
    updateAttendanceStatus.mutate({ id: attendanceId, status: 'absent' });
  };

  const handleGlobalSearch = (searchTerm: string) => {
    setGlobalSearchTerm(searchTerm);
  };

  const handleMetricCardClick = (filter: 'all' | 'present') => {
    if (filter === 'all') {
      setActiveTab('students');
    } else {
      setAttendanceFilter(filter);
      setActiveTab('attendance');
    }
  };

  const getPageTitle = () => {
    const titles = {
      dashboard: userRole === 'student' ? 'My Dashboard' : 'Dashboard Overview',
      classes: 'All Courses',
      attendance: userRole === 'student' ? 'My Attendance' : 'Live Attendance',
      'qr-generator': 'QR Code Generator',
      sessions: 'Session Manager',
      beacons: 'BLE Beacon Manager',
      reports: userRole === 'student' ? 'My Reports' : 'Attendance Reports',
      analytics: 'System Analytics',
      students: 'All Students',
      users: 'User Management',
      'course-assignments': 'Course Assignments',
      audit: 'Audit Trail',
      rules: 'System Rules',
      lecturers: 'Lecturer Overview',
      alerts: 'Notifications'
    };
    return titles[activeTab as keyof typeof titles] || 'Dashboard';
  };

  // Transform attendance data to match Student interface
  const transformAttendanceToStudent = (attendance: AttendanceRecord) => ({
    id: attendance.id,
    name: attendance.users?.full_name || 'Unknown Student',
    studentId: attendance.users?.email || attendance.student_id,
    checkInTime: attendance.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }) : undefined,
    checkOutTime: attendance.check_out_time ? new Date(attendance.check_out_time).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }) : undefined,
    method: (attendance.method === 'MANUAL' ? 'QR' : attendance.method) as 'BLE' | 'QR' | 'Absent',
    status: attendance.status as 'verified' | 'pending' | 'absent',
    courseCode: attendance.course_code || undefined,
  });

  const getFilteredStudentsForTable = () => {
    if (!attendanceData) return [];
    
    const transformedData = attendanceData.map(transformAttendanceToStudent);
    
    if (attendanceFilter === 'present') {
      return transformedData.filter(s => s.status === 'verified');
    }
    return transformedData;
  };

  const renderDashboardContent = () => {
    if (attendanceLoading || statsLoading) {
      return <CardLoading text="Loading data..." />;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            {userRole === 'student' ? (
              <StudentDashboard />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div onClick={() => handleMetricCardClick('all')} className="cursor-pointer">
                    <MetricCard 
                      title="Total Students" 
                      value={stats?.totalStudents.toString() || '0'} 
                      change="0%"
                      trend="up" 
                      icon={Users} 
                      color="blue"
                    />
                  </div>
                  <div onClick={() => handleMetricCardClick('present')} className="cursor-pointer">
                    <MetricCard 
                      title="Present Today" 
                      value={stats?.presentStudents.toString() || '0'} 
                      change="0%"
                      trend="up" 
                      icon={Calendar} 
                      color="green"
                    />
                  </div>
                  <MetricCard 
                    title="Attendance Rate" 
                    value={
                      <span className={`inline-flex items-center gap-2 font-mono text-2xl font-bold ${stats?.attendanceRate >= 90 ? 'text-green-400' : stats?.attendanceRate >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {Number(stats?.attendanceRate || 0).toFixed(1)}%
                        {stats?.attendanceRate >= 90 ? '🔥' : stats?.attendanceRate >= 80 ? '👍' : '⚠️'}
                      </span>
                    }
                    change="0%"
                    trend="up" 
                    icon={Clock} 
                    color={stats?.attendanceRate >= 90 ? 'green' : stats?.attendanceRate >= 80 ? 'yellow' : 'red'}
                  />
                  <div onClick={() => setActiveTab('classes')} className="cursor-pointer">
                    <MetricCard 
                      title="Classes Today" 
                      value={stats?.classesToday.toString() || '0'} 
                      change="0%"
                      trend="up" 
                      icon={BookOpen} 
                      color="yellow"
                    />
                  </div>
                </div>
                
                {userRole === 'admin' ? (
                  <LiveClasses />
                ) : userRole === 'lecturer' ? (
                  <LecturerLiveAttendance lecturerId={user?.id || ''} />
                ) : (
                  <AttendanceTable 
                    students={(attendanceData || []).map(transformAttendanceToStudent)} 
                    onApprove={handleApprove}
                    onReject={handleReject}
                    userRole={userRole}
                    showSearch={true}
                  />
                )}
              </>
            )}
          </div>
        );
      
      case 'attendance':
        if (userRole === 'student') {
          return (
            <div className="space-y-8">
              <div className="glass-card p-6">
                <h2 className="text-xl font-bold text-white mb-4">My Attendance</h2>
                <p className="text-gray-400">View your attendance records and statistics</p>
              </div>
              <AttendanceTable 
                students={getFilteredStudentsForTable()} 
                onApprove={handleApprove}
                onReject={handleReject}
                userRole={userRole}
                showSearch={true}
                globalSearchTerm={globalSearchTerm}
              />
            </div>
          );
        }
        return (
          <AttendanceTable 
            students={getFilteredStudentsForTable()} 
            onApprove={handleApprove}
            onReject={handleReject}
            userRole={userRole}
            showSearch={true}
            globalSearchTerm={globalSearchTerm}
          />
        );
      
      case 'classes':
        return <ClassesOverview globalSearchTerm={globalSearchTerm} userRole={userRole} userId={user?.id} />;
      
      case 'qr-generator':
        return <QRGenerator />;
      
      case 'sessions':
        return <SessionManager />;
      
      case 'reports':
        return <ReportsPage />;
      
      case 'lecturers':
        return <LecturerOverview />;
      
      case 'beacons':
        return <BeaconManager />;
      
      case 'users':
        return <UserManagement />;
      
      case 'analytics':
        return <Analytics />;
      
      case 'students':
        return <StudentsPage />;
      
      case 'course-assignments':
        return <StudentCourseAssignment />;
      
      case 'alerts':
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-xl bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border-2 border-yellow-400 rounded-3xl shadow-2xl p-8 glass-card flex flex-col" style={{minWidth: '340px'}}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-extrabold text-yellow-400 tracking-wide">Notifications</span>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-4">
                {/* Dummy notifications for now */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/30 to-pink-500/10 border-2 border-yellow-400 flex items-center space-x-4 shadow-lg">
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="font-bold text-white text-lg">Low Attendance Alert</div>
                    <div className="text-gray-200 text-base">Today's attendance rate is 68%</div>
                    <div className="text-xs text-gray-400 mt-1">12:09 AM</div>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-500/30 to-pink-500/10 border-2 border-red-400 flex items-center space-x-4 shadow-lg">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <div>
                    <div className="font-bold text-white text-lg">BLE Beacon Issues</div>
                    <div className="text-gray-200 text-base">2 BLE attendance records without beacon data</div>
                    <div className="text-xs text-gray-400 mt-1">12:05 AM</div>
                  </div>
                </div>
                {/* Add more notifications as needed */}
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="glass-card p-12 text-center">
            <Grid2X2 className="w-16 h-16 text-sky-blue mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">{getPageTitle()}</h2>
            <p className="text-gray-400">This section is coming soon</p>
          </div>
        );
    }
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

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
          students={(attendanceData || []).map(transformAttendanceToStudent)}
          onApprove={handleApprove}
          onReject={handleReject}
          onSearch={handleGlobalSearch}
          activeTab={activeTab}
          onLogout={handleLogout}
        />
        {renderDashboardContent()}
      </div>
    </div>
  );
};

export default Index;
