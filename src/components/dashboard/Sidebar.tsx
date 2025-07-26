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
  GraduationCap,
  Menu,
  Smartphone,
  BarChart3,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  userRole: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole, activeTab, onTabChange, onLogout }) => {
  const [collapsed, setCollapsed] = React.useState(false);

  if (collapsed) {
    return (
      <div className="sidebar-glass h-screen flex flex-col items-center justify-start p-2 w-20 transition-all duration-300">
        <Button
          variant="ghost"
          className="mb-4 mt-2"
          onClick={() => setCollapsed(false)}
        >
          <Menu className="w-7 h-7 text-blue-600" />
        </Button>
      </div>
    );
  }

  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Grid2X2 },
      { id: 'classes', label: 'All Courses', icon: Calendar },
      { id: 'alerts', label: 'Alerts', icon: Bell },
    ];

    const roleSpecificItems = {
      student: [
        { id: 'attendance', label: 'My Attendance', icon: Users },
        { id: 'reports', label: 'My Reports', icon: Clock },
      ],
      lecturer: [
        { id: 'attendance', label: 'Live Attendance', icon: Users },
        { id: 'lecturer-presence', label: 'My Sessions', icon: UserCheck },
        { id: 'qr-generator', label: 'QR Generator', icon: Monitor },
        { id: 'sessions', label: 'Session Manager', icon: Calendar },
        { id: 'reports', label: 'Reports', icon: Clock },
      ],
      admin: [
        { id: 'analytics', label: 'Analytics', icon: Monitor },
        { id: 'attendance-analytics', label: 'Attendance Analytics', icon: BarChart3 },
        { id: 'students', label: 'All Students', icon: Users },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'beacons', label: 'BLE Beacon Manager', icon: Bluetooth },
        { id: 'device-verification', label: 'Device Verification', icon: Smartphone },
        { id: 'lecturer-presence', label: 'Lecturer Presence', icon: UserCheck },
        { id: 'course-assignments', label: 'Course Assignments', icon: GraduationCap },
      ]
    };

    return [...baseItems, ...(roleSpecificItems[userRole as keyof typeof roleSpecificItems] || [])];
  };

  return (
    <div className="sidebar-glass w-80 h-screen flex flex-col transition-all duration-300 bg-white">
      <div className="flex flex-col h-full bg-white">
        <div className="p-6 bg-white">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <div className="relative">
                  <div className="text-lg font-bold text-white">T</div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-1.5 h-1.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tally Check</h1>
                <p className="text-sm text-gray-600 capitalize">{userRole.replace('_', ' ')} Panel</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="ml-2"
              onClick={() => setCollapsed(true)}
            >
              <Menu className="w-7 h-7 text-blue-600" />
            </Button>
          </div>

          <nav className="space-y-2">
            {getMenuItems().map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  variant="ghost"
                  className={`w-full justify-start h-12 rounded-xl transition-all duration-300 ${
                    activeTab === item.id
                      ? 'bg-blue-500/20 text-blue-700 border border-blue-300'
                      : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-200 bg-white">
          <Button
            onClick={onLogout}
            variant="ghost"
            className="w-full justify-start h-12 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200"
          >
            <LogIn className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
