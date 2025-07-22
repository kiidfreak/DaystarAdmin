import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { Student } from '@/types/student';
import { exportToPDF, formatAttendanceDataForExport } from '@/utils/pdfExport';

interface AttendanceTableProps {
  students: Student[];
  onApprove?: (studentId: string) => void;
  onReject?: (studentId: string) => void;
  userRole: string;
  showSearch?: boolean;
  globalSearchTerm?: string;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({ 
  students, 
  onApprove, 
  onReject, 
  userRole,
  showSearch = true,
  globalSearchTerm = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'ble' | 'qr'>('all');
  const [studentsPerPage, setStudentsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const effectiveSearchTerm = globalSearchTerm || searchTerm;

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch =
        student.name.toLowerCase().includes(effectiveSearchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(effectiveSearchTerm.toLowerCase());
      const matchesMethod =
        methodFilter === 'all' || student.method?.toLowerCase() === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [students, effectiveSearchTerm, methodFilter]);

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage, studentsPerPage]);

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const getStatusBadge = (status: string, method: string) => {
    if (method?.toLowerCase() === 'ble') {
      return <Badge className="status-online border rounded-xl">📡 BLE</Badge>;
    }
    if (method?.toLowerCase() === 'qr') {
      return <Badge className="status-online border rounded-xl">📱 QR</Badge>;
    }
    return <Badge className="status-offline border rounded-xl">❓</Badge>;
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, methodFilter, studentsPerPage]);

  const exportToCSV = () => {
    const headers = ['Student', 'Student ID', 'Check-in Time', 'Check-out Time', 'Status', 'Method'];
    const csvData = filteredStudents.map(student => [
      student.name,
      student.studentId,
      student.checkInTime || '-',
      student.checkOutTime || '-',
      student.status,
      student.method
    ]);
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDFReport = () => {
    const attendanceData = formatAttendanceDataForExport(
      filteredStudents.map(student => ({
        name: student.name,
        studentId: student.studentId,
        courseCode: student.courseCode || 'N/A',
        checkInTime: student.checkInTime || 'N/A',
        checkOutTime: student.checkOutTime || 'N/A',
        method: student.method || 'N/A',
        status: student.status || 'N/A'
      }))
    );
    exportToPDF({
      title: 'Live Attendance Report',
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      attendanceData,
      type: 'attendance'
    });
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Live Attendance</h2>
        <div className="flex items-center space-x-4">
          <Button
            size="sm"
            onClick={exportToCSV}
            className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-xl"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={exportToPDFReport}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-xl"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Only show local search if no global search is active */}
      {showSearch && !globalSearchTerm && (
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name or student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-sky-blue/50"
            />
          </div>

          {/* Method Filter Buttons */}
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={() => setMethodFilter('all')}
              className={`rounded-xl ${
                methodFilter === 'all'
                  ? 'bg-sky-blue/20 text-sky-blue border border-sky-blue/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Filter className="w-4 h-4 mr-1" />
              All
            </Button>
            <Button
              size="sm"
              onClick={() => setMethodFilter('qr')}
              className={`rounded-xl ${
                methodFilter === 'qr'
                  ? 'bg-sky-blue/20 text-sky-blue border border-sky-blue/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              📱 QR
            </Button>
            <Button
              size="sm"
              onClick={() => setMethodFilter('ble')}
              className={`rounded-xl ${
                methodFilter === 'ble'
                  ? 'bg-sky-blue/20 text-sky-blue border border-sky-blue/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              📡 BLE
            </Button>
          </div>

          {/* Students per page selector */}
          <div className="flex items-center space-x-2 mt-4">
            <span className="text-sm text-gray-400">Show:</span>
            <select
              value={studentsPerPage}
              onChange={(e) => setStudentsPerPage(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-sky-blue/50"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-400">students</span>
          </div>
        </div>
      )}

      {globalSearchTerm && (
        <div className="mb-6">
          <div className="glass-card p-4">
            <p className="text-white">
              Search results for: <span className="text-sky-blue font-semibold">"{globalSearchTerm}"</span>
              {filteredStudents.length === 0 && <span className="text-gray-400 ml-2">No students found</span>}
            </p>
          </div>
          <div className="flex space-x-2 mt-4">
            <Button
              size="sm"
              onClick={() => setMethodFilter('all')}
              className={`rounded-xl ${
                methodFilter === 'all'
                  ? 'bg-sky-blue/20 text-sky-blue border border-sky-blue/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Filter className="w-4 h-4 mr-1" />
              All
            </Button>
            <Button
              size="sm"
              onClick={() => setMethodFilter('qr')}
              className={`rounded-xl ${
                methodFilter === 'qr'
                  ? 'bg-sky-blue/20 text-sky-blue border border-sky-blue/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              📱 QR
            </Button>
            <Button
              size="sm"
              onClick={() => setMethodFilter('ble')}
              className={`rounded-xl ${
                methodFilter === 'ble'
                  ? 'bg-sky-blue/20 text-sky-blue border border-sky-blue/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              📡 BLE
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Student</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Student ID</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Check-in Time</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Check-out Time</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Method</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.map((student) => (
              <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-4 px-4 text-white font-medium">{student.name}</td>
                <td className="py-4 px-4 text-gray-400">{student.studentId}</td>
                <td className="py-4 px-4 text-gray-400">{student.checkInTime || '-'}</td>
                <td className="py-4 px-4 text-gray-400">{student.checkOutTime || '-'}</td>
                <td className="py-4 px-4">{getStatusBadge(student.status, student.method)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {paginatedStudents.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No students found matching your criteria
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <div className="text-sm text-gray-400">
            Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, filteredStudents.length)} of {filteredStudents.length} students
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 p-0 rounded-xl ${
                      currentPage === pageNum
                        ? 'bg-sky-blue/20 text-sky-blue border border-sky-blue/30'
                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
