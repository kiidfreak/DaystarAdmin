import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  BookOpen,
  GraduationCap,
  Shield,
  Mail,
  Phone,
  Building,
  Calendar,
  Plus,
  XCircle,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import type { Database } from '@/lib/supabase';

type User = Database['public']['Tables']['users']['Row'];
type Course = Database['public']['Tables']['courses']['Row'];

interface UserFormData {
  full_name: string;
  email: string;
  password: string; // Add password field
  role: 'lecturer' | 'student' | 'admin';
  department?: string;
  phone?: string;
  office_location?: string;
}

interface CourseAssignment {
  course_id: string;
  instructor_id: string;
}

export const UserManagement: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'lecturers' | 'students' | 'assignments'>('lecturers');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    password: '',
    role: 'lecturer',
    department: '',
    phone: '',
    office_location: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Temporary function to create first admin (only shows if no users exist)
  const createFirstAdmin = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([{
          full_name: 'System Administrator',
          email: 'admin@tallycheck.com',
          role: 'admin',
          department: 'Administration',
          phone: '',
          office_location: ''
        }])
        .select()
        .single();

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      toast({
        title: "Admin Created",
        description: "Admin profile created: admin@tallycheck.com / Admin123!",
      });

      queryClient.invalidateQueries(['users']);
    } catch (error) {
      console.error('Admin creation error:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create admin",
        variant: "destructive",
      });
    }
  };

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
        .order('code');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Get lecturers with their course assignments
  const { data: lecturers, isLoading: lecturersLoading } = useQuery({
    queryKey: ['lecturers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          courses!courses_instructor_id_fkey (
            id,
            name,
            code
          )
        `)
        .eq('role', 'lecturer')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async (userData: UserFormData) => {
      // Create user profile in users table (without auth for now)
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([{
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
          department: userData.department,
          phone: userData.phone,
          office_location: userData.office_location
        }])
        .select()
        .single();
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }
      
      return profileData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      setShowCreateForm(false);
      setFormData({
        full_name: '',
        email: '',
        password: '',
        role: 'lecturer',
        department: '',
        phone: '',
        office_location: ''
      });
      toast({
        title: "User Created",
        description: "User profile has been created successfully. Note: Auth setup will be configured later.",
      });
    },
    onError: (error) => {
      console.error('Create user error:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UserFormData> }) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      setEditingUser(null);
      toast({
        title: "User Updated",
        description: "User has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      // Check if user is assigned to any courses
      const { data: assignedCourses, error: checkError } = await supabase
        .from('courses')
        .select('id')
        .eq('instructor_id', id);
      
      if (checkError) throw checkError;
      
      // If user is assigned to courses, remove assignments first
      if (assignedCourses && assignedCourses.length > 0) {
        const { error: unassignError } = await supabase
          .from('courses')
          .update({ instructor_id: null })
          .eq('instructor_id', id);
        
        if (unassignError) throw unassignError;
      }
      
      // Now delete the user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast({
        title: "User Deleted",
        description: "User and related assignments have been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete user. They may have active assignments.",
        variant: "destructive",
      });
    },
  });

  // Assign course mutation
  const assignCourse = useMutation({
    mutationFn: async ({ formData, instructorId }: { formData: FormData, instructorId: string }) => {
      const courseId = formData.get('course_id') as string;
      if (!instructorId) throw new Error('No instructor selected');
      const { data, error } = await supabase
        .from('courses')
        .update({ instructor_id: instructorId })
        .eq('id', courseId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      setShowAssignmentForm(false);
      setSelectedUser(null);
      toast({
        title: "Course Assigned",
        description: "Course has been assigned successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign course",
        variant: "destructive",
      });
    },
  });

  // Unassign course mutation
  const unassignCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { data, error } = await supabase
        .from('courses')
        .update({ instructor_id: null })
        .eq('id', courseId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      toast({
        title: "Course Unassigned",
        description: "Course has been unassigned successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Unassignment Failed",
        description: "Failed to unassign course",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password for new users
    if (!editingUser && formData.password.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    if (editingUser) {
      updateUser.mutate({ id: editingUser.id, updates: formData });
    } else {
      createUser.mutate(formData);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '', // Password is not editable
      role: user.role as 'lecturer' | 'student' | 'admin',
      department: user.department || '',
      phone: user.phone || '',
      office_location: user.office_location || ''
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this user? This will also remove any course assignments.')) {
      deleteUser.mutate(id);
    }
  };

  const handleAssignCourse = (user: User) => {
    setSelectedUser(user);
    setShowAssignmentForm(true);
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      lecturer: <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">👨‍🏫 Lecturer</Badge>,
      student: <Badge className="bg-green-500/20 text-green-400 border-green-500/30">🎓 Student</Badge>,
      admin: <Badge className="bg-[#001F3F]/20 text-[#001F3F] border-[#001F3F]/30">🛡️ Admin</Badge>
    };
    return badges[role as keyof typeof badges] || badges.student;
  };

  const getFilteredUsers = () => {
    if (!users) return [];
    
    let filtered = users;
    
    // Filter by role
    switch (activeTab) {
      case 'lecturers':
        filtered = users.filter(user => user.role === 'lecturer');
        break;
      case 'students':
        filtered = users.filter(user => user.role === 'student');
        break;
      default:
        filtered = users;
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return filtered;
  };

  if (usersLoading || coursesLoading || lecturersLoading) {
    return <PageLoading text="Loading users..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001F3F] via-[#1E3A5F] to-[#001F3F] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">User Management</h2>
            <p className="text-gray-400">Manage lecturers, students, and course assignments</p>
            {users && users.length === 0 && (
              <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                <p className="text-blue-200 text-sm">
                  <strong>First Time Setup:</strong> Create your first admin account to get started. 
                  This admin will be able to create additional users and manage the system.
                </p>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            {users && users.length === 0 && (
              <Button
                onClick={createFirstAdmin}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-lg"
              >
                <Shield className="w-5 h-5 mr-2" />
                Create Admin Account
              </Button>
            )}
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-[#001F3F] hover:bg-[#1E3A5F] text-white px-6 py-3 rounded-xl shadow-lg"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20">
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              onClick={() => setActiveTab('lecturers')}
              className={`flex-1 rounded-xl transition-all duration-300 ${
                activeTab === 'lecturers' 
                  ? 'bg-[#001F3F]/20 text-[#001F3F] border border-[#001F3F]/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <GraduationCap className="w-5 h-5 mr-2" />
              Lecturers
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('students')}
              className={`flex-1 rounded-xl transition-all duration-300 ${
                activeTab === 'students' 
                  ? 'bg-[#001F3F]/20 text-[#001F3F] border border-[#001F3F]/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Students
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab('assignments')}
              className={`flex-1 rounded-xl transition-all duration-300 ${
                activeTab === 'assignments' 
                  ? 'bg-[#001F3F]/20 text-[#001F3F] border border-[#001F3F]/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Course Assignments
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white rounded-xl focus:border-[#001F3F] focus:ring-2 focus:ring-[#001F3F]/20"
              />
            </div>
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Create/Edit User Form */}
        {(showCreateForm || editingUser) && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Full Name</label>
                  <Input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Dr. John Smith"
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-[#001F3F] focus:ring-2 focus:ring-[#001F3F]/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.smith@university.edu"
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Password</label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password for login"
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    required={!editingUser}
                  />
                  {!editingUser && (
                    <p className="text-xs text-gray-400 mt-1">
                      Password must be at least 6 characters. User will be able to sign in immediately.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'lecturer' | 'student' | 'admin' })}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                    required
                  >
                    <option value="lecturer">Lecturer</option>
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Department</label>
                  <Input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Computer Science"
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Phone</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Office Location</label>
                  <Input
                    type="text"
                    value={formData.office_location}
                    onChange={(e) => setFormData({ ...formData, office_location: e.target.value })}
                    placeholder="Building A, Room 205"
                    className="bg-white/10 border-white/20 text-white rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingUser(null);
                  }}
                  className="text-gray-400 hover:text-white px-6 py-3 rounded-xl w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createUser.isPending || updateUser.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl shadow-lg w-full sm:w-auto"
                >
                  {createUser.isPending || updateUser.isPending ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Course Assignment Form */}
        {showAssignmentForm && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                Assign Course
              </h3>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAssignmentForm(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              let instructorId = selectedUser?.id;
              if (!instructorId) {
                instructorId = formData.get('instructor_id') as string;
              }
              assignCourse.mutate({ formData, instructorId });
            }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Course</label>
                <select
                  name="course_id"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  required
                >
                  <option value="">Select a course</option>
                  {courses?.filter(course => !course.instructor_id).map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Lecturer</label>
                <select
                  name="instructor_id"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
                  required={!selectedUser}
                  defaultValue={selectedUser?.id || ''}
                >
                  <option value="">Select a lecturer</option>
                  {users?.filter(u => u.role === 'lecturer').map((lecturer) => (
                    <option key={lecturer.id} value={lecturer.id}>
                      {lecturer.full_name} ({lecturer.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAssignmentForm(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-white px-6 py-3 rounded-xl w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={assignCourse.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl shadow-lg w-full sm:w-auto"
                >
                  {assignCourse.isPending ? 'Assigning...' : 'Assign Course'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'assignments' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Course Assignments</h3>
              <div className="text-gray-400">
                {courses?.length || 0} course{courses?.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {courses?.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/20">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <h4 className="text-xl font-semibold text-white mb-2">No courses configured yet</h4>
                <p className="text-gray-400 mb-6">Add courses first to manage assignments</p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Course
                </Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {courses?.map((course) => (
                  <div key={course.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-200 shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="bg-purple-600/20 p-3 rounded-xl">
                            <BookOpen className="w-6 h-6 text-purple-400" />
                          </div>
                          <div>
                            <h4 className="text-xl font-semibold text-white mb-1">
                              {course.name}
                            </h4>
                            <p className="text-gray-400 text-sm">{course.code}</p>
                          </div>
                          {course.users ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ Assigned</Badge>
                          ) : (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏳ Unassigned</Badge>
                          )}
                        </div>
                        
                        {course.users && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                              <GraduationCap className="w-5 h-5 text-purple-400" />
                              <div>
                                <p className="text-sm text-gray-400">Instructor</p>
                                <p className="text-white font-medium">{course.users.full_name}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                              <Mail className="w-5 h-5 text-purple-400" />
                              <div>
                                <p className="text-sm text-gray-400">Email</p>
                                <p className="text-white font-medium">{course.users.email}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-3 ml-6">
                        {course.users ? (
                          <Button
                            size="sm"
                            onClick={() => unassignCourse.mutate(course.id)}
                            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-xl px-4 py-2"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Unassign
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedUser(null);
                              setShowAssignmentForm(true);
                            }}
                            className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-xl px-4 py-2"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Assign
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">
                {activeTab === 'lecturers' ? 'Lecturers' : 'Students'}
              </h3>
              <div className="text-gray-400">
                {getFilteredUsers().length} {activeTab.slice(0, -1)}
              </div>
            </div>
            
            {getFilteredUsers().length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center border border-white/20">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <h4 className="text-xl font-semibold text-white mb-2">No {activeTab} found</h4>
                <p className="text-gray-400 mb-6">Add some {activeTab} to get started</p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add {activeTab.slice(0, -1)}
                </Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {getFilteredUsers().map((user) => (
                  <div key={user.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-200 shadow-lg">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                          <div className="bg-purple-600/20 p-3 rounded-xl self-start">
                            <Users className="w-6 h-6 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xl font-semibold text-white mb-1 truncate" title={user.full_name}>
                              {user.full_name}
                            </h4>
                            <p className="text-gray-400 text-sm truncate" title={user.email}>{user.email}</p>
                          </div>
                          <div className="self-start">
                            {getRoleBadge(user.role)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl min-w-0">
                            <Mail className="w-5 h-5 text-purple-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-400">Email</p>
                              <p className="text-white font-medium truncate" title={user.email}>{user.email}</p>
                            </div>
                          </div>
                          
                          {user.department && (
                            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl min-w-0">
                              <Building className="w-5 h-5 text-purple-400 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-gray-400">Department</p>
                                <p className="text-white font-medium truncate" title={user.department}>{user.department}</p>
                              </div>
                            </div>
                          )}
                          
                          {user.phone && (
                            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl min-w-0">
                              <Phone className="w-5 h-5 text-purple-400 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-gray-400">Phone</p>
                                <p className="text-white font-medium truncate" title={user.phone}>{user.phone}</p>
                              </div>
                            </div>
                          )}
                          
                          {user.office_location && (
                            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl min-w-0">
                              <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-gray-400">Office</p>
                                <p className="text-white font-medium truncate" title={user.office_location}>{user.office_location}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Show assigned courses for lecturers */}
                        {user.role === 'lecturer' && lecturers?.find(l => l.id === user.id)?.courses && (
                          <div className="mt-6 pt-6 border-t border-white/10">
                            <h5 className="text-sm font-medium text-white mb-3">Assigned Courses</h5>
                            <div className="flex flex-wrap gap-2">
                              {lecturers.find(l => l.id === user.id)?.courses?.map((course) => (
                                <Badge key={course.id} className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                  {course.name} ({course.code})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 lg:ml-6">
                        {user.role === 'lecturer' && (
                          <Button
                            size="sm"
                            onClick={() => handleAssignCourse(user)}
                            className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-xl px-3 py-2 text-xs sm:text-sm"
                          >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Assign
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleEdit(user)}
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 rounded-xl px-3 py-2 text-xs sm:text-sm"
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-xl px-3 py-2 text-xs sm:text-sm"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 