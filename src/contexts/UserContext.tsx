import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department?: string;
  phone?: string;
  office_location?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string, role: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Restore user session on mount
  React.useEffect(() => {
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        // Fetch user data from your users table
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single();
        if (userData) {
          setUser(userData as User);
        }
      }
    };
    restoreSession();
  }, []);

  const login = async (email: string, password: string, role: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // First, try to authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        // If auth fails, try to find user in our users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('role', role)
          .single();

        if (userError || !userData) {
          return { 
            success: false, 
            error: 'User not found or invalid credentials' 
          };
        }

        // Set the user from database
        setUser(userData as User);
        return { success: true };
      }

      // If auth succeeds, get user data from our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        return { 
          success: false, 
          error: 'User not found in database' 
        };
      }

      // Verify role matches
      if (userData.role !== role) {
        return { 
          success: false, 
          error: 'Role mismatch' 
        };
      }

      setUser(userData as User);
      return { success: true };

    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Login failed. Please try again.' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    supabase.auth.signOut();
  };

  return (
    <UserContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}; 