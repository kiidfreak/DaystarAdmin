import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Download
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { exportToPDF, formatAttendanceDataForExport } from '@/utils/pdfExport';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import type { Database } from '@/lib/supabase';

type ClassSession = Database['public']['Tables']['class_sessions']['Row'] & {
  courses?: {
    id: string;
    name: string;
    code: string;
    instructor_id: string | null;
    users?: {
      id: string;
      full_name: string;
      email: string;
    } | null;
  } | null;
};

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLiveAttendance, setShowLiveAttendance] = useState(false);
  const [attendanceMethodFilter, setAttendanceMethodFilter] = useState<'all' | 'ble' | 'qr'>('all');

  // Get lecturer's sessions from past week to next week
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['lecturer-sessions', lecturerId],
    queryFn: async () => {
      const today = new Date();
      const pastWeek = new Date(today);
      pastWeek.setDate(today.getDate() - 7);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const { data, error } = await supabase
        .from('class_sessions')
        .select(`
          *,
          courses (
            id,
            name,
            code,
            instructor_id,
            users!courses_instructor_id_fkey (
              id,
              full_name,
              email
            )
          )
        `)
        .gte('session_date', pastWeek.toISOString().split('T')[0])
        .lte('session_date', nextWeek.toISOString().split('T')[0])
        .eq('courses.instructor_id', lecturerId)
        .order('session_date')
        .order('start_time');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!lecturerId,
  });

  // Get attendance records for the past week to next week
  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery({
    queryKey: ['lecturer-attendance-range', lecturerId],
    queryFn: async () => {
      const today = new Date();
      const pastWeek = new Date(today);
      pastWeek.setDate(today.getDate() - 7);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
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
        .gte('date', pastWeek.toISOString().split('T')[0])
        .lte('date', nextWeek.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!lecturerId,
  });

  // Get live attendance for selected session
  const { data: liveAttendance, isLoading: liveAttendanceLoading } = useQuery({
    queryKey: ['lecturer-live-attendance', selectedSession?.id],
    queryFn: async () => {
      if (!selectedSession?.id) return [];
      
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
        .eq('session_id', selectedSession.id)
        .order('check_in_time', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSession?.id && showLiveAttendance,
    refetchInterval: showLiveAttendance ? 5000 : false, // Refresh every 5 seconds when live
  });

  const getSessionStatus = (session: ClassSession) => {
    const now = new Date();
    const sessionDate = new Date(session.session_date);
    const startTime = session.start_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${session.start_time}`) : null;
    const endTime = session.end_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${session.end_time}`) : null;
    
    if (!startTime || !endTime) return 'unknown';
    
    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'ongoing';
    return 'completed';
  };

  const getAttendanceForSession = (sessionId: string) => {
    if (!attendanceRecords) return { present: 0, absent: 0, total: 0 };
    
    const sessionAttendance = attendanceRecords.filter(record => record.session_id === sessionId);
    const present = sessionAttendance.filter(record => record.status === 'verified').length;
    const absent = sessionAttendance.filter(record => record.status === 'absent').length;
    
    return { present, absent, total: sessionAttendance.length };
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      ongoing: <Badge className="bg-green-500/20 text-green-400 border-green-500/30">🔄 Ongoing</Badge>,
      upcoming: <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">⏰ Upcoming</Badge>,
      completed: <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">✅ Completed</Badge>,
      unknown: <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">❓ Unknown</Badge>
    };
    return badges[status as keyof typeof badges] || badges.unknown;
  };

  const getMethodBadge = (method: string) => {
    const badges = {
      BLE: <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">📡 BLE</Badge>,
      QR: <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">📱 QR</Badge>,
      MANUAL: <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">✋ Manual</Badge>,
      absent: <Badge className="bg-red-500/20 text-red-400 border-red-500/30">❌ Absent</Badge>
    };
    return badges[method as keyof typeof badges] || badges.MANUAL;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      verified: 'text-green-400',
      pending: 'text-yellow-400',
      absent: 'text-red-400'
    };
    return colors[status as keyof typeof colors] || 'text-gray-400';
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getFilteredSessions = () => {
    if (!sessions) return [];
    
    let filtered = sessions;
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(session => getSessionStatus(session) === statusFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.courses?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.courses?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getFilterButtonClass = (filterValue: string) => {
    return statusFilter === filterValue 
      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' 
      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10';
  };

  const getAttendanceMethodFilterClass = (filterValue: string) => {
    return attendanceMethodFilter === filterValue 
      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' 
      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10';
  };

  const getFilteredLiveAttendance = () => {
    if (!liveAttendance) return [];
    
    let filtered = liveAttendance;
    
    // Filter by attendance method
    if (attendanceMethodFilter !== 'all') {
      filtered = filtered.filter(record => {
        const method = record.method?.toLowerCase() || 'manual';
        return method === attendanceMethodFilter;
      });
    }
    
    return filtered;
  };

  if (sessionsLoading || attendanceLoading) {
    return <PageLoading text="Loading your classes..." />;
  }

  const filteredSessions = getFilteredSessions();
  const ongoingSessions = sessions?.filter(s => getSessionStatus(s) === 'ongoing').length || 0;
  const upcomingSessions = sessions?.filter(s => getSessionStatus(s) === 'upcoming').length || 0;
  const completedSessions = sessions?.filter(s => getSessionStatus(s) === 'completed').length || 0;

  const handleExportAttendance = () => {
    if (!liveAttendance || liveAttendance.length === 0) return;
    
    const attendanceData = formatAttendanceDataForExport(liveAttendance.map(record => ({
      name: record.users?.full_name || 'Unknown Student',
      studentId: record.users?.email || record.student_id,
      courseCode: selectedSession?.courses?.code || 'N/A',
      checkInTime: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : 'N/A',
      method: record.method || 'N/A',
      status: record.status || 'N/A'
    })));

    exportToPDF({
      title: `${selectedSession?.courses?.name || 'Class'} Attendance Report`,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">My Classes</h2>
            <p className="text-gray-400">Monitor your class sessions and live attendance</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{sessions?.length || 0}</div>
              <div className="text-gray-400 text-sm">Your Sessions (Past & Next Week)</div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search your classes by course or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
              />
            </div>
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex space-x-2">
          <Button
            size="sm"
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl ${getFilterButtonClass('all')}`}
          >
            <Filter className="w-4 h-4 mr-1" />
            All ({sessions?.length || 0})
          </Button>
          <Button
            size="sm"
            onClick={() => setStatusFilter('ongoing')}
            className={`rounded-xl ${getFilterButtonClass('ongoing')}`}
          >
            <Play className="w-4 h-4 mr-1" />
            Ongoing ({ongoingSessions})
          </Button>
          <Button
            size="sm"
            onClick={() => setStatusFilter('upcoming')}
            className={`rounded-xl ${getFilterButtonClass('upcoming')}`}
          >
            <Clock className="w-4 h-4 mr-1" />
            Upcoming ({upcomingSessions})
          </Button>
          <Button
            size="sm"
            onClick={() => setStatusFilter('completed')}
            className={`rounded-xl ${getFilterButtonClass('completed')}`}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed ({completedSessions})
          </Button>
        </div>

        {/* My Classes Grid */}
        {filteredSessions.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/20">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h4 className="text-xl font-semibold text-white mb-2">No classes found</h4>
            <p className="text-gray-400 mb-6">
              {searchTerm ? `No classes match "${searchTerm}"` : 'No classes scheduled for this period'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredSessions.map((session) => {
              const status = getSessionStatus(session);
              const attendance = getAttendanceForSession(session.id);
              const course = session.courses;
              
              return (
                <div key={session.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-200 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="bg-purple-600/20 p-3 rounded-xl">
                          <BookOpen className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold text-white mb-1">
                            {course?.name || 'Unknown Course'}
                          </h4>
                          <p className="text-gray-400 text-sm">{course?.code}</p>
                        </div>
                        {getStatusBadge(status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                          <CalendarDays className="w-5 h-5 text-purple-400" />
                          <div>
                            <p className="text-sm text-gray-400">Date</p>
                            <p className="text-white font-medium">
                              {new Date(session.session_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                          <Clock className="w-5 h-5 text-purple-400" />
                          <div>
                            <p className="text-sm text-gray-400">Time</p>
                            <p className="text-white font-medium">
                              {session.start_time ? session.start_time.substring(0, 5) : '--'} - {session.end_time ? session.end_time.substring(0, 5) : '--'}
                            </p>
                          </div>
                        </div>
                        
                        {session.location && (
                          <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                            <MapPin className="w-5 h-5 text-purple-400" />
                            <div>
                              <p className="text-sm text-gray-400">Location</p>
                              <p className="text-white font-medium">{session.location}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                          <TrendingUp className="w-5 h-5 text-purple-400" />
                          <div>
                            <p className="text-sm text-gray-400">Attendance</p>
                            <p className="text-white font-medium">
                              {attendance.present}/{attendance.total} ({attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0}%)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Details */}
                      {status === 'ongoing' && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium text-white">Live Attendance</h5>
                            <div className="flex space-x-2">
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                {attendance.present} Present
                              </Badge>
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                {attendance.absent} Absent
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-3 ml-6">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedSession(session);
                          setShowDetailsModal(true);
                        }}
                        className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 rounded-xl px-4 py-2"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Session Details Modal */}
        {showDetailsModal && selectedSession && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998] flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                      <BookOpen className="w-6 h-6 mr-3 text-purple-400" />
                      Session Details - {selectedSession.courses?.name}
                    </h3>
                    <p className="text-gray-400">Complete session information and attendance overview</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Session Status</div>
                      <div className="text-white font-medium">{getStatusBadge(getSessionStatus(selectedSession))}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailsModal(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>
                </div>

                {/* Session Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <BookOpen className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-sm text-gray-400">Course</p>
                        <p className="text-white font-medium">{selectedSession.courses?.name}</p>
                        <p className="text-gray-400 text-sm">{selectedSession.courses?.code}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-sm text-gray-400">Date</p>
                        <p className="text-white font-medium">
                          {new Date(selectedSession.session_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-sm text-gray-400">Time</p>
                        <p className="text-white font-medium">
                          {selectedSession.start_time ? selectedSession.start_time.substring(0, 5) : '--'} - {selectedSession.end_time ? selectedSession.end_time.substring(0, 5) : '--'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {selectedSession.location && (
                    <div className="bg-white/5 rounded-xl p-4">
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="text-sm text-gray-400">Location</p>
                          <p className="text-white font-medium">{selectedSession.location}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-sm text-gray-400">Instructor</p>
                        <p className="text-white font-medium">{selectedSession.courses?.users?.full_name || 'Unassigned'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-sm text-gray-400">Attendance</p>
                        <p className="text-white font-medium">
                          {(() => {
                            const attendance = getAttendanceForSession(selectedSession.id);
                            return `${attendance.present}/${attendance.total} (${attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0}%)`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-6 border-t border-white/10">
                  <div className="text-sm text-gray-400">
                    Session ID: {selectedSession.id}
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowDetailsModal(false)}
                      className="border-white/20 text-gray-400 hover:text-white"
                    >
                      Close
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowLiveAttendance(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Live Attendance
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Attendance Modal */}
        {showLiveAttendance && selectedSession && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998] flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
                      Live Attendance - {selectedSession.courses?.name}
                    </h3>
                    <p className="text-gray-400">Real-time student attendance monitoring</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Last Updated</div>
                      <div className="text-white font-medium">{new Date().toLocaleTimeString()}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLiveAttendance(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>
                </div>

                {/* Live Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {(() => {
                    const filteredAttendance = getFilteredLiveAttendance();
                    const total = filteredAttendance?.length || 0;
                    const present = filteredAttendance?.filter(a => a.status === 'verified' || (a.method === 'BLE' && a.status !== 'absent')).length || 0;
                    const absent = filteredAttendance?.filter(a => a.status === 'absent').length || 0;
                    const pending = filteredAttendance?.filter(a => a.status === 'pending').length || 0;
                    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

                    return (
                      <>
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-green-400">{present}</div>
                              <div className="text-sm text-gray-400">Present</div>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-green-400" />
                          </div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-red-400">{absent}</div>
                              <div className="text-sm text-gray-400">Absent</div>
                            </div>
                            <XCircle className="w-8 h-8 text-red-400" />
                          </div>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-yellow-400">{pending}</div>
                              <div className="text-sm text-gray-400">Pending</div>
                            </div>
                            <Clock3 className="w-8 h-8 text-yellow-400" />
                          </div>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-blue-400">{rate}%</div>
                              <div className="text-sm text-gray-400">Rate</div>
                            </div>
                            <TrendingUp className="w-8 h-8 text-blue-400" />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Attendance Method Filters */}
                <div className="mb-6">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-400">Filter by method:</span>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => setAttendanceMethodFilter('all')}
                        className={`${getAttendanceMethodFilterClass('all')} rounded-xl px-4 py-2`}
                      >
                        All
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setAttendanceMethodFilter('ble')}
                        className={`${getAttendanceMethodFilterClass('ble')} rounded-xl px-4 py-2`}
                      >
                        📡 BLE
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setAttendanceMethodFilter('qr')}
                        className={`${getAttendanceMethodFilterClass('qr')} rounded-xl px-4 py-2`}
                      >
                        📱 QR
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Live Attendance Table */}
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <h4 className="text-lg font-semibold text-white">Student Attendance</h4>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {liveAttendanceLoading ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading live attendance...</p>
                      </div>
                    ) : (() => {
                        const filteredAttendance = getFilteredLiveAttendance();
                        return filteredAttendance && filteredAttendance.length > 0 ? (
                      <div className="divide-y divide-white/10">
                        {filteredAttendance.map((record) => (
                          <div key={record.id} className="p-4 hover:bg-white/5 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                  <div className="text-white font-medium">
                                    {record.users?.full_name || 'Unknown Student'}
                                  </div>
                                  <div className="text-gray-400 text-sm">
                                    {record.users?.email || record.student_id}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-4">
                                {/* Check-in Time */}
                                <div className="text-right">
                                  <div className="text-sm text-gray-400">Check-in</div>
                                  <div className={`font-medium ${getStatusColor(record.status)}`}>
                                    {formatTime(record.check_in_time)}
                                  </div>
                                </div>
                                
                                {/* Checkout Time */}
                                <div className="text-right">
                                  <div className="text-sm text-gray-400">Check-out</div>
                                  <div className={`font-medium ${getStatusColor(record.status)}`}>
                                    {formatTime(record.check_out_time)}
                                  </div>
                                </div>
                                
                                {/* Method */}
                                <div className="text-center">
                                  <div className="text-sm text-gray-400 mb-1">Method</div>
                                  {getMethodBadge(record.method || 'MANUAL')}
                                </div>
                                
                                {/* Status */}
                                <div className="text-center">
                                  <div className="text-sm text-gray-400 mb-1">Status</div>
                                  <Badge 
                                    className={`${
                                      record.status === 'verified' || (record.method === 'BLE' && record.status !== 'absent')
                                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                        : record.status === 'pending'
                                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                                    }`}
                                  >
                                    {record.method === 'BLE' && record.status !== 'absent' ? '📡 BLE' :
                                     record.status === 'verified' ? '✅ Verified' : 
                                     record.status === 'pending' ? '⏳ Pending' : '❌ Absent'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            {/* Additional Details */}
                            {record.check_in_time && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-400">Check-in Time:</span>
                                  <span className="text-white">
                                    {new Date(record.check_in_time).toLocaleString('en-US', {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                        ) : (
                          <div className="p-8 text-center">
                            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h4 className="text-lg font-semibold text-white mb-2">No Attendance Records</h4>
                            <p className="text-gray-400">
                              {attendanceMethodFilter === 'all' 
                                ? 'No students have checked in yet for this session.' 
                                : `No students have checked in using ${attendanceMethodFilter.toUpperCase()} method.`}
                            </p>
                          </div>
                        );
                      })()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/10">
                  <div className="text-sm text-gray-400">
                    Auto-refreshing every 5 seconds
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleExportAttendance}
                      disabled={!liveAttendance || liveAttendance.length === 0}
                      className="border-white/20 text-gray-400 hover:text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowLiveAttendance(false)}
                      className="border-white/20 text-gray-400 hover:text-white"
                    >
                      Close
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowLiveAttendance(false);
                        setShowDetailsModal(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Back to Session Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 