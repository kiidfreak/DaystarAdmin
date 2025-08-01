import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Users, TrendingUp, Eye, EyeOff, Filter, BookOpen, FileText } from 'lucide-react';
import { useCourses, useSessionsByCourse } from '@/hooks/use-api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CardLoading } from '@/components/ui/LoadingSpinner';
import { EnhancedAttendanceReport } from './EnhancedAttendanceReport';
import type { Database } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
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
  students?: any[];
}

// Enhanced attendance data with student names
const useAttendanceReports = (courseId: string, courseCode: string, isInactive: boolean = false) => {
  const { data: attendanceRecords, isLoading, error } = useQuery({
    queryKey: ['attendance', 'course', courseId, courseCode, isInactive],
    queryFn: async () => {
      if (!courseId && !courseCode) return [];
      let query = supabase
        .from('attendance_records')
        .select(`*, users!inner(full_name, email, student_number)`)
        .eq('course_id', courseId);
      if (!isInactive) {
        query = query.gte('date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      }
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      // Debug log
      console.log('Fetched attendanceRecords for courseId:', courseId, 'isInactive:', isInactive, data);
      return data || [];
    },
    enabled: !!courseId,
    refetchInterval: 5000, // Real-time updates
  });

  // Group attendance by date and calculate statistics with student names
  const reports: AttendanceReport[] = [];
  const studentDetails: Record<string, any[]> = {};
  
  if (attendanceRecords) {
    const groupedByDate = attendanceRecords.reduce((acc, record) => {
      const date = record.date || new Date(record.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { present: 0, absent: 0, late: 0, total: 0, students: [] };
      }
      acc[date].total++;
      
      // Add student details
      const studentInfo = {
        name: record.users?.full_name || 'Unknown Student',
        email: record.users?.email || '',
        studentNumber: record.users?.student_number || '',
        status: record.status,
        checkInTime: record.check_in_time,
        method: record.method
      };
      acc[date].students.push(studentInfo);
      
      if (record.status === 'present' || record.status === 'verified') {
        acc[date].present++;
      } else if (record.status === 'pending' || record.status === 'late') {
        acc[date].late++;
      } else {
        acc[date].absent++;
      }
      return acc;
    }, {} as Record<string, { present: number; absent: number; late: number; total: number; students: any[] }>);

    // Convert to AttendanceReport format
    Object.entries(groupedByDate).forEach(([date, stats]) => {
      const s = stats as { present: number; absent: number; late: number; total: number; students?: any[] };
      reports.push({
        date: new Date(date).toLocaleDateString(),
        present: s.present,
        absent: s.absent,
        late: s.late,
        total: s.total,
        attendanceRate: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
      });
      studentDetails[date] = s.students || [];
    });
  }

  return { reports, studentDetails, isLoading, error };
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
  const exportCourseReportPDF = (courseName: string, courseCode: string, reports: AttendanceReport[], studentDetails?: Record<string, any[]>) => {
    const doc = new jsPDF();
    
    // Add creative header with styling
    doc.setFillColor(0, 31, 63); // Navy Blue background
    doc.rect(0, 0, 210, 30, 'F');
    
    // Title with white text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Tally Check', 20, 15);
    
    doc.setFontSize(14);
    doc.text(`${courseName} (${courseCode})`, 20, 25);
    
    // Reset text color for content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let yPosition = 40;
    
    // Summary section
    doc.setFillColor(240, 249, 255); // Light blue background
    doc.rect(10, yPosition, 190, 20, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 Attendance Summary', 15, yPosition + 8);
    
    const totalPresent = reports.reduce((sum, r) => sum + r.present, 0);
    const totalAbsent = reports.reduce((sum, r) => sum + r.absent, 0);
    const totalLate = reports.reduce((sum, r) => sum + r.late, 0);
    const totalStudents = reports.reduce((sum, r) => sum + r.total, 0);
    const overallRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Present: ${totalPresent}`, 15, yPosition + 15);
    doc.text(`Total Absent: ${totalAbsent}`, 60, yPosition + 15);
    doc.text(`Total Late: ${totalLate}`, 105, yPosition + 15);
    doc.text(`Overall Rate: ${overallRate}%`, 150, yPosition + 15);
    
    yPosition += 30;
    
    // Attendance table with enhanced styling
    const headers = ['Date', 'Present', 'Late', 'Absent', 'Total', 'Rate'];
    const rows = reports.map(r => [r.date, r.present, r.late, r.absent, r.total, `${r.attendanceRate}%`]);
    
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: yPosition,
      styles: {
        head: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        body: {
          textColor: [0, 0, 0],
          fontSize: 9
        }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { top: 10 }
    });
    
    yPosition = doc.lastAutoTable.finalY + 20;
    
    // Student details section if available
    if (studentDetails && Object.keys(studentDetails).length > 0) {
      doc.setFillColor(240, 249, 255);
      doc.rect(10, yPosition, 190, 15, 'F');
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('👥 Student Details', 15, yPosition + 8);
      
      yPosition += 20;
      
      // Show student details for each date
      Object.entries(studentDetails).forEach(([date, students]) => {
        if (students.length > 0) {
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`📅 ${date}`, 15, yPosition);
          yPosition += 8;
          
          const studentHeaders = ['Name', 'Status', 'Check-in Time', 'Method'];
          const studentRows = students.map(s => [
            s.name,
            s.status,
            s.checkInTime ? new Date(s.checkInTime).toLocaleTimeString() : 'N/A',
            s.method || 'N/A'
          ]);
          
          doc.autoTable({
            head: [studentHeaders],
            body: studentRows,
            startY: yPosition,
            styles: {
              head: {
                fillColor: [147, 197, 253],
                textColor: [0, 0, 0],
                fontStyle: 'bold'
              },
              body: {
                textColor: [0, 0, 0],
                fontSize: 8
              }
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            },
            margin: { top: 5 }
          });
          
          yPosition = doc.lastAutoTable.finalY + 15;
        }
      });
    }
    
    // Footer
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 280, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 290);
    doc.text('Tally Check - Professional Attendance Management', 20, 295);
    
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

  // Fetch all sessions for all courses
  const { data: allSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['all-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('id, course_id, session_date, start_time, end_time');
      if (error) throw error;
      return data || [];
    },
  });

  // Group courses by session status
  const now = new Date();
  const groupedCourses = {
    active: [] as Course[],
    inactive: [] as Course[],
  };
  filteredCourses.forEach((course) => {
    const sessions = (allSessions || []).filter(s => s.course_id === course.id);
    const hasFutureOrOngoing = sessions.some(s => {
      const sessionDate = new Date(s.session_date);
      const startTime = s.start_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${s.start_time}`) : null;
      const endTime = s.end_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${s.end_time}`) : null;
      if (!startTime || !endTime) return false;
      return now < endTime;
    });
    if (hasFutureOrOngoing) {
      groupedCourses.active.push(course);
    } else {
      groupedCourses.inactive.push(course);
    }
  });

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
          <Button
            onClick={exportAllCoursesCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 shadow"
          >
            <FileText className="w-4 h-4" />
            Export All to CSV
          </Button>
        </div>
        
        <Accordion type="multiple" className="grid gap-6">
          {(['active', 'inactive'] as const).map((status) => (
            <AccordionItem key={status} value={status}>
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  <BookOpen className={`w-5 h-5 ${
                    status === 'active' ? 'text-green-500' : 'text-gray-500'
                  }`} />
                  <span className="capitalize font-semibold">{status} Courses</span>
                  <span className="ml-2 text-xs text-gray-400">({groupedCourses[status].length})</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {groupedCourses[status].length === 0 ? (
                  <div className="p-6 text-center text-gray-400">No {status} courses</div>
                ) : (
                  <div className="grid gap-6">
                    {groupedCourses[status].map((course) => (
                      <CourseAttendanceCard
                        key={course.id}
                        course={course}
                        reports={allCourseReports[course.id] || []}
                        isSelected={selectedCourse === course.id}
                        onSelect={() => setSelectedCourse(selectedCourse === course.id ? null : course.id)}
                      />
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
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

const CourseAttendanceCard: React.FC<{ course: Course; reports: AttendanceReport[]; isSelected: boolean; onSelect: () => void }> = ({ course, reports, isSelected, onSelect }) => {
  const { reports: courseReports, studentDetails, isLoading } = useAttendanceReports(course.id, course.code, false);
  
  const exportCourseReportCSV = (courseName: string, courseCode: string, reports: AttendanceReport[]) => {
    const headers = ['Date', 'Present', 'Late', 'Absent', 'Total', 'Attendance Rate'];
    const rows = reports.map(r => [r.date, r.present, r.late, r.absent, r.total, `${r.attendanceRate}%`]);
    const csv = Papa.unparse({ fields: headers, data: rows });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${courseName}_${courseCode}_AttendanceReport.csv`);
  };

  const exportCourseReportPDF = (courseName: string, courseCode: string, reports: AttendanceReport[]) => {
    const doc = new jsPDF();
    
    // Add creative header with styling
    doc.setFillColor(59, 130, 246); // Blue background
    doc.rect(0, 0, 210, 30, 'F');
    
    // Title with white text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Tally Check', 20, 15);
    
    doc.setFontSize(14);
    doc.text(`${courseName} (${courseCode})`, 20, 25);
    
    // Reset text color for content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let yPosition = 40;
    
    // Summary section
    doc.setFillColor(240, 249, 255); // Light blue background
    doc.rect(10, yPosition, 190, 20, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 Attendance Summary', 15, yPosition + 8);
    
    const totalPresent = reports.reduce((sum, r) => sum + r.present, 0);
    const totalAbsent = reports.reduce((sum, r) => sum + r.absent, 0);
    const totalLate = reports.reduce((sum, r) => sum + r.late, 0);
    const totalStudents = reports.reduce((sum, r) => sum + r.total, 0);
    const overallRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Present: ${totalPresent}`, 15, yPosition + 15);
    doc.text(`Total Absent: ${totalAbsent}`, 60, yPosition + 15);
    doc.text(`Total Late: ${totalLate}`, 105, yPosition + 15);
    doc.text(`Overall Rate: ${overallRate}%`, 150, yPosition + 15);
    
    yPosition += 30;
    
    // Attendance table with enhanced styling
    const headers = ['Date', 'Present', 'Late', 'Absent', 'Total', 'Rate'];
    const rows = reports.map(r => [r.date, r.present, r.late, r.absent, r.total, `${r.attendanceRate}%`]);
    
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: yPosition,
      styles: {
        head: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        body: {
          textColor: [0, 0, 0],
          fontSize: 9
        }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { top: 10 }
    });
    
    yPosition = doc.lastAutoTable.finalY + 20;
    
    // Student details section if available
    if (studentDetails && Object.keys(studentDetails).length > 0) {
      doc.setFillColor(240, 249, 255);
      doc.rect(10, yPosition, 190, 15, 'F');
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('👥 Student Details', 15, yPosition + 8);
      
      yPosition += 20;
      
      // Show student details for each date
      Object.entries(studentDetails).forEach(([date, students]) => {
        if (students.length > 0) {
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`📅 ${date}`, 15, yPosition);
          yPosition += 8;
          
          const studentHeaders = ['Name', 'Status', 'Check-in Time', 'Method'];
          const studentRows = students.map(s => [
            s.name,
            s.status,
            s.checkInTime ? new Date(s.checkInTime).toLocaleTimeString() : 'N/A',
            s.method || 'N/A'
          ]);
          
          doc.autoTable({
            head: [studentHeaders],
            body: studentRows,
            startY: yPosition,
            styles: {
              head: {
                fillColor: [147, 197, 253],
                textColor: [0, 0, 0],
                fontStyle: 'bold'
              },
              body: {
                textColor: [0, 0, 0],
                fontSize: 8
              }
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            },
            margin: { top: 5 }
          });
          
          yPosition = doc.lastAutoTable.finalY + 15;
        }
      });
    }
    
    // Footer
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 280, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 290);
    doc.text('Tally Check - Professional Attendance Management', 20, 295);
    
    doc.save(`${courseName}_${courseCode}_AttendanceReport.pdf`);
  };

  return (
    <div className={`backdrop-blur-lg rounded-2xl p-6 border transition-all duration-200 shadow-lg ${
      reports.length > 0 
        ? 'bg-white/90 border-gray-200 hover:bg-white/95' 
        : 'bg-gray-100/90 border-gray-300 hover:bg-gray-100/95'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className={`p-2 rounded-xl ${
              reports.length > 0 
                ? 'bg-green-100 border border-green-200' 
                : 'bg-gray-100 border border-gray-200'
            }`}>
              <BookOpen className={`w-5 h-5 ${
                reports.length > 0 ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                reports.length > 0 ? 'text-gray-900' : 'text-gray-700'
              }`}>{course.name}</h3>
              <Badge className={`rounded-xl ${
                reports.length > 0 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                {course.code}
              </Badge>
            </div>
          </div>
          <p className={`mb-3 ${
            reports.length > 0 ? 'text-gray-600' : 'text-gray-500'
          }`}>{(course as any).users?.full_name || 'No instructor assigned'}</p>
        </div>
        <Button
          size="sm"
          onClick={onSelect}
          className={`rounded-xl px-4 py-2 ${
            isSelected 
              ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600' 
              : 'bg-gray-600 hover:bg-gray-700 text-white border border-gray-600'
          }`}
        >
          {isSelected ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
          {isSelected ? 'Hide' : 'View'} Reports
        </Button>
      </div>
      <div className="flex flex-wrap gap-4 mb-4">
        <div className={`flex items-center space-x-2 ${
          reports.length > 0 ? 'text-gray-600' : 'text-gray-500'
        }`}>
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="text-sm">Course Code: {course.code}</span>
        </div>
        <div className={`flex items-center space-x-2 ${
          reports.length > 0 ? 'text-gray-600' : 'text-gray-500'
        }`}>
          <MapPin className="w-4 h-4 text-blue-400" />
          <span className="text-sm">Created: {new Date(course.created_at).toLocaleDateString()}</span>
        </div>
        <div className={`flex items-center space-x-2 ${
          reports.length > 0 ? 'text-gray-600' : 'text-gray-500'
        }`}>
          <Users className="w-4 h-4 text-blue-400" />
          <span className="text-sm">Course ID: {course.id.slice(0, 8)}...</span>
        </div>
      </div>
      <div className="flex items-center space-x-2 mb-4">
        <Calendar className="w-4 h-4 text-blue-400" />
        <Badge className={`text-xs border rounded-lg ${
          reports.length > 0 
            ? 'bg-green-100 text-green-700 border-green-200' 
            : 'bg-gray-100 text-gray-700 border-gray-200'
        }`}>
          {reports.length > 0 ? 'Active Course' : 'Inactive Course'}
        </Badge>
      </div>
      {isSelected && (
        <div className="mt-6">
          {reports.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">Attendance Reports (Last 2 Weeks)</span>
              <Button
                onClick={() => exportCourseReportCSV(course.name, course.code, reports)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1 flex items-center gap-2 text-xs shadow"
              >
                <FileText className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          )}
          {isLoading ? (
            <div className="text-gray-400">Loading attendance data...</div>
          ) : courseReports.length === 0 ? (
            <div className="text-gray-400">No attendance records found.</div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-gray-700">Date</th>
                      <th className="px-3 py-2 text-gray-700">Present</th>
                      <th className="px-3 py-2 text-gray-700">Late</th>
                      <th className="px-3 py-2 text-gray-700">Absent</th>
                      <th className="px-3 py-2 text-gray-700">Total</th>
                      <th className="px-3 py-2 text-gray-700">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseReports.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 text-gray-900">{r.date}</td>
                        <td className="px-3 py-2 text-gray-900">{r.present}</td>
                        <td className="px-3 py-2 text-gray-900">{r.late}</td>
                        <td className="px-3 py-2 text-gray-900">{r.absent}</td>
                        <td className="px-3 py-2 text-gray-900">{r.total}</td>
                        <td className="px-3 py-2 font-bold" style={{ color: r.attendanceRate >= 80 ? '#22c55e' : r.attendanceRate >= 50 ? '#eab308' : '#ef4444' }}>{r.attendanceRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Student Details Section */}
              {studentDetails && Object.keys(studentDetails).length > 0 && (
                <div className="mt-6">
                  <h5 className={`text-sm font-semibold mb-3 ${
                    reports.length > 0 ? 'text-gray-900' : 'text-gray-700'
                  }`}>👥 Student Details</h5>
                  <div className="space-y-4">
                    {Object.entries(studentDetails).map(([date, students]) => (
                      <div key={date} className="bg-gray-50 rounded-lg p-4">
                        <h6 className="text-xs font-semibold text-blue-600 mb-2">📅 {date}</h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {students.map((student, idx) => (
                            <div key={idx} className="bg-white rounded p-2 text-xs border border-gray-100">
                              <div className="font-medium text-gray-900">{student.name}</div>
                              <div className="text-gray-600">
                                Status: <span className={`${
                                  student.status === 'present' || student.status === 'verified' 
                                    ? 'text-green-600' 
                                    : student.status === 'late' 
                                    ? 'text-yellow-600' 
                                    : 'text-red-600'
                                }`}>{student.status}</span>
                              </div>
                              {student.checkInTime && (
                                <div className="text-gray-600">
                                  Time: {new Date(student.checkInTime).toLocaleTimeString()}
                                </div>
                              )}
                              {student.method && (
                                <div className="text-gray-600">
                                  Method: {student.method}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
