import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Calendar, Clock, Settings, LogOut, MapPin, Phone } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

interface ProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  onLogout: () => void;
}

export const ProfilePopup: React.FC<ProfilePopupProps> = ({
  isOpen,
  onClose,
  userRole,
  onLogout
}) => {
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    onLogout?.();
    onClose();
  };

  // Use real user data if available, otherwise fall back to role-based defaults
  const getUserInfo = () => {
    if (user) {
      return {
        name: user.full_name,
        email: user.email,
        department: user.department || 'Not specified',
        employeeId: user.id,
        phone: user.phone || 'Not provided',
        officeLocation: user.office_location || 'Not specified',
        joinDate: '2020-01-15' // This could be added to the user table if needed
      };
    }

    // Fallback data based on role
    const roleInfo = {
      lecturer: {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@uni.edu',
        department: 'Computer Science',
        employeeId: 'EMP001',
        phone: '+1 (555) 123-4567',
        officeLocation: 'Building A, Room 201',
        joinDate: '2020-01-15'
      },
      admin: {
        name: 'Michael Admin',
        email: 'admin@uni.edu',
        department: 'IT Administration',
        employeeId: 'ADM001',
        phone: '+1 (555) 987-6543',
        officeLocation: 'Admin Building, Room 101',
        joinDate: '2019-03-10'
      }
    };
    
    return roleInfo[userRole as keyof typeof roleInfo] || roleInfo.lecturer;
  };

  const userInfo = getUserInfo();
  const initials = userInfo.name.split(' ').map(n => n[0]).join('');

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      lecturer: 'bg-blue-100 text-blue-700 border-blue-200',
      admin: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[role as keyof typeof colors] || colors.lecturer;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-gray-200 text-gray-900 max-w-md z-[99999]">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src="" />
              <AvatarFallback className="bg-blue-500/20 text-blue-600 text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{userInfo.name}</h3>
              <Badge className={`text-xs border rounded-lg ${getRoleBadgeColor(user?.role || userRole)}`}>
                {(user?.role || userRole).replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>
          </div>

          {/* Profile Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">{userInfo.email}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Employee ID: {userInfo.employeeId}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Department: {userInfo.department}</span>
            </div>

            {userInfo.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">Phone: {userInfo.phone}</span>
              </div>
            )}

            {userInfo.officeLocation && (
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">Office: {userInfo.officeLocation}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">Joined: {new Date(userInfo.joinDate).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
