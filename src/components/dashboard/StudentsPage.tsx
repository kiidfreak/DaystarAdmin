import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Search, 
  Filter, 
  User, 
  Mail, 
  Calendar,
  GraduationCap,
  Building,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { CardLoading } from '@/components/ui/LoadingSpinner';
import type { Database } from '@/lib/supabase';

type Student = Database['public']['Tables']['users']['Row'] & {
  attendance_stats?: {
    total_sessions: number;
    attended_sessions: number;
    attendance_rate: number;
    last_attendance?: string;
  };
};

export const StudentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 20;

  // Get all students with attendance statistics
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['students', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .order('full_name');
      
      if (error) throw error;
      
      // Get attendance statistics for each student
      const studentsWithStats = await Promise.all(
        (data || []).map(async (student) => {
          // Get student's attendance records
          const { data: attendanceRecords } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('student_id', student.id);
          
          // Get all sessions
          const { data: allSessions } = await supabase
            .from('class_sessions')
            .select('*');
          
          const totalSessions = allSessions?.length || 0;
          const attendedSessions = attendanceRecords?.length || 0;
          const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
          const lastAttendance = attendanceRecords?.[0]?.check_in_time;
          
          return {
            ...student,
            attendance_stats: {
              total_sessions: totalSessions,
              attended_sessions: attendedSessions,
              attendance_rate: attendanceRate,
              last_attendance: lastAttendance
            }
          };
        })
      );
      
      return studentsWithStats;
    },
  });

  // Get unique departments for filtering
  const departments = [...new Set(students?.map(s => s.department).filter(Boolean) || [])];

  // Filter students based on search and filters
  const getFilteredStudents = () => {
    if (!students) return [];
    
    let filtered = students;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by status (active/inactive based on attendance rate)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(student => {
        const rate = student.attendance_stats?.attendance_rate || 0;
        return statusFilter === 'active' ? rate >= 70 : rate < 70;
      });
    }
    
    // Filter by department
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(student => student.department === departmentFilter);
    }
    
    return filtered;
  };

  const filteredStudents = getFilteredStudents();
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * studentsPerPage,
    currentPage * studentsPerPage
  );

  const getStatusBadge = (attendanceRate: number) => {
    if (attendanceRate >= 90) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Excellent</Badge>;
    } else if (attendanceRate >= 70) {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Good</Badge>;
    } else if (attendanceRate >= 50) {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Fair</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-700 border-red-200">Poor</Badge>;
    }
  };

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-blue-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return <CardLoading text="Loading students..." />;
  }

  if (error) {
    return (
      <div className="professional-card p-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Students</h3>
        <p className="text-gray-600">Please try again later</p>
      </div>
    );
  }

  const totalStudents = students?.length || 0;
  const activeStudents = students?.filter(s => (s.attendance_stats?.attendance_rate || 0) >= 70).length || 0;
  const inactiveStudents = totalStudents - activeStudents;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">All Students</h2>
          <p className="text-gray-600 text-lg">Manage and view all registered students</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{totalStudents}</div>
          <div className="text-gray-600 text-sm">Total Students</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="professional-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalStudents}</div>
              <div className="text-gray-600 text-sm">Total Students</div>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="professional-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{activeStudents}</div>
              <div className="text-gray-600 text-sm">Active Students</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="professional-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-600">{inactiveStudents}</div>
              <div className="text-gray-600 text-sm">Inactive Students</div>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="professional-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              type="text"
              placeholder="Search students by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
          
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-40 h-12 text-base">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-48 h-12 text-base">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="professional-card overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Student Directory</h3>
          <p className="text-gray-600 text-sm mt-1">
            Showing {paginatedStudents.length} of {filteredStudents.length} students
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="professional-table">
            <thead>
              <tr>
                <th className="text-left py-4 px-6 text-gray-700 font-semibold">Student</th>
                <th className="text-left py-4 px-6 text-gray-700 font-semibold">Contact</th>
                <th className="text-left py-4 px-6 text-gray-700 font-semibold">Department</th>
                <th className="text-left py-4 px-6 text-gray-700 font-semibold">Attendance</th>
                <th className="text-left py-4 px-6 text-gray-700 font-semibold">Status</th>
                <th className="text-left py-4 px-6 text-gray-700 font-semibold">Last Attendance</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No students found matching your criteria</p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-gray-900 font-medium">{student.full_name}</div>
                          <div className="text-gray-600 text-sm">ID: {student.student_id}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-900 text-sm">{student.email}</span>
                        </div>
                        {student.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600 text-sm">{student.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-900">{student.department || 'Not specified'}</span>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="text-gray-900">
                          {student.attendance_stats?.attended_sessions || 0} / {student.attendance_stats?.total_sessions || 0}
                        </div>
                        <div className={`font-medium ${getAttendanceRateColor(student.attendance_stats?.attendance_rate || 0)}`}>
                          {student.attendance_stats?.attendance_rate.toFixed(1) || 0}%
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      {getStatusBadge(student.attendance_stats?.attendance_rate || 0)}
                    </td>
                    
                    <td className="py-4 px-6">
                      {student.attendance_stats?.last_attendance ? (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 text-sm">
                            {new Date(student.attendance_stats.last_attendance).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Never</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-gray-600 text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="border-gray-300 text-gray-700 hover:text-gray-900"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="border-gray-300 text-gray-700 hover:text-gray-900"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 