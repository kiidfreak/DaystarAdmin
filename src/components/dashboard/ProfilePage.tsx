import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Shield, 
  Edit, 
  Save, 
  X,
  GraduationCap,
  Calendar,
  Clock,
  Star,
  Award,
  TrendingUp,
  BookOpen,
  Users,
  CheckCircle,
  FileText
} from 'lucide-react';

interface ProfilePageProps {
  userRole: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ userRole }) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Mock data for demonstration - in real app, this would come from API
  const mockStats = {
    totalClasses: 24,
    totalStudents: 156,
    averageAttendance: 87.5,
    teachingHours: 48,
    coursesTaught: 3,
    studentSatisfaction: 4.8
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getMotivationalMessage = () => {
    const messages = [
      "You're making a difference in students' lives today! 🌟",
      "Your dedication to teaching is inspiring! 📚",
      "Another great day to shape young minds! 🎓",
      "Your students are lucky to have you! 💫",
      "Keep up the amazing work! 🚀"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password don't match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically make an API call to change the password
    // For now, we'll just show a success message
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully",
    });

    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      lecturer: <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">👨‍🏫 Lecturer</Badge>,
      admin: <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">🛡️ Admin</Badge>,
      student: <Badge className="bg-green-500/20 text-green-400 border-green-500/30">🎓 Student</Badge>
    };
    return badges[role as keyof typeof badges] || badges.lecturer;
  };

  if (!user) {
    return (
      <div className="glass-card p-12 text-center">
        <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Profile Not Found</h2>
        <p className="text-gray-400">Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {getGreeting()}, {user.full_name}! 👋
              </h1>
              <p className="text-gray-300 text-lg mb-2">{getMotivationalMessage()}</p>
              <div className="flex items-center space-x-2">
                {getRoleBadge(user.role)}
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">Member since {new Date().getFullYear()}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
          >
            {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <Input
                  type="text"
                  value={user.full_name}
                  disabled={!isEditing}
                  className="bg-white/10 border-white/20 text-white rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <Input
                  type="email"
                  value={user.email}
                  disabled={true}
                  className="bg-white/10 border-white/20 text-white rounded-xl opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Department</label>
                <Input
                  type="text"
                  value={user.department || 'Not specified'}
                  disabled={!isEditing}
                  className="bg-white/10 border-white/20 text-white rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <Input
                  type="tel"
                  value={user.phone || 'Not specified'}
                  disabled={!isEditing}
                  className="bg-white/10 border-white/20 text-white rounded-xl"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Office Location</label>
                <Input
                  type="text"
                  value={user.office_location || 'Not specified'}
                  disabled={!isEditing}
                  className="bg-white/10 border-white/20 text-white rounded-xl"
                />
              </div>
            </div>
            {isEditing && (
              <div className="mt-6 flex justify-end">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>

          {/* Teaching Statistics */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Teaching Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <BookOpen className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{mockStats.totalClasses}</div>
                <div className="text-sm text-gray-400">Classes Taught</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{mockStats.totalStudents}</div>
                <div className="text-sm text-gray-400">Students</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <CheckCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{mockStats.averageAttendance}%</div>
                <div className="text-sm text-gray-400">Avg Attendance</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <Clock className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{mockStats.teachingHours}h</div>
                <div className="text-sm text-gray-400">Teaching Hours</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <GraduationCap className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{mockStats.coursesTaught}</div>
                <div className="text-sm text-gray-400">Courses</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{mockStats.studentSatisfaction}</div>
                <div className="text-sm text-gray-400">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button
                onClick={() => setIsChangingPassword(true)}
                variant="outline"
                className="w-full border-green-500/30 text-green-400 hover:bg-green-500/20"
              >
                <Shield className="w-4 h-4 mr-2" />
                Change Password
              </Button>
              <Button
                variant="outline"
                className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Schedule
              </Button>
              <Button
                variant="outline"
                className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
              >
                <FileText className="w-4 h-4 mr-2" />
                Download Reports
              </Button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm text-white">Class session completed</div>
                  <div className="text-xs text-gray-400">Computer Science 101</div>
                </div>
                <div className="text-xs text-gray-400">2h ago</div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm text-white">QR code generated</div>
                  <div className="text-xs text-gray-400">Data Structures</div>
                </div>
                <div className="text-xs text-gray-400">4h ago</div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm text-white">Attendance report viewed</div>
                  <div className="text-xs text-gray-400">Weekly summary</div>
                </div>
                <div className="text-xs text-gray-400">1d ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {isChangingPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-6">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white/10 border-white/20 text-white rounded-xl"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsChangingPassword(false)}
                  className="flex-1 border-gray-500/30 text-gray-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Change Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}; 