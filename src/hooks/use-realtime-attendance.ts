import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';

export const useRealtimeAttendance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    // Listen for browser online/offline events
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to real-time attendance updates
    const attendanceSubscription = supabase
      .channel('attendance_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records'
        },
        (payload) => {
          console.log('Real-time attendance update:', payload);
          // Invalidate and refetch attendance queries
          queryClient.invalidateQueries({ queryKey: ['attendance'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          // Show toast notification for new attendance
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Attendance Record",
              description: "A student has just checked in",
            });
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
        console.log('Real-time subscription status:', status);
      });

    // Subscribe to session updates
    const sessionSubscription = supabase
      .channel('session_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_sessions'
        },
        (payload) => {
          console.log('Real-time session update:', payload);
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
      )
      .subscribe();

    // Subscribe to beacon updates
    const beaconSubscription = supabase
      .channel('beacon_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'beacons'
        },
        (payload) => {
          console.log('Real-time beacon update:', payload);
          queryClient.invalidateQueries({ queryKey: ['beacons'] });
        }
      )
      .subscribe();

    // Subscribe to user updates
    const userSubscription = supabase
      .channel('user_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          console.log('Real-time user update:', payload);
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: ['students'] });
          queryClient.invalidateQueries({ queryKey: ['lecturers'] });
        }
      )
      .subscribe();

    return () => {
      // Cleanup subscriptions
      attendanceSubscription.unsubscribe();
      sessionSubscription.unsubscribe();
      beaconSubscription.unsubscribe();
      userSubscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient, toast]);

  // isConnected is true if browser is online
  const isConnected = isBrowserOnline;
  return { isConnected };
}; 