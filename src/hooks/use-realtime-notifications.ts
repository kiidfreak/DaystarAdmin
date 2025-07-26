import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
}

export const useRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to attendance records changes
    const attendanceChannel = supabase
      .channel('attendance-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_records'
        },
        (payload) => {
          const newRecord = payload.new;
          const notification: Notification = {
            id: `attendance-${newRecord.id}`,
            type: 'success',
            title: 'Student Signed In',
            message: `A student has signed in for attendance`,
            timestamp: new Date(),
            data: newRecord
          };
          
          setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
          
          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.type,
          });
        }
      )
      .subscribe();

    // Subscribe to class sessions changes
    const sessionsChannel = supabase
      .channel('sessions-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'class_sessions'
        },
        (payload) => {
          const newSession = payload.new;
          const notification: Notification = {
            id: `session-${newSession.id}`,
            type: 'info',
            title: 'New Class Session',
            message: `A new class session has been created`,
            timestamp: new Date(),
            data: newSession
          };
          
          setNotifications(prev => [notification, ...prev.slice(0, 9)]);
          
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.type,
          });
        }
      )
      .subscribe();

    // Subscribe to beacon changes
    const beaconChannel = supabase
      .channel('beacon-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'beacons'
        },
        (payload) => {
          const updatedBeacon = payload.new;
          const oldBeacon = payload.old;
          
          if (updatedBeacon.is_active !== oldBeacon.is_active) {
            const notification: Notification = {
              id: `beacon-${updatedBeacon.id}`,
              type: updatedBeacon.is_active ? 'success' : 'warning',
              title: updatedBeacon.is_active ? 'Beacon Activated' : 'Beacon Deactivated',
              message: `Beacon ${updatedBeacon.name} has been ${updatedBeacon.is_active ? 'activated' : 'deactivated'}`,
              timestamp: new Date(),
              data: updatedBeacon
            };
            
            setNotifications(prev => [notification, ...prev.slice(0, 9)]);
            
            toast({
              title: notification.title,
              description: notification.message,
              variant: notification.type,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to user changes (for device verification)
    const userChannel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          const updatedUser = payload.new;
          const oldUser = payload.old;
          
          // Check if device_id changed (device verification)
          if (updatedUser.device_id !== oldUser.device_id) {
            const notification: Notification = {
              id: `device-${updatedUser.id}`,
              type: 'info',
              title: 'Device Verification',
              message: `Device verification completed for ${updatedUser.full_name}`,
              timestamp: new Date(),
              data: updatedUser
            };
            
            setNotifications(prev => [notification, ...prev.slice(0, 9)]);
            
            toast({
              title: notification.title,
              description: notification.message,
              variant: notification.type,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to course changes
    const courseChannel = supabase
      .channel('course-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'courses'
        },
        (payload) => {
          const newCourse = payload.new;
          const notification: Notification = {
            id: `course-${newCourse.id}`,
            type: 'info',
            title: 'New Course Created',
            message: `Course "${newCourse.name}" has been created`,
            timestamp: new Date(),
            data: newCourse
          };
          
          setNotifications(prev => [notification, ...prev.slice(0, 9)]);
          
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.type,
          });
        }
      )
      .subscribe();

    return () => {
      attendanceChannel.unsubscribe();
      sessionsChannel.unsubscribe();
      beaconChannel.unsubscribe();
      userChannel.unsubscribe();
      courseChannel.unsubscribe();
    };
  }, [toast]);

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    clearNotification,
    clearAllNotifications
  };
}; 