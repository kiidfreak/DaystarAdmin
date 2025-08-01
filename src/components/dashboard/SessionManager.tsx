import React, { useState, useRef, useEffect } from 'react';
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
import { sessionApi } from '@/lib/api';
import { useBeaconAssignments } from '@/hooks/use-api';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

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
  beacon_id?: string; // Added beacon_id to the interface
}

export const SessionManager: React.FC = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for form and UI
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [formData, setFormData] = useState<SessionFormData>({
    course_id: '',
    session_date: new Date().toISOString().split('T')[0],
    start_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    end_time: new Date(Date.now() + 90 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    location: '',
    attendance_window_start: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Start immediately
    attendance_window_end: new Date(Date.now() + 90 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) // End when session ends
  });
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionDateFilter, setSessionDateFilter] = useState('');
  const [selectedBeaconId, setSelectedBeaconId] = useState<string>('');
  
  // State to track newly created sessions for immediate UI update
  const [newlyCreatedSessions, setNewlyCreatedSessions] = useState<ClassSession[]>([]);
  const sessionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const { data: beaconAssignments, isLoading: beaconAssignmentsLoading } = useBeaconAssignments();

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
      console.log('Current lecturer courses:', courses);
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

  // Temporary debug: Get ALL sessions to see if the created session exists
  const { data: debugAllSessions } = useQuery({
    queryKey: ['all-sessions-debug'],
    queryFn: async () => {
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
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      console.log('DEBUG: All recent sessions:', data);
      return data || [];
    },
  });

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (sessionData: SessionFormData) => {
      // Find beacon assignment for the selected course
      let beacon_id: string | undefined = undefined;
      
      // Use beacon_id from form if provided, otherwise auto-assign from course
      if (sessionData.beacon_id) {
        beacon_id = sessionData.beacon_id;
      } else if (beaconAssignments && sessionData.course_id) {
        const assignment = beaconAssignments.find(
          (a) => a.course_id === sessionData.course_id && !a.session_id // course-level assignment
        );
        if (assignment) {
          beacon_id = assignment.beacon_id;
        }
      }
      
      // Format the session data properly for the API
      const sessionDate = sessionData.session_date.split('T')[0];
      
      // Ensure start_time and end_time are in HH:MM:SS format
      const startTime = sessionData.start_time.length === 5 ? sessionData.start_time + ':00' : sessionData.start_time;
      const endTime = sessionData.end_time.length === 5 ? sessionData.end_time + ':00' : sessionData.end_time;
      
      // Set attendance window to start immediately when session starts and end when session ends
      const attendanceWindowStart = `${sessionDate} ${startTime}`;
      const attendanceWindowEnd = `${sessionDate} ${endTime}`;
      
      const formattedData = {
        course_id: sessionData.course_id,
        session_date: sessionDate,
        start_time: startTime, // Always HH:MM:SS format
        end_time: endTime, // Always HH:MM:SS format
        location: sessionData.location || null,
        attendance_window_start: attendanceWindowStart,
        attendance_window_end: attendanceWindowEnd,
        ...(beacon_id ? { beacon_id } : {})
      };
      
      console.log('Creating session with formatted data:', formattedData);
      return await sessionApi.createSession(formattedData);
    },
    onSuccess: (data) => {
      // Debug: Log the actual data returned from the API
      console.log('API returned session data:', data);
      console.log('Session data type:', typeof data);
      console.log('Session data keys:', Object.keys(data || {}));
      
      // Add the newly created session to state for immediate UI update
      setNewlyCreatedSessions(prev => [...prev, data]);
      
      // Force immediate refetch of sessions
      queryClient.invalidateQueries({ queryKey: ['lecturer-sessions'] });
      
      // Debug: Check current cache before update
      const currentCache = queryClient.getQueryData(['lecturer-sessions', user?.id]);
      console.log('Current cache before update:', currentCache);
      console.log('Current cache type:', typeof currentCache);
      console.log('Current cache length:', Array.isArray(currentCache) ? currentCache.length : 'not array');
      
      // Manually update the cache with the new session
      queryClient.setQueryData(['lecturer-sessions', user?.id], (oldData: any) => {
        console.log('Updating cache with oldData:', oldData);
        console.log('Adding new session:', data);
        
        if (oldData && Array.isArray(oldData)) {
          const newData = [...oldData, data];
          console.log('New cache data length:', newData.length);
          return newData;
        }
        console.log('Cache update failed - oldData not array or null');
        return oldData;
      });
      
      // Debug: Check cache after update
      const updatedCache = queryClient.getQueryData(['lecturer-sessions', user?.id]);
      console.log('Updated cache after manual update:', updatedCache);
      console.log('Updated cache length:', Array.isArray(updatedCache) ? updatedCache.length : 'not array');
      
      // Add a small delay and refetch again to ensure the session appears
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['lecturer-sessions'] });
        queryClient.refetchQueries({ queryKey: ['lecturer-sessions'] });
      }, 100);
      
      setShowCreateForm(false);
      setFormData({
        course_id: '',
        session_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        end_time: new Date(Date.now() + 90 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        location: '',
        attendance_window_start: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // Start immediately
        attendance_window_end: new Date(Date.now() + 90 * 60 * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) // End when session ends
      });
      setHighlightedSessionId(data?.id || null);
      
      // Debug: Log the created session
      console.log('Session created with ID:', data?.id);
      console.log('Total sessions after creation:', sessions?.length || 0);
      
      // Debug: Find the created session in the list
      const createdSession = sessions?.find(s => s.id === data?.id);
      console.log('Created session found in list:', createdSession);
      
      // Debug: Check if the session has the correct course_id
      console.log('Created session course_id:', data?.course_id);
      console.log('Lecturer course IDs:', courses?.map(c => c.id));
      console.log('Session course_id matches lecturer courses:', courses?.some(c => c.id === data?.course_id));
      
      toast({
        title: "✅ Session Created Successfully",
        description: "Your session is now active immediately! Students can check in right away.",
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
    const startTime = session.start_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${session.start_time}`) : null;
    const endTime = session.end_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${session.end_time}`) : null;
    if (!startTime || !endTime) return 'unknown';
    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'ongoing';
    return 'completed';
  };

  // Sort sessions by priority: current happening first, then upcoming, then completed
  const sortSessionsByPriority = (sessions: ClassSession[]) => {
    if (!sessions) return [];
    
    console.log('Sorting sessions, count:', sessions.length);
    
    return [...sessions].sort((a, b) => {
      const statusA = getSessionStatus(a);
      const statusB = getSessionStatus(b);
      
      // Debug: Log status for specific session
      if (a.id === 'a8807438-d729-43fc-8664-e6793e822cac' || b.id === 'a8807438-d729-43fc-8664-e6793e822cac') {
        console.log('Status comparison:', {
          sessionA: { id: a.id, status: statusA, start_time: a.start_time, end_time: a.end_time },
          sessionB: { id: b.id, status: statusB, start_time: b.start_time, end_time: b.end_time }
        });
      }
      
      // Debug: Log status for any session from today
      const today = dayjs().startOf('day');
      const sessionADate = dayjs.utc(a.session_date).local();
      const sessionBDate = dayjs.utc(b.session_date).local();
      
      if (sessionADate.isSame(today, 'day') || sessionBDate.isSame(today, 'day')) {
        console.log('TODAY SESSION STATUS COMPARISON:', {
          sessionA: { id: a.id, date: sessionADate.format('YYYY-MM-DD'), status: statusA, start_time: a.start_time, end_time: a.end_time },
          sessionB: { id: b.id, date: sessionBDate.format('YYYY-MM-DD'), status: statusB, start_time: b.start_time, end_time: b.end_time }
        });
      }
      
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

  // Scroll to highlighted session after sessions update
  useEffect(() => {
    if (highlightedSessionId && sessionRefs.current[highlightedSessionId]) {
      sessionRefs.current[highlightedSessionId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setHighlightedSessionId(null), 2000);
    }
  }, [sessions, highlightedSessionId]);

  // Filter and search logic
  const combinedSessions = [...(sessions || []), ...newlyCreatedSessions.filter(newSession => 
    !sessions?.some(existingSession => existingSession.id === newSession.id)
  )];
  
  // Debug: Log the newly created sessions being added
  console.log('Newly created sessions being added:', newlyCreatedSessions.map(s => ({ id: s.id, start_time: s.start_time, end_time: s.end_time })));
  console.log('Combined sessions count:', combinedSessions.length);
  
  const filteredSessions = sortSessionsByPriority(combinedSessions.filter(session => {
    const course = courses?.find(c => c.id === session.course_id);
    const matchesCourse = !sessionSearch || (course && (
      course.name.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      course.code.toLowerCase().includes(sessionSearch.toLowerCase())
    ));
    const matchesDate = !sessionDateFilter || session.session_date.startsWith(sessionDateFilter);
    
    // Debug: Check if this is the newly created session
    if (session.id === 'a8807438-d729-43fc-8664-e6793e822cac') {
      console.log('Found newly created session in filter:', {
        session,
        course,
        sessionSearch,
        sessionDateFilter,
        matchesCourse,
        matchesDate
      });
    }
    
    return matchesCourse && matchesDate;
  }));

  // Debug: Log the final filtered sessions
  console.log('Final filtered sessions count:', filteredSessions.length);
  console.log('First few filtered sessions:', filteredSessions.slice(0, 3).map(s => ({ id: s.id, start_time: s.start_time, end_time: s.end_time })));
  
  // Debug: Check if the newly created session is in the final list
  const newSessionInList = filteredSessions.find(s => s.id === 'a8807438-d729-43fc-8664-e6793e822cac');
  console.log('New session in final list:', newSessionInList ? 'YES' : 'NO', newSessionInList);

  // Helper to create an active session now
  const handleCreateActiveSessionNow = () => {
    if (!formData.course_id) return;
    
    const now = dayjs(); // Use local time for creation
    const start = now.subtract(30, 'minute'); // Start 30 minutes ago (active)
    const end = now.add(30, 'minute'); // End 30 minutes from now (active)
    const today = now.format('YYYY-MM-DD');
    const startTime = start.format('HH:mm:ss');
    const endTime = end.format('HH:mm:ss');
    
    // Send only time strings, let DB trigger add the date
    const activeAttendanceStart = start.format('HH:mm:ss');
    const activeAttendanceEnd = end.format('HH:mm:ss');
    
    const activeSessionData: SessionFormData = {
      course_id: formData.course_id,
      session_date: today,
      start_time: startTime,
      end_time: endTime,
      location: 'Active Session Room',
      attendance_window_start: activeAttendanceStart, // Just time string
      attendance_window_end: activeAttendanceEnd // Just time string
    };
    
    console.log('Creating active session now (local time):', activeSessionData);
    createSession.mutate(activeSessionData);
  };

  // Helper to check if a string is a time only
  const isTimeOnly = (str: string) => /^\d{2}:\d{2}(:\d{2})?$/.test(str);



  if (coursesLoading || sessionsLoading || beaconAssignmentsLoading) {
    return <PageLoading text="Loading sessions..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Session Manager</h2>
            <p className="text-gray-400">Create and manage your class sessions</p>
          </div>
          <div className="flex items-center">
                         <Button
               onClick={() => setShowCreateForm(true)}
               className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg mr-2"
             >
              <Plus className="w-5 h-5 mr-2" />
              Create Session
            </Button>
            <Button
              onClick={handleCreateActiveSessionNow}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-lg"
              disabled={!formData.course_id}
            >
              <Play className="w-5 h-5 mr-2" />
              Create Active Session Now
            </Button>
          </div>
        </div>

        {/* Create/Edit Form */}
        {(showCreateForm || editingSession) && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {editingSession ? 'Edit Session' : 'Create New Session'}
                </h3>
                {!editingSession && (
                  <p className="text-sm text-green-400 mt-1">
                    ⚡ Sessions start immediately when created - students can check in right away!
                  </p>
                )}
              </div>
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
                                         className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
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
                     className="bg-white/10 border-white/20 text-white rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                     required
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-3">Start Time</label>
                   <Input
                     type="time"
                     value={formData.start_time}
                     onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                     className="bg-white/10 border-white/20 text-white rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                     required
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-3">End Time</label>
                   <Input
                     type="time"
                     value={formData.end_time}
                     onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                     className="bg-white/10 border-white/20 text-white rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
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
                     className="bg-white/10 border-white/20 text-white rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-3">Attendance Window Start</label>
                   <Input
                     type="time"
                     value={formData.attendance_window_start}
                     onChange={(e) => setFormData({ ...formData, attendance_window_start: e.target.value })}
                     className="bg-white/10 border-white/20 text-white rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                     required
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-3">Attendance Window End</label>
                   <Input
                     type="time"
                     value={formData.attendance_window_end}
                     onChange={(e) => setFormData({ ...formData, attendance_window_end: e.target.value })}
                     className="bg-white/10 border-white/20 text-white rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                     required
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-3">Beacon (Optional)</label>
                   <select
                     value={formData.beacon_id || ''}
                     onChange={(e) => setFormData({ ...formData, beacon_id: e.target.value || undefined })}
                     className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                  >
                    <option value="">Auto-assign from course</option>
                    {beaconAssignments?.map((assignment) => (
                      <option key={`${assignment.beacon_id}-${assignment.course_id}`} value={assignment.beacon_id}>
                        {assignment.ble_beacons?.name || assignment.beacon_id} - {assignment.courses?.name}
                      </option>
                    ))}
                  </select>
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
                   className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg"
                 >
                  {createSession.isPending || updateSession.isPending ? 'Saving...' : (editingSession ? 'Update Session' : 'Create Session')}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Sessions List */}
        <div className="space-y-6">
          {/* Add search/filter bar above the sessions list */}
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-6">
            <div className="flex-1 mb-2 md:mb-0">
                             <Input
                 placeholder="Search by course name or code..."
                 value={sessionSearch}
                 onChange={e => setSessionSearch(e.target.value)}
                 className="bg-white/10 border-white/20 text-white rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
               />
            </div>
            <div className="flex space-x-2">
                             <Input
                 type="date"
                 value={sessionDateFilter}
                 onChange={e => setSessionDateFilter(e.target.value)}
                 className="bg-white/10 border-white/20 text-white rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
               />
              <Button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['lecturer-sessions'] });
                  queryClient.invalidateQueries({ queryKey: ['all-sessions-debug'] });
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl"
              >
                🔄 Refresh
              </Button>
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/20">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-6" />
              <h4 className="text-xl font-semibold text-white mb-2">No sessions found</h4>
              <p className="text-gray-400 mb-6">Try adjusting your search or filters.</p>
                             <Button
                 onClick={() => setShowCreateForm(true)}
                 className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
               >
                <Plus className="w-5 h-5 mr-2" />
                Create Session
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredSessions.map((session, index) => {
                const status = getSessionStatus(session);
                const course = courses?.find(c => c.id === session.course_id);
                
                return (
                  <div
                    key={`${session.id}-${index}`}
                    ref={el => (sessionRefs.current[session.id] = el)}
                    className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-200 shadow-lg ${highlightedSessionId === session.id ? 'ring-4 ring-purple-400' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                                          <div className="bg-[#001F3F]/20 p-3 rounded-xl">
                  <BookOpen className="w-6 h-6 text-[#001F3F]" />
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
        </div>
      </div>
    </div>
  );
}; 