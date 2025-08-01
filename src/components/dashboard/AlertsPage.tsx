import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { 
  Bell, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Filter,
  Search,
  Clock,
  Users,
  BookOpen,
  TrendingDown,
  TrendingUp,
  Wifi,
  Bluetooth,
  Smartphone,
  Loader2,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Calendar,
  Zap,
  Shield,
  Activity,
  MapPin
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Alert {
  id: string;
  type: 'attendance' | 'system' | 'device' | 'course' | 'student' | 'performance' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  course?: string;
  studentCount?: number;
  isRead: boolean;
  actionRequired: boolean;
  metadata?: {
    attendanceRate?: number;
    previousRate?: number;
    studentNames?: string[];
    deviceId?: string;
    location?: string;
  };
}

export const AlertsPage: React.FC = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'critical' | 'attendance' | 'system'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRead, setShowRead] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set());

  // Fetch comprehensive alerts for the lecturer
  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['lecturer-alerts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const alerts: Alert[] = [];

      try {
        // Get lecturer's courses
        const { data: courses } = await supabase
          .from('courses')
          .select('id, course_name, lecturer_id')
          .eq('lecturer_id', user.id);

        if (!courses || courses.length === 0) {
          // No courses alert
          alerts.push({
            id: 'no-courses',
            type: 'course',
            severity: 'medium',
            title: 'No Courses Assigned',
            message: 'You don\'t have any courses assigned yet. Contact your administrator.',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionRequired: true
          });
          return alerts;
        }

        const courseIds = courses.map(c => c.id);

        // Fetch recent attendance data (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: attendanceData } = await supabase
          .from('attendance_records')
          .select(`
            *,
            courses!inner(course_name, id),
            users!inner(full_name, email)
          `)
          .in('course_id', courseIds)
          .gte('check_in_time', thirtyDaysAgo.toISOString())
          .order('check_in_time', { ascending: false });

        if (attendanceData && attendanceData.length > 0) {
          // Calculate attendance trends per course
          const courseStats = new Map<string, {
            total: number;
            present: number;
            recentTotal: number;
            recentPresent: number;
            students: Set<string>;
            recentStudents: Set<string>;
          }>();

          // Separate recent data (last 7 days) from older data
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          attendanceData.forEach(record => {
            const courseName = record.courses?.course_name || 'Unknown';
            const studentId = record.users?.full_name || 'Unknown';
            const isRecent = new Date(record.check_in_time) >= sevenDaysAgo;
            
            if (!courseStats.has(courseName)) {
              courseStats.set(courseName, {
                total: 0,
                present: 0,
                recentTotal: 0,
                recentPresent: 0,
                students: new Set(),
                recentStudents: new Set()
              });
            }

            const stats = courseStats.get(courseName)!;
            stats.total++;
            stats.students.add(studentId);

            if (record.status === 'verified' || record.status === 'present') {
              stats.present++;
            }

            if (isRecent) {
              stats.recentTotal++;
              stats.recentStudents.add(studentId);
              if (record.status === 'verified' || record.status === 'present') {
                stats.recentPresent++;
              }
            }
          });

          // Generate intelligent alerts based on patterns
          courseStats.forEach((stats, courseName) => {
            const overallRate = (stats.present / stats.total) * 100;
            const recentRate = stats.recentTotal > 0 ? (stats.recentPresent / stats.recentTotal) * 100 : 0;
            const studentCount = stats.students.size;

            // Low attendance alert
            if (overallRate < 75) {
              alerts.push({
                id: `attendance-${courseName}`,
                type: 'attendance',
                severity: overallRate < 50 ? 'critical' : overallRate < 60 ? 'high' : 'medium',
                title: 'Low Attendance Alert',
                message: `${courseName} has ${overallRate.toFixed(1)}% overall attendance rate`,
                timestamp: new Date().toISOString(),
                course: courseName,
                studentCount,
                isRead: false,
                actionRequired: true,
                metadata: {
                  attendanceRate: overallRate,
                  previousRate: recentRate
                }
              });
            }

            // Declining attendance trend
            if (recentRate > 0 && overallRate > 0 && (overallRate - recentRate) > 15) {
              alerts.push({
                id: `trend-${courseName}`,
                type: 'attendance',
                severity: 'high',
                title: 'Declining Attendance Trend',
                message: `${courseName} attendance has dropped from ${overallRate.toFixed(1)}% to ${recentRate.toFixed(1)}%`,
                timestamp: new Date().toISOString(),
                course: courseName,
                studentCount,
                isRead: false,
                actionRequired: true,
                metadata: {
                  attendanceRate: recentRate,
                  previousRate: overallRate
                }
              });
            }

            // High absenteeism
            if (studentCount > 10 && (stats.total / studentCount) < 0.5) {
              alerts.push({
                id: `absenteeism-${courseName}`,
                type: 'student',
                severity: 'medium',
                title: 'High Student Absenteeism',
                message: `${courseName} has high absenteeism - many students missing multiple classes`,
                timestamp: new Date().toISOString(),
                course: courseName,
                studentCount,
                isRead: false,
                actionRequired: true
              });
            }
          });

          // Check for individual student issues
          const studentAttendance = new Map<string, { present: number; total: number; course: string }>();
          
          attendanceData.forEach(record => {
            const studentId = record.users?.full_name || 'Unknown';
            const courseName = record.courses?.course_name || 'Unknown';
            const key = `${studentId}-${courseName}`;
            
            if (!studentAttendance.has(key)) {
              studentAttendance.set(key, { present: 0, total: 0, course: courseName });
            }
            
            const student = studentAttendance.get(key)!;
            student.total++;
            if (record.status === 'verified' || record.status === 'present') {
              student.present++;
            }
          });

          // Alert for students with very poor attendance
          studentAttendance.forEach((stats, key) => {
            const [studentName, courseName] = key.split('-');
            const rate = (stats.present / stats.total) * 100;
            
            if (stats.total >= 5 && rate < 50) {
              alerts.push({
                id: `student-${key}`,
                type: 'student',
                severity: 'high',
                title: 'Student Attendance Concern',
                message: `${studentName} has only ${rate.toFixed(1)}% attendance in ${courseName}`,
                timestamp: new Date().toISOString(),
                course: courseName,
                isRead: false,
                actionRequired: true,
                metadata: {
                  attendanceRate: rate,
                  studentNames: [studentName]
                }
              });
            }
          });
        } else {
          // No attendance data alert
          alerts.push({
            id: 'no-attendance-data',
            type: 'attendance',
            severity: 'medium',
            title: 'No Recent Attendance Data',
            message: 'No attendance records found for your courses in the last 30 days',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionRequired: false
          });
        }

        // System alerts based on time and patterns
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();

        // Morning alert for early classes
        if (hour >= 7 && hour <= 9) {
          alerts.push({
            id: 'morning-classes',
            type: 'system',
            severity: 'low',
            title: 'Morning Classes Active',
            message: 'Early morning classes are in session. Check attendance for morning courses.',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionRequired: false
          });
        }

        // Weekend alert
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          alerts.push({
            id: 'weekend',
            type: 'system',
            severity: 'low',
            title: 'Weekend Mode',
            message: 'It\'s the weekend. Attendance tracking is typically lower on weekends.',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionRequired: false
          });
        }

        // Device connectivity alerts (simulated)
        const { data: deviceData } = await supabase
          .from('beacons')
          .select('*')
          .eq('status', 'offline');

        if (deviceData && deviceData.length > 0) {
          alerts.push({
            id: 'device-offline',
            type: 'device',
            severity: 'high',
            title: 'BLE Beacon Offline',
            message: `${deviceData.length} BLE beacon(s) are currently offline`,
            timestamp: new Date().toISOString(),
            isRead: false,
            actionRequired: true,
            metadata: {
              deviceId: deviceData[0]?.id,
              location: deviceData[0]?.location
            }
          });
        }

        // Performance alerts
        if (attendanceData && attendanceData.length > 100) {
          const avgProcessingTime = 2.5; // Simulated
          if (avgProcessingTime > 3) {
            alerts.push({
              id: 'performance-slow',
              type: 'system',
              severity: 'medium',
              title: 'System Performance Notice',
              message: 'Attendance processing is running slower than usual',
              timestamp: new Date().toISOString(),
              isRead: false,
              actionRequired: false
            });
          }
        }

        // Security alerts (simulated)
        const suspiciousLogins = Math.random() > 0.8; // 20% chance
        if (suspiciousLogins) {
          alerts.push({
            id: 'security-alert',
            type: 'security',
            severity: 'high',
            title: 'Suspicious Login Activity',
            message: 'Multiple failed login attempts detected from unknown location',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionRequired: true
          });
        }

        // Maintenance alerts
        const maintenanceScheduled = Math.random() > 0.9; // 10% chance
        if (maintenanceScheduled) {
          alerts.push({
            id: 'maintenance-scheduled',
            type: 'system',
            severity: 'low',
            title: 'Scheduled Maintenance',
            message: 'System maintenance scheduled for tonight at 2:00 AM',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionRequired: false
          });
        }

      } catch (error) {
        console.error('Error generating alerts:', error);
        alerts.push({
          id: 'system-error',
          type: 'system',
          severity: 'critical',
          title: 'System Error',
          message: 'Unable to fetch attendance data. Please check your connection.',
          timestamp: new Date().toISOString(),
          isRead: false,
          actionRequired: true
        });
      }

      return alerts;
    },
    enabled: !!user?.id,
    refetchInterval: 300000, // Refetch every 5 minutes
    refetchIntervalInBackground: true
  });

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const getSeverityIcon = (severity: string) => {
    const icons = {
      low: <Info className="w-5 h-5 text-blue-600" />,
      medium: <AlertCircle className="w-5 h-5 text-yellow-600" />,
      high: <AlertCircle className="w-5 h-5 text-orange-600" />,
      critical: <XCircle className="w-5 h-5 text-red-600" />
    };
    return icons[severity as keyof typeof icons] || icons.low;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      attendance: <Users className="w-4 h-4" />,
      system: <Settings className="w-4 h-4" />,
      device: <Bluetooth className="w-4 h-4" />,
      course: <BookOpen className="w-4 h-4" />,
      student: <Users className="w-4 h-4" />,
      performance: <Activity className="w-4 h-4" />,
      security: <Shield className="w-4 h-4" />
    };
    return icons[type as keyof typeof icons] || <Bell className="w-4 h-4" />;
  };

  const filteredAlerts = (alerts || []).filter(alert => {
    // Skip dismissed alerts
    if (dismissedAlerts.has(alert.id)) {
      return false;
    }
    
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'unread' && !alert.isRead && !readAlerts.has(alert.id)) ||
                         (selectedFilter === 'critical' && alert.severity === 'critical') ||
                         (selectedFilter === 'attendance' && alert.type === 'attendance') ||
                         (selectedFilter === 'system' && alert.type === 'system');
    
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRead = showRead || (!alert.isRead && !readAlerts.has(alert.id));
    
    return matchesFilter && matchesSearch && matchesRead;
  });

  const unreadCount = (alerts || []).filter(alert => !alert.isRead && !readAlerts.has(alert.id) && !dismissedAlerts.has(alert.id)).length;
  const criticalCount = (alerts || []).filter(alert => alert.severity === 'critical' && !dismissedAlerts.has(alert.id)).length;
  const attendanceAlerts = (alerts || []).filter(alert => alert.type === 'attendance' && !dismissedAlerts.has(alert.id)).length;

  const handleMarkAsRead = (alertId: string) => {
    // Add to read alerts set
    setReadAlerts(prev => new Set([...prev, alertId]));
    
    toast({
      title: "✅ Alert Marked as Read",
      description: "The alert has been marked as read",
    });
  };

  const handleDismissAlert = (alertId: string) => {
    // Add to dismissed alerts set
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    
    toast({
      title: "🗑️ Alert Dismissed",
      description: "The alert has been dismissed and will be hidden",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="professional-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Alerts & Notifications</h2>
            <p className="text-gray-600 text-lg">
              Real-time alerts based on your attendance data and system events
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => setShowRead(!showRead)}
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {showRead ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showRead ? 'Hide Read' : 'Show All'}
            </Button>
          </div>
        </div>

        {/* Alert Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-900">{alerts?.length || 0}</div>
                <div className="text-sm text-blue-600">Total Alerts</div>
              </div>
              <Bell className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-900">{criticalCount}</div>
                <div className="text-sm text-red-600">Critical Alerts</div>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-900">{unreadCount}</div>
                <div className="text-sm text-yellow-600">Unread Alerts</div>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-900">{attendanceAlerts}</div>
                <div className="text-sm text-green-600">Attendance Alerts</div>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="professional-card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Alerts</option>
              <option value="unread">Unread Only</option>
              <option value="critical">Critical Only</option>
              <option value="attendance">Attendance Alerts</option>
              <option value="system">System Alerts</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <Search className="w-5 h-5 text-gray-600" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`professional-card p-6 border-l-4 ${
                alert.severity === 'critical' ? 'border-l-red-500' :
                alert.severity === 'high' ? 'border-l-orange-500' :
                alert.severity === 'medium' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              } ${!alert.isRead ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{alert.title}</h3>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      {alert.actionRequired && (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                          Action Required
                        </Badge>
                      )}
                                             {!alert.isRead && !readAlerts.has(alert.id) && (
                         <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                       )}
                    </div>
                    <p className="text-gray-600 mb-3">{alert.message}</p>
                    
                    {/* Enhanced metadata display */}
                    {alert.metadata && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        {alert.metadata.attendanceRate !== undefined && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                            <TrendingDown className="w-4 h-4" />
                            <span>Current Rate: {alert.metadata.attendanceRate.toFixed(1)}%</span>
                            {alert.metadata.previousRate && (
                              <>
                                <span>•</span>
                                <span>Previous: {alert.metadata.previousRate.toFixed(1)}%</span>
                              </>
                            )}
                          </div>
                        )}
                        {alert.metadata.studentNames && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>Students: {alert.metadata.studentNames.join(', ')}</span>
                          </div>
                        )}
                        {alert.metadata.location && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>Location: {alert.metadata.location}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                      {alert.course && (
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{alert.course}</span>
                        </div>
                      )}
                      {alert.studentCount && (
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{alert.studentCount} students</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                                 <div className="flex items-center space-x-2">
                   {!alert.isRead && !readAlerts.has(alert.id) && (
                     <Button
                       onClick={() => handleMarkAsRead(alert.id)}
                       variant="outline"
                       size="sm"
                       className="border-green-200 text-green-700 hover:bg-green-50"
                     >
                       <CheckCircle className="w-4 h-4 mr-1" />
                       Mark Read
                     </Button>
                   )}
                   <Button
                     onClick={() => handleDismissAlert(alert.id)}
                     variant="outline"
                     size="sm"
                     className="border-gray-200 text-gray-700 hover:bg-gray-50"
                   >
                     <XCircle className="w-4 h-4 mr-1" />
                     Dismiss
                   </Button>
                 </div>
              </div>
            </div>
          ))
        ) : (
          <div className="professional-card p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Alerts</h3>
            <p className="text-gray-600">
              {searchTerm ? 'No alerts match your search criteria' : 'You\'re all caught up! No new alerts.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 