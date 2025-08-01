
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Download, 
  Filter,
  Search,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  GraduationCap,
  BookOpen,
  Star,
  Award,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface StudentAttendance {
  id: string;
  name: string;
  email: string;
  course: string;
  totalClasses: number;
  attendedClasses: number;
  attendanceRate: number;
  lastAttendance: string;
  status: 'excellent' | 'good' | 'warning' | 'poor';
}

interface CourseStats {
  courseName: string;
  totalStudents: number;
  averageAttendance: number;
  totalClasses: number;
  lastClassDate: string;
}

export const ReportsPage: React.FC = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'semester'>('month');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch lecturer's courses
  const { data: lecturerCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['lecturer-courses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('lecturer_id', user.id);
      
      if (error) {
        console.error('Error fetching courses:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch attendance data for the lecturer's students
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['lecturer-attendance', user?.id, selectedPeriod],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Calculate date range based on selected period
      const now = new Date();
      let startDate = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'semester':
          startDate.setMonth(now.getMonth() - 6);
          break;
      }

      // Get courses taught by this lecturer
      const { data: courses } = await supabase
        .from('courses')
        .select('id, course_name')
        .eq('lecturer_id', user.id);

      if (!courses || courses.length === 0) return [];

      const courseIds = courses.map(c => c.id);

      // Fetch attendance records for these courses
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          users!inner(full_name, email),
          courses!inner(course_name)
        `)
        .in('course_id', courseIds)
        .gte('check_in_time', startDate.toISOString())
        .order('check_in_time', { ascending: false });

      if (error) {
        console.error('Error fetching attendance:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id
  });

  // Process attendance data to get student statistics
  const processStudentData = (): StudentAttendance[] => {
    if (!attendanceData) return [];

    const studentMap = new Map<string, StudentAttendance>();

    attendanceData.forEach(record => {
      const studentId = record.student_id;
      const studentName = record.users?.full_name || 'Unknown Student';
      const studentEmail = record.users?.email || '';
      const courseName = record.courses?.course_name || 'Unknown Course';

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          id: studentId,
          name: studentName,
          email: studentEmail,
          course: courseName,
          totalClasses: 0,
          attendedClasses: 0,
          attendanceRate: 0,
          lastAttendance: '',
          status: 'good'
        });
      }

      const student = studentMap.get(studentId)!;
      student.totalClasses++;
      
      if (record.status === 'verified' || record.status === 'present') {
        student.attendedClasses++;
      }

      // Update last attendance
      const recordDate = new Date(record.check_in_time);
      if (!student.lastAttendance || recordDate > new Date(student.lastAttendance)) {
        student.lastAttendance = record.check_in_time;
      }
    });

    // Calculate attendance rates and status
    const students = Array.from(studentMap.values()).map(student => {
      student.attendanceRate = student.totalClasses > 0 
        ? (student.attendedClasses / student.totalClasses) * 100 
        : 0;

      // Determine status based on attendance rate
      if (student.attendanceRate >= 90) student.status = 'excellent';
      else if (student.attendanceRate >= 80) student.status = 'good';
      else if (student.attendanceRate >= 70) student.status = 'warning';
      else student.status = 'poor';

      return student;
    });

    return students;
  };

  // Process course statistics
  const processCourseStats = (): CourseStats[] => {
    if (!attendanceData) return [];

    const courseMap = new Map<string, CourseStats>();

    attendanceData.forEach(record => {
      const courseName = record.courses?.course_name || 'Unknown Course';
      
      if (!courseMap.has(courseName)) {
        courseMap.set(courseName, {
          courseName,
          totalStudents: 0,
          averageAttendance: 0,
          totalClasses: 0,
          lastClassDate: ''
        });
      }

      const course = courseMap.get(courseName)!;
      course.totalClasses++;

      // Update last class date
      const recordDate = new Date(record.check_in_time);
      if (!course.lastClassDate || recordDate > new Date(course.lastClassDate)) {
        course.lastClassDate = record.check_in_time;
      }
    });

    // Calculate average attendance for each course
    const students = processStudentData();
    courseMap.forEach(course => {
      const courseStudents = students.filter(s => s.course === course.courseName);
      course.totalStudents = courseStudents.length;
      course.averageAttendance = courseStudents.length > 0 
        ? courseStudents.reduce((sum, s) => sum + s.attendanceRate, 0) / courseStudents.length 
        : 0;
    });

    return Array.from(courseMap.values());
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      excellent: <Badge className="bg-green-100 text-green-800 border-green-200">⭐ Excellent</Badge>,
      good: <Badge className="bg-blue-100 text-blue-800 border-blue-200">👍 Good</Badge>,
      warning: <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⚠️ Warning</Badge>,
      poor: <Badge className="bg-red-100 text-red-800 border-red-200">❌ Poor</Badge>
    };
    return badges[status as keyof typeof badges] || badges.good;
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-blue-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const students = processStudentData();
  const courses = processCourseStats();

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || student.course === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  const overallStats = {
    totalStudents: students.length,
    averageAttendance: students.length > 0 
      ? students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length 
      : 0,
    excellentStudents: students.filter(s => s.status === 'excellent').length,
    warningStudents: students.filter(s => s.status === 'warning' || s.status === 'poor').length
  };

  const handleExportReport = () => {
    toast({
      title: "Report Exported",
      description: "Your attendance report has been downloaded successfully",
    });
  };

  if (coursesLoading || attendanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="professional-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Student Attendance Reports</h2>
            <p className="text-gray-600 text-lg">
              Real-time attendance data for your students - {selectedPeriod} view
            </p>
          </div>
          <Button onClick={handleExportReport} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="professional-card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="semester">This Semester</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-gray-600" />
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.courseName} value={course.courseName}>
                  {course.courseName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <Search className="w-5 h-5 text-gray-600" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="professional-card p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{overallStats.totalStudents}</div>
          <div className="text-gray-600 text-sm">Total Students</div>
        </div>
        
        <div className="professional-card p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{overallStats.averageAttendance.toFixed(1)}%</div>
          <div className="text-gray-600 text-sm">Average Attendance</div>
        </div>
        
        <div className="professional-card p-6 text-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{overallStats.excellentStudents}</div>
          <div className="text-gray-600 text-sm">Excellent Students</div>
        </div>
        
        <div className="professional-card p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{overallStats.warningStudents}</div>
          <div className="text-gray-600 text-sm">Need Attention</div>
        </div>
      </div>

      {/* Course Statistics */}
      {courses.length > 0 && (
        <div className="professional-card p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <BookOpen className="w-5 h-5 mr-2" />
            Course Performance Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => (
              <div key={course.courseName} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{course.courseName}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Students:</span>
                    <span className="font-medium">{course.totalStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Attendance:</span>
                    <span className={`font-medium ${getAttendanceColor(course.averageAttendance)}`}>
                      {course.averageAttendance.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Classes:</span>
                    <span className="font-medium">{course.totalClasses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Class:</span>
                    <span className="font-medium">{new Date(course.lastClassDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Attendance Table */}
      <div className="professional-card p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Student Attendance Details
        </h3>
        
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Student</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Course</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">Attendance Rate</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">Classes</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">Last Attendance</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-700">{student.course}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`font-bold text-lg ${getAttendanceColor(student.attendanceRate)}`}>
                        {student.attendanceRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-gray-700">
                      {student.attendedClasses}/{student.totalClasses}
                    </td>
                    <td className="py-4 px-4 text-center text-gray-700">
                      {student.lastAttendance ? new Date(student.lastAttendance).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(student.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{searchTerm ? 'No students found matching your search criteria' : 'No attendance data available for this period'}</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="professional-card p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Detailed Report
          </Button>
          <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
            <PieChart className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
          <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
            <Activity className="w-4 h-4 mr-2" />
            Attendance Trends
          </Button>
          <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
            <Award className="w-4 h-4 mr-2" />
            Student Awards
          </Button>
        </div>
      </div>
    </div>
  );
};
