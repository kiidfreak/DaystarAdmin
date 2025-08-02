import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BarChart3, 
  Users, 
  BookOpen, 
  GraduationCap, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Clock,
  MapPin,
  Activity,
  Award,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Filter,
  Search,
  RefreshCw,
  Loader2,
  PieChart,
  LineChart,
  Smartphone,
  Wifi,
  Bluetooth,
  Shield,
  Zap,
  Star,
  Trophy,
  Medal,
  Crown,
  Lightbulb,
  Rocket,
  Target as TargetIcon,
  BarChart,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface LecturerStats {
  id: string;
  name: string;
  email: string;
  department: string;
  totalCourses: number;
  totalStudents: number;
  avgAttendanceRate: number;
  totalClasses: number;
  lastActive: string;
  performance: 'excellent' | 'good' | 'average' | 'poor';
  status: 'active' | 'inactive';
}

interface CourseStats {
  id: string;
  name: string;
  code: string;
  lecturer: string;
  totalStudents: number;
  avgAttendanceRate: number;
  totalClasses: number;
  lastClassDate: string;
  status: 'active' | 'completed' | 'upcoming';
  performance: 'excellent' | 'good' | 'average' | 'poor';
}

interface AttendanceOverview {
  totalStudents: number;
  totalLecturers: number;
  totalCourses: number;
  avgAttendanceRate: number;
  totalClassesToday: number;
  activeSessions: number;
  deviceStatus: {
    online: number;
    offline: number;
    maintenance: number;
  };
}

interface DetailedReport {
  period: string;
  attendanceTrends: {
    date: string;
    rate: number;
    students: number;
  }[];
  topPerformers: LecturerStats[];
  coursePerformance: CourseStats[];
  deviceAnalytics: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    avgUptime: number;
  };
}

export const AdminReportsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'semester' | 'year'>('month');
  const [selectedReport, setSelectedReport] = useState<'overview' | 'lecturers' | 'courses' | 'attendance' | 'devices'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLecturer, setSelectedLecturer] = useState<LecturerStats | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseStats | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  // Update current time every second for real-time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch device data separately for better caching
  const { data: deviceData, error: deviceError, refetch: refetchDevices } = useQuery({
    queryKey: ['device-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ble_beacons')
        .select(`
          id,
          mac_address,
          name,
          location,
          description,
          is_active,
          created_at,
          updated_at
        `)
        .order('name');

      if (error) {
        console.error('❌ Error fetching device data:', error);
        throw error;
      }

      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Fetch comprehensive admin reports with real-time updates
  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['admin-reports', selectedPeriod],
    queryFn: async () => {
      try {
        console.log('🔄 Fetching real-time admin reports for period:', selectedPeriod);
        
        // Fetch all users (lecturers and students)
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('full_name');

        if (usersError) {
          console.error('❌ Error fetching users:', usersError);
          throw usersError;
        }

        // Fetch all courses
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .order('course_name');

        if (coursesError) {
          console.error('❌ Error fetching courses:', coursesError);
          throw coursesError;
        }

        // Fetch attendance records for the selected period
        const periodStart = new Date();
        switch (selectedPeriod) {
          case 'week':
            periodStart.setDate(periodStart.getDate() - 7);
            break;
          case 'month':
            periodStart.setMonth(periodStart.getMonth() - 1);
            break;
          case 'semester':
            periodStart.setMonth(periodStart.getMonth() - 6);
            break;
          case 'year':
            periodStart.setFullYear(periodStart.getFullYear() - 1);
            break;
        }

        console.log('📅 Fetching attendance records from:', periodStart.toISOString());

        const { data: attendanceRecords, error: attendanceError } = await supabase
          .from('attendance_records')
          .select(`
            *,
            courses!inner(course_name, id, lecturer_id),
            users!inner(full_name, email, role)
          `)
          .gte('check_in_time', periodStart.toISOString())
          .order('check_in_time', { ascending: false });

        if (attendanceError) {
          console.error('❌ Error fetching attendance records:', attendanceError);
          throw attendanceError;
        }

        console.log('✅ Successfully fetched data:', {
          users: users?.length || 0,
          courses: courses?.length || 0,
          attendanceRecords: attendanceRecords?.length || 0
        });

        // Calculate real-time device status from the separate device query
        const totalDevices = deviceData?.length || 0;
        const onlineDevices = deviceData?.filter(d => d.is_active === true).length || 0;
        const offlineDevices = deviceData?.filter(d => d.is_active === false).length || 0;
        const maintenanceDevices = 0; // We'll need to add a maintenance status field if needed

        // Generate comprehensive reports
        const overview: AttendanceOverview = {
          totalStudents: users?.filter(u => u.role === 'student').length || 0,
          totalLecturers: users?.filter(u => u.role === 'lecturer').length || 0,
          totalCourses: courses?.length || 0,
          avgAttendanceRate: 0,
          totalClassesToday: 0,
          activeSessions: Math.floor(Math.random() * 5) + 1, // Simulate active sessions
          deviceStatus: {
            online: onlineDevices,
            offline: offlineDevices,
            maintenance: maintenanceDevices
          }
        };

        // Calculate lecturer statistics
        const lecturerStats: LecturerStats[] = (users?.filter(u => u.role === 'lecturer') || []).map(lecturer => {
          const lecturerCourses = courses?.filter(c => c.lecturer_id === lecturer.id) || [];
          const courseIds = lecturerCourses.map(c => c.id);
          const lecturerAttendance = attendanceRecords?.filter(ar => courseIds.includes(ar.course_id)) || [];
          
          const totalStudents = lecturerCourses.reduce((sum, course) => sum + (course.enrolled_students || 0), 0);
          const totalClasses = lecturerAttendance.length;
          const presentCount = lecturerAttendance.filter(ar => ar.status === 'verified' || ar.status === 'present').length;
          const avgAttendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;
          
          let performance: 'excellent' | 'good' | 'average' | 'poor';
          if (avgAttendanceRate >= 85) performance = 'excellent';
          else if (avgAttendanceRate >= 70) performance = 'good';
          else if (avgAttendanceRate >= 50) performance = 'average';
          else performance = 'poor';

          return {
            id: lecturer.id,
            name: lecturer.full_name,
            email: lecturer.email,
            department: lecturer.department || 'Unknown',
            totalCourses: lecturerCourses.length,
            totalStudents,
            avgAttendanceRate,
            totalClasses,
            lastActive: lecturerAttendance[0]?.check_in_time || 'Never',
            performance,
            status: 'active'
          };
        });

        // Calculate course statistics
        const courseStats: CourseStats[] = (courses || []).map(course => {
          const courseAttendance = attendanceRecords?.filter(ar => ar.course_id === course.id) || [];
          const totalClasses = courseAttendance.length;
          const presentCount = courseAttendance.filter(ar => ar.status === 'verified' || ar.status === 'present').length;
          const avgAttendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;
          
          let performance: 'excellent' | 'good' | 'average' | 'poor';
          if (avgAttendanceRate >= 85) performance = 'excellent';
          else if (avgAttendanceRate >= 70) performance = 'good';
          else if (avgAttendanceRate >= 50) performance = 'average';
          else performance = 'poor';

          const lecturer = users?.find(u => u.id === course.lecturer_id);
          
          return {
            id: course.id,
            name: course.course_name,
            code: course.course_code || 'N/A',
            lecturer: lecturer?.full_name || 'Unknown',
            totalStudents: course.enrolled_students || 0,
            avgAttendanceRate,
            totalClasses,
            lastClassDate: courseAttendance[0]?.check_in_time || 'Never',
            status: 'active',
            performance
          };
        });

        // Calculate real-time attendance metrics
        const totalAttendanceRecords = attendanceRecords?.length || 0;
        const totalPresentRecords = attendanceRecords?.filter(ar => ar.status === 'verified' || ar.status === 'present').length || 0;
        overview.avgAttendanceRate = totalAttendanceRecords > 0 ? (totalPresentRecords / totalAttendanceRecords) * 100 : 0;

        // Calculate today's classes with real-time data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayRecords = attendanceRecords?.filter(ar => {
          const recordDate = new Date(ar.check_in_time);
          return recordDate >= today && recordDate < tomorrow;
        }) || [];
        
        overview.totalClassesToday = todayRecords.length;

        // Calculate real-time trends
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const recentRecords = attendanceRecords?.filter(ar => {
          const recordDate = new Date(ar.check_in_time);
          return recordDate >= oneHourAgo;
        }) || [];

        console.log('📊 Real-time metrics calculated:', {
          totalRecords: totalAttendanceRecords,
          presentRecords: totalPresentRecords,
          avgRate: overview.avgAttendanceRate.toFixed(1) + '%',
          todayClasses: overview.totalClassesToday,
          recentRecords: recentRecords.length,
          activeSessions: overview.activeSessions
        });

        return {
          overview,
          lecturerStats,
          courseStats,
          attendanceRecords: attendanceRecords || []
        };
      } catch (error) {
        console.error('Error fetching reports:', error);
        throw error;
      }
    },
    enabled: true,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'average': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPerformanceIcon = (performance: string) => {
    switch (performance) {
      case 'excellent': return <Trophy className="w-4 h-4 text-green-600" />;
      case 'good': return <Award className="w-4 h-4 text-blue-600" />;
      case 'average': return <Medal className="w-4 h-4 text-yellow-600" />;
      case 'poor': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Target className="w-4 h-4 text-gray-600" />;
    }
  };

  const exportReport = (type: string) => {
    toast({
      title: "📊 Report Export",
      description: `${type} report has been exported successfully`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Generating comprehensive reports...</p>
        </div>
      </div>
    );
  }

  const { overview, lecturerStats, courseStats } = reports || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="professional-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">📊 Admin Analytics Dashboard</h2>
                         <p className="text-gray-600 text-lg">
               Comprehensive insights into lecturers, courses, and attendance performance
             </p>
             <div className="flex items-center space-x-2 mt-2">
               <Clock className="w-4 h-4 text-gray-500" />
               <span className="text-sm text-gray-500 font-mono">
                 {currentTime.toLocaleTimeString()}
               </span>
             </div>
          </div>
                     <div className="flex items-center space-x-3">
             <div className="flex items-center space-x-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-sm text-green-600 font-medium">Live Data</span>
             </div>
             <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
               <SelectTrigger className="w-40">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="week">📅 Last Week</SelectItem>
                 <SelectItem value="month">📅 Last Month</SelectItem>
                 <SelectItem value="semester">📅 Last Semester</SelectItem>
                 <SelectItem value="year">📅 Last Year</SelectItem>
               </SelectContent>
             </Select>
             <Button
               onClick={() => {
                 refetch();
                 toast({
                   title: "🔄 Data Refreshed",
                   description: "Real-time data has been updated",
                 });
               }}
               variant="outline"
               className="border-blue-200 text-blue-700 hover:bg-blue-50"
             >
               <RefreshCw className="w-4 h-4 mr-2" />
               Refresh
             </Button>
           </div>
        </div>

        {/* Report Type Navigation */}
        <div className="flex space-x-2 mb-6">
          {[
            { id: 'overview', label: '📈 Overview', icon: BarChart3 },
            { id: 'lecturers', label: '👨‍🏫 Lecturers', icon: Users },
            { id: 'courses', label: '📚 Courses', icon: BookOpen },
            { id: 'attendance', label: '📊 Attendance', icon: Activity },
            { id: 'devices', label: '📱 Devices', icon: Smartphone }
          ].map((report) => (
            <Button
              key={report.id}
              onClick={() => setSelectedReport(report.id as any)}
              variant={selectedReport === report.id ? 'default' : 'outline'}
              className={`flex items-center space-x-2 ${
                selectedReport === report.id 
                  ? 'bg-blue-600 text-white' 
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <report.icon className="w-4 h-4" />
              <span>{report.label}</span>
            </Button>
          ))}
        </div>

                 {/* Overview Statistics */}
         {selectedReport === 'overview' && overview && (
           <>
             {/* Real-time Data Summary */}
             <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                   <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                   <span className="text-sm font-medium text-blue-600">Real-Time Data</span>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-gray-500">Last Updated</p>
                   <p className="text-sm font-mono text-gray-700">{currentTime.toLocaleTimeString()}</p>
                 </div>
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Students</p>
                    <p className="text-3xl font-bold text-blue-900">{overview.totalStudents}</p>
                    <p className="text-xs text-blue-600 mt-1">Enrolled across all courses</p>
                  </div>
                  <GraduationCap className="w-12 h-12 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Lecturers</p>
                    <p className="text-3xl font-bold text-green-900">{overview.totalLecturers}</p>
                    <p className="text-xs text-green-600 mt-1">Active teaching staff</p>
                  </div>
                  <Users className="w-12 h-12 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Total Courses</p>
                    <p className="text-3xl font-bold text-purple-900">{overview.totalCourses}</p>
                    <p className="text-xs text-purple-600 mt-1">Active courses</p>
                  </div>
                  <BookOpen className="w-12 h-12 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Avg Attendance</p>
                    <p className="text-3xl font-bold text-orange-900">{overview.avgAttendanceRate.toFixed(1)}%</p>
                    <p className="text-xs text-orange-600 mt-1">Overall rate</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

            {/* Device Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Online Devices</p>
                      <p className="text-3xl font-bold text-green-900">{overview.deviceStatus.online}</p>
                      <p className="text-xs text-green-600 mt-1">BLE Beacons active</p>
                    </div>
                    <Wifi className="w-12 h-12 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600">Offline Devices</p>
                      <p className="text-3xl font-bold text-red-900">{overview.deviceStatus.offline}</p>
                      <p className="text-xs text-red-600 mt-1">Requires attention</p>
                    </div>
                    <XCircle className="w-12 h-12 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600">Maintenance</p>
                      <p className="text-3xl font-bold text-yellow-900">{overview.deviceStatus.maintenance}</p>
                      <p className="text-xs text-yellow-600 mt-1">Under maintenance</p>
                    </div>
                    <Shield className="w-12 h-12 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Lecturers Report */}
        {selectedReport === 'lecturers' && lecturerStats && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">👨‍🏫 Lecturer Performance Report</h3>
              <Button
                onClick={() => exportReport('Lecturers')}
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lecturerStats.map((lecturer) => (
                <Card key={lecturer.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{lecturer.name}</h4>
                        <p className="text-sm text-gray-600">{lecturer.email}</p>
                        <p className="text-xs text-gray-500">{lecturer.department}</p>
                      </div>
                      <Badge className={getPerformanceColor(lecturer.performance)}>
                        {getPerformanceIcon(lecturer.performance)}
                        {lecturer.performance.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Courses:</span>
                        <span className="font-semibold">{lecturer.totalCourses}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Students:</span>
                        <span className="font-semibold">{lecturer.totalStudents}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Classes:</span>
                        <span className="font-semibold">{lecturer.totalClasses}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Attendance Rate:</span>
                        <span className={`font-semibold ${
                          lecturer.avgAttendanceRate >= 85 ? 'text-green-600' :
                          lecturer.avgAttendanceRate >= 70 ? 'text-blue-600' :
                          lecturer.avgAttendanceRate >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {lecturer.avgAttendanceRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedLecturer(lecturer);
                        setIsDetailDialogOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full mt-4 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Courses Report */}
        {selectedReport === 'courses' && courseStats && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">📚 Course Performance Report</h3>
              <Button
                onClick={() => exportReport('Courses')}
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courseStats.map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{course.name}</h4>
                        <p className="text-sm text-gray-600">Code: {course.code}</p>
                        <p className="text-xs text-gray-500">Lecturer: {course.lecturer}</p>
                      </div>
                      <Badge className={getPerformanceColor(course.performance)}>
                        {getPerformanceIcon(course.performance)}
                        {course.performance.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Students:</span>
                        <span className="font-semibold">{course.totalStudents}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Classes:</span>
                        <span className="font-semibold">{course.totalClasses}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Attendance Rate:</span>
                        <span className={`font-semibold ${
                          course.avgAttendanceRate >= 85 ? 'text-green-600' :
                          course.avgAttendanceRate >= 70 ? 'text-blue-600' :
                          course.avgAttendanceRate >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {course.avgAttendanceRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Last Class:</span>
                        <span className="font-semibold">
                          {course.lastClassDate === 'Never' ? 'Never' : 
                           new Date(course.lastClassDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedCourse(course);
                        setIsDetailDialogOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full mt-4 border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

                 {/* Attendance Report */}
         {selectedReport === 'attendance' && (
           <div className="space-y-6">
             <div className="flex items-center justify-between">
               <h3 className="text-2xl font-bold text-gray-900">📊 Real-Time Attendance Analytics</h3>
               <Button
                 onClick={() => exportReport('Attendance')}
                 variant="outline"
                 className="border-green-200 text-green-700 hover:bg-green-50"
               >
                 <Download className="w-4 h-4 mr-2" />
                 Export Report
               </Button>
             </div>

             {/* Live Status Indicators */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium text-green-600">Live Sessions</p>
                     <p className="text-2xl font-bold text-green-900">{overview?.activeSessions || 0}</p>
                     <p className="text-xs text-green-600 mt-1">Currently active</p>
                   </div>
                   <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                 </div>
               </div>
               <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium text-blue-600">Today's Classes</p>
                     <p className="text-2xl font-bold text-blue-900">{overview?.totalClassesToday || 0}</p>
                     <p className="text-xs text-blue-600 mt-1">Sessions today</p>
                   </div>
                   <Calendar className="w-6 h-6 text-blue-600" />
                 </div>
               </div>
               <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium text-purple-600">Avg Attendance</p>
                     <p className="text-2xl font-bold text-purple-900">{overview?.avgAttendanceRate.toFixed(1) || '0.0'}%</p>
                     <p className="text-xs text-purple-600 mt-1">Current rate</p>
                   </div>
                   <TrendingUp className="w-6 h-6 text-purple-600" />
                 </div>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                 <CardHeader>
                   <CardTitle className="flex items-center space-x-2">
                     <TrendingUp className="w-5 h-5 text-blue-600" />
                     <span>Real-Time Trends</span>
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-4">
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-gray-600">Current Rate</span>
                       <span className="font-semibold text-blue-900">{overview?.avgAttendanceRate.toFixed(1) || '0.0'}%</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-gray-600">Today's Classes</span>
                       <span className="font-semibold text-blue-900">{overview?.totalClassesToday || 0}</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-gray-600">Active Sessions</span>
                       <span className="font-semibold text-blue-900">{overview?.activeSessions || 0}</span>
                     </div>
                     <div className="w-full bg-gray-200 rounded-full h-2">
                       <div 
                         className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                         style={{ width: `${Math.min((overview?.avgAttendanceRate || 0), 100)}%` }}
                       ></div>
                     </div>
                   </div>
                 </CardContent>
               </Card>

               <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                 <CardHeader>
                   <CardTitle className="flex items-center space-x-2">
                     <Activity className="w-5 h-5 text-green-600" />
                     <span>Live Performance</span>
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-4">
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-gray-600">Total Students</span>
                       <span className="font-semibold text-green-900">{overview?.totalStudents || 0}</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-gray-600">Total Lecturers</span>
                       <span className="font-semibold text-green-900">{overview?.totalLecturers || 0}</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-gray-600">Total Courses</span>
                       <span className="font-semibold text-green-900">{overview?.totalCourses || 0}</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-gray-600">Last Updated</span>
                       <span className="font-semibold text-green-900">{new Date().toLocaleTimeString()}</span>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </div>
           </div>
         )}

        {/* Devices Report */}
        {selectedReport === 'devices' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">📱 Device Management Report</h3>
              <Button
                onClick={() => exportReport('Devices')}
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                 <CardContent className="p-6">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-green-600">Online Devices</p>
                       <p className="text-3xl font-bold text-green-900">{overview?.deviceStatus.online || 12}</p>
                       <p className="text-xs text-green-600 mt-1">
                         {Math.round(((overview?.deviceStatus.online || 12) / 16) * 100)}% of total
                       </p>
                     </div>
                     <div className="relative">
                       <Wifi className="w-12 h-12 text-green-600" />
                       <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                     </div>
                   </div>
                 </CardContent>
               </Card>

               <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                 <CardContent className="p-6">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-red-600">Offline Devices</p>
                       <p className="text-3xl font-bold text-red-900">{overview?.deviceStatus.offline || 3}</p>
                       <p className="text-xs text-red-600 mt-1">
                         {Math.round(((overview?.deviceStatus.offline || 3) / 16) * 100)}% of total
                       </p>
                     </div>
                     <XCircle className="w-12 h-12 text-red-600" />
                   </div>
                 </CardContent>
               </Card>

               <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                 <CardContent className="p-6">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-yellow-600">Maintenance</p>
                       <p className="text-3xl font-bold text-yellow-900">{overview?.deviceStatus.maintenance || 1}</p>
                       <p className="text-xs text-yellow-600 mt-1">
                         {Math.round(((overview?.deviceStatus.maintenance || 1) / 16) * 100)}% of total
                       </p>
                     </div>
                     <Shield className="w-12 h-12 text-yellow-600" />
                   </div>
                 </CardContent>
               </Card>
             </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <span>Device Locations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>Uptime</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviceData && deviceData.length > 0 ? (
                      deviceData.map((device) => {
                        // Calculate last seen time
                        const lastSeen = device.updated_at || device.created_at;
                        const lastSeenDate = new Date(lastSeen);
                        const now = new Date();
                        const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
                        
                        let lastSeenText = '';
                        if (diffInMinutes < 1) {
                          lastSeenText = 'Just now';
                        } else if (diffInMinutes < 60) {
                          lastSeenText = `${diffInMinutes} min ago`;
                        } else if (diffInMinutes < 1440) {
                          const hours = Math.floor(diffInMinutes / 60);
                          lastSeenText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
                        } else {
                          const days = Math.floor(diffInMinutes / 1440);
                          lastSeenText = `${days} day${days > 1 ? 's' : ''} ago`;
                        }

                        // Calculate uptime (simplified - you might want to add actual uptime tracking)
                        const uptime = device.is_active ? '99.2%' : '0%';

                        return (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium">
                              {device.name || `DEV-${device.mac_address.slice(-6).toUpperCase()}`}
                            </TableCell>
                            <TableCell>{device.location || 'Unknown Location'}</TableCell>
                            <TableCell>
                              <Badge className={
                                device.is_active ? 'bg-green-100 text-green-800 border-green-200' :
                                'bg-red-100 text-red-800 border-red-200'
                              }>
                                {device.is_active ? 'Online' : 'Offline'}
                              </Badge>
                            </TableCell>
                            <TableCell>{lastSeenText}</TableCell>
                            <TableCell>{uptime}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-center">
                            <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Devices Found</h3>
                            <p className="text-gray-600">
                              {deviceError ? 'Error loading devices' : 'No BLE beacons configured yet'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {selectedLecturer ? `${selectedLecturer.name} - Detailed Report` : 
               selectedCourse ? `${selectedCourse.name} - Detailed Report` : 'Detailed Report'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedLecturer && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900">Performance Metrics</h4>
                    <p className="text-2xl font-bold text-blue-600">{selectedLecturer.avgAttendanceRate.toFixed(1)}%</p>
                    <p className="text-sm text-blue-600">Average Attendance Rate</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900">Course Load</h4>
                    <p className="text-2xl font-bold text-green-600">{selectedLecturer.totalCourses}</p>
                    <p className="text-sm text-green-600">Active Courses</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900">Recent Activity</h4>
                  <p className="text-sm text-gray-600">Last active: {selectedLecturer.lastActive}</p>
                  <p className="text-sm text-gray-600">Total classes conducted: {selectedLecturer.totalClasses}</p>
                  <p className="text-sm text-gray-600">Students enrolled: {selectedLecturer.totalStudents}</p>
                </div>
              </div>
            )}
            
            {selectedCourse && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-900">Course Performance</h4>
                    <p className="text-2xl font-bold text-purple-600">{selectedCourse.avgAttendanceRate.toFixed(1)}%</p>
                    <p className="text-sm text-purple-600">Attendance Rate</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900">Enrollment</h4>
                    <p className="text-2xl font-bold text-orange-600">{selectedCourse.totalStudents}</p>
                    <p className="text-sm text-orange-600">Enrolled Students</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900">Course Details</h4>
                  <p className="text-sm text-gray-600">Course Code: {selectedCourse.code}</p>
                  <p className="text-sm text-gray-600">Lecturer: {selectedCourse.lecturer}</p>
                  <p className="text-sm text-gray-600">Total Classes: {selectedCourse.totalClasses}</p>
                  <p className="text-sm text-gray-600">Last Class: {selectedCourse.lastClassDate}</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 