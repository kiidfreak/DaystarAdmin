
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, Check, Clock, AlertCircle, Users, BookOpen, AlertTriangle } from 'lucide-react';
import { Student } from '@/types/student';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface NotificationBellProps {
  students: Student[];
  onApprove?: (studentId: string) => void;
  onReject?: (studentId: string) => void;
  userRole?: string;
}

// Function to check for attendance errors and issues
const checkAttendanceErrors = async (attendanceRecords: any[], sessions: any[]) => {
  const errors = [];
  const now = new Date();

  // Check for duplicate attendance records
  const studentAttendanceCounts = attendanceRecords.reduce((acc, record) => {
    const key = `${record.student_id}-${record.session_id}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const duplicates = Object.entries(studentAttendanceCounts)
    .filter(([_, count]) => (count as number) > 1)
    .map(([key, count]) => {
      const [studentId, sessionId] = key.split('-');
      return { studentId, sessionId, count };
    });

  if (duplicates.length > 0) {
    errors.push({
      id: 'duplicate-attendance',
      type: 'error',
      title: 'Duplicate Attendance Records',
      message: `${duplicates.length} duplicate attendance record${duplicates.length === 1 ? '' : 's'} detected`,
      icon: AlertTriangle,
      timestamp: new Date()
    });
  }

  // Check for attendance outside session times
  const invalidTimeRecords = attendanceRecords.filter(record => {
    const session = sessions.find(s => s.id === record.session_id);
    if (!session || !record.check_in_time) return false;

    const sessionDate = new Date(session.session_date);
    const startTime = session.start_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${session.start_time}`) : null;
    const endTime = session.end_time ? new Date(`${sessionDate.toISOString().split('T')[0]}T${session.end_time}`) : null;
    const checkInTime = new Date(record.check_in_time);

    if (!startTime || !endTime) return false;

    // Allow 15 minutes before session starts and 15 minutes after session ends
    const earlyStart = new Date(startTime.getTime() - 15 * 60 * 1000);
    const lateEnd = new Date(endTime.getTime() + 15 * 60 * 1000);

    return checkInTime < earlyStart || checkInTime > lateEnd;
  });

  if (invalidTimeRecords.length > 0) {
    errors.push({
      id: 'invalid-time-attendance',
      type: 'error',
      title: 'Invalid Attendance Times',
      message: `${invalidTimeRecords.length} attendance record${invalidTimeRecords.length === 1 ? '' : 's'} outside session times`,
      icon: AlertTriangle,
      timestamp: new Date()
    });
  }

  // Check for missing session data
  const attendanceWithoutSession = attendanceRecords.filter(record => 
    !sessions.find(s => s.id === record.session_id)
  );

  if (attendanceWithoutSession.length > 0) {
    errors.push({
      id: 'missing-session-data',
      type: 'error',
      title: 'Missing Session Data',
      message: `${attendanceWithoutSession.length} attendance record${attendanceWithoutSession.length === 1 ? '' : 's'} with missing session data`,
      icon: AlertTriangle,
      timestamp: new Date()
    });
  }

  // Check for BLE beacon issues (if attendance method is BLE but no beacon data)
  const bleRecordsWithoutBeacon = attendanceRecords.filter(record => 
    record.method === 'BLE' && (!record.beacon_id && !record.beacon_mac_address)
  );

  if (bleRecordsWithoutBeacon.length > 0) {
    errors.push({
      id: 'ble-beacon-issues',
      type: 'error',
      title: 'BLE Beacon Issues',
      message: `${bleRecordsWithoutBeacon.length} BLE attendance record${bleRecordsWithoutBeacon.length === 1 ? '' : 's'} without beacon data`,
      icon: AlertTriangle,
      timestamp: new Date()
    });
  }

  // Check for QR code issues (if attendance method is QR but no QR data)
  const qrRecordsWithoutData = attendanceRecords.filter(record => 
    record.method === 'QR' && (!record.qr_code && !record.qr_session_id)
  );

  if (qrRecordsWithoutData.length > 0) {
    errors.push({
      id: 'qr-code-issues',
      type: 'error',
      title: 'QR Code Issues',
      message: `${qrRecordsWithoutData.length} QR attendance record${qrRecordsWithoutData.length === 1 ? '' : 's'} without QR data`,
      icon: AlertTriangle,
      timestamp: new Date()
    });
  }

  // Check for high error rate in attendance
  const totalRecords = attendanceRecords.length;
  const errorRecords = duplicates.length + invalidTimeRecords.length + attendanceWithoutSession.length;
  const errorRate = totalRecords > 0 ? (errorRecords / totalRecords) * 100 : 0;

  if (errorRate > 10) { // Alert if error rate is above 10%
    errors.push({
      id: 'high-error-rate',
      type: 'error',
      title: 'High Error Rate',
      message: `Attendance error rate is ${errorRate.toFixed(1)}% (${errorRecords}/${totalRecords} records)`,
      icon: AlertTriangle,
      timestamp: new Date()
    });
  }

  return errors;
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  students,
  onApprove,
  onReject,
  userRole
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const pendingStudents = students.filter(student => student.status === 'pending');
  const pendingCount = pendingStudents.length;

  // Get real-time alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', 'realtime'],
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

      const alerts = [];

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
          icon: BookOpen,
          timestamp: new Date()
        });
      }

      // Check for low attendance
      const totalAttendance = todayAttendance?.length || 0;
      const presentAttendance = todayAttendance?.filter(a => a.status === 'verified').length || 0;
      const attendanceRate = totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 0;

      if (attendanceRate < 70 && totalAttendance > 0) {
        alerts.push({
          id: 'low-attendance',
          type: 'warning',
          title: 'Low Attendance Alert',
          message: `Today's attendance rate is ${attendanceRate.toFixed(1)}%`,
          icon: AlertCircle,
          timestamp: new Date()
        });
      }

      // Check for pending approvals (only for lecturers)
      if (userRole === 'lecturer' && pendingCount > 0) {
        alerts.push({
          id: 'pending-approvals',
          type: 'pending',
          title: 'Pending Approvals',
          message: `${pendingCount} student${pendingCount === 1 ? '' : 's'} waiting for approval`,
          icon: Users,
          timestamp: new Date()
        });
      }

      // Check for attendance errors and issues
      const errorAlerts = await checkAttendanceErrors(todayAttendance, todaySessions);
      alerts.push(...errorAlerts);

      return alerts;
    },
    refetchInterval: 10000, // Refresh every 10 seconds for real-time alerts
  });

  const totalAlerts = (alerts?.length || 0) + pendingCount;

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        className="glass-button p-3 relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5 text-sky-blue" />
        {totalAlerts > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">{totalAlerts}</span>
          </div>
        )}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[99999]" onClick={() => setIsOpen(false)}>
          <div 
            className="absolute right-8 top-20 w-80 bg-gray-900/98 backdrop-blur-sm border border-white/20 rounded-xl shadow-2xl z-[99999]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Alerts</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {totalAlerts > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  {totalAlerts} alert{totalAlerts === 1 ? '' : 's'} requiring attention
                </p>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {totalAlerts === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No alerts</p>
                </div>
              ) : (
                <div className="p-2">
                  {/* System Alerts */}
                  {alerts?.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          alert.type === 'warning' ? 'bg-yellow-500/20' :
                          alert.type === 'info' ? 'bg-blue-500/20' :
                          alert.type === 'error' ? 'bg-red-500/20' :
                          'bg-orange-500/20'
                        }`}>
                          <alert.icon className={`w-4 h-4 ${
                            alert.type === 'warning' ? 'text-yellow-400' :
                            alert.type === 'info' ? 'text-blue-400' :
                            alert.type === 'error' ? 'text-red-400' :
                            'text-orange-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-white text-sm">
                              {alert.title}
                            </p>
                            <Badge className={`border rounded text-xs ${
                              alert.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              alert.type === 'info' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                              alert.type === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                              'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            }`}>
                              {alert.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mb-1">{alert.message}</p>
                          <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{alert.timestamp.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pending Approvals (only for lecturers) */}
                  {userRole === 'lecturer' && pendingStudents.map((student) => (
                    <div
                      key={student.id}
                      className="p-3 rounded-lg hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-white text-sm truncate">
                              {student.name}
                            </p>
                            <Badge className="status-warning border rounded text-xs">
                              {student.method}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mb-1">ID: {student.studentId}</p>
                          <div className="flex items-center space-x-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{student.checkInTime || 'Just now'}</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-1 ml-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              onApprove?.(student.id);
                              if (pendingStudents.length === 1) {
                                setIsOpen(false);
                              }
                            }}
                            className="h-7 w-7 p-0 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              onReject?.(student.id);
                              if (pendingStudents.length === 1) {
                                setIsOpen(false);
                              }
                            }}
                            className="h-7 w-7 p-0 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
