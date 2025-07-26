
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, Check, Clock, AlertCircle, Users, BookOpen, AlertTriangle } from 'lucide-react';
import { Student } from '@/types/student';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRealtimeNotifications, Notification } from '@/hooks/use-realtime-notifications';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface NotificationBellProps {
  students: Student[];
  onApprove?: (studentId: string) => void;
  onReject?: (studentId: string) => void;
  userRole?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  students,
  onApprove,
  onReject,
  userRole
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, clearNotification, clearAllNotifications } = useRealtimeNotifications();
  
  const pendingStudents = students.filter(student => student.status === 'pending');
  const pendingCount = pendingStudents.length;

  // Get additional system alerts
  const { data: systemAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's sessions
      const { data: todaySessions, error: sessionsError } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('session_date', today);
      
      if (sessionsError) throw sessionsError;

      // Get today's attendance records
      const { data: todayAttendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', today);
      
      if (attendanceError) throw attendanceError;

      const alerts: Notification[] = [];

      // Check for ongoing sessions
      const now = new Date();
      const ongoingSessions = todaySessions?.filter(session => {
        const sessionDate = new Date(session.session_date);
        const startTime = session.start_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${session.start_time}`) : null;
        const endTime = session.end_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${session.end_time}`) : null;
        
        return startTime && endTime && now >= startTime && now <= endTime;
      }) || [];

      if (ongoingSessions.length > 0) {
        alerts.push({
          id: 'ongoing-sessions',
          type: 'info',
          title: 'Live Classes',
          message: `${ongoingSessions.length} class${ongoingSessions.length === 1 ? ' is' : 'es are'} currently in session`,
          timestamp: new Date()
        });
      }

      // Check for low attendance sessions
      const sessionsWithLowAttendance = todaySessions?.filter(session => {
        const sessionAttendance = todayAttendance?.filter(record => record.session_id === session.id) || [];
        const attendanceRate = sessionAttendance.length > 0 ? 
          (sessionAttendance.filter(r => r.status === 'verified').length / sessionAttendance.length) * 100 : 0;
        return attendanceRate < 50; // Alert if attendance rate is below 50%
      }) || [];

      if (sessionsWithLowAttendance.length > 0) {
        alerts.push({
          id: 'low-attendance',
          type: 'warning',
          title: 'Low Attendance Alert',
          message: `${sessionsWithLowAttendance.length} session${sessionsWithLowAttendance.length === 1 ? '' : 's'} with low attendance`,
          timestamp: new Date()
        });
      }

      // Check for beacon issues
      const { data: beacons, error: beaconError } = await supabase
        .from('beacons')
        .select('*')
        .eq('is_active', true);

      if (!beaconError && beacons) {
        const inactiveBeacons = beacons.filter(beacon => !beacon.is_active);
        if (inactiveBeacons.length > 0) {
          alerts.push({
            id: 'inactive-beacons',
            type: 'error',
            title: 'Inactive Beacons',
            message: `${inactiveBeacons.length} beacon${inactiveBeacons.length === 1 ? ' is' : 's are'} currently inactive`,
            timestamp: new Date()
          });
        }
      }

      return alerts;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Combine real-time notifications with system alerts
  const allNotifications = [
    ...notifications,
    ...(systemAlerts || [])
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const totalAlerts = allNotifications.length + pendingCount;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'info':
        return <BookOpen className="w-4 h-4 text-[#001F3F]" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'info':
        return 'bg-[#001F3F]/20 text-[#001F3F] border-[#001F3F]/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-7 h-7 text-[#001F3F] drop-shadow-lg" />
        {totalAlerts > 0 && (
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center glow-badge">
            <span className="text-xs font-bold text-white">{totalAlerts}</span>
          </div>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#001F3F]">Notifications</h3>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {allNotifications.length === 0 && pendingCount === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No notifications</p>
              </div>
            ) : (
              <>
                {/* Real-time Notifications */}
                {allNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearNotification(notification.id)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Pending Student Approvals */}
                {pendingCount > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <h4 className="text-sm font-medium text-[#001F3F] mb-2">
                      Pending Approvals ({pendingCount})
                    </h4>
                    {pendingStudents.slice(0, 3).map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg mb-2"
                      >
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm text-gray-700">{student.name}</span>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onApprove?.(student.id)}
                            className="text-xs text-green-600 hover:text-green-700"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onReject?.(student.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingCount > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{pendingCount - 3} more pending approvals
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
