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
  UserCheck,
  ChevronDown,
  ChevronRight,
  FileText,
  Activity
} from 'lucide-react';

interface SidebarProps {
  userRole: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  items: MenuItem[];
  isOpen?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole, activeTab, onTabChange, onLogout }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    const newOpenGroups = new Set(openGroups);
    if (newOpenGroups.has(groupId)) {
      newOpenGroups.delete(groupId);
    } else {
      newOpenGroups.add(groupId);
    }
    setOpenGroups(newOpenGroups);
  };

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

  const getMenuGroups = (): MenuGroup[] => {
    const baseGroups: MenuGroup[] = [
      {
        id: 'main',
        label: 'Main',
        icon: Grid2X2,
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: Grid2X2 },
          { id: 'classes', label: 'All Courses', icon: Calendar },
          { id: 'alerts', label: 'Alerts', icon: Bell },
        ]
      }
    ];

    const roleSpecificGroups: MenuGroup[] = [];

    if (userRole === 'student') {
      roleSpecificGroups.push(
        {
          id: 'attendance',
          label: 'Attendance',
          icon: Users,
          items: [
            { id: 'attendance', label: 'My Attendance', icon: Users },
            { id: 'reports', label: 'My Reports', icon: Clock },
          ]
        }
      );
    }

    if (userRole === 'lecturer') {
      roleSpecificGroups.push(
        {
          id: 'attendance-management',
          label: 'Attendance Management',
          icon: Users,
          items: [
            { id: 'attendance', label: 'Live Attendance', icon: Users },
            { id: 'qr-generator', label: 'QR Generator', icon: Monitor },
          ]
        },
        {
          id: 'sessions',
          label: 'Sessions',
          icon: Calendar,
          items: [
            { id: 'sessions', label: 'Session Manager', icon: Calendar },
          ]
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: FileText,
          items: [
            { id: 'reports', label: 'Reports', icon: Clock },
          ]
        },
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
          items: [
            { id: 'profile', label: 'My Profile', icon: User },
          ]
        }
      );
    }

    if (userRole === 'admin') {
      roleSpecificGroups.push(
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          items: [
            { id: 'attendance-analytics', label: 'Attendance Analytics', icon: BarChart3 },
            { id: 'admin-reports', label: 'Admin Reports', icon: Activity },
          ]
        },
        {
          id: 'user-management',
          label: 'User Management',
          icon: Users,
          items: [
            { id: 'students', label: 'All Students', icon: Users },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'course-assignments', label: 'Course Assignments', icon: GraduationCap },
          ]
        },
        {
          id: 'system',
          label: 'System',
          icon: Settings,
          items: [
            { id: 'beacons', label: 'BLE Beacon Manager', icon: Bluetooth },
            { id: 'device-verification', label: 'Device Verification', icon: Smartphone },
            { id: 'lecturer-presence', label: 'Lecturer Presence', icon: UserCheck },
          ]
        }
      );
    }

    return [...baseGroups, ...roleSpecificGroups];
  };

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    return (
      <Button
        key={item.id}
        onClick={() => onTabChange(item.id)}
        variant="ghost"
        className={`w-full justify-start h-10 rounded-lg transition-all duration-300 ml-4 ${
          activeTab === item.id
            ? 'bg-blue-500/20 text-blue-700 border border-blue-300'
            : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200'
        }`}
      >
        <Icon className="w-4 h-4 mr-3" />
        {item.label}
      </Button>
    );
  };

  const renderMenuGroup = (group: MenuGroup) => {
    const Icon = group.icon;
    const isOpen = openGroups.has(group.id);
    const hasActiveItem = group.items.some(item => item.id === activeTab);

    return (
      <div key={group.id} className="space-y-1">
        <Button
          onClick={() => toggleGroup(group.id)}
          variant="ghost"
          className={`w-full justify-between h-12 rounded-xl transition-all duration-300 ${
            hasActiveItem
              ? 'bg-blue-500/10 text-blue-700 border border-blue-200'
              : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center">
            <Icon className="w-5 h-5 mr-3" />
            {group.label}
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>
        
        {isOpen && (
          <div className="space-y-1 mt-2">
            {group.items.map(renderMenuItem)}
          </div>
        )}
      </div>
    );
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

          <nav className="space-y-3">
            {getMenuGroups().map(renderMenuGroup)}
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
