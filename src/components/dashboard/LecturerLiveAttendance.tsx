import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  BookOpen, 
  Clock, 
  MapPin, 
  Users, 
  Calendar,
  Play,
  Pause,
  Eye,
  EyeOff,
  Filter,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  X,
  User,
  Mail,
  Phone,
  Building,
  CalendarDays,
  Timer,
  CheckCircle2,
  XCircle,
  Clock3,
  Download,
  Plus,
  UserPlus,
  Wifi,
  QrCode
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { exportToPDF, formatAttendanceDataForExport } from '@/utils/pdfExport';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/lib/supabase';

type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'] & {
  users?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
};

interface LecturerLiveAttendanceProps {
  lecturerId: string;
}

export const LecturerLiveAttendance: React.FC<LecturerLiveAttendanceProps> = ({ lecturerId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'qr' | 'ble'>('all');
  const [showEntries, setShowEntries] = useState(10);
  const { toast } = useToast();

  // Get live attendance records for the lecturer
  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ['lecturer-live-attendance', lecturerId],
    queryFn: async () => {
      try {
        console.log('Fetching live attendance with lecturerId:', lecturerId);
        const { data, error } = await supabase
          .from('attendance_records')
          .select(`
            *,
            users (
              id,
              full_name,
              email
            )
          `)
          .eq('verified_by', lecturerId)
          .order('check_in_time', { ascending: false });
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        console.log('Live attendance result:', data);
        return data || [];
      } catch (error) {
        console.error('Error fetching live attendance:', error);
        throw error;
      }
    },
    enabled: !!lecturerId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const getMethodBadge = (method: string) => {
    if (method === 'BLE') {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1 text-sm font-medium">
          <Wifi className="w-4 h-4 mr-1" />
          BLE
        </Badge>
      );
    } else if (method === 'QR') {
      return (
        <Badge className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1 text-sm font-medium">
          <QrCode className="w-4 h-4 mr-1" />
          QR
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-700 border-gray-200 px-3 py-1 text-sm font-medium">
        {method || 'Unknown'}
      </Badge>
    );
  };

  const filteredRecords = attendanceRecords?.filter(record => {
    const matchesSearch = 
      record.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMethod = methodFilter === 'all' || record.method === methodFilter.toUpperCase();
    
    return matchesSearch && matchesMethod;
  }) || [];

  const handleExportCSV = () => {
    toast({
      title: "Export Started",
      description: "CSV file is being prepared for download.",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Export Started", 
      description: "PDF file is being prepared for download.",
    });
  };

  if (isLoading) {
    return <PageLoading text="Loading live attendance..." />;
  }

  // Add error handling
  if (!attendanceRecords) {
    return (
      <div className="space-y-6">
        <Card className="professional-card p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Data</h3>
          <p className="text-gray-600">No attendance records found for this lecturer</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="professional-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Attendance</h1>
              <p className="text-lg text-gray-600">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">LIVE</span>
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleExportCSV}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button 
              onClick={handleExportPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Search and Filters Section */}
      <Card className="professional-card p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
          
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              type="text"
              placeholder="Search by name or student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4">
            
            {/* Method Filter */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">Method:</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setMethodFilter('all')}
                  className={`${
                    methodFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ALL
                </Button>
                <Button
                  size="sm"
                  onClick={() => setMethodFilter('qr')}
                  className={`${
                    methodFilter === 'qr'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  QR
                </Button>
                <Button
                  size="sm"
                  onClick={() => setMethodFilter('ble')}
                  className={`${
                    methodFilter === 'ble'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  BLE
                </Button>
              </div>
            </div>
            
            {/* Show Entries */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">Show:</span>
              <select 
                value={showEntries}
                onChange={(e) => setShowEntries(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600">students</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Attendance Table */}
      <Card className="professional-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="professional-table">
            <thead>
              <tr>
                <th className="text-left py-4 px-6 text-gray-700 font-semibold">
                  Student
                </th>
                <th className="text-left py-4 px-6 text-gray-700 font-semibold">
                  Student ID
                </th>
                <th className="text-left py-4 px-6 text-gray-700 font-semibold">
                  Check-in Time
                </th>
                <th className="text-left py-4 px-6 text-gray-700 font-semibold">
                  Check-out Time
                </th>
                <th className="text-left py-4 px-6 text-gray-700 font-semibold">
                  Method
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.slice(0, showEntries).map((record, index) => (
                <tr 
                  key={record.id} 
                  className={`hover:bg-gray-50 transition-all duration-200 ${
                    index === 0 ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {record.users?.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {record.users?.full_name || 'Unknown Student'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">
                      {record.users?.email || record.student_id || 'No ID'}
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">
                      {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }) : 'N/A'}
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      }) : '-'}
                    </div>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    {getMethodBadge(record.method)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-700 text-lg font-semibold mb-2">No attendance records found</div>
            <div className="text-gray-600 text-sm">Students will appear here once they check in</div>
          </div>
        )}
      </Card>
    </div>
  );
};