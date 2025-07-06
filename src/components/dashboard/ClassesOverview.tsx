import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Users, TrendingUp, Eye, EyeOff, Filter } from 'lucide-react';
import { useCourses, useSessionsByCourse } from '@/hooks/use-api';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CardLoading } from '@/components/ui/LoadingSpinner';
import { EnhancedAttendanceReport } from './EnhancedAttendanceReport';
import type { Database } from '@/lib/supabase';

type Course = Database['public']['Tables']['courses']['Row'] & {
  users?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
};

interface AttendanceReport {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  attendanceRate: number;
}

// Fetch real attendance data for a course
const useAttendanceReports = (courseId: string) => {
  const { data: attendanceRecords, isLoading, error } = useQuery({
    queryKey: ['attendance', 'course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('course_code', courseId)
        .gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId,
  });

  // Group attendance by date and calculate statistics
  const reports: AttendanceReport[] = [];
  if (attendanceRecords) {
    const groupedByDate = attendanceRecords.reduce((acc, record) => {
      const date = record.date || new Date(record.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      
      acc[date].total++;
      if (record.status === 'verified') {
        acc[date].present++;
      } else if (record.status === 'pending') {
        acc[date].late++;
      } else {
        acc[date].absent++;
      }
      
      return acc;
    }, {} as Record<string, { present: number; absent: number; late: number; total: number }>);

    // Convert to AttendanceReport format
    Object.entries(groupedByDate).forEach(([date, stats]) => {
      reports.push({
        date: new Date(date).toLocaleDateString(),
        present: (stats as any).present,
        absent: (stats as any).absent,
        late: (stats as any).late,
        total: (stats as any).total,
        attendanceRate: (stats as any).total > 0 ? Math.round(((stats as any).present / (stats as any).total) * 100) : 0
      });
    });
  }

  return { reports, isLoading, error };
};

interface ClassesOverviewProps {
  globalSearchTerm?: string;
  userRole?: string;
  userId?: string;
}

export const ClassesOverview: React.FC<ClassesOverviewProps> = ({ globalSearchTerm = '', userRole, userId }) => {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all-courses' | 'course-reports'>('all-courses');
  const [dateRange, setDateRange] = useState<'week' | 'month'>('week');
  
  // Fetch courses based on user role
  const { data: courses, isLoading, error } = useQuery({
    queryKey: ['courses', 'user', userRole, userId],
    queryFn: async () => {
      console.log('Fetching courses for:', { userRole, userId });
      
      if (userRole === 'lecturer' && userId) {
        // For lecturers, get only their assigned courses
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            users!courses_instructor_id_fkey (
              id,
              full_name,
              email
            )
          `)
          .eq('instructor_id', userId)
          .order('code');
        
        if (error) throw error;
        console.log('Lecturer courses found:', data?.length || 0, data);
        return data || [];
      } else {
        // For admins, get all courses
        const { data, error } = await supabase
          .from('courses')
          .select(`
            *,
            users!courses_instructor_id_fkey (
              id,
              full_name,
              email
            )
          `)
          .order('code');
        
        if (error) throw error;
        console.log('Admin courses found:', data?.length || 0, data);
        return data || [];
      }
    },
    enabled: !!userRole && !!userId,
    staleTime: 0, // Always fetch fresh data
  });
  const { reports: attendanceReports, isLoading: attendanceLoading, error: attendanceError } = useAttendanceReports(selectedCourse || '');

  const filteredCourses = courses?.filter(course => 
    course.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
    (course as any).users?.full_name.toLowerCase().includes(globalSearchTerm.toLowerCase())
  ) || [];

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-400';
    if (rate >= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getDayBadgeColor = (day: string) => {
    const colors = {
      'Monday': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Tuesday': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Wednesday': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Thursday': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Friday': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Saturday': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'Sunday': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return colors[day as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  if (isLoading) {
    return <CardLoading text="Loading courses..." />;
  }

  if (error) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-red-400 mb-4">Error loading courses</p>
        <p className="text-gray-400">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {globalSearchTerm && (
        <div className="glass-card p-4">
          <p className="text-white">
            Search results for: <span className="text-sky-blue font-semibold">"{globalSearchTerm}"</span>
            {filteredCourses.length === 0 && <span className="text-gray-400 ml-2">No courses found</span>}
          </p>
        </div>
      )}

      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-white mb-6">All Courses</h2>
        
        <div className="grid gap-6">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{course.name}</h3>
                    <Badge className="bg-sky-blue/20 text-sky-blue border border-sky-blue/30 rounded-xl">
                      {course.code}
                    </Badge>
                  </div>
                  <p className="text-gray-400 mb-3">{(course as any).users?.full_name || 'No instructor assigned'}</p>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => setSelectedCourse(selectedCourse === course.id ? null : course.id)}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl"
                >
                  {selectedCourse === course.id ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                  {selectedCourse === course.id ? 'Hide' : 'View'} Reports
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Clock className="w-4 h-4 text-sky-blue" />
                  <span className="text-sm">Course Code: {course.code}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-gray-300">
                  <MapPin className="w-4 h-4 text-sky-blue" />
                  <span className="text-sm">Created: {new Date(course.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-gray-300">
                  <Users className="w-4 h-4 text-sky-blue" />
                  <span className="text-sm">Course ID: {course.id.slice(0, 8)}...</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-sky-blue" />
                <div className="flex space-x-2">
                  <Badge className="text-xs border rounded-lg bg-sky-blue/20 text-sky-blue border-sky-blue/30">
                    Active Course
                  </Badge>
                </div>
              </div>

              {/* Attendance Reports */}
              {selectedCourse === course.id && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-4">Attendance Reports - Last 14 Days</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-sm">Date</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-sm">Present</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-sm">Late</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-sm">Absent</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-sm">Total</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-sm">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceLoading ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400">
                              Loading attendance data...
                            </td>
                          </tr>
                        ) : attendanceError ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-red-400">
                              Error loading attendance data
                            </td>
                          </tr>
                        ) : attendanceReports.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400">
                              No attendance data available
                            </td>
                          </tr>
                        ) : (
                          attendanceReports.map((report, index) => (
                            <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-3 px-3 text-white text-sm">{report.date}</td>
                              <td className="py-3 px-3 text-green-400 font-medium text-sm">{report.present}</td>
                              <td className="py-3 px-3 text-yellow-400 font-medium text-sm">{report.late}</td>
                              <td className="py-3 px-3 text-red-400 font-medium text-sm">{report.absent}</td>
                              <td className="py-3 px-3 text-gray-300 text-sm">{report.total}</td>
                              <td className={`py-3 px-3 font-medium text-sm ${getAttendanceRateColor(report.attendanceRate)}`}>
                                {report.attendanceRate}%
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 p-4 bg-white/5 rounded-lg">
                    <h5 className="text-sm font-medium text-white mb-2">Summary Statistics</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-gray-400">Avg. Attendance:</span>
                        <span className="ml-1 font-medium text-green-400">
                          {attendanceReports.length > 0 
                            ? Math.round(attendanceReports.reduce((sum, r) => sum + r.attendanceRate, 0) / attendanceReports.length)
                            : 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Best Day:</span>
                        <span className="ml-1 font-medium text-green-400">
                          {attendanceReports.length > 0 
                            ? Math.max(...attendanceReports.map(r => r.attendanceRate))
                            : 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Total Classes:</span>
                        <span className="ml-1 font-medium text-white">{attendanceReports.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Course Code:</span>
                        <span className="ml-1 font-medium text-sky-blue">{course.code}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {filteredCourses.length === 0 && globalSearchTerm && (
          <div className="text-center py-8 text-gray-400">
            No classes found matching "{globalSearchTerm}"
          </div>
        )}
      </div>

      {activeTab === 'course-reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Enhanced Course Reports</h3>
            <div className="flex space-x-2">
              <Button
                onClick={() => setDateRange('week')}
                variant={dateRange === 'week' ? 'default' : 'outline'}
                className="text-xs"
              >
                Week
              </Button>
              <Button
                onClick={() => setDateRange('month')}
                variant={dateRange === 'month' ? 'default' : 'outline'}
                className="text-xs"
              >
                Month
              </Button>
            </div>
          </div>
          
          <EnhancedAttendanceReport
            startDate={getDateRange().start}
            endDate={getDateRange().end}
            userRole={userRole}
          />
        </div>
      )}
    </div>
  );
};
