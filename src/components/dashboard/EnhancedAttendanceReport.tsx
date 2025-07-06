import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  Download, 
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { enhancedAttendanceApi } from '@/lib/api';
import { CardLoading } from '@/components/ui/LoadingSpinner';
import { exportToPDF } from '@/utils/pdfExport';
import type { Database } from '@/lib/supabase';

type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'] & {
  users?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  class_sessions?: {
    id: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    courses?: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
};

interface EnhancedAttendanceReportProps {
  startDate?: string;
  endDate?: string;
  courseId?: string;
  userRole: string;
}

export const EnhancedAttendanceReport: React.FC<EnhancedAttendanceReportProps> = ({
  startDate,
  endDate,
  courseId,
  userRole
}) => {
  const [dateRange, setDateRange] = useState({
    start: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: endDate || new Date().toISOString().split('T')[0]
  });
  const [selectedCourse, setSelectedCourse] = useState(courseId || '');

  const { data: attendanceData, isLoading, error } = useQuery({
    queryKey: ['enhanced-attendance', dateRange.start, dateRange.end, selectedCourse],
    queryFn: () => enhancedAttendanceApi.getAttendanceReport(dateRange.start, dateRange.end, selectedCourse),
  });

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return '--';
    return new Date(dateTimeString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      verified: <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ Verified</Badge>,
      pending: <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏰ Pending</Badge>,
      absent: <Badge className="bg-red-500/20 text-red-400 border-red-500/30">❌ Absent</Badge>
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getMethodBadge = (method: string) => {
    const badges = {
      BLE: <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">📡 BLE</Badge>,
      QR: <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">📱 QR</Badge>,
      MANUAL: <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">✋ Manual</Badge>
    };
    return badges[method as keyof typeof badges] || badges.MANUAL;
  };

  const calculateAttendanceStats = () => {
    if (!attendanceData) return { total: 0, present: 0, absent: 0, late: 0, rate: 0 };
    
    const total = attendanceData.length;
    const present = attendanceData.filter(r => r.status === 'verified').length;
    const absent = attendanceData.filter(r => r.status === 'absent').length;
    const late = attendanceData.filter(r => r.status === 'pending').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return { total, present, absent, late, rate };
  };

  const handleExportReport = () => {
    if (!attendanceData) return;
    
    const attendanceDataForExport = attendanceData.map(record => ({
      studentName: record.users?.full_name || 'Unknown Student',
      studentId: record.users?.email || record.student_id,
      courseCode: record.class_sessions?.courses?.code || record.course_code || 'N/A',
      courseName: record.class_sessions?.courses?.name || record.course_name || 'N/A',
      checkInTime: formatDateTime(record.check_in_time),
      sessionStart: formatTime(record.class_sessions?.start_time),
      sessionEnd: formatTime(record.class_sessions?.end_time),
      location: record.class_sessions?.location || 'N/A',
      method: record.method || 'N/A',
      status: record.status || 'N/A',
      date: record.date || new Date(record.created_at).toLocaleDateString()
    }));

    exportToPDF({
      title: 'Enhanced Attendance Report',
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      attendanceData: attendanceDataForExport,
      type: 'enhanced-attendance'
    });
  };

  const stats = calculateAttendanceStats();

  if (isLoading) {
    return <CardLoading text="Loading enhanced attendance report..." />;
  }

  if (error) {
    return (
      <Card className="glass-card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Error Loading Report</h3>
        <p className="text-gray-400">Please try again later</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Enhanced Attendance Report</h2>
            <p className="text-gray-400">Detailed attendance with check-in/check-out times</p>
          </div>
          <Button
            onClick={handleExportReport}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Course (Optional)</label>
            <Input
              type="text"
              placeholder="Filter by course code"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-gray-400 text-sm">Total Records</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.present}</p>
              <p className="text-gray-400 text-sm">Present</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.late}</p>
              <p className="text-gray-400 text-sm">Late</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <XCircle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.absent}</p>
              <p className="text-gray-400 text-sm">Absent</p>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.rate}%</p>
              <p className="text-gray-400 text-sm">Attendance Rate</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Attendance Table */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Detailed Attendance Records</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Student</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Course</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Check-in Time</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Session Time</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Location</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Method</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData && attendanceData.length > 0 ? (
                attendanceData.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium">{record.users?.full_name || 'Unknown'}</p>
                        <p className="text-gray-400 text-sm">{record.users?.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium">{record.class_sessions?.courses?.name || record.course_name}</p>
                        <p className="text-gray-400 text-sm">{record.class_sessions?.courses?.code || record.course_code}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {formatDateTime(record.check_in_time)}
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      <div>
                        <p className="text-sm">Start: {formatTime(record.class_sessions?.start_time)}</p>
                        <p className="text-sm">End: {formatTime(record.class_sessions?.end_time)}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {record.class_sessions?.location || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      {getMethodBadge(record.method)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(record.status)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    No attendance records found for the selected date range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}; 