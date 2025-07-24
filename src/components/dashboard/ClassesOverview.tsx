import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Users, TrendingUp, Eye, EyeOff, Filter } from 'lucide-react';
import { useCourses, useSessionsByCourse } from '@/hooks/use-api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CardLoading } from '@/components/ui/LoadingSpinner';
import { EnhancedAttendanceReport } from './EnhancedAttendanceReport';
import type { Database } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

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
const useAttendanceReports = (courseId: string, courseCode: string) => {
  const { data: attendanceRecords, isLoading, error } = useQuery({
    queryKey: ['attendance', 'course', courseId, courseCode],
    queryFn: async () => {
      if (!courseCode) return [];
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('course_code', courseCode)
        .gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!courseCode,
    refetchInterval: 5000, // Real-time updates
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
      if (record.status === 'present' || record.status === 'verified') {
        acc[date].present++;
      } else if (record.status === 'pending' || record.status === 'late') {
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
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
    enabled: !!userRole && (userRole !== 'lecturer' || !!userId),
    staleTime: 0, // Always fetch fresh data
  });
  const selectedCourseObj = courses?.find(c => c.id === selectedCourse) || null;

  // Move filteredCourses here, before any useEffect or code that uses it
  const filteredCourses = courses?.filter(course => 
    course.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
    course.code.toLowerCase().includes(globalSearchTerm.toLowerCase()) ||
    (course as any).users?.full_name.toLowerCase().includes(globalSearchTerm.toLowerCase())
  ) || [];

  const [allCourseReports, setAllCourseReports] = useState<Record<string, AttendanceReport[]>>({});

  useEffect(() => {
    const fetchAllReports = async () => {
      if (!filteredCourses.length) return;
      const reportsObj: Record<string, AttendanceReport[]> = {};
      for (const course of filteredCourses) {
        const { data: attendanceRecords, error } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('course_code', course.code)
          .gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('date', { ascending: false });
        if (!error && attendanceRecords) {
          // Group attendance by date and calculate statistics
          const groupedByDate = attendanceRecords.reduce((acc, record) => {
            const date = record.date || new Date(record.created_at).toISOString().split('T')[0];
            if (!acc[date]) {
              acc[date] = { present: 0, absent: 0, late: 0, total: 0 };
            }
            acc[date].total++;
            if (record.status === 'present' || record.status === 'verified') {
              acc[date].present++;
            } else if (record.status === 'pending' || record.status === 'late') {
              acc[date].late++;
            } else {
              acc[date].absent++;
            }
            return acc;
          }, {} as Record<string, { present: number; absent: number; late: number; total: number }>);
          // Convert to AttendanceReport format
          const reports: AttendanceReport[] = Object.entries(groupedByDate).map(([date, stats]) => {
            const s = stats as { present: number; absent: number; late: number; total: number };
            return {
              date: new Date(date).toLocaleDateString(),
              present: s.present,
              absent: s.absent,
              late: s.late,
              total: s.total,
              attendanceRate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
            };
          });
          reportsObj[course.id] = reports;
        } else {
          reportsObj[course.id] = [];
        }
      }
      setAllCourseReports(reportsObj);
    };
    fetchAllReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filteredCourses)]);

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

  // Export helpers
  const exportCourseReportCSV = (courseName: string, courseCode: string, reports: AttendanceReport[]) => {
    const csv = Papa.unparse([
      ['Date', 'Present', 'Late', 'Absent', 'Total', 'Attendance Rate'],
      ...reports.map(r => [r.date, r.present, r.late, r.absent, r.total, `${r.attendanceRate}%`])
    ]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${courseName}_${courseCode}_AttendanceReport.csv`);
  };
  const exportCourseReportPDF = (courseName: string, courseCode: string, reports: AttendanceReport[]) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`${courseName} (${courseCode}) Attendance Report`, 10, 15);
    doc.setFontSize(10);
    const headers = ['Date', 'Present', 'Late', 'Absent', 'Total', 'Attendance Rate'];
    const rows = reports.map(r => [r.date, r.present, r.late, r.absent, r.total, `${r.attendanceRate}%`]);
    doc.autoTable({ head: [headers], body: rows, startY: 25 });
    doc.save(`${courseName}_${courseCode}_AttendanceReport.pdf`);
  };

  // Implement exportAllCoursesCSV and exportAllCoursesPDF
  const exportAllCoursesCSV = () => {
    if (!filteredCourses.length) return;
    let allRows = [];
    for (const course of filteredCourses) {
      const reports = allCourseReports[course.id] || [];
      if (reports.length > 0) {
        allRows = allRows.concat(
          reports.map(r => ({
            Course: course.name,
            Code: course.code,
            Date: r.date,
            Present: r.present,
            Late: r.late,
            Absent: r.absent,
            Total: r.total,
            'Attendance Rate': `${r.attendanceRate}%`
          }))
        );
      }
    }
    if (allRows.length === 0) return;
    const csv = Papa.unparse(allRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `AllCourses_AttendanceReports.csv`);
  };

  const exportAllCoursesPDF = () => {
    if (!filteredCourses.length) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('All Courses Attendance Reports', 10, 15);
    doc.setFontSize(10);
    let y = 25;
    for (const course of filteredCourses) {
      const reports = allCourseReports[course.id] || [];
      if (reports.length > 0) {
        doc.text(`${course.name} (${course.code})`, 10, y);
        y += 6;
        const headers = ['Date', 'Present', 'Late', 'Absent', 'Total', 'Attendance Rate'];
        const rows = reports.map(r => [r.date, r.present, r.late, r.absent, r.total, `${r.attendanceRate}%`]);
        doc.autoTable({ head: [headers], body: rows, startY: y });
        y = doc.lastAutoTable.finalY + 10;
      }
    }
    doc.save('AllCourses_AttendanceReports.pdf');
  };

  // Inline date range logic for EnhancedAttendanceReport
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + (6 - today.getDay()));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const getDateRange = () =>
    dateRange === 'week'
      ? { start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] }
      : { start: monthStart.toISOString().split('T')[0], end: monthEnd.toISOString().split('T')[0] };

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
      {/* Create Course Button for Admins */}
      {userRole === 'admin' && (
        <div className="flex justify-end mb-4">
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowCreateModal(true)} variant="default">+ Create Course</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>Enter the course name and code below.</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCreating(true);
                  setErrorMsg(null);
                  const { data, error } = await supabase.from('courses').insert({
                    name: newCourseName,
                    code: newCourseCode,
                  });
                  setCreating(false);
                  if (error) {
                    setErrorMsg(error.message);
                  } else {
                    setShowCreateModal(false);
                    setNewCourseName('');
                    setNewCourseCode('');
                    queryClient.invalidateQueries({ queryKey: ['courses'] });
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Course Name</label>
                  <Input
                    value={newCourseName}
                    onChange={e => setNewCourseName(e.target.value)}
                    placeholder="e.g. Introduction to AI"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Course Code</label>
                  <Input
                    value={newCourseCode}
                    onChange={e => setNewCourseCode(e.target.value)}
                    placeholder="e.g. AI101"
                    required
                  />
                </div>
                {errorMsg && <div className="text-red-400 text-sm">{errorMsg}</div>}
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Course'}
                  </Button>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
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
        {/* Export All Courses Buttons */}
        <div className="flex gap-2 mb-4">
          <Button onClick={exportAllCoursesCSV} variant="outline">Export All to CSV</Button>
          <Button onClick={exportAllCoursesPDF} variant="outline">Export All to PDF</Button>
        </div>
        
        <div className="grid gap-6">
          {filteredCourses.map((course) => (
            <CourseAttendanceCard
              key={course.id}
              course={course}
              reports={allCourseReports[course.id] || []}
              isSelected={selectedCourse === course.id}
              onSelect={() => setSelectedCourse(selectedCourse === course.id ? null : course.id)}
            />
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

// Add this new component above ClassesOverview
const CourseAttendanceCard: React.FC<{ course: Course; reports: AttendanceReport[]; isSelected: boolean; onSelect: () => void }> = ({ course, reports, isSelected, onSelect }) => {
  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors shadow-lg">
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
          onClick={onSelect}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl"
        >
          {isSelected ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
          {isSelected ? 'Hide' : 'View'} Reports
        </Button>
      </div>
      <div className="flex flex-wrap gap-4 mb-4 text-gray-300">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-sky-blue" />
          <span className="text-sm">Course Code: {course.code}</span>
        </div>
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-sky-blue" />
          <span className="text-sm">Created: {new Date(course.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4 text-sky-blue" />
          <span className="text-sm">Course ID: {course.id.slice(0, 8)}...</span>
        </div>
      </div>
      <div className="flex items-center space-x-2 mb-4">
        <Calendar className="w-4 h-4 text-sky-blue" />
        <Badge className="text-xs border rounded-lg bg-sky-blue/20 text-sky-blue border-sky-blue/30">
          Active Course
        </Badge>
      </div>
      {isSelected && (
        <div className="mt-6">
          <h4 className="text-md font-semibold text-white mb-2">Attendance Reports (Last 2 Weeks)</h4>
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant="outline" onClick={() => exportCourseReportCSV(course.name, course.code, reports)}>
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportCourseReportPDF(course.name, course.code, reports)}>
              Export PDF
            </Button>
          </div>
          {reports.length === 0 ? (
            <div className="text-gray-400">No attendance records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left text-gray-300">
                <thead>
                  <tr className="bg-white/10">
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Present</th>
                    <th className="px-3 py-2">Late</th>
                    <th className="px-3 py-2">Absent</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2">{r.date}</td>
                      <td className="px-3 py-2">{r.present}</td>
                      <td className="px-3 py-2">{r.late}</td>
                      <td className="px-3 py-2">{r.absent}</td>
                      <td className="px-3 py-2">{r.total}</td>
                      <td className="px-3 py-2 font-bold" style={{ color: r.attendanceRate >= 80 ? '#22c55e' : r.attendanceRate >= 50 ? '#eab308' : '#ef4444' }}>{r.attendanceRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
