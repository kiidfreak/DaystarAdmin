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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

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

export const LiveClasses: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLiveAttendance, setShowLiveAttendance] = useState(false);

  // Get sessions from past week to next week with course and instructor details
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['live-classes'],
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
        .order('session_date')
        .order('start_time');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Get attendance records for the past week to next week
  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance-range'],
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
  });

  // Get live attendance for selected session
  const { data: liveAttendance, isLoading: liveAttendanceLoading } = useQuery({
    queryKey: ['live-attendance', selectedSession?.id],
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
        session.courses?.users?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  if (sessionsLoading || attendanceLoading) {
    return <PageLoading text="Loading live classes..." />;
  }

  const filteredSessions = getFilteredSessions();
  // Group sessions by status
  const groupedSessions = {
    ongoing: filteredSessions.filter(s => getSessionStatus(s) === 'ongoing'),
    upcoming: filteredSessions.filter(s => getSessionStatus(s) === 'upcoming'),
    completed: filteredSessions.filter(s => getSessionStatus(s) === 'completed'),
  };

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
            <h2 className="text-3xl font-bold text-white mb-2">Live Classes</h2>
            <p className="text-gray-400">Monitor class sessions across all courses (past week to next week)</p>
          </div>
          <div className="flex items-center space-x-4">
                      <div className="text-right">
            <div className="text-2xl font-bold text-white">{sessions?.length || 0}</div>
            <div className="text-gray-400 text-sm">Sessions (Past & Next Week)</div>
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
                placeholder="Search classes by course, instructor, or location..."
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
            Ongoing ({groupedSessions.ongoing.length})
          </Button>
          <Button
            size="sm"
            onClick={() => setStatusFilter('upcoming')}
            className={`rounded-xl ${getFilterButtonClass('upcoming')}`}
          >
            <Clock className="w-4 h-4 mr-1" />
            Upcoming ({groupedSessions.upcoming.length})
          </Button>
          <Button
            size="sm"
            onClick={() => setStatusFilter('completed')}
            className={`rounded-xl ${getFilterButtonClass('completed')}`}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed ({groupedSessions.completed.length})
          </Button>
        </div>

        {/* Live Classes Grid */}
        {filteredSessions.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/20">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h4 className="text-xl font-semibold text-white mb-2">No classes found</h4>
            <p className="text-gray-400 mb-6">
              {searchTerm ? `No classes match "${searchTerm}"` : 'No classes scheduled for today'}
            </p>
          </div>
        ) : (
          <Accordion type="multiple" className="grid gap-6">
            {(['ongoing', 'upcoming', 'completed'] as const).map((status) => (
              <AccordionItem key={status} value={status}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    {getStatusBadge(status)}
                    <span className="capitalize font-semibold">{status} Classes</span>
                    <span className="ml-2 text-xs text-gray-400">({groupedSessions[status].length})</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {groupedSessions[status].length === 0 ? (
                    <div className="p-6 text-center text-gray-400">No {status} classes</div>
                  ) : (
                    <div className="grid gap-6">
                      {groupedSessions[status].map((session) => {
                        const attendance = getAttendanceForSession(session.id);
                        const course = session.courses;
                        const instructor = session.courses?.users;
                        const sessionStatus = getSessionStatus(session);
                        const isCompleted = sessionStatus === 'completed';
                        
                        return (
                          <div key={session.id} className={`backdrop-blur-lg rounded-2xl p-6 border transition-all duration-200 shadow-lg ${
                            isCompleted 
                              ? 'bg-white/90 border-gray-200 hover:bg-white/95' 
                              : 'bg-white/10 border-white/20 hover:bg-white/15'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-4 mb-4">
                                  <div className={`p-3 rounded-xl ${
                                    isCompleted 
                                      ? 'bg-green-100 border border-green-200' 
                                      : 'bg-purple-600/20'
                                  }`}>
                                    <BookOpen className={`w-6 h-6 ${
                                      isCompleted ? 'text-green-600' : 'text-purple-400'
                                    }`} />
                                  </div>
                                  <div>
                                    <h4 className={`text-xl font-semibold mb-1 ${
                                      isCompleted ? 'text-gray-900' : 'text-white'
                                    }`}>
                                      {course?.name || 'Unknown Course'}
                                    </h4>
                                    <p className={`text-sm ${
                                      isCompleted ? 'text-gray-600' : 'text-gray-400'
                                    }`}>{course?.code}</p>
                                  </div>
                                  {getStatusBadge(sessionStatus)}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div className={`flex items-center space-x-3 p-3 rounded-xl ${
                                    isCompleted 
                                      ? 'bg-gray-50 border border-gray-100' 
                                      : 'bg-white/5'
                                  }`}>
                                    <Users className={`w-5 h-5 ${
                                      isCompleted ? 'text-gray-600' : 'text-purple-400'
                                    }`} />
                                    <div>
                                      <p className={`text-sm ${
                                        isCompleted ? 'text-gray-500' : 'text-gray-400'
                                      }`}>Instructor</p>
                                      <p className={`font-medium ${
                                        isCompleted ? 'text-gray-900' : 'text-white'
                                      }`}>{instructor?.full_name || 'Unassigned'}</p>
                                    </div>
                                  </div>
                                  <div className={`flex items-center space-x-3 p-3 rounded-xl ${
                                    isCompleted 
                                      ? 'bg-gray-50 border border-gray-100' 
                                      : 'bg-white/5'
                                  }`}>
                                    <Clock className={`w-5 h-5 ${
                                      isCompleted ? 'text-gray-600' : 'text-purple-400'
                                    }`} />
                                    <div>
                                      <p className={`text-sm ${
                                        isCompleted ? 'text-gray-500' : 'text-gray-400'
                                      }`}>Time</p>
                                      <p className={`font-medium ${
                                        isCompleted ? 'text-gray-900' : 'text-white'
                                      }`}>
                                        {session.start_time ? session.start_time.substring(0, 5) : '--'} - {session.end_time ? session.end_time.substring(0, 5) : '--'}
                                      </p>
                                    </div>
                                  </div>
                                  {session.location && (
                                    <div className={`flex items-center space-x-3 p-3 rounded-xl ${
                                      isCompleted 
                                        ? 'bg-gray-50 border border-gray-100' 
                                        : 'bg-white/5'
                                    }`}>
                                      <MapPin className={`w-5 h-5 ${
                                        isCompleted ? 'text-gray-600' : 'text-purple-400'
                                      }`} />
                                      <div>
                                        <p className={`text-sm ${
                                          isCompleted ? 'text-gray-500' : 'text-gray-400'
                                        }`}>Location</p>
                                        <p className={`font-medium ${
                                          isCompleted ? 'text-gray-900' : 'text-white'
                                        }`}>{session.location}</p>
                                      </div>
                                    </div>
                                  )}
                                  <div className={`flex items-center space-x-3 p-3 rounded-xl ${
                                    isCompleted 
                                      ? 'bg-gray-50 border border-gray-100' 
                                      : 'bg-white/5'
                                  }`}>
                                    <TrendingUp className={`w-5 h-5 ${
                                      isCompleted ? 'text-gray-600' : 'text-purple-400'
                                    }`} />
                                    <div>
                                      <p className={`text-sm ${
                                        isCompleted ? 'text-gray-500' : 'text-gray-400'
                                      }`}>Attendance</p>
                                      <p className={`font-medium ${
                                        isCompleted ? 'text-gray-900' : 'text-white'
                                      }`}>
                                        {attendance.present}/{attendance.total} ({attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0}%)
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                {/* Attendance Details */}
                                {sessionStatus === 'ongoing' && (
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
                                {/* Completed Class Summary */}
                                {isCompleted && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-sm font-medium text-gray-700">Session Summary</h5>
                                      <div className="flex space-x-2">
                                        <Badge className="bg-green-100 text-green-700 border-green-200">
                                          ✅ Completed
                                        </Badge>
                                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                          {attendance.present} Students
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
                                  className={`rounded-xl px-4 py-2 ${
                                    isCompleted 
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600' 
                                      : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30'
                                  }`}
                                >
                                  Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Session Details Modal */}
        {showDetailsModal && selectedSession && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99998] flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {selectedSession.courses?.name} - {selectedSession.courses?.code}
                    </h3>
                    <p className="text-gray-400">Session Details</p>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Session Information */}
                  <div className="space-y-6">
                    <div className="bg-white/5 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <CalendarDays className="w-5 h-5 mr-2 text-purple-400" />
                        Session Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Date:</span>
                          <span className="text-white font-medium">
                            {new Date(selectedSession.session_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Time:</span>
                          <span className="text-white font-medium">
                            {selectedSession.start_time} - {selectedSession.end_time}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Location:</span>
                          <span className="text-white font-medium">{selectedSession.location || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Status:</span>
                          <div className="flex items-center">
                            {getStatusBadge(getSessionStatus(selectedSession))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Instructor Information */}
                    <div className="bg-white/5 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <User className="w-5 h-5 mr-2 text-purple-400" />
                        Instructor Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {selectedSession.courses?.users?.full_name || 'Unassigned'}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {selectedSession.courses?.users?.email || 'No email available'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Information */}
                  <div className="space-y-6">
                    <div className="bg-white/5 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-purple-400" />
                        Attendance Overview
                      </h4>
                      <div className="space-y-4">
                        {(() => {
                          const attendance = getAttendanceForSession(selectedSession.id);
                          const attendanceRate = attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0;
                          
                          return (
                            <>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                  <div className="text-2xl font-bold text-green-400">{attendance.present}</div>
                                  <div className="text-sm text-gray-400">Present</div>
                                </div>
                                <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                  <div className="text-2xl font-bold text-red-400">{attendance.absent}</div>
                                  <div className="text-sm text-gray-400">Absent</div>
                                </div>
                                <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                  <div className="text-2xl font-bold text-blue-400">{attendanceRate}%</div>
                                  <div className="text-sm text-gray-400">Rate</div>
                                </div>
                              </div>
                              
                              <div className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-gray-400 text-sm">Total Students</span>
                                  <span className="text-white font-medium">{attendance.total}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${attendanceRate}%` }}
                                  ></div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Session Timeline */}
                    <div className="bg-white/5 rounded-xl p-4">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Timer className="w-5 h-5 mr-2 text-purple-400" />
                        Session Timeline
                      </h4>
                      <div className="space-y-3">
                        {(() => {
                          const status = getSessionStatus(selectedSession);
                          const now = new Date();
                          const sessionDate = new Date(selectedSession.session_date);
                          const startTime = selectedSession.start_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${selectedSession.start_time}`) : null;
                          const endTime = selectedSession.end_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${selectedSession.end_time}`) : null;
                          
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${status === 'completed' ? 'bg-green-500' : status === 'ongoing' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                                <span className="text-gray-400">Session Start</span>
                                <span className="text-white">{startTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${status === 'completed' ? 'bg-green-500' : status === 'ongoing' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                                <span className="text-gray-400">Session End</span>
                                <span className="text-white">{endTime?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              {status === 'ongoing' && (
                                <div className="flex items-center space-x-3">
                                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                                  <span className="text-green-400 font-medium">Currently Active</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailsModal(false)}
                    className="border-white/20 text-gray-400 hover:text-white"
                  >
                    Close
                  </Button>
                  {getSessionStatus(selectedSession) === 'ongoing' && (
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
                  )}
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
                {/* Header */}
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
                    const total = liveAttendance?.length || 0;
                    const present = liveAttendance?.filter(a => a.status === 'verified').length || 0;
                    const absent = liveAttendance?.filter(a => a.status === 'absent').length || 0;
                    const pending = liveAttendance?.filter(a => a.status === 'pending').length || 0;
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
                    ) : liveAttendance && liveAttendance.length > 0 ? (
                      <div className="divide-y divide-white/10">
                        {liveAttendance.map((record) => (
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
                                      record.status === 'verified' 
                                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                        : record.status === 'pending'
                                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                                    }`}
                                  >
                                    {record.status === 'verified' ? '✅ Verified' : 
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
                        <p className="text-gray-400">No students have checked in yet for this session.</p>
                      </div>
                    )}
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