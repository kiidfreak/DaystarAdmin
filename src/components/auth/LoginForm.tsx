
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  onLogin: (email: string, password: string, role: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Demo role detection based on email
    let role = 'lecturer';
    if (email.includes('admin')) role = 'admin';

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onLogin(email, password, role);
      toast({
        title: "Login Successful",
        description: `Welcome to Tally Check ${role} dashboard`,
      });
    } catch (error) {
      console.log(error);
      toast({
        title: "Login Failed",
        description: "Please check your credentials",
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

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600 mb-4">
                Demo accounts for testing:
              </p>
              <div className="space-y-2 text-xs text-gray-500">
                <p>• <span className="font-semibold">lecturer@uni.edu</span> - Lecturer Dashboard</p>
                <p>• <span className="font-semibold">admin@uni.edu</span> - Admin Dashboard</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
