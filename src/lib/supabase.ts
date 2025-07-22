import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase = createClient(config.supabase.url, config.supabase.anonKey);

// Database types based on your actual schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          created_at: string;
          role: string;
          department?: string;
          phone?: string;
          office_location?: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          created_at?: string;
          role?: string;
          department?: string;
          phone?: string;
          office_location?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          created_at?: string;
          role?: string;
          department?: string;
          phone?: string;
          office_location?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          name: string;
          code: string;
          created_at: string;
          instructor_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          created_at?: string;
          instructor_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          created_at?: string;
          instructor_id?: string | null;
        };
      };
      class_sessions: {
        Row: {
          id: string;
          course_id: string;
          session_date: string;
          location: string | null;
          created_at: string;
          beacon_id: string | null;
          start_time: string | null;
          end_time: string | null;
          attendance_window_start: string | null;
          attendance_window_end: string | null;
        };
        Insert: {
          id?: string;
          course_id: string;
          session_date: string;
          location?: string | null;
          created_at?: string;
          beacon_id?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          attendance_window_start?: string | null;
          attendance_window_end?: string | null;
        };
        Update: {
          id?: string;
          course_id?: string;
          session_date?: string;
          location?: string | null;
          created_at?: string;
          beacon_id?: string | null;
          start_time?: string | null;
          end_time?: string | null;
          attendance_window_start?: string | null;
          attendance_window_end?: string | null;
        };
      };
      attendance_records: {
        Row: {
          id: string;
          session_id: string | null;
          student_id: string;
          method: string;
          status: string;
          check_in_time: string | null;
          latitude: number | null;
          longitude: number | null;
          device_info: any | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
          course_name: string | null;
          course_code: string | null;
          date: string | null;
          location_accuracy: number | null;
          check_out_time: string | null;
          course_id: string | null;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          student_id: string;
          method: string;
          status?: string;
          check_in_time?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          device_info?: any | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
          course_name?: string | null;
          course_code?: string | null;
          date?: string | null;
          location_accuracy?: number | null;
          check_out_time?: string | null;
          course_id?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          student_id?: string;
          method?: string;
          status?: string;
          check_in_time?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          device_info?: any | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
          course_name?: string | null;
          course_code?: string | null;
          date?: string | null;
          location_accuracy?: number | null;
          check_out_time?: string | null;
          course_id?: string | null;
        };
      };
      course_enrollments: {
        Row: {
          student_id: string;
          course_id: string;
        };
        Insert: {
          student_id: string;
          course_id: string;
        };
        Update: {
          student_id?: string;
          course_id?: string;
        };
      };
      ble_beacons: {
        Row: {
          id: string;
          mac_address: string;
          name: string | null;
          uuid: string | null;
          major: number | null;
          minor: number | null;
          location: string | null;
          description: string | null;
          is_active: boolean | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          mac_address: string;
          name?: string | null;
          uuid?: string | null;
          major?: number | null;
          minor?: number | null;
          location?: string | null;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          mac_address?: string;
          name?: string | null;
          uuid?: string | null;
          major?: number | null;
          minor?: number | null;
          location?: string | null;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      beacon_assignments: {
        Row: {
          id: string;
          beacon_id: string;
          course_id: string;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          beacon_id: string;
          course_id: string;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          beacon_id?: string;
          course_id?: string;
          session_id?: string | null;
          created_at?: string;
        };
      };
      check_in_prompts: {
        Row: {
          id: string;
          course_id: string | null;
          course_name: string;
          timestamp: number;
          expires_at: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id?: string | null;
          course_name: string;
          timestamp: number;
          expires_at: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string | null;
          course_name?: string;
          timestamp?: number;
          expires_at?: number;
          created_at?: string;
        };
      };
    };
  };
} 