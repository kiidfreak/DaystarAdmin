import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, User, Clock, MapPin, CheckCircle, XCircle, AlertCircle, LogIn, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeAttendance } from '@/hooks/use-realtime-attendance';
import { PageLoading } from '@/components/ui/LoadingSpinner';

interface LecturerSession {
  id: string;
  lecturer_id: string;
  lecturer_name: string;
  lecturer_email: string;
  course_code: string;
  course_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  sign_in_time?: string;
  sign_out_time?: string;
  location?: string;
}

interface LecturerPresenceProps {
  userRole?: string;
  userId?: string;
}

export const LecturerPresence: React.FC<LecturerPresenceProps> = ({ userRole, userId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'active' | 'ended'>('all');
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LecturerSession | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useRealtimeAttendance();

  // Get lecturer sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['lecturer-sessions', userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('class_sessions')
        .select(`
          *,
          courses:course_code(name),
          users:lecturer_id(full_name, email)
        `)
        .eq('session_date', today);

      if (userRole === 'lecturer' && userId) {
        query = query.eq('lecturer_id', userId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []).map(session => ({
        id: session.id,
        lecturer_id: session.lecturer_id,
        lecturer_name: session.users?.full_name || 'Unknown',
        lecturer_email: session.users?.email || 'Unknown',
        course_code: session.course_code,
        course_name: session.courses?.name || 'Unknown',
        session_date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time,
        status: session.status || 'scheduled',
        sign_in_time: session.sign_in_time,
        sign_out_time: session.sign_out_time,
        location: session.location
      }));
    },
    enabled: !!userId || userRole === 'admin',
  });

  // Sign in mutation
  const signInMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('class_sessions')
        .update({ 
          status: 'active',
          sign_in_time: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lecturer-sessions'] });
      toast({
        title: "Signed In Successfully",
        description: "You have been marked as present for this session",
      });
    },
    onError: () => {
      toast({
        title: "Sign In Failed",
        description: "Failed to sign in for this session",
        variant: "destructive",
      });
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('class_sessions')
        .update({ 
          status: 'ended',
          sign_out_time: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lecturer-sessions'] });
      toast({
        title: "Signed Out Successfully",
        description: "Session has been marked as ended",
      });
    },
    onError: () => {
      toast({
        title: "Sign Out Failed",
        description: "Failed to sign out from this session",
        variant: "destructive",
      });
    },
  });

  const filteredSessions = sessions?.filter(session => {
    const matchesSearch = searchTerm === '' || 
      session.lecturer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.course_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleSignIn = async (sessionId: string) => {
    await signInMutation.mutateAsync(sessionId);
  };

  const handleSignOut = async (sessionId: string) => {
    await signOutMutation.mutateAsync(sessionId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Scheduled</Badge>;
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">🟢 Active</Badge>;
      case 'ended':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Ended</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getLecturerStatus = (session: LecturerSession) => {
    if (session.status === 'active') {
      return (
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm">Lecturer Present ✅</span>
        </div>
      );
    } else if (session.status === 'ended') {
      return (
        <div className="flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-sm">Session Ended</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 text-sm">Lecturer Not Signed In ❌</span>
        </div>
      );
    }
  };

  if (isLoading) {
    return <PageLoading text="Loading lecturer presence..." />;
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="w-5 h-5 text-blue-400" />
            Lecturer Presence Tracking
            {isConnected && (
              <div className="flex items-center space-x-2 ml-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">Live</span>
              </div>
            )}
          </CardTitle>
          <p className="text-gray-300">
            Track lecturer attendance and manage session status
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by lecturer or course..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Status</label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all" className="text-white hover:bg-gray-700">All Status</SelectItem>
                  <SelectItem value="scheduled" className="text-white hover:bg-gray-700">Scheduled</SelectItem>
                  <SelectItem value="active" className="text-white hover:bg-gray-700">Active</SelectItem>
                  <SelectItem value="ended" className="text-white hover:bg-gray-700">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Actions</label>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-white">Total Sessions</span>
                </div>
                <p className="text-2xl font-bold text-white">{sessions?.length || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/20 hover:bg-green-500/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-white">Active Sessions</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {sessions?.filter(s => s.status === 'active').length || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-white">Scheduled</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {sessions?.filter(s => s.status === 'scheduled').length || 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-white">Ended Sessions</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  {sessions?.filter(s => s.status === 'ended').length || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sessions Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Today's Sessions</h3>
              <Badge variant="outline" className="text-sm bg-white/10 text-white border-white/20">
                {filteredSessions.length} sessions
              </Badge>
            </div>
            
            <div className="border border-gray-700 rounded-lg overflow-hidden bg-white/5">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-800/50">
                    <TableHead className="text-white font-medium">Lecturer</TableHead>
                    <TableHead className="text-white font-medium">Course</TableHead>
                    <TableHead className="text-white font-medium">Time</TableHead>
                    <TableHead className="text-white font-medium">Status</TableHead>
                    <TableHead className="text-white font-medium">Presence</TableHead>
                    <TableHead className="text-white font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id} className="hover:bg-blue-50 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{session.lecturer_name}</p>
                          <p className="text-sm text-gray-300">{session.lecturer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{session.course_name}</p>
                          <p className="text-sm text-gray-300">{session.course_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-white">
                            {session.start_time} - {session.end_time}
                          </p>
                          {session.sign_in_time && (
                            <p className="text-green-400">
                              In: {new Date(session.sign_in_time).toLocaleTimeString()}
                            </p>
                          )}
                          {session.sign_out_time && (
                            <p className="text-red-400">
                              Out: {new Date(session.sign_out_time).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(session.status)}
                      </TableCell>
                      <TableCell>
                        {getLecturerStatus(session)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {session.status === 'scheduled' && (
                            <Button
                              size="sm"
                              onClick={() => handleSignIn(session.id)}
                              disabled={signInMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700"
                            >
                              <LogIn className="w-4 h-4 mr-1" />
                              Sign In
                            </Button>
                          )}
                          {session.status === 'active' && (
                            <Button
                              size="sm"
                              onClick={() => handleSignOut(session.id)}
                              disabled={signOutMutation.isPending}
                              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                            >
                              <LogOut className="w-4 h-4 mr-1" />
                              Sign Out
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 