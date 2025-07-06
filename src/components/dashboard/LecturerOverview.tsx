import React, { useState } from 'react';
import { MetricCard } from './MetricCard';
import { Users, Calendar, Clock, CheckCircle, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CardLoading } from '@/components/ui/LoadingSpinner';
import type { Database } from '@/lib/supabase';
import { EnhancedAttendanceReport } from './EnhancedAttendanceReport';

type Lecturer = Database['public']['Tables']['users']['Row'] & {
  courses?: {
    id: string;
    name: string;
    code: string;
  }[];
  attendance_stats?: {
    total_students: number;
    students_present: number;
    ble_checkins: number;
    qr_checkins: number;
    classes_today: number;
    attended_classes: number;
  };
};

interface LecturerData {
  id: string;
  name: string;
  email: string;
  classesToday: number;
  attendedClasses: number;
  totalStudents: number;
  studentsPresent: number;
  bleCheckIns: number;
  qrCheckIns: number;
  status: 'present' | 'absent' | 'partial';
}

// Hook to fetch lecturers with attendance data
const useLecturersWithAttendance = () => {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['lecturers', 'attendance', today],
    queryFn: async () => {
      // Get all lecturers
      const { data: lecturers, error: lecturersError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          courses!courses_instructor_id_fkey (
            id,
            name,
            code
          )
        `)
        .eq('role', 'lecturer');
      
      if (lecturersError) throw lecturersError;
      
      // Get today's attendance records
      const { data: todayAttendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', today);
      
      if (attendanceError) throw attendanceError;
      
      // Get today's class sessions
      const { data: todaySessions, error: sessionsError } = await supabase
        .from('class_sessions')
        .select('*')
        .gte('session_date', `${today}T00:00:00`)
        .lte('session_date', `${today}T23:59:59`);
      
      if (sessionsError) throw sessionsError;
      
      // Calculate statistics for each lecturer
      const lecturersWithStats: LecturerData[] = (lecturers || []).map(lecturer => {
        const lecturerCourses = lecturer.courses || [];
        const courseCodes = lecturerCourses.map(course => course.code);
        const courseIds = lecturerCourses.map(course => course.id);
        
        // Get attendance records for this lecturer's courses
        const lecturerAttendance = todayAttendance?.filter(record => 
          courseCodes.includes(record.course_code)
        ) || [];
        
        // Get sessions for this lecturer's courses today
        const lecturerSessions = todaySessions?.filter(session => 
          courseIds.includes(session.course_id)
        ) || [];
        
        // Calculate statistics
        const totalStudents = lecturerAttendance.length;
        const studentsPresent = lecturerAttendance.filter(record => record.status === 'verified').length;
        const bleCheckIns = lecturerAttendance.filter(record => record.method === 'BLE').length;
        const qrCheckIns = lecturerAttendance.filter(record => record.method === 'QR').length;
        const classesToday = lecturerSessions.length;
        const attendedClasses = lecturerSessions.filter(session => 
          lecturerAttendance.some(record => record.course_code === session.course_code)
        ).length;
        
        // Determine status
        let status: 'present' | 'absent' | 'partial' = 'absent';
        if (classesToday === 0) {
          status = 'absent';
        } else if (attendedClasses === classesToday) {
          status = 'present';
        } else if (attendedClasses > 0) {
          status = 'partial';
        }
        
        return {
          id: lecturer.id,
          name: lecturer.full_name || 'Unknown Lecturer',
          email: lecturer.email || '',
          classesToday,
          attendedClasses,
          totalStudents,
          studentsPresent,
          bleCheckIns,
          qrCheckIns,
          status
        };
      });
      
      return lecturersWithStats;
    },
  });
};

export const LecturerOverview: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'partial' | 'absent'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');
  const [dateRange, setDateRange] = useState<'week' | 'month'>('week');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  
  const { data: lecturers, isLoading, error } = useLecturersWithAttendance();

  if (isLoading) {
    return <CardLoading text="Loading lecturer data..." />;
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="glass-card p-12 text-center">
          <p className="text-red-400 mb-4">Error loading lecturer data</p>
          <p className="text-gray-400">Please try again later</p>
        </div>
      </div>
    );
  }

  const lecturerData = lecturers || [];
  const presentLecturers = lecturerData.filter(l => l.status === 'present').length;
  const absentLecturers = lecturerData.filter(l => l.status === 'absent').length;
  const partialLecturers = lecturerData.filter(l => l.status === 'partial').length;
  
  const totalStudents = lecturerData.reduce((sum, l) => sum + l.totalStudents, 0);
  const totalPresent = lecturerData.reduce((sum, l) => sum + l.studentsPresent, 0);
  const totalBLE = lecturerData.reduce((sum, l) => sum + l.bleCheckIns, 0);
  const totalQR = lecturerData.reduce((sum, l) => sum + l.qrCheckIns, 0);

  const filteredLecturers = statusFilter === 'all' 
    ? lecturerData 
    : lecturerData.filter(lecturer => lecturer.status === statusFilter);

  const getFilterButtonClass = (filterValue: string) => {
    return statusFilter === filterValue 
      ? 'bg-sky-blue/20 text-sky-blue border border-sky-blue/30' 
      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10';
  };

  const getStatusBadge = (status: string, attendedClasses: number, totalClasses: number) => {
    if (status === 'present') {
      return <Badge className="status-online border rounded-xl">✅ All Classes</Badge>;
    }
    if (status === 'partial') {
      return <Badge className="status-warning border rounded-xl">⚠️ {attendedClasses}/{totalClasses} Classes</Badge>;
    }
    return <Badge className="status-offline border rounded-xl">❌ Absent</Badge>;
  };

  const getDateRange = () => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (dateRange === 'week') {
      start.setDate(now.getDate() - now.getDay());
      end.setDate(now.getDate() + (6 - now.getDay()));
    } else if (dateRange === 'month') {
      start.setDate(1);
      end.setDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  return (
    <div className="space-y-8">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Lecturers Present" 
          value={presentLecturers} 
          change={`${lecturerData.length > 0 ? ((presentLecturers / lecturerData.length) * 100).toFixed(0) : 0}%`}
          trend="up" 
          icon={Users} 
          color="green"
        />
        <MetricCard 
          title="Lecturers Absent" 
          value={absentLecturers} 
          change={`${lecturerData.length > 0 ? ((absentLecturers / lecturerData.length) * 100).toFixed(0) : 0}%`}
          trend={absentLecturers > 0 ? "down" : "neutral"} 
          icon={Calendar} 
          color="red"
        />
        <MetricCard 
          title="Student Attendance" 
          value={`${totalStudents > 0 ? ((totalPresent / totalStudents) * 100).toFixed(0) : 0}%`} 
          change={`${totalPresent}/${totalStudents}`}
          trend="up" 
          icon={CheckCircle} 
          color="blue"
        />
        <MetricCard 
          title="BLE vs QR Check-ins" 
          value={`${totalBLE}/${totalQR}`} 
          change={`${(totalBLE + totalQR) > 0 ? ((totalBLE / (totalBLE + totalQR)) * 100).toFixed(0) : 0}% BLE`}
          trend="neutral" 
          icon={Clock} 
          color="yellow"
        />
      </div>

      {/* Lecturer Details Table */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Lecturer Attendance Overview</h2>
          <div className="flex space-x-2">
            <Badge className="status-online border rounded-xl">
              {presentLecturers} Present
            </Badge>
            <Badge className="status-warning border rounded-xl">
              {partialLecturers} Partial
            </Badge>
            <Badge className="status-offline border rounded-xl">
              {absentLecturers} Absent
            </Badge>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6">
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => setStatusFilter('all')}
              className={`rounded-xl ${getFilterButtonClass('all')}`}
            >
              <Filter className="w-4 h-4 mr-1" />
              All ({lecturerData.length})
            </Button>
            <Button
              size="sm"
              onClick={() => setStatusFilter('present')}
              className={`rounded-xl ${getFilterButtonClass('present')}`}
            >
              Present ({presentLecturers})
            </Button>
            <Button
              size="sm"
              onClick={() => setStatusFilter('partial')}
              className={`rounded-xl ${getFilterButtonClass('partial')}`}
            >
              Partial ({partialLecturers})
            </Button>
            <Button
              size="sm"
              onClick={() => setStatusFilter('absent')}
              className={`rounded-xl ${getFilterButtonClass('absent')}`}
            >
              Absent ({absentLecturers})
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Lecturer</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Classes Status</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Student Attendance</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">BLE Check-ins</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">QR Check-ins</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              {filteredLecturers.map((lecturer) => (
                <tr key={lecturer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <div className="text-white font-medium">{lecturer.name}</div>
                      <div className="text-gray-400 text-sm">{lecturer.email}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {getStatusBadge(lecturer.status, lecturer.attendedClasses, lecturer.classesToday)}
                  </td>
                  <td className="py-4 px-4 text-gray-400">
                    {lecturer.studentsPresent}/{lecturer.totalStudents}
                  </td>
                  <td className="py-4 px-4 text-green-400 font-medium">
                    {lecturer.bleCheckIns}
                  </td>
                  <td className="py-4 px-4 text-yellow-400 font-medium">
                    {lecturer.qrCheckIns}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`font-medium ${
                      lecturer.totalStudents > 0 && (lecturer.studentsPresent / lecturer.totalStudents) > 0.8 
                        ? 'text-green-400' 
                        : lecturer.totalStudents > 0 && (lecturer.studentsPresent / lecturer.totalStudents) > 0.6 
                        ? 'text-yellow-400' 
                        : 'text-red-400'
                    }`}>
                      {lecturer.totalStudents > 0 ? ((lecturer.studentsPresent / lecturer.totalStudents) * 100).toFixed(0) : 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredLecturers.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No lecturers found matching your criteria
          </div>
        )}
      </div>

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Enhanced Attendance Reports</h3>
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
            courseId={selectedCourse}
            userRole="lecturer"
          />
        </div>
      )}
    </div>
  );
};
