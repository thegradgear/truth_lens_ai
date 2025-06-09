"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { mockSignInWithEmailAndPassword, mockCreateUserWithEmailAndPassword, mockSignOut } from '@/lib/firebase'; // Mocked
import { User } from '@/types'; // Define User type

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signUp: (email?: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
} | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Mock session persistence
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('veritas-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
      // If JSON is malformed or any other error, clear it
      localStorage.removeItem('veritas-user');
    }
    setLoading(false);
  }, []);

  const handleAuthSuccess = useCallback((authUser: any) => {
    const userData: User = {
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName || authUser.email?.split('@')[0] || 'User',
    };
    setUser(userData);
    localStorage.setItem('veritas-user', JSON.stringify(userData));
    router.push('/dashboard');
    setLoading(false);
  }, [router]);

  const signIn = useCallback(async (email?: string, password?: string) => {
    setLoading(true);
    try {
      const response = await mockSignInWithEmailAndPassword(email, password);
      if (response && response.user) {
        handleAuthSuccess(response.user);
      } else {
        throw new Error("Sign in failed: No user data returned.");
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setLoading(false);
      throw error; // Re-throw to be caught by the form
    }
  }, [handleAuthSuccess]);

  const signUp = useCallback(async (email?: string, password?: string) => {
    setLoading(true);
    try {
      const response = await mockCreateUserWithEmailAndPassword(email, password);
      if (response && response.user) {
        handleAuthSuccess(response.user);
      } else {
         throw new Error("Sign up failed: No user data returned.");
      }
    } catch (error) {
      console.error("Sign up error:", error);
      setLoading(false);
      throw error; // Re-throw to be caught by the form
    }
  }, [handleAuthSuccess]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await mockSignOut();
      setUser(null);
      localStorage.removeItem('veritas-user');
      router.push('/login');
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!loading && !user && !['/login', '/signup', '/'].includes(pathname) && !pathname.startsWith('/_next/')) {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);


  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
