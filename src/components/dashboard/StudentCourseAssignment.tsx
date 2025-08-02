import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Users, 
  BookOpen, 
  Plus, 
  Search, 
  Filter,
  UserPlus,
  GraduationCap,
  Calendar,
  Mail,
  Phone,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import type { Database } from '@/lib/supabase';

type StudentEnrollment = {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_number: string;
  student_department: string;
  course_id: string;
  course_name: string;
  course_code: string;
  instructor_id: string | null;
  instructor_name: string | null;
  enrollment_status: string;
  enrollment_date: string;
  assigned_by: string | null;
  assigned_by_name: string | null;
  assigned_at: string;
  notes: string | null;
};

type CourseAssignmentStats = {
  course_name: string;
  course_code: string;
  total_students: number;
  active_students: number;
  instructor_name: string | null;
};

export const StudentCourseAssignment: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  // Change selectedStudent type to match the user type from Supabase
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [assignmentTab, setAssignmentTab] = useState<'student' | 'lecturer'>('student');
  const [selectedLecturer, setSelectedLecturer] = useState<any | null>(null);
  const [selectedLecturerCourse, setSelectedLecturerCourse] = useState('');
  const [lecturerSearch, setLecturerSearch] = useState('');
  const [lecturerAssigning, setLecturerAssigning] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  // Add after useUser():
  const { data: allStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });
  
  const filteredStudents = allStudents?.filter(student =>
    student.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Get all courses
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching courses:', error);
        return [];
      }
      return data || [];
    },
  });

  // Get all users for assigned_by lookup
  const { data: allUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Get student enrollments - try both table names for compatibility
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['student-enrollments'],
    queryFn: async () => {
      try {
        // First try student_course_enrollments table (preferred)
        let { data, error } = await supabase
          .from('student_course_enrollments')
          .select(`
            *,
            users!student_course_enrollments_student_id_fkey (
              id,
              full_name,
              email
            ),
            courses!student_course_enrollments_course_id_fkey (
              id,
              name,
              code
            )
          `);
        
        // If that fails, try course_enrollments table (fallback)
        if (error) {
          console.log('student_course_enrollments table not found, trying course_enrollments...');
          const result = await supabase
            .from('course_enrollments')
            .select(`
              *,
              users!course_enrollments_student_id_fkey (
                id,
                full_name,
                email
              ),
              courses!course_enrollments_course_id_fkey (
                id,
                name,
                code
              )
            `);
          
          if (result.error) {
            console.error('Error fetching enrollments from both tables:', result.error);
            return [];
          }
          
          data = result.data;
        }
        
        // Transform data to match expected format
        return data?.map(enrollment => {
          const assignedByUser = allUsers?.find(u => u.id === enrollment.assigned_by);
          return {
            enrollment_id: enrollment.id || `${enrollment.student_id}-${enrollment.course_id}`,
            student_id: enrollment.student_id,
            student_name: enrollment.users?.full_name || 'Unknown',
            student_email: enrollment.users?.email || '',
            student_number: '', // student_number column doesn't exist in users table
            student_department: 'General',
            course_id: enrollment.course_id,
            course_name: enrollment.courses?.name || 'Unknown Course',
            course_code: enrollment.courses?.code || '',
            instructor_id: null,
            instructor_name: null,
            enrollment_status: enrollment.status || 'active',
            enrollment_date: enrollment.enrollment_date || enrollment.created_at || new Date().toISOString(),
            assigned_by: enrollment.assigned_by,
            assigned_by_name: assignedByUser?.full_name || null,
            assigned_at: enrollment.assigned_at || enrollment.created_at || new Date().toISOString(),
            notes: enrollment.notes || null
          };
        }) || [];
              } catch (error) {
          console.error('Error in enrollments query:', error);
          return [];
        }
      },
      enabled: !!allUsers, // Only run when allUsers is loaded
    });

  // Get course assignment stats - simplified
  const { data: assignmentStats, isLoading: statsLoading } = useQuery({
    queryKey: ['course-assignment-stats'],
    queryFn: async () => {
      try {
        // Simple stats calculation
        const stats = courses?.map(course => ({
          course_name: course.name || 'Unknown',
          course_code: course.code || '',
          total_students: enrollments?.filter(e => e.course_id === course.id).length || 0,
          active_students: enrollments?.filter(e => e.course_id === course.id && e.enrollment_status === 'active').length || 0,
          instructor_name: null
        })) || [];
        
        return stats;
      } catch (error) {
        console.error('Error calculating stats:', error);
        return [];
      }
    },
    enabled: !!courses && !!enrollments, // Only run when courses and enrollments are loaded
  });

  // Filter course assignment stats based on search term
  const filteredAssignmentStats = assignmentStats?.filter(stat => {
    if (!searchTerm) return true;
    return stat.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           stat.course_code.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  // Assign courses to student
  const assignCourses = useMutation({
    mutationFn: async ({ studentId, courseIds, notes }: { 
      studentId: string; 
      courseIds: string[]; 
      notes?: string; 
    }) => {
      const assignments = courseIds.map(courseId => ({
        student_id: studentId,
        course_id: courseId,
        assigned_by: user?.id,
        status: 'active' as const, // Ensure valid status
        notes: notes || 'Assigned by admin',
        enrollment_date: new Date().toISOString(),
        assigned_at: new Date().toISOString()
      }));

      // Try student_course_enrollments table first
      let { data, error } = await supabase
        .from('student_course_enrollments')
        .insert(assignments)
        .select();
      
      // If that fails, try course_enrollments table
      if (error) {
        console.log('student_course_enrollments table not found, trying course_enrollments...');
        const result = await supabase
          .from('course_enrollments')
          .insert(assignments.map(({ assigned_by, status, notes, enrollment_date, assigned_at, ...rest }) => rest))
          .select();
        
        if (result.error) {
          throw result.error;
        }
        
        data = result.data;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unassigned-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['course-assignment-stats'] });
      setShowAssignmentModal(false);
      setSelectedStudent(null);
      setSelectedCourses([]);
      toast({
        title: "Courses Assigned",
        description: "Student has been successfully assigned to the selected courses",
      });
    },
    onError: (error) => {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign courses to student",
        variant: "destructive",
      });
    },
  });

  // Update enrollment status
  const updateEnrollmentStatus = useMutation({
    mutationFn: async ({ enrollmentId, status }: { enrollmentId: string; status: string }) => {
      // Validate status to ensure it's one of the allowed values
      const validStatuses = ['active', 'inactive', 'pending'];
      const validStatus = validStatuses.includes(status) ? status : 'pending';
      
      // Try student_course_enrollments table first
      let { data, error } = await supabase
        .from('student_course_enrollments')
        .update({ status: validStatus, updated_at: new Date().toISOString() })
        .eq('id', enrollmentId)
        .select()
        .single();
      
      // If that fails, try course_enrollments table
      if (error) {
        console.log('student_course_enrollments table not found, trying course_enrollments...');
        const result = await supabase
          .from('course_enrollments')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', enrollmentId)
          .select()
          .single();
        
        if (result.error) {
          throw result.error;
        }
        
        data = result.data;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['course-assignment-stats'] });
      toast({
        title: "Status Updated",
        description: "Enrollment status has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update enrollment status",
        variant: "destructive",
      });
    },
  });

  // Fetch all lecturers
  const { data: allLecturers, isLoading: lecturersLoading } = useQuery({
    queryKey: ['all-lecturers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'lecturer')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });
  const filteredLecturers = allLecturers?.filter(lecturer =>
    lecturer.full_name.toLowerCase().includes(lecturerSearch.toLowerCase()) ||
    lecturer.email.toLowerCase().includes(lecturerSearch.toLowerCase())
  );

  // Assign course to lecturer
  const assignLecturer = useMutation({
    mutationFn: async ({ courseId, lecturerId }: { courseId: string; lecturerId: string }) => {
      setLecturerAssigning(true);
      const { error } = await supabase
        .from('courses')
        .update({ instructor_id: lecturerId })
        .eq('id', courseId);
      setLecturerAssigning(false);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course-assignment-stats'] });
      setShowAssignmentModal(false);
      setSelectedLecturer(null);
      setSelectedLecturerCourse('');
      toast({
        title: 'Course Assigned',
        description: 'Lecturer has been successfully assigned to the course',
      });
    },
    onError: () => {
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign course to lecturer',
        variant: 'destructive',
      });
    },
  });

  const handleAssignCourses = () => {
    if (!selectedStudent || selectedCourses.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select a student and at least one course",
        variant: "destructive",
      });
      return;
    }

    // Check for existing enrollments to prevent duplicates
    const existingEnrollments = enrollments?.filter(e => 
      e.student_id === selectedStudent.id && 
      selectedCourses.includes(e.course_id)
    ) || [];

    if (existingEnrollments.length > 0) {
      const existingCourseNames = existingEnrollments.map(e => e.course_name).join(', ');
      toast({
        title: "Duplicate Enrollment",
        description: `Student is already enrolled in: ${existingCourseNames}`,
        variant: "destructive",
      });
      return;
    }

    assignCourses.mutate({
      studentId: selectedStudent.id,
      courseIds: selectedCourses,
      notes: `Assigned by ${user?.full_name} on ${new Date().toLocaleDateString()}`
    });
  };

  const getStatusBadge = (status: string) => {
    // Ensure status is one of the valid values from the schema
    const validStatus = ['active', 'inactive', 'pending'].includes(status) ? status : 'pending';
    
    const badges = {
      active: <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ Active</Badge>,
      inactive: <Badge className="bg-red-500/20 text-red-400 border-red-500/30">❌ Inactive</Badge>,
      pending: <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏰ Pending</Badge>
    };
    return badges[validStatus as keyof typeof badges];
  };

  const filteredEnrollments = enrollments?.filter(enrollment => {
    const matchesSearch = enrollment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.course_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || enrollment.enrollment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalStudents = allStudents?.length || 0;
  const activeEnrollments = enrollments?.filter(e => e.enrollment_status === 'active').length || 0;
  const pendingEnrollments = enrollments?.filter(e => e.enrollment_status === 'pending').length || 0;
  const totalCourses = courses?.length || 0;

  // Show loading state while data is being fetched
  if (studentsLoading || coursesLoading || enrollmentsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#001F3F] to-slate-900 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="glass-card p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Loading Course Assignment Data</h2>
            <p className="text-gray-400">Please wait while we fetch the latest information...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there are issues
  const hasError = !allStudents || !courses || !enrollments;
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#001F3F] to-slate-900 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="glass-card p-12 text-center">
            <div className="mb-4">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Course Assignment Dashboard</h2>
            <p className="text-gray-400 mb-6">Welcome to the Course Assignment page. You can manage student course enrollments here.</p>
            <Button
              onClick={() => setShowAssignmentModal(true)}
              className="bg-[#001F3F] hover:bg-[#1E3A5F] text-white px-6 py-3 rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Start Assigning Courses
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#001F3F] to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Course Assignment</h2>
            <p className="text-gray-400">Manage student course enrollments and instructor assignments</p>
          </div>
          <Button
            onClick={() => setShowAssignmentModal(true)}
            className="bg-[#001F3F] hover:bg-[#1E3A5F] text-white px-6 py-3 rounded-xl shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Assign Courses
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400">{totalStudents}</div>
                <div className="text-gray-400 text-sm">Total Students</div>
              </div>
              <div className="bg-[#001F3F]/20 p-3 rounded-xl">
                <GraduationCap className="w-6 h-6 text-[#001F3F]" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400">{activeEnrollments}</div>
                <div className="text-gray-400 text-sm">Active Enrollments</div>
              </div>
              <div className="bg-green-500/20 p-3 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{pendingEnrollments}</div>
                <div className="text-gray-400 text-sm">Pending Assignments</div>
              </div>
              <div className="bg-yellow-500/20 p-3 rounded-xl">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-400">{totalCourses}</div>
                <div className="text-gray-400 text-sm">Available Courses</div>
              </div>
              <div className="bg-orange-500/20 p-3 rounded-xl">
                <BookOpen className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Fallback display if no data */}
        {(!enrollments || enrollments.length === 0) && !enrollmentsLoading && (
          <div className="glass-card p-12 text-center">
            <div className="mb-4">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Course Assignments Found</h3>
            <p className="text-gray-400 mb-6">Start by assigning courses to students using the button above.</p>
            <Button
              onClick={() => setShowAssignmentModal(true)}
              className="bg-[#001F3F] hover:bg-[#1E3A5F] text-white px-6 py-3 rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Assign First Course
            </Button>
          </div>
        )}

        {/* Search and Filters */}
        {enrollments && enrollments.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name, email, or course..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border-white/20 text-white rounded-xl focus:border-[#001F3F] focus:ring-2 focus:ring-[#001F3F]/20 placeholder:text-gray-400"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-3 rounded-xl transition-colors ${
                    statusFilter === 'all' 
                      ? 'bg-[#001F3F] text-white' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-4 py-3 rounded-xl transition-colors ${
                    statusFilter === 'active' 
                      ? 'bg-[#001F3F] text-white' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-4 py-3 rounded-xl transition-colors ${
                    statusFilter === 'inactive' 
                      ? 'bg-[#001F3F] text-white' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Inactive
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-4 py-3 rounded-xl transition-colors ${
                    statusFilter === 'pending' 
                      ? 'bg-[#001F3F] text-white' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student Enrollments - Show first when there are search results */}
        {filteredEnrollments && filteredEnrollments.length > 0 && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Student Enrollments
              {searchTerm && (
                <span className="text-sm text-gray-400 ml-2">
                  ({filteredEnrollments.length} result{filteredEnrollments.length !== 1 ? 's' : ''} for "{searchTerm}")
                </span>
              )}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-gray-400 font-medium p-3">Student</th>
                    <th className="text-gray-400 font-medium p-3">Course</th>
                    <th className="text-gray-400 font-medium p-3">Status</th>
                    <th className="text-gray-400 font-medium p-3">Enrollment Date</th>
                    <th className="text-gray-400 font-medium p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrollments.map((enrollment) => (
                    <tr key={enrollment.enrollment_id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-3">
                        <div>
                          <p className="text-white font-medium">{enrollment.student_name}</p>
                          <p className="text-gray-400 text-sm">{enrollment.student_email}</p>
                          <p className="text-gray-400 text-xs">Student ID: {enrollment.student_id}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-white font-medium">{enrollment.course_name}</p>
                          <p className="text-gray-400 text-sm">{enrollment.course_code}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        {getStatusBadge(enrollment.enrollment_status)}
                      </td>
                      <td className="p-3 text-gray-300">
                        {new Date(enrollment.enrollment_date).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Handle status update
                              const newStatus = enrollment.enrollment_status === 'active' ? 'inactive' : 'active';
                              updateEnrollmentStatus.mutate({
                                enrollmentId: enrollment.enrollment_id,
                                status: newStatus
                              });
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                          >
                            {enrollment.enrollment_status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Course Assignment Stats - Show after enrollments when there are search results */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Course Assignment Statistics
            {searchTerm && (
              <span className="text-sm text-gray-400 ml-2">
                ({filteredAssignmentStats.length} course{filteredAssignmentStats.length !== 1 ? 's' : ''} matching "{searchTerm}")
              </span>
            )}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-gray-400 font-medium p-3">Course</th>
                  <th className="text-gray-400 font-medium p-3">Instructor</th>
                  <th className="text-gray-400 font-medium p-3">Total Students</th>
                  <th className="text-gray-400 font-medium p-3">Active Students</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignmentStats.length > 0 ? (
                  filteredAssignmentStats.map((stat) => (
                    <tr key={stat.course_code} className="border-b border-white/10">
                      <td className="p-3">
                        <div>
                          <p className="text-white font-medium">{stat.course_name}</p>
                          <p className="text-gray-400 text-sm">{stat.course_code}</p>
                        </div>
                      </td>
                      <td className="p-3 text-gray-300">{stat.instructor_name || 'Unassigned'}</td>
                      <td className="p-3 text-white">{stat.total_students}</td>
                      <td className="p-3 text-white">{stat.active_students}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-400">
                      {searchTerm ? `No courses found matching "${searchTerm}"` : 'No course statistics available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Empty state for filtered results */}
        {filteredEnrollments && filteredEnrollments.length === 0 && enrollments && enrollments.length > 0 && (
          <div className="glass-card p-12 text-center">
            <div className="mb-4">
              <Search className="w-16 h-16 text-gray-400 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
            <p className="text-gray-400">Try adjusting your search terms or filters.</p>
          </div>
        )}

        {/* Assignment Modal */}
        {showAssignmentModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Assign Courses
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowAssignmentModal(false)}
                  className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
              {/* Tabs for Student/Lecturer Assignment */}
              <div className="flex mb-8 gap-2">
                <Button
                  variant={assignmentTab === 'student' ? 'default' : 'outline'}
                  className={`rounded-xl flex-1 ${assignmentTab === 'student' ? 'bg-[#001F3F] text-white' : 'bg-white/10 text-white border-white/20'}`}
                  onClick={() => setAssignmentTab('student')}
                >
                  <Users className="w-4 h-4 mr-2" /> Assign Student
                </Button>
                <Button
                  variant={assignmentTab === 'lecturer' ? 'default' : 'outline'}
                  className={`rounded-xl flex-1 ${assignmentTab === 'lecturer' ? 'bg-[#001F3F] text-white' : 'bg-white/10 text-white border-white/20'}`}
                  onClick={() => setAssignmentTab('lecturer')}
                >
                  <GraduationCap className="w-4 h-4 mr-2" /> Assign Lecturer
                </Button>
              </div>
              {/* Student Assignment Tab */}
              {assignmentTab === 'student' && (
                <div className="space-y-6">
                  {/* Student Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Search Student</label>
                    <Input
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="mb-2 bg-white/10 border-white/20 text-white rounded-xl focus:border-[#001F3F] focus:ring-2 focus:ring-[#001F3F]/20"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {filteredStudents?.map((student) => (
                        <div
                          key={student.id}
                          onClick={() => setSelectedStudent(student)}
                          className={`p-3 rounded-xl cursor-pointer transition-colors ${
                            selectedStudent?.id === student.id
                              ? 'bg-[#001F3F]/20 border border-[#001F3F]/30'
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{student.full_name}</p>
                              <p className="text-gray-400 text-sm">{student.email}</p>
                                            <p className="text-gray-500 text-xs">ID: {student.id}</p>
                            </div>
                            {selectedStudent?.id === student.id && (
                              <CheckCircle className="w-5 h-5 text-[#001F3F]" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Course Selection */}
                  {selectedStudent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">Select Courses</label>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {courses?.map((course) => (
                          <label
                            key={course.id}
                            className="flex items-center space-x-3 p-3 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCourses.includes(course.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCourses([...selectedCourses, course.id]);
                                } else {
                                  setSelectedCourses(selectedCourses.filter(id => id !== course.id));
                                }
                              }}
                              className="rounded border-white/20 bg-white/10 text-[#001F3F] focus:ring-[#001F3F]"
                            />
                            <div>
                              <p className="text-white font-medium">{course.name}</p>
                              <p className="text-gray-400 text-sm">{course.code}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assign Button */}
                  {selectedStudent && selectedCourses.length > 0 && (
                    <Button
                      onClick={handleAssignCourses}
                      disabled={assignCourses.isPending}
                      className="bg-[#001F3F] hover:bg-[#1E3A5F] text-white px-6 py-3 rounded-xl shadow-lg w-full"
                    >
                      {assignCourses.isPending ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Assigning...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <UserPlus className="w-5 h-5 mr-2" />
                          Assign {selectedCourses.length} Course{selectedCourses.length > 1 ? 's' : ''} to {selectedStudent.full_name}
                        </div>
                      )}
                    </Button>
                  )}
                </div>
              )}
              {/* Lecturer Assignment Tab */}
              {assignmentTab === 'lecturer' && (
                <div className="space-y-6">
                  {/* Lecturer Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Search Lecturer</label>
                    <Input
                      placeholder="Search by name or email..."
                      value={lecturerSearch}
                      onChange={e => setLecturerSearch(e.target.value)}
                      className="mb-2 bg-white/10 border-white/20 text-white rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    />
                    <label className="block text-sm font-medium text-gray-300 mb-3">Select Lecturer</label>
                    <select
                      value={selectedLecturer?.id || ''}
                      onChange={e => {
                        const lecturer = allLecturers?.find(l => l.id === e.target.value);
                        setSelectedLecturer(lecturer || null);
                      }}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    >
                      <option value="">Select a lecturer</option>
                      {filteredLecturers?.map((lecturer) => (
                        <option key={lecturer.id} value={lecturer.id}>
                          {lecturer.full_name} ({lecturer.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Course Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Select Course</label>
                    <select
                      value={selectedLecturerCourse}
                      onChange={e => setSelectedLecturerCourse(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                    >
                      <option value="">Select a course</option>
                      {courses?.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name} ({course.code}) {course.users ? `- Instructor: ${course.users.full_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-4 pt-6">
                    <Button
                      variant="ghost"
                      onClick={() => setShowAssignmentModal(false)}
                      className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedLecturer && selectedLecturerCourse) {
                          assignLecturer.mutate({
                            courseId: selectedLecturerCourse,
                            lecturerId: selectedLecturer.id
                          });
                        }
                      }}
                      disabled={lecturerAssigning || !selectedLecturer || !selectedLecturerCourse}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg"
                    >
                      {lecturerAssigning ? 'Assigning...' : 'Assign Course'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 