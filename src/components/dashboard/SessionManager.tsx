import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  CheckCircle,
  XCircle,
  BookOpen,
  Users,
  Timer
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import type { Database } from '@/lib/supabase';

type ClassSession = Database['public']['Tables']['class_sessions']['Row'];
type Course = Database['public']['Tables']['courses']['Row'];

interface SessionFormData {
  course_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location?: string;
  attendance_window_start?: string;
  attendance_window_end?: string;
}

export const SessionManager: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [formData, setFormData] = useState<SessionFormData>({
    course_id: '',
    session_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:30',
    location: '',
    attendance_window_start: '08:45',
    attendance_window_end: '09:15'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  // Get lecturer's courses - using actual logged-in user ID
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['lecturer-courses', user?.id],
    queryFn: async () => {
      console.log('Fetching courses for user:', user?.id);
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', user.id);
      
      if (error) throw error;
      console.log('Courses found:', data?.length || 0, data);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get all sessions for lecturer's courses
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['lecturer-sessions', user?.id],
    queryFn: async () => {
      const courseIds = courses?.map(course => course.id) || [];
      console.log('Fetching sessions for course IDs:', courseIds);
      if (courseIds.length === 0) return [];

      const { data, error } = await supabase
        .from('class_sessions')
        .select(`
          *,
          courses (
            id,
            name,
            code
          )
        `)
        .in('course_id', courseIds)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      console.log('Sessions found:', data?.length || 0, data);
      return data || [];
    },
    enabled: !!courses && courses.length > 0,
  });

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (sessionData: SessionFormData) => {
      // Format the session data properly for the database
      const formattedData = {
        course_id: sessionData.course_id,
        session_date: `${sessionData.session_date}T00:00:00+00`, // Convert to timestamp with timezone
        start_time: sessionData.start_time, // Keep as time string for time field
        end_time: sessionData.end_time, // Keep as time string for time field
        location: sessionData.location || null,
        attendance_window_start: sessionData.attendance_window_start ? `${sessionData.session_date} ${sessionData.attendance_window_start}:00` : null, // Convert to timestamp
        attendance_window_end: sessionData.attendance_window_end ? `${sessionData.session_date} ${sessionData.attendance_window_end}:00` : null, // Convert to timestamp
      };

      const { data, error } = await supabase
        .from('class_sessions')
        .insert([formattedData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lecturer-sessions'] });
      setShowCreateForm(false);
      setFormData({
        course_id: '',
        session_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:30',
        location: '',
        attendance_window_start: '08:45',
        attendance_window_end: '09:15'
      });
      toast({
        title: "Session Created",
        description: "Class session has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create class session",
        variant: "destructive",
      });
    },
  });

  // Update session mutation
  const updateSession = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SessionFormData> }) => {
      // Format the updates properly for the database
      const formattedUpdates: any = {};
      
      if (updates.course_id) formattedUpdates.course_id = updates.course_id;
      if (updates.session_date) formattedUpdates.session_date = `${updates.session_date}T00:00:00+00`;
      if (updates.start_time) formattedUpdates.start_time = updates.start_time; // Keep as time string
      if (updates.end_time) formattedUpdates.end_time = updates.end_time; // Keep as time string
      if (updates.location !== undefined) formattedUpdates.location = updates.location || null;
      if (updates.attendance_window_start) formattedUpdates.attendance_window_start = `${updates.session_date || formData.session_date} ${updates.attendance_window_start}:00`;
      if (updates.attendance_window_end) formattedUpdates.attendance_window_end = `${updates.session_date || formData.session_date} ${updates.attendance_window_end}:00`;

      const { data, error } = await supabase
        .from('class_sessions')
        .update(formattedUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lecturer-sessions'] });
      setEditingSession(null);
      toast({
        title: "Session Updated",
        description: "Class session has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update class session",
        variant: "destructive",
      });
    },
  });

  // Delete session mutation
  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      // First check if there are attendance records for this session
      const { data: attendanceRecords, error: checkError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('session_id', id);
      
      if (checkError) throw checkError;
      
      // If there are attendance records, delete them first
      if (attendanceRecords && attendanceRecords.length > 0) {
        const { error: deleteAttendanceError } = await supabase
          .from('attendance_records')
          .delete()
          .eq('session_id', id);
        
        if (deleteAttendanceError) throw deleteAttendanceError;
      }
      
      // Now delete the session
      const { error } = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lecturer-sessions'] });
      toast({
        title: "Session Deleted",
        description: "Class session and related attendance records have been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete class session. It may have attendance records that need to be handled first.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSession) {
      updateSession.mutate({ id: editingSession.id, updates: formData });
    } else {
      createSession.mutate(formData);
    }
  };

  const handleEdit = (session: ClassSession) => {
    setEditingSession(session);
    
    // Extract date from session_date timestamp
    const sessionDate = new Date(session.session_date).toISOString().split('T')[0];
    
    // Extract time from attendance window timestamps
    const attendanceStartTime = session.attendance_window_start 
      ? new Date(session.attendance_window_start).toTimeString().substring(0, 5)
      : '08:45';
    const attendanceEndTime = session.attendance_window_end
      ? new Date(session.attendance_window_end).toTimeString().substring(0, 5)
      : '09:15';
    
    setFormData({
      course_id: session.course_id,
      session_date: sessionDate,
      start_time: session.start_time || '09:00', // start_time is already a time string
      end_time: session.end_time || '10:30', // end_time is already a time string
      location: session.location || '',
      attendance_window_start: attendanceStartTime,
      attendance_window_end: attendanceEndTime
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this session? This will also delete any related attendance records.')) {
      deleteSession.mutate(id);
    }
  };

  const getSessionStatus = (session: ClassSession) => {
    const now = new Date();
    const sessionDate = new Date(session.session_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    sessionDate.setHours(0, 0, 0, 0);
    
    // If session date is in the past, it's completed
    if (sessionDate < today) return 'completed';
    
    // If session date is in the future, it's upcoming
    if (sessionDate > today) return 'upcoming';
    
    // If session date is today, check the time
    if (sessionDate.getTime() === today.getTime()) {
      // Get current time in minutes since midnight for easier comparison
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      // Parse session times
      const [startHour, startMinute] = (session.start_time || '00:00').split(':').map(Number);
      const [endHour, endMinute] = (session.end_time || '23:59').split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      console.log(`Session: ${session.id}, Current: ${currentMinutes}min, Start: ${startMinutes}min, End: ${endMinutes}min`);
      
      // If current time is before start time, it's upcoming
      if (currentMinutes < startMinutes) return 'upcoming';
      
      // If current time is after end time, it's completed
      if (currentMinutes > endMinutes) return 'completed';
      
      // If current time is between start and end time, it's ongoing
      return 'ongoing';
    }
    
    return 'upcoming';
  };

  // Sort sessions by priority: current happening first, then upcoming, then completed
  const sortSessionsByPriority = (sessions: ClassSession[]) => {
    if (!sessions) return [];
    
    return [...sessions].sort((a, b) => {
      const statusA = getSessionStatus(a);
      const statusB = getSessionStatus(b);
      
      // Priority order: ongoing > upcoming > completed
      const priorityOrder = { ongoing: 0, upcoming: 1, completed: 2 };
      const priorityA = priorityOrder[statusA as keyof typeof priorityOrder] ?? 2;
      const priorityB = priorityOrder[statusB as keyof typeof priorityOrder] ?? 2;
      
      // If same priority, sort by date and time
      if (priorityA === priorityB) {
        const dateA = new Date(a.session_date);
        const dateB = new Date(b.session_date);
        
        if (dateA.getTime() === dateB.getTime()) {
          // Same date, sort by start time
          const timeA = a.start_time || '00:00';
          const timeB = b.start_time || '00:00';
          return timeA.localeCompare(timeB);
        }
        
        return dateA.getTime() - dateB.getTime();
      }
      
      return priorityA - priorityB;
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ Completed</Badge>,
      ongoing: <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">🔄 Ongoing</Badge>,
      upcoming: <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏰ Upcoming</Badge>
    };
    return badges[status as keyof typeof badges] || badges.upcoming;
  };

  if (coursesLoading || sessionsLoading) {
    return <PageLoading text="Loading sessions..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Session Manager</h2>
            <p className="text-gray-400">Create and manage your class sessions</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Session
          </Button>
        </div>

        {/* Create/Edit Form */}
        {(showCreateForm || editingSession) && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingSession ? 'Edit Session' : 'Create New Session'}
              </h3>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingSession(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Course</label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    required
                  >
                    <option value="">Select a course</option>
                    {courses?.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Date</label>
                  <Input
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Start Time</label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">End Time</label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Location</label>
                  <Input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Room 101, Building A"
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Attendance Window Start</label>
                  <Input
                    type="time"
                    value={formData.attendance_window_start}
                    onChange={(e) => setFormData({ ...formData, attendance_window_start: e.target.value })}
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Attendance Window End</label>
                  <Input
                    type="time"
                    value={formData.attendance_window_end}
                    onChange={(e) => setFormData({ ...formData, attendance_window_end: e.target.value })}
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingSession(null);
                  }}
                  className="text-gray-400 hover:text-white px-6 py-3 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSession.isPending || updateSession.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl shadow-lg"
                >
                  {createSession.isPending || updateSession.isPending ? 'Saving...' : (editingSession ? 'Update Session' : 'Create Session')}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Sessions List */}
        <div className="space-y-6">
          {(() => {
            const sortedSessions = sortSessionsByPriority(sessions || []);
            return (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white">Your Sessions</h3>
                  <div className="text-gray-400">
                    {sortedSessions.length} session{sortedSessions.length !== 1 ? 's' : ''}
                  </div>
                </div>
                
                {sessions?.length === 0 ? (
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/20">
                    <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                    <h4 className="text-xl font-semibold text-white mb-2">No sessions created yet</h4>
                    <p className="text-gray-400 mb-6">Create your first class session to get started</p>
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create First Session
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {sortedSessions.map((session) => {
                      const status = getSessionStatus(session);
                      const course = courses?.find(c => c.id === session.course_id);
                      
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
                                  <Calendar className="w-5 h-5 text-purple-400" />
                                  <div>
                                    <p className="text-sm text-gray-400">Date</p>
                                    <p className="text-white font-medium">{new Date(session.session_date).toLocaleDateString()}</p>
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
                                  <Timer className="w-5 h-5 text-purple-400" />
                                  <div>
                                    <p className="text-sm text-gray-400">Attendance Window</p>
                                    <p className="text-white font-medium">
                                      {session.attendance_window_start 
                                        ? new Date(session.attendance_window_start).toTimeString().substring(0, 5) 
                                        : '--'} - {session.attendance_window_end 
                                        ? new Date(session.attendance_window_end).toTimeString().substring(0, 5) 
                                        : '--'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-3 ml-6">
                              <Button
                                size="sm"
                                onClick={() => handleEdit(session)}
                                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 rounded-xl px-4 py-2"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDelete(session.id)}
                                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-xl px-4 py-2"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}; 