import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, attendanceApi, coursesApi, sessionsApi, dashboardApi, sessionApi, beaconApi } from '@/lib/api';
import { useToast } from './use-toast';

// Users hooks (Students and Lecturers)
export const useStudents = () => {
  return useQuery({
    queryKey: ['students'],
    queryFn: usersApi.getStudents,
  });
};

export const useLecturers = () => {
  return useQuery({
    queryKey: ['lecturers'],
    queryFn: usersApi.getLecturers,
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
};

export const useUserByEmail = (email: string) => {
  return useQuery({
    queryKey: ['users', 'email', email],
    queryFn: () => usersApi.getByEmail(email),
    enabled: !!email,
  });
};

// Attendance hooks
export const useTodayAttendance = () => {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: attendanceApi.getToday,
  });
};

export const useAttendanceByDate = (date: string) => {
  return useQuery({
    queryKey: ['attendance', date],
    queryFn: () => attendanceApi.getByDate(date),
    enabled: !!date,
  });
};

export const useUpdateAttendanceStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'verified' | 'pending' | 'absent' }) =>
      attendanceApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({
        title: "Attendance Updated",
        description: "Student attendance status has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update attendance status",
        variant: "destructive",
      });
    },
  });
};

// Courses hooks
export const useCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: coursesApi.getAll,
  });
};

export const useCoursesByInstructor = (instructorEmail: string) => {
  return useQuery({
    queryKey: ['courses', 'instructor', instructorEmail],
    queryFn: () => coursesApi.getByInstructor(instructorEmail),
    enabled: !!instructorEmail,
  });
};

export const useCoursesByInstructorId = (instructorId: string) => {
  return useQuery({
    queryKey: ['courses', 'instructor-id', instructorId],
    queryFn: () => coursesApi.getByInstructorId(instructorId),
    enabled: !!instructorId,
  });
};

export const useCourse = (id: string) => {
  return useQuery({
    queryKey: ['courses', id],
    queryFn: () => coursesApi.getById(id),
    enabled: !!id,
  });
};

// Sessions hooks
export const useSessionsByCourse = (courseCode: string) => {
  return useQuery({
    queryKey: ['sessions', 'course', courseCode],
    queryFn: () => sessionsApi.getByCourse(courseCode),
    enabled: !!courseCode,
  });
};

// Dashboard hooks
export const useDashboardStats = (userRole: string, userId?: string) => {
  return useQuery({
    queryKey: ['dashboard', 'stats', userRole, userId],
    queryFn: async () => {
      return await dashboardApi.getStats(userRole, userId);
    },
    enabled: !!userRole,
  });
};

// Session Management hooks
export const useTodaySessions = (courseCodes: string[]) => {
  return useQuery({
    queryKey: ['sessions', 'today', courseCodes],
    queryFn: () => sessionApi.getTodaySessions(courseCodes),
    enabled: courseCodes.length > 0,
  });
};

export const useCreateSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: sessionApi.createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
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
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      sessionApi.updateSession(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
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
};

export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: sessionApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({
        title: "Session Deleted",
        description: "Class session has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete class session",
        variant: "destructive",
      });
    },
  });
};

// Beacon Management hooks
export const useBeacons = () => {
  return useQuery({
    queryKey: ['beacons'],
    queryFn: beaconApi.getAll,
  });
};

export const useBeacon = (id: string) => {
  return useQuery({
    queryKey: ['beacons', id],
    queryFn: () => beaconApi.getById(id),
    enabled: !!id,
  });
};

export const useBeaconAssignments = () => {
  return useQuery({
    queryKey: ['beacon-assignments'],
    queryFn: beaconApi.getAssignments,
  });
};

export const useCreateBeacon = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: beaconApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beacons'] });
      toast({
        title: "Beacon Created",
        description: "BLE beacon has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create beacon",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateBeacon = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      beaconApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beacons'] });
      toast({
        title: "Beacon Updated",
        description: "BLE beacon has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update beacon",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteBeacon = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: beaconApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beacons'] });
      queryClient.invalidateQueries({ queryKey: ['beacon-assignments'] });
      toast({
        title: "Beacon Deleted",
        description: "BLE beacon and its assignments have been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete beacon. It may be assigned to courses.",
        variant: "destructive",
      });
    },
  });
};

export const useAssignBeacon = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: beaconApi.assign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beacon-assignments'] });
      toast({
        title: "Beacon Assigned",
        description: "Beacon has been assigned to course successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign beacon to course",
        variant: "destructive",
      });
    },
  });
};

export const useUnassignBeacon = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: beaconApi.unassign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beacon-assignments'] });
      toast({
        title: "Beacon Unassigned",
        description: "Beacon has been unassigned from course successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Unassignment Failed",
        description: "Failed to unassign beacon from course",
        variant: "destructive",
      });
    },
  });
};