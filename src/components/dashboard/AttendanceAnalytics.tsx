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
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Attendance Analytics
            {isConnected && (
              <div className="flex items-center space-x-2 ml-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">Live</span>
              </div>
            )}
          </CardTitle>
          {/* Export Buttons */}
          <div className="flex items-center gap-4 mt-6">
            <Button
              onClick={() => handleExport('csv')}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">Total</span>
              </div>
              <p className="text-2xl font-bold text-white">{analytics.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">Present</span>
              </div>
              <p className="text-2xl font-bold text-white">{analytics.verified}</p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Pending</span>
              </div>
              <p className="text-2xl font-bold text-white">{analytics.pending}</p>
            </CardContent>
          </Card>

          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="text-sm text-gray-300">Absent</span>
              </div>
              <p className="text-2xl font-bold text-white">{analytics.absent}</p>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">BLE</span>
              </div>
              <p className="text-2xl font-bold text-white">{analytics.bleCount}</p>
            </CardContent>
          </Card>

          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-gray-300">QR</span>
              </div>
              <p className="text-2xl font-bold text-white">{analytics.qrCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Attendance Records</h3>
            <Badge variant="outline" className="text-sm">
              {filteredAttendance.length} records
            </Badge>
          </div>
          
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-800/50">
                  <TableHead className="text-gray-300">Student</TableHead>
                  <TableHead className="text-gray-300">Course</TableHead>
                  <TableHead className="text-gray-300">Check-in</TableHead>
                  <TableHead className="text-gray-300">Method</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Beacon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.map((record) => (
                  <TableRow key={record.id} className="hover:bg-gray-800/30">
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{record.users?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-400">{record.users?.email || record.student_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {record.course_code || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="text-white">
                          {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : 'N/A'}
                        </p>
                        {record.check_out_time && (
                          <p className="text-gray-400">
                            Out: {new Date(record.check_out_time).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`text-xs ${
                          record.method === 'BLE' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          record.method === 'QR' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}
                      >
                        {record.method || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`text-xs ${
                          record.status === 'verified' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          record.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}
                      >
                        {record.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-400">
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