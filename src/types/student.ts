
export interface Student {
  id: string;
  name: string;
  studentId: string;
  checkInTime?: string;
  checkOutTime?: string;
  method: 'BLE' | 'QR' | 'Absent';
  status: 'verified' | 'pending' | 'absent';
  courseCode?: string;
  courseName?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  instructor: string;
  schedule: string;
  location: string;
  days: string[];
  studentsEnrolled: number;
  attendanceRate: number;
}

export interface AttendanceReport {
  date: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  attendanceRate: number;
}
