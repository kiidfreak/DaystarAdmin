import { supabase } from './supabase';
import type { Database } from './supabase';

type User = Database['public']['Tables']['users']['Row'];
type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];
type Course = Database['public']['Tables']['courses']['Row'];
type ClassSession = Database['public']['Tables']['class_sessions']['Row'];
type CourseEnrollment = Database['public']['Tables']['course_enrollments']['Row'];
type Beacon = Database['public']['Tables']['ble_beacons']['Row'];
type BeaconAssignment = Database['public']['Tables']['beacon_assignments']['Row'];

// Users API (Students and Lecturers)
export const usersApi = {
  async getStudents(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .order('full_name');
    
    if (error) throw error;
    return data || [];
  },

  async getLecturers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'lecturer')
      .order('full_name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Attendance Records API
export const attendanceApi = {
  async getToday(): Promise<AttendanceRecord[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        users!attendance_records_student_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('date', today)
      .order('check_in_time', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByDate(date: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        users!attendance_records_student_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('date', date)
      .order('check_in_time', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async updateStatus(id: string, status: string, verifiedBy?: string): Promise<AttendanceRecord> {
    const updateData: any = { status };
    if (verifiedBy) {
      updateData.verified_by = verifiedBy;
      updateData.verified_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(attendance: Database['public']['Tables']['attendance_records']['Insert']): Promise<AttendanceRecord> {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert(attendance)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Courses API
export const coursesApi = {
  async getAll(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        users!courses_instructor_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .order('code');
    
    if (error) throw error;
    return data || [];
  },

  async getByInstructor(instructorId: string): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('instructor_id', instructorId)
      .order('code');
    
    if (error) throw error;
    return data || [];
  },

  async getByInstructorId(instructorId: string): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        users!courses_instructor_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('instructor_id', instructorId)
      .order('code');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        users!courses_instructor_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getEnrolledStudents(courseId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('student_id')
      .eq('course_id', courseId);
    
    if (error) throw error;
    
    if (!data || data.length === 0) return [];
    
    const studentIds = data.map(item => item.student_id);
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('*')
      .in('id', studentIds);
    
    if (studentsError) throw studentsError;
    return students || [];
  },

  async getStudentEnrollments(studentId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('student_course_enrollments')
      .select(`
        *,
        courses!student_course_enrollments_course_id_fkey (
          id,
          name,
          code,
          department,
          users!courses_instructor_id_fkey (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'active');
    
    if (error) throw error;
    return data || [];
  }
};

// Class Sessions API
export const sessionsApi = {
  async getToday(): Promise<ClassSession[]> {
    const today = new Date().toISOString().split('T')[0];
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
      .gte('session_date', `${today}T00:00:00`)
      .lte('session_date', `${today}T23:59:59`)
      .order('session_date');
    
    if (error) throw error;
    return data || [];
  },

  async getByCourse(courseId: string): Promise<ClassSession[]> {
    const { data, error } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('session_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
};

// Dashboard statistics
export const dashboardApi = {
  async getStats(userRole: string, userId?: string) {
    const today = new Date().toISOString().split('T')[0];
    
    if (userRole === 'lecturer' && userId) {
      // Get lecturer's courses using actual user ID
      const { data: lecturerCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, code')
        .eq('instructor_id', userId);
      
      if (coursesError) throw coursesError;
      
      const courseIds = lecturerCourses?.map(course => course.id) || [];
      
      // Get enrolled students for lecturer's courses
      const { data: enrolledStudents, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select(`
          student_id,
          courses!course_enrollments_course_id_fkey (
            id,
            code
          )
        `)
        .in('course_id', courseIds);
      
      if (enrollmentsError) throw enrollmentsError;
      
      // Get today's attendance records for lecturer's courses
      const { data: todayAttendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', today)
        .in('course_code', lecturerCourses?.map(c => c.code) || []);
      
      if (attendanceError) throw attendanceError;
      
      // Get today's class sessions for lecturer's courses
      const { data: todaySessions, error: sessionsError } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('session_date', today)
        .in('course_id', courseIds);
      
      if (sessionsError) throw sessionsError;
      
      // Calculate statistics
      const uniqueEnrolledStudents = new Set(enrolledStudents?.map(e => e.student_id) || []).size;
      const todayPresentStudents = new Set(todayAttendance?.map(a => a.student_id) || []).size;
      const todaySessionsCount = todaySessions?.length || 0;
      const bleCheckins = todayAttendance?.filter(a => a.method === 'BLE').length || 0;
      const qrCheckins = todayAttendance?.filter(a => a.method === 'QR').length || 0;
      
      return {
        totalStudents: uniqueEnrolledStudents,
        presentStudents: todayPresentStudents,
        classesToday: todaySessionsCount,
        bleCheckins,
        qrCheckins,
        attendanceRate: uniqueEnrolledStudents > 0 ? (todayPresentStudents / uniqueEnrolledStudents) * 100 : 0
      };
    } else {
      // Admin dashboard - get all statistics
      const { data: allAttendance, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', today);
      
      if (attendanceError) throw attendanceError;
      
      const { data: allSessions, error: sessionsError } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('session_date', today);
      
      if (sessionsError) throw sessionsError;
      
      const { data: allStudents, error: studentsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student');
      
      if (studentsError) throw studentsError;
      
      const totalStudents = allStudents?.length || 0;
      const presentStudents = new Set(allAttendance?.map(a => a.student_id) || []).size;
      const classesToday = allSessions?.length || 0;
      const bleCheckins = allAttendance?.filter(a => a.method === 'BLE').length || 0;
      const qrCheckins = allAttendance?.filter(a => a.method === 'QR').length || 0;
      
      return {
        totalStudents,
        presentStudents,
        classesToday,
        bleCheckins,
        qrCheckins,
        attendanceRate: totalStudents > 0 ? (presentStudents / totalStudents) * 100 : 0
      };
    }
  }
};

// Class Session Management API
export const sessionApi = {
  async createSession(sessionData: {
    course_id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    location?: string;
    attendance_window_start?: string;
    attendance_window_end?: string;
    beacon_id?: string; // in case beacon assignment is present
  }) {
    // Log all values being sent to the API
    console.log('[Session Creation] Sending values:', {
      course_id: sessionData.course_id,
      session_date: sessionData.session_date,
      start_time: sessionData.start_time,
      end_time: sessionData.end_time,
      attendance_window_start: sessionData.attendance_window_start,
      attendance_window_end: sessionData.attendance_window_end,
      beacon_id: sessionData.beacon_id,
      location: sessionData.location
    });
    const { data, error } = await supabase
      .from('class_sessions')
      .insert([sessionData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getSessionsByCourse(courseId: string) {
    const { data, error } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('course_id', courseId)
      .order('session_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getTodaySessions(courseIds: string[]) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('session_date', today)
      .in('course_id', courseIds);
    
    if (error) throw error;
    return data || [];
  },

  async updateSession(id: string, updates: any) {
    const { data, error } = await supabase
      .from('class_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteSession(id: string) {
    const { error } = await supabase
      .from('class_sessions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Beacon Management API
export const beaconApi = {
  async getAll(): Promise<Beacon[]> {
    const { data, error } = await supabase
      .from('ble_beacons')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Beacon | null> {
    const { data, error } = await supabase
      .from('ble_beacons')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByMacAddress(macAddress: string): Promise<Beacon | null> {
    const { data, error } = await supabase
      .from('ble_beacons')
      .select('*')
      .eq('mac_address', macAddress)
      .eq('is_active', true)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getActiveSessionsForBeacon(macAddress: string, userId: string): Promise<any[]> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];
    
    // Get beacon by MAC address
    const { data: beacon, error: beaconError } = await supabase
      .from('ble_beacons')
      .select('*')
      .eq('mac_address', macAddress)
      .eq('is_active', true)
      .single();
    
    if (beaconError || !beacon) {
      console.log('BLE DEBUG: Beacon not found or inactive:', macAddress);
      return [];
    }
    
    // Get active sessions for this beacon
    const { data: sessions, error: sessionsError } = await supabase
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
      .eq('beacon_id', beacon.id)
      .eq('session_date', today)
      .gte('start_time', currentTime)
      .lte('end_time', currentTime)
      .order('start_time');
    
    if (sessionsError) {
      console.log('BLE DEBUG: Error fetching sessions:', sessionsError);
      return [];
    }
    
    console.log('BLE DEBUG: Active sessions found for beacon:', sessions?.length || 0);
    return sessions || [];
  },

  async validateBeaconSession(macAddress: string, userId: string): Promise<any | null> {
    const sessions = await this.getActiveSessionsForBeacon(macAddress, userId);
    
    if (sessions.length === 0) {
      console.log('BLE DEBUG: No active sessions found for beacon:', macAddress);
      return null;
    }
    
    // Return the first active session (you might want to add more logic here)
    const session = sessions[0];
    console.log('BLE DEBUG: Valid session found:', session.id);
    
    return {
      sessionId: session.id,
      courseId: session.course_id,
      courseName: session.courses?.name,
      courseCode: session.courses?.code,
      startTime: session.start_time,
      endTime: session.end_time,
      location: session.location,
      attendanceWindowStart: session.attendance_window_start,
      attendanceWindowEnd: session.attendance_window_end,
      beaconId: session.beacon_id,
      beaconEnabled: true,
      qrCodeActive: false, // You can add QR code logic here
      qrCodeExpiresAt: null,
      sessionType: 'BLE'
    };
  },

  async getAssignments(): Promise<(BeaconAssignment & { ble_beacons: Beacon; courses: Course })[]> {
    const { data, error } = await supabase
      .from('beacon_assignments')
      .select(`
        *,
        ble_beacons (*),
        courses (*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(beaconData: Database['public']['Tables']['ble_beacons']['Insert']): Promise<Beacon> {
    const { data, error } = await supabase
      .from('ble_beacons')
      .insert([beaconData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Database['public']['Tables']['ble_beacons']['Update']>): Promise<Beacon> {
    const { data, error } = await supabase
      .from('ble_beacons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    // First check if beacon is assigned to any courses
    const { data: assignments, error: checkError } = await supabase
      .from('beacon_assignments')
      .select('id')
      .eq('beacon_id', id);
    
    if (checkError) throw checkError;
    
    // If beacon is assigned, remove assignments first
    if (assignments && assignments.length > 0) {
      const { error: deleteAssignmentsError } = await supabase
        .from('beacon_assignments')
        .delete()
        .eq('beacon_id', id);
      
      if (deleteAssignmentsError) throw deleteAssignmentsError;
    }
    
    // Check if beacon is referenced in class_sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('class_sessions')
      .select('id')
      .eq('beacon_id', id);
    
    if (sessionsError) throw sessionsError;
    
    // If beacon is used in sessions, remove the reference first
    if (sessions && sessions.length > 0) {
      const { error: updateSessionsError } = await supabase
        .from('class_sessions')
        .update({ beacon_id: null })
        .eq('beacon_id', id);
      
      if (updateSessionsError) throw updateSessionsError;
    }
    
    // Now delete the beacon
    const { error } = await supabase
      .from('ble_beacons')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async assign(assignment: Database['public']['Tables']['beacon_assignments']['Insert']): Promise<BeaconAssignment> {
    const { data, error } = await supabase
      .from('beacon_assignments')
      .insert([assignment])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async unassign(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('beacon_assignments')
      .delete()
      .eq('id', assignmentId);
    
    if (error) throw error;
  }
};

// Mobile App Beacon Validation API
export const mobileBeaconApi = {
  async validateBeaconForUser(macAddress: string, userId: string): Promise<any | null> {
    try {
      console.log('BLE DEBUG: Validating beacon for user:', { macAddress, userId });
      
      // Get beacon by MAC address
      const beacon = await beaconApi.getByMacAddress(macAddress);
      if (!beacon) {
        console.log('BLE DEBUG: Beacon not found:', macAddress);
        return null;
      }
      
      // Get current time
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0];
      
      // Find active sessions for this beacon
      const { data: sessions, error } = await supabase
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
        .eq('beacon_id', beacon.id)
        .eq('session_date', today)
        .gte('start_time', currentTime)
        .lte('end_time', currentTime)
        .order('start_time');
      
      if (error) {
        console.log('BLE DEBUG: Error fetching sessions:', error);
        return null;
      }
      
      console.log('BLE DEBUG: Sessions found:', sessions?.length || 0);
      
      if (!sessions || sessions.length === 0) {
        console.log('BLE DEBUG: No active sessions found for beacon');
        return null;
      }
      
      // Return the first active session
      const session = sessions[0];
      console.log('BLE DEBUG: Valid session found:', session.id);
      
      return {
        sessionId: session.id,
        courseId: session.course_id,
        courseName: session.courses?.name,
        courseCode: session.courses?.code,
        startTime: session.start_time,
        endTime: session.end_time,
        location: session.location,
        attendanceWindowStart: session.attendance_window_start,
        attendanceWindowEnd: session.attendance_window_end,
        beaconId: session.beacon_id,
        beaconEnabled: true,
        qrCodeActive: false,
        qrCodeExpiresAt: null,
        sessionType: 'BLE',
        instructor: session.courses?.users
      };
    } catch (error) {
      console.log('BLE DEBUG: Error in validateBeaconForUser:', error);
      return null;
    }
  }
};

// QR Code API
export const qrCodeApi = {
  async createQRCode(courseId: string, courseName: string, durationMinutes: number = 15) {
    const now = Date.now();
    const expiresAt = now + (durationMinutes * 60 * 1000);
    
    const { data, error } = await supabase
      .from('check_in_prompts')
      .insert({
        course_id: courseId,
        course_name: courseName,
        created_timestamp: now,
        expires_at: expiresAt
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getActiveQRCode(courseId: string) {
    const now = Date.now();
    
    const { data, error } = await supabase
      .from('check_in_prompts')
      .select('*')
      .eq('course_id', courseId)
      .gte('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },

  async validateQRCode(qrCodeId: string) {
    const now = Date.now();
    
    const { data, error } = await supabase
      .from('check_in_prompts')
      .select(`
        *,
        courses!check_in_prompts_course_id_fkey (
          id,
          name,
          code
        )
      `)
      .eq('id', qrCodeId)
      .gte('expires_at', now)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getQRCodeHistory(courseId?: string) {
    let query = supabase
      .from('check_in_prompts')
      .select(`
        *,
        courses!check_in_prompts_course_id_fkey (
          id,
          name,
          code
        )
      `)
      .order('created_at', { ascending: false });
    
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
};

// Enhanced Attendance API with check-in/check-out times
export const enhancedAttendanceApi = {
  async getAttendanceWithTimes(date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        users!attendance_records_student_id_fkey (
          id,
          full_name,
          email
        ),
        class_sessions!attendance_records_session_id_fkey (
          id,
          start_time,
          end_time,
          location,
          courses!class_sessions_course_id_fkey (
            id,
            name,
            code
          )
        )
      `)
      .eq('date', targetDate)
      .order('check_in_time', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getAttendanceReport(startDate: string, endDate: string, courseId?: string) {
    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        users!attendance_records_student_id_fkey (
          id,
          full_name,
          email
        ),
        class_sessions!attendance_records_session_id_fkey (
          id,
          start_time,
          end_time,
          location,
          courses!class_sessions_course_id_fkey (
            id,
            name,
            code
          )
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    
    if (courseId) {
      query = query.eq('course_code', courseId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}; 