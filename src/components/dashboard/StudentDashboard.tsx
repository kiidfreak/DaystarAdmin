import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  BookOpen, 
  User, 
  Calendar, 
  Clock, 
  GraduationCap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { coursesApi } from '@/lib/api';
import { CardLoading } from '@/components/ui/LoadingSpinner';
import { useUser } from '@/contexts/UserContext';

type StudentEnrollment = {
  id: string;
  student_id: string;
  course_id: string;
  status: string;
  assigned_at: string;
  notes: string | null;
  courses: {
    id: string;
    name: string;
    code: string;
    department: string;
    users: {
      id: string;
      full_name: string;
      email: string;
    } | null;
  };
};

export const StudentDashboard: React.FC = () => {
  const { user } = useUser();

  // Get student enrollments
  const { data: enrollments, isLoading, error } = useQuery({
    queryKey: ['student-enrollments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return await coursesApi.getStudentEnrollments(user.id);
    },
    enabled: !!user?.id,
  });

  // Get student attendance statistics
  const { data: attendanceStats } = useQuery({
    queryKey: ['student-attendance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: attendanceRecords } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', user.id);
      
      const { data: allSessions } = await supabase
        .from('class_sessions')
        .select('*');
      
      const totalSessions = allSessions?.length || 0;
      const attendedSessions = attendanceRecords?.length || 0;
      const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
      
      return {
        totalSessions,
        attendedSessions,
        attendanceRate,
        lastAttendance: attendanceRecords?.[0]?.check_in_time
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <CardLoading text="Loading your courses..." />;
  }

  if (error) {
    return (
      <div className="glass-card p-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Error Loading Courses</h3>
        <p className="text-gray-400">Please try again later</p>
      </div>
    );
  }

  const enrolledCourses = enrollments || [];
  const totalCourses = enrolledCourses.length;
  const activeCourses = enrolledCourses.filter(e => e.status === 'active').length;

  const getStatusBadge = (status: string) => {
    const badges = {
      active: <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ Active</Badge>,
      inactive: <Badge className="bg-red-500/20 text-red-400 border-red-500/30">❌ Inactive</Badge>,
      pending: <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏰ Pending</Badge>
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-400';
    if (rate >= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">My Dashboard</h2>
          <p className="text-gray-400">Welcome back, {user?.full_name}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{totalCourses}</div>
          <div className="text-gray-400 text-sm">Enrolled Courses</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">{totalCourses}</div>
              <div className="text-gray-400 text-sm">Total Courses</div>
            </div>
            <BookOpen className="w-8 h-8 text-blue-400" />
          </div>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-400">{activeCourses}</div>
              <div className="text-gray-400 text-sm">Active Courses</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-2xl font-bold ${getAttendanceRateColor(attendanceStats?.attendanceRate || 0)}`}>
                {attendanceStats?.attendanceRate.toFixed(1) || 0}%
              </div>
              <div className="text-gray-400 text-sm">Attendance Rate</div>
            </div>
            <Clock className="w-8 h-8 text-purple-400" />
          </div>
        </Card>
      </div>

      {/* Enrolled Courses */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">My Enrolled Courses</h3>
          <p className="text-gray-400 text-sm mt-1">
            {enrolledCourses.length === 0 ? 'No courses enrolled yet' : `${enrolledCourses.length} course${enrolledCourses.length !== 1 ? 's' : ''} enrolled`}
          </p>
        </div>
        
        {enrolledCourses.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-white mb-2">No Courses Enrolled</h4>
            <p className="text-gray-400">You haven't been enrolled in any courses yet. Please contact your administrator.</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid gap-6">
              {enrolledCourses.map((enrollment: StudentEnrollment) => (
                <div key={enrollment.id} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-white">{enrollment.courses.name}</h4>
                        <Badge className="bg-sky-blue/20 text-sky-blue border border-sky-blue/30 rounded-xl">
                          {enrollment.courses.code}
                        </Badge>
                        {getStatusBadge(enrollment.status)}
                      </div>
                      <p className="text-gray-400 mb-3">
                        Instructor: {enrollment.courses.users?.full_name || 'No instructor assigned'}
                      </p>
                      <p className="text-gray-400 text-sm">Department: {enrollment.courses.department}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Enrolled: {new Date(enrollment.assigned_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Attendance Summary */}
      {attendanceStats && (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-xl font-semibold text-white">Attendance Summary</h3>
            <p className="text-gray-400 text-sm mt-1">Your overall attendance performance</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">{attendanceStats.totalSessions}</div>
                <div className="text-gray-400 text-sm">Total Sessions</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">{attendanceStats.attendedSessions}</div>
                <div className="text-gray-400 text-sm">Attended Sessions</div>
              </div>
              
              <div className="text-center">
                <div className={`text-3xl font-bold ${getAttendanceRateColor(attendanceStats.attendanceRate)} mb-2`}>
                  {attendanceStats.attendanceRate.toFixed(1)}%
                </div>
                <div className="text-gray-400 text-sm">Attendance Rate</div>
              </div>
            </div>
            
            {attendanceStats.lastAttendance && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Last attendance: {new Date(attendanceStats.lastAttendance).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}; 