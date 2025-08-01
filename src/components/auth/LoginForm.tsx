
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Shield, UserPlus } from 'lucide-react';

interface LoginFormProps {
  onLogin: (email: string, password: string, role: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const { toast } = useToast();

  // Temporary function to create admin account
  const createAdminAccount = async () => {
    setIsCreatingAdmin(true);
    try {
      // First check if admin already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', 'admin@tallycheck.com')
        .limit(1);

      if (checkError) {
        throw new Error(`Failed to check existing users: ${checkError.message}`);
      }

      if (existingUsers && existingUsers.length > 0) {
        toast({
          title: "Admin Already Exists",
          description: "Admin account already exists. Use admin@tallycheck.com / Admin123! to login.",
        });
        return;
      }

      // Create user profile in users table first (without auth)
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
        title: "✅ Admin Account Created!",
        description: "Admin profile created. You can now login with admin@tallycheck.com / Admin123!",
      });

      // Auto-fill the form
      setEmail('admin@tallycheck.com');
      setPassword('Admin123!');

    } catch (error) {
      console.error('Admin creation error:', error);
      toast({
        title: "❌ Admin Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create admin account",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First try to get user profile directly
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('User not found. Please create an admin account first.');
      }

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // For now, bypass auth and directly login with profile
      // This is a temporary solution until we can set up proper auth
      // Allow any user that exists in the database to log in
      // In the future, we'll implement proper password validation
      onLogin(email, password, userProfile.role);
      
      toast({
        title: "Login Successful",
        description: `Welcome to Tally Check ${userProfile.role} dashboard`,
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Please check your credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Logo & Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 items-center justify-center p-12">
        <div className="text-center text-white max-w-md">
          {/* Large Logo with provided design */}
          <div className="w-32 h-32 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <div className="relative">
              <div className="text-6xl font-bold text-white">T</div>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl font-bold mb-4">Tally Check</h1>
          <p className="text-xl text-gray-200 mb-8">Professional Attendance Management</p>
          
          {/* Decorative Elements */}
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <div className="w-3 h-3 bg-white/50 rounded-full"></div>
              <div className="w-3 h-3 bg-white/30 rounded-full"></div>
            </div>
            <p className="text-sm text-gray-300">
              Streamline attendance tracking with modern technology
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo (visible on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <div className="relative">
                <div className="text-3xl font-bold text-white">T</div>
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-blue-600 mb-2">Tally Check</h1>
            <p className="text-gray-600">Admin & Lecturer Dashboard</p>
          </div>

          <Card className="p-8 border border-gray-200 shadow-xl rounded-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-blue-600 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-blue-600 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-2 border-gray-200 text-gray-900 placeholder:text-gray-500 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all duration-300"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-blue-600 mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-2 border-gray-200 text-gray-900 placeholder:text-gray-500 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all duration-300"
                  required
                />
              </div>
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Temporary Admin Creation Button */}
            <div className="mt-6">
              <Button
                type="button"
                onClick={createAdminAccount}
                disabled={isCreatingAdmin}
                variant="outline"
                className="w-full h-12 border-2 border-green-200 text-green-600 hover:bg-green-50 font-medium rounded-xl transition-all duration-300"
              >
                {isCreatingAdmin ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Admin Account...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Create Admin Account</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                First time setup? Click "Create Admin Account" above to create the default admin account.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
