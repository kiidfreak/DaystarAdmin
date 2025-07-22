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
  const [studentSearch, setStudentSearch] = useState('');
  const filteredStudents = allStudents?.filter(student =>
    student.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (student.student_number || '').toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Get all courses
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
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
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Get student enrollments
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['student-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_enrollments_view')
        .select('*')
        .order('student_name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Get course assignment stats
  const { data: assignmentStats, isLoading: statsLoading } = useQuery({
    queryKey: ['course-assignment-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_course_assignment_stats');
      
      if (error) throw error;
      return data || [];
    },
  });

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
        status: 'active',
        notes: notes || 'Assigned by admin'
      }));

      const { data, error } = await supabase
        .from('student_course_enrollments')
        .insert(assignments)
        .select();
      
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('student_course_enrollments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', enrollmentId)
        .select()
        .single();
      
      if (error) throw error;
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

  const handleAssignCourses = () => {
    if (!selectedStudent || selectedCourses.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select a student and at least one course",
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
    const badges = {
      active: <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ Active</Badge>,
      inactive: <Badge className="bg-red-500/20 text-red-400 border-red-500/30">❌ Inactive</Badge>,
      pending: <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏰ Pending</Badge>
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const filteredEnrollments = enrollments?.filter(enrollment => {
    const matchesSearch = enrollment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         enrollment.student_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || enrollment.enrollment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (coursesLoading || enrollmentsLoading || statsLoading) {
    return <PageLoading text="Loading course assignments..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Student Course Assignment</h2>
            <p className="text-gray-400">Manage student course enrollments and assignments</p>
          </div>
          <Button
            onClick={() => setShowAssignmentModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl shadow-lg"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Assign Courses
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600/20 p-3 rounded-xl">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Unassigned Students</p>
                <p className="text-2xl font-bold text-white">{enrollments?.filter(e => e.enrollment_status === 'pending').length || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-green-600/20 p-3 rounded-xl">
                <BookOpen className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Enrollments</p>
                <p className="text-2xl font-bold text-white">{enrollments?.length || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-600/20 p-3 rounded-xl">
                <GraduationCap className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Active Courses</p>
                <p className="text-2xl font-bold text-white">{courses?.length || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-600/20 p-3 rounded-xl">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Pending Assignments</p>
                <p className="text-2xl font-bold text-white">
                  {enrollments?.filter(e => e.enrollment_status === 'pending').length || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Course Assignment Stats */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Course Assignment Statistics</h3>
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
                {assignmentStats?.map((stat) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Student Enrollments */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Student Enrollments</h3>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search students or courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-xl ${statusFilter === 'all' ? 'bg-purple-600' : 'bg-white/10'}`}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  className={`rounded-xl ${statusFilter === 'active' ? 'bg-green-600' : 'bg-white/10'}`}
                >
                  Active
                </Button>
                <Button
                  size="sm"
                  onClick={() => setStatusFilter('inactive')}
                  className={`rounded-xl ${statusFilter === 'inactive' ? 'bg-red-600' : 'bg-white/10'}`}
                >
                  Inactive
                </Button>
                <Button
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                  className={`rounded-xl ${statusFilter === 'pending' ? 'bg-yellow-600' : 'bg-white/10'}`}
                >
                  Pending
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-gray-400 font-medium p-3">Student</th>
                  <th className="text-gray-400 font-medium p-3">Course</th>
                  <th className="text-gray-400 font-medium p-3">Instructor</th>
                  <th className="text-gray-400 font-medium p-3">Status</th>
                  <th className="text-gray-400 font-medium p-3">Assigned By</th>
                  <th className="text-gray-400 font-medium p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments?.map((enrollment) => (
                  <tr key={enrollment.enrollment_id} className="border-b border-white/10">
                    <td className="p-3">
                      <div>
                        <p className="text-white font-medium">{enrollment.student_name}</p>
                        <p className="text-gray-400 text-sm">{enrollment.student_number}</p>
                        <p className="text-gray-400 text-sm">{enrollment.student_email}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="text-white font-medium">{enrollment.course_name}</p>
                        <p className="text-gray-400 text-sm">{enrollment.course_code}</p>
                      </div>
                    </td>
                    <td className="p-3 text-gray-300">{enrollment.instructor_name || 'Unassigned'}</td>
                    <td className="p-3">{getStatusBadge(enrollment.enrollment_status)}</td>
                    <td className="p-3 text-gray-300">{enrollment.assigned_by_name || 'System'}</td>
                    <td className="p-3">
                      <div className="flex space-x-2">
                        {enrollment.enrollment_status === 'active' ? (
                          <Button
                            size="sm"
                            onClick={() => updateEnrollmentStatus.mutate({ 
                              enrollmentId: enrollment.enrollment_id, 
                              status: 'inactive' 
                            })}
                            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-xl px-3 py-1"
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => updateEnrollmentStatus.mutate({ 
                              enrollmentId: enrollment.enrollment_id, 
                              status: 'active' 
                            })}
                            className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-xl px-3 py-1"
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Assignment Modal */}
        {showAssignmentModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Assign Courses to Student</h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowAssignmentModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Student Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Search Student</label>
                  <Input
                    placeholder="Search by name, email, or student number..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="mb-2 bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                  <label className="block text-sm font-medium text-gray-300 mb-3">Select Student</label>
                  <select
                    value={selectedStudent?.id || ''}
                    onChange={e => {
                      const student = allStudents?.find(s => s.id === e.target.value);
                      setSelectedStudent(student || null);
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  >
                    <option value="">Select a student</option>
                    {filteredStudents?.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} ({student.student_number || student.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Course Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Select Courses</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {courses?.map((course) => (
                      <label key={course.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10">
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
                          className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-400"
                        />
                        <div className="flex-1">
                          <p className="text-white font-medium">{course.name}</p>
                          <p className="text-gray-400 text-sm">{course.code} - {course.department}</p>
                          {course.users && (
                            <p className="text-gray-400 text-sm">Instructor: {course.users.full_name}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAssignmentModal(false)}
                    className="text-gray-400 hover:text-white px-6 py-3 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignCourses}
                    disabled={assignCourses.isPending || !selectedStudent || selectedCourses.length === 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl shadow-lg"
                  >
                    {assignCourses.isPending ? 'Assigning...' : 'Assign Courses'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 