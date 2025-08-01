import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  BookOpen,
  GraduationCap,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Zap,
  Eye,
  EyeOff,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { exportToPDF, exportToCSV, formatAnalyticsDataForExport } from '@/utils/pdfExport';
import { PageLoading, CardLoading } from '@/components/ui/LoadingSpinner';
import type { Database } from '@/lib/supabase';

type User = Database['public']['Tables']['users']['Row'];
type Course = Database['public']['Tables']['courses']['Row'];
type ClassSession = Database['public']['Tables']['class_sessions']['Row'];
type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];

interface LecturerStats {
  id: string;
  name: string;
  email: string;
  totalCourses: number;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  averageAttendance: number;
  totalStudents: number;
  thisWeekSessions: number;
  nextWeekSessions: number;
  attendanceTrend: 'up' | 'down' | 'stable';
  performanceScore: number;
}

interface SystemStats {
  totalLecturers: number;
  totalStudents: number;
  totalCourses: number;
  totalSessions: number;
  averageAttendanceRate: number;
  activeBeacons: number;
  todayAttendance: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
}

export const Analytics: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'semester'>('week');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const { user } = useUser();

  // Calculate date range based on timeFilter
  const today = new Date();
  let startDate: Date, endDate: Date;
  if (timeFilter === 'week') {
    const day = today.getDay();
    startDate = new Date(today);
    startDate.setDate(today.getDate() - day);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
  } else if (timeFilter === 'month') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else {
    // semester: Jan 1–June 30 or July 1–Dec 31
    if (today.getMonth() < 6) {
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 5, 30);
    } else {
      startDate = new Date(today.getFullYear(), 6, 1);
      endDate = new Date(today.getFullYear(), 11, 31);
    }
  }
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Get all lecturers with their statistics (real-time, filtered)
  const { data: lecturers, isLoading: lecturersLoading } = useQuery({
    queryKey: ['analytics', 'lecturers', timeFilter],
    queryFn: async () => {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'lecturer')
        .order('full_name');
      if (usersError) throw usersError;
      const lecturerStats: LecturerStats[] = [];
      for (const lecturer of users || []) {
        // Get lecturer's courses
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('instructor_id', lecturer.id);
        if (coursesError) continue;
        const courseIds = courses?.map(c => c.id) || [];
        // Get all sessions for lecturer's courses in range
        const { data: sessions, error: sessionsError } = await supabase
          .from('class_sessions')
          .select('*')
          .in('course_id', courseIds)
          .gte('session_date', startDateStr)
          .lte('session_date', endDateStr)
          .order('session_date');
        if (sessionsError) continue;
        // Get attendance records in range
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('*')
          .in('course_id', courseIds)
          .gte('date', startDateStr)
          .lte('date', endDateStr);
        if (attendanceError) continue;
        // Calculate statistics (same as before)
        const totalSessions = sessions?.length || 0;
        const completedSessions = sessions?.filter(s => new Date(s.session_date) < today).length || 0;
        const remainingSessions = totalSessions - completedSessions;
        const thisWeekSessions = sessions?.filter(s => {
          const sessionDate = new Date(s.session_date);
          return sessionDate >= startDate && sessionDate <= endDate;
        }).length || 0;
        const nextWeekSessions = 0; // Not used in filtered view
        const totalAttendanceRecords = attendance?.length || 0;
        const presentRecords = attendance?.filter(a => a.status === 'verified').length || 0;
        const averageAttendance = totalAttendanceRecords > 0 ? (presentRecords / totalAttendanceRecords) * 100 : 0;
        const performanceScore = Math.round((averageAttendance * 0.7) + ((completedSessions / (totalSessions || 1)) * 30));
        lecturerStats.push({
          id: lecturer.id,
          name: lecturer.full_name,
          email: lecturer.email,
          totalCourses: courses?.length || 0,
          totalSessions,
          completedSessions,
          remainingSessions,
          averageAttendance,
          totalStudents: new Set(attendance?.map(a => a.student_id)).size,
          thisWeekSessions,
          nextWeekSessions,
          attendanceTrend: 'stable',
          performanceScore
        });
      }
      return lecturerStats;
    },
    refetchInterval: 30000,
  });

  // Get system-wide statistics (real-time, filtered)
  const { data: systemStats, isLoading: systemLoading } = useQuery({
    queryKey: ['analytics', 'system', timeFilter],
    queryFn: async () => {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');
      if (usersError) throw usersError;
      // Get all courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*');
      if (coursesError) throw coursesError;
      // Get all sessions in range
      const { data: sessions, error: sessionsError } = await supabase
        .from('class_sessions')
        .select('*')
        .gte('session_date', startDateStr)
        .lte('session_date', endDateStr);
      if (sessionsError) throw sessionsError;
      // Get attendance in range
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr);
      if (attendanceError) throw attendanceError;
      // Calculate stats
      const totalLecturers = users?.filter(u => u.role === 'lecturer').length || 0;
      const totalStudents = users?.filter(u => u.role === 'student').length || 0;
      const totalCourses = courses?.length || 0;
      const totalSessions = sessions?.length || 0;
      const attendanceCount = new Set(attendance?.map(a => a.student_id)).size || 0;
      const averageAttendanceRate = totalStudents > 0 ? (attendanceCount / totalStudents) * 100 : 0;
      // Calculate growth rates
      // Previous period for growth
      let prevStart, prevEnd;
      if (timeFilter === 'week') {
        prevStart = new Date(startDate);
        prevStart.setDate(startDate.getDate() - 7);
        prevEnd = new Date(startDate);
        prevEnd.setDate(startDate.getDate() - 1);
      } else if (timeFilter === 'month') {
        prevStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
        prevEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
      } else {
        // semester
        if (startDate.getMonth() < 6) {
          prevStart = new Date(startDate.getFullYear() - 1, 6, 1);
          prevEnd = new Date(startDate.getFullYear() - 1, 11, 31);
        } else {
          prevStart = new Date(startDate.getFullYear(), 0, 1);
          prevEnd = new Date(startDate.getFullYear(), 5, 30);
        }
      }
      const prevStartStr = prevStart.toISOString().split('T')[0];
      const prevEndStr = prevEnd.toISOString().split('T')[0];
      const { data: prevAttendance } = await supabase
        .from('attendance_records')
        .select('*')
        .gte('date', prevStartStr)
        .lte('date', prevEndStr);
      const prevAttendanceCount = new Set(prevAttendance?.map(a => a.student_id)).size || 0;
      const growth = prevAttendanceCount > 0 ? ((attendanceCount - prevAttendanceCount) / prevAttendanceCount) * 100 : 0;
      return {
        totalLecturers,
        totalStudents,
        totalCourses,
        totalSessions,
        averageAttendanceRate,
        activeBeacons: 0, // Add if needed
        todayAttendance: attendanceCount,
        weeklyGrowth: timeFilter === 'week' ? growth : 0,
        monthlyGrowth: timeFilter === 'month' ? growth : 0
      };
    },
    refetchInterval: 30000,
  });

  if (lecturersLoading || systemLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const topPerformers = lecturers?.sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 5) || [];
  const needsAttention = lecturers?.filter(l => l.performanceScore < 70).slice(0, 5) || [];

  // Show loading state while data is being fetched
  if (lecturersLoading || systemLoading) {
    return <PageLoading text="Loading analytics data..." />;
  }

  const handleExport = () => {
    const exportData = formatAnalyticsDataForExport(systemStats, lecturers || []);
    
    exportToPDF({
      title: 'System Analytics Report',
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      systemStats: exportData.systemStats,
      lecturerStats: exportData.lecturerStats,
      type: 'analytics' as any
    });
  };

  const handleExportCSV = () => {
    const exportData = formatAnalyticsDataForExport(systemStats, lecturers || []);
    exportToCSV({
      title: 'System Analytics Report',
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      systemStats: exportData.systemStats,
      lecturerStats: exportData.lecturerStats,
      type: 'analytics' as any
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">System Analytics</h2>
            <p className="text-gray-400">Real-time comprehensive insights into attendance patterns and lecturer performance</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setViewMode(viewMode === 'overview' ? 'detailed' : 'overview')}
              className="text-gray-400 hover:text-white"
            >
              {viewMode === 'overview' ? <EyeOff className="w-5 h-5 mr-2" /> : <Eye className="w-5 h-5 mr-2" />}
              {viewMode === 'overview' ? 'Detailed View' : 'Overview'}
            </Button>
            <Button
              variant="ghost"
              onClick={handleExport}
              className="text-gray-400 hover:text-white"
            >
              <Download className="w-5 h-5 mr-2" />
              Export PDF
            </Button>
            <Button
              variant="ghost"
              onClick={handleExportCSV}
              className="text-gray-400 hover:text-white"
            >
              <Download className="w-5 h-5 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Time Filter */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20">
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              onClick={() => setTimeFilter('week')}
              className={`flex-1 rounded-xl transition-all duration-300 ${
                timeFilter === 'week' 
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              This Week
            </Button>
            <Button
              variant="ghost"
              onClick={() => setTimeFilter('month')}
              className={`flex-1 rounded-xl transition-all duration-300 ${
                timeFilter === 'month' 
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              This Month
            </Button>
            <Button
              variant="ghost"
              onClick={() => setTimeFilter('semester')}
              className={`flex-1 rounded-xl transition-all duration-300 ${
                timeFilter === 'semester' 
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              This Semester
            </Button>
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-600/20 p-3 rounded-xl">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                +{systemStats?.weeklyGrowth}%
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{systemStats?.totalStudents || 0}</h3>
            <p className="text-gray-400 text-sm">Total Students</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-600/20 p-3 rounded-xl">
                <GraduationCap className="w-6 h-6 text-blue-400" />
              </div>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                Active
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{systemStats?.totalLecturers || 0}</h3>
            <p className="text-gray-400 text-sm">Total Lecturers</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-600/20 p-3 rounded-xl">
                <BookOpen className="w-6 h-6 text-green-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {systemStats?.totalCourses || 0}
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{systemStats?.totalCourses || 0}</h3>
            <p className="text-gray-400 text-sm">Active Courses</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-600/20 p-3 rounded-xl">
                <Activity className="w-6 h-6 text-yellow-400" />
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                {systemStats?.averageAttendanceRate?.toFixed(1) || 0}%
              </Badge>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{systemStats?.averageAttendanceRate?.toFixed(1) || 0}%</h3>
            <p className="text-gray-400 text-sm">Avg. Attendance</p>
          </div>
        </div>

        {/* Lecturer Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performers */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">🏆 Top Performers</h3>
              <Award className="w-6 h-6 text-yellow-400" />
            </div>
            
            <div className="space-y-4">
              {topPerformers.map((lecturer, index) => (
                <div key={lecturer.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{lecturer.name}</h4>
                      <p className="text-gray-400 text-sm">{lecturer.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">{lecturer.performanceScore}%</div>
                    <div className="text-gray-400 text-xs">{lecturer.averageAttendance.toFixed(1)}% attendance</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Needs Attention */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">⚠️ Needs Attention</h3>
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            
            <div className="space-y-4">
              {needsAttention.map((lecturer, index) => (
                <div key={lecturer.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{lecturer.name}</h4>
                      <p className="text-gray-400 text-sm">{lecturer.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-400 font-bold">{lecturer.performanceScore}%</div>
                    <div className="text-gray-400 text-xs">{lecturer.averageAttendance.toFixed(1)}% attendance</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Lecturer Analytics */}
        {viewMode === 'detailed' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">📊 Lecturer Performance Details</h3>
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400 text-sm">{lecturers?.length || 0} lecturers</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Lecturer</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Courses</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Sessions</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Remaining</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">This Week</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Attendance</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Trend</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {lecturers?.map((lecturer) => (
                    <tr key={lecturer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-white font-medium">{lecturer.name}</div>
                          <div className="text-gray-400 text-sm">{lecturer.email}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-300">{lecturer.totalCourses}</td>
                      <td className="py-4 px-4 text-gray-300">{lecturer.totalSessions}</td>
                      <td className="py-4 px-4">
                        <Badge className={`${
                          lecturer.remainingSessions > 5 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                            : lecturer.remainingSessions > 2 
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {lecturer.remainingSessions} remaining
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-gray-300">{lecturer.thisWeekSessions}</td>
                      <td className="py-4 px-4">
                        <span className={`font-medium ${
                          lecturer.averageAttendance >= 80 
                            ? 'text-green-400' 
                            : lecturer.averageAttendance >= 60 
                            ? 'text-yellow-400' 
                            : 'text-red-400'
                        }`}>
                          {lecturer.averageAttendance.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {lecturer.attendanceTrend === 'up' ? (
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        ) : lecturer.attendanceTrend === 'down' ? (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-400 rounded-full"></div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className={`w-16 h-2 bg-gray-700 rounded-full overflow-hidden`}>
                          <div 
                            className={`h-full rounded-full ${
                              lecturer.performanceScore >= 80 
                                ? 'bg-green-400' 
                                : lecturer.performanceScore >= 60 
                                ? 'bg-yellow-400' 
                                : 'bg-red-400'
                            }`}
                            style={{ width: `${lecturer.performanceScore}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400">{lecturer.performanceScore}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="w-6 h-6 text-yellow-400" />
              <h4 className="text-lg font-semibold text-white">Quick Insights</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. Sessions per Lecturer:</span>
                <span className="text-white font-medium">
                  {lecturers && lecturers.length > 0 
                    ? Math.round(lecturers.reduce((sum, l) => sum + l.totalSessions, 0) / lecturers.length)
                    : 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">High Performers:</span>
                <span className="text-green-400 font-medium">
                  {lecturers?.filter(l => l.performanceScore >= 80).length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Needs Support:</span>
                <span className="text-red-400 font-medium">
                  {lecturers?.filter(l => l.performanceScore < 60).length || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <Target className="w-6 h-6 text-blue-400" />
              <h4 className="text-lg font-semibold text-white">This Week</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Sessions:</span>
                <span className="text-white font-medium">
                  {lecturers?.reduce((sum, l) => sum + l.thisWeekSessions, 0) || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Next Week:</span>
                <span className="text-white font-medium">
                  {lecturers?.reduce((sum, l) => sum + l.nextWeekSessions, 0) || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Beacons:</span>
                <span className="text-green-400 font-medium">{systemStats?.activeBeacons || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-4">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              <h4 className="text-lg font-semibold text-white">Growth Metrics</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Weekly Growth:</span>
                <span className="text-green-400 font-medium">+{systemStats?.weeklyGrowth || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monthly Growth:</span>
                <span className="text-green-400 font-medium">+{systemStats?.monthlyGrowth || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Today's Attendance:</span>
                <span className="text-white font-medium">{systemStats?.todayAttendance || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 