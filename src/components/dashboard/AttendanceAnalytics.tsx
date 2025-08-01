import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Download, Filter, Search, Users, Clock, MapPin } from 'lucide-react';
import { useTodayAttendance, useCourses } from '@/hooks/use-api';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/utils/exportUtils';
import { useRealtimeAttendance } from '@/hooks/use-realtime-attendance';
import { PageLoading } from '@/components/ui/LoadingSpinner';

interface AttendanceAnalyticsProps {
  userRole?: string;
}

export const AttendanceAnalytics: React.FC<AttendanceAnalyticsProps> = ({ userRole }) => {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [beaconFilter, setBeaconFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'absent'>('all');

  const { data: attendanceData, isLoading } = useTodayAttendance();
  const { data: courses } = useCourses();
  const { toast } = useToast();
  const { isConnected } = useRealtimeAttendance();

  // Get unique beacons from attendance data
  const uniqueBeacons = useMemo(() => {
    if (!attendanceData) return [];
    const beacons = attendanceData
      .map(record => record.beacon_id || record.beacon_mac_address)
      .filter(Boolean);
    return [...new Set(beacons)];
  }, [attendanceData]);

  // Filter attendance data based on filters
  const filteredAttendance = useMemo(() => {
    if (!attendanceData) return [];

    return attendanceData.filter(record => {
      // Date filter
      const recordDate = new Date(record.date || record.check_in_time).toISOString().split('T')[0];
      if (dateFilter && recordDate !== dateFilter) return false;

      // Course filter
      if (courseFilter !== 'all' && record.course_code !== courseFilter) return false;

      // Beacon filter
      if (beaconFilter !== 'all') {
        const beaconId = record.beacon_id || record.beacon_mac_address;
        if (beaconId !== beaconFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const studentName = record.users?.full_name?.toLowerCase() || '';
        const studentId = record.users?.email?.toLowerCase() || '';
        const courseCode = record.course_code?.toLowerCase() || '';
        
        if (!studentName.includes(searchLower) && 
            !studentId.includes(searchLower) && 
            !courseCode.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [attendanceData, dateFilter, courseFilter, beaconFilter, statusFilter, searchTerm]);

  // Calculate analytics
  const analytics = useMemo(() => {
    const total = filteredAttendance.length;
    const verified = filteredAttendance.filter(r => r.status === 'verified').length;
    const pending = filteredAttendance.filter(r => r.status === 'pending').length;
    const absent = filteredAttendance.filter(r => r.status === 'absent').length;
    const bleCount = filteredAttendance.filter(r => r.method === 'BLE').length;
    const qrCount = filteredAttendance.filter(r => r.method === 'QR').length;

    return {
      total,
      verified,
      pending,
      absent,
      bleCount,
      qrCount,
      attendanceRate: total > 0 ? (verified / total) * 100 : 0
    };
  }, [filteredAttendance]);

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const exportData = filteredAttendance.map(record => ({
        'Student Name': record.users?.full_name || 'Unknown',
        'Student ID': record.users?.email || record.student_id || 'Unknown',
        'Course': record.course_code || 'Unknown',
        'Check-in Time': record.check_in_time ? new Date(record.check_in_time).toLocaleString() : 'N/A',
        'Check-out Time': record.check_out_time ? new Date(record.check_out_time).toLocaleString() : 'N/A',
        'Method': record.method || 'Unknown',
        'Status': record.status || 'Unknown',
        'Beacon ID': record.beacon_id || record.beacon_mac_address || 'N/A',
        'Date': record.date || new Date(record.check_in_time).toLocaleDateString()
      }));

      if (format === 'csv') {
        await exportToCSV(exportData, `attendance_analytics_${dateFilter}`);
      } else {
        // For Excel, we'll use the same CSV function for now
        await exportToCSV(exportData, `attendance_analytics_${dateFilter}`);
      }

      toast({
        title: "Export Successful",
        description: `Attendance data exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export attendance data",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <Card className="bg-white shadow-xl rounded-2xl p-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Calendar className="w-6 h-6 text-blue-600" />
            Attendance Analytics
            {isConnected && (
              <div className="flex items-center space-x-2 ml-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-500 font-semibold">Live</span>
              </div>
            )}
          </CardTitle>
          {/* Export Buttons */}
          <div className="flex items-center gap-4 mt-6">
            <Button
              onClick={() => handleExport('csv')}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 text-base shadow"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 text-base shadow"
            >
              <Download className="w-5 h-5" />
              Export Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Date</label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-gray-800/50 border-gray-600"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Course</label>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="bg-gray-800/50 border-gray-600">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses?.map((course) => (
                  <SelectItem key={course.course_code} value={course.course_code}>
                    {course.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Beacon</label>
            <Select value={beaconFilter} onValueChange={setBeaconFilter}>
              <SelectTrigger className="bg-gray-800/50 border-gray-600">
                <SelectValue placeholder="All Beacons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Beacons</SelectItem>
                {uniqueBeacons.map((beacon) => (
                  <SelectItem key={beacon} value={beacon}>
                    {beacon}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Status</label>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="bg-gray-800/50 border-gray-600">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Actions</label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDateFilter(new Date().toISOString().split('T')[0]);
                setCourseFilter('all');
                setBeaconFilter('all');
                setStatusFilter('all');
                setSearchTerm('');
              }}
              className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
            >
              <Filter className="w-4 h-4" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Analytics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-6">
          <Card className="bg-blue-50 border-blue-200 shadow rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-base text-gray-700 font-semibold">Total</span>
              </div>
              <p className="text-3xl font-extrabold text-blue-900">{analytics.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200 shadow rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-500" />
                <span className="text-base text-gray-700 font-semibold">Present</span>
              </div>
              <p className="text-3xl font-extrabold text-green-900">{analytics.verified}</p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200 shadow rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <span className="text-base text-gray-700 font-semibold">Pending</span>
              </div>
              <p className="text-3xl font-extrabold text-yellow-900">{analytics.pending}</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200 shadow rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-500" />
                <span className="text-base text-gray-700 font-semibold">Absent</span>
              </div>
              <p className="text-3xl font-extrabold text-red-900">{analytics.absent}</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200 shadow rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-500" />
                <span className="text-base text-gray-700 font-semibold">BLE</span>
              </div>
              <p className="text-3xl font-extrabold text-purple-900">{analytics.bleCount}</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200 shadow rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-500" />
                <span className="text-base text-gray-700 font-semibold">QR</span>
              </div>
              <p className="text-3xl font-extrabold text-orange-900">{analytics.qrCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-gray-900">Attendance Records</h3>
            <Badge variant="outline" className="text-base font-semibold bg-gray-100 text-gray-700 border-gray-300 rounded-lg px-3 py-1">
              {filteredAttendance.length} records
            </Badge>
          </div>
          
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-700 font-bold text-base py-3 px-4">Student</TableHead>
                  <TableHead className="text-gray-700 font-bold text-base py-3 px-4">Course</TableHead>
                  <TableHead className="text-gray-700 font-bold text-base py-3 px-4">Check-in</TableHead>
                  <TableHead className="text-gray-700 font-bold text-base py-3 px-4">Method</TableHead>
                  <TableHead className="text-gray-700 font-bold text-base py-3 px-4">Status</TableHead>
                  <TableHead className="text-gray-700 font-bold text-base py-3 px-4">Beacon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.map((record, idx) => (
                  <TableRow key={record.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                    <TableCell className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">{record.users?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">{record.users?.email || record.student_id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200 rounded-lg px-2 py-1">
                        {record.course_code || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="text-base text-gray-900">
                        {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : 'N/A'}
                      </div>
                      {record.check_out_time && (
                        <div className="text-xs text-gray-400">
                          Out: {new Date(record.check_out_time).toLocaleTimeString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge 
                        className={`text-xs rounded-full px-3 py-1 font-semibold ${
                          record.method === 'BLE' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          record.method === 'QR' ? 'bg-green-100 text-green-700 border-green-200' :
                          'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {record.method || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge 
                        className={`text-xs rounded-full px-3 py-1 font-semibold ${
                          record.status === 'verified' ? 'bg-green-100 text-green-700 border-green-200' :
                          record.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                          'bg-red-100 text-red-700 border-red-200'
                        }`}
                      >
                        {record.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className="text-xs text-gray-500">
                        {record.beacon_id || record.beacon_mac_address || 'N/A'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 