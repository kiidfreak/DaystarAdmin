import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Users, 
  Settings, 
  Bell, 
  Grid2X2, 
  User, 
  LogIn,
  Monitor,
  Clock,
  Bluetooth,
  GraduationCap
} from 'lucide-react';

interface SidebarProps {
  userRole: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole, activeTab, onTabChange, onLogout }) => {
  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Grid2X2 },
      { id: 'classes', label: 'All Courses', icon: Calendar },
    ];

    const roleSpecificItems = {
      lecturer: [
        { id: 'attendance', label: 'Live Attendance', icon: Users },
        { id: 'qr-generator', label: 'QR Generator', icon: Monitor },
        { id: 'sessions', label: 'Session Manager', icon: Calendar },
        { id: 'reports', label: 'Reports', icon: Clock },
      ],
      admin: [
        { id: 'analytics', label: 'Analytics', icon: Monitor },
        { id: 'students', label: 'All Students', icon: Users },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'beacons', label: 'BLE Beacon Manager', icon: Bluetooth },
        { id: 'course-assignments', label: 'Course Assignments', icon: GraduationCap },
      ]
    };

    return [...baseItems, ...(roleSpecificItems[userRole as keyof typeof roleSpecificItems] || [])];
  };

  return (
    <div className="sidebar-glass w-80 h-screen p-6 flex flex-col">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-sky-blue/20 rounded-2xl flex items-center justify-center">
            <span className="text-lg font-bold text-sky-blue">UC</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">UniConnect</h1>
            <p className="text-sm text-gray-400 capitalize">{userRole.replace('_', ' ')} Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {getMenuItems().map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              variant="ghost"
              className={`w-full justify-start h-12 rounded-2xl transition-all duration-300 ${
                activeTab === item.id
                  ? 'bg-sky-blue/20 text-sky-blue border border-sky-blue/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-white/10">
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full justify-start h-12 rounded-2xl text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogIn className="w-5 h-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
