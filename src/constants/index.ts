// Export all constants
export * from './colors';
export * from './typography';
export * from './spacing';

// App-specific constants
export const APP_CONSTANTS = {
  name: 'Tally Check',
  version: '1.0.0',
  description: 'University Attendance Management System',
  
  // API endpoints
  endpoints: {
    students: '/api/students',
    attendance: '/api/attendance',
    courses: '/api/courses',
    lecturers: '/api/lecturers',
  },
  
  // User roles
  roles: {
    student: 'student',
    lecturer: 'lecturer',
    admin: 'admin',
  },
  
  // Attendance methods
  attendanceMethods: {
    BLE: 'BLE',
    QR: 'QR',
    MANUAL: 'MANUAL',
  },
  
  // Attendance statuses
  attendanceStatuses: {
    verified: 'verified',
    pending: 'pending',
    absent: 'absent',
  },
  
  // Pagination
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50, 100],
  },
  
  // Time formats
  timeFormats: {
    display: 'HH:mm',
    input: 'HH:mm',
    full: 'YYYY-MM-DD HH:mm:ss',
  },
  
  // Validation rules
  validation: {
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address',
    },
    password: {
      minLength: 8,
      message: 'Password must be at least 8 characters long',
    },
    studentId: {
      pattern: /^[A-Z]{2}\d{6}$/,
      message: 'Student ID must be in format: XX123456',
    },
  },
} as const;

export type AppConstants = typeof APP_CONSTANTS; 