
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, // aliased to avoid conflict with local signOut name
  auth // import auth from firebase.ts
} from '@/lib/firebase'; 
import type { User as AuthUserType } from '@/types'; 
import type { User as FirebaseUserType } from 'firebase/auth'; // Firebase's User type
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext<{
  user: AuthUserType | null;
  loading: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signUp: (email?: string, password?: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
} | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUserType | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUserType | null) => {
      if (firebaseUser) {
        const appUser: AuthUserType = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        };
        setUser(appUser);
        localStorage.setItem('veritas-user', JSON.stringify(appUser)); // Keep for quick UI updates if needed
      } else {
        setUser(null);
        localStorage.removeItem('veritas-user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleAuthSuccess = useCallback((firebaseUser: FirebaseUserType) => {
    const appUser: AuthUserType = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    };
    setUser(appUser);
    localStorage.setItem('veritas-user', JSON.stringify(appUser));
    
    const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
    if (redirectAfterLogin) {
        router.push(redirectAfterLogin);
        localStorage.removeItem('redirectAfterLogin');
    } else {
        router.push('/dashboard');
    }
    setLoading(false);
  }, [router]);

  const signIn = useCallback(async (email?: string, password?: string) => {
    if (!email || !password) {
      setLoading(false);
      throw new Error("Email and password are required.");
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(email, password);
      if (userCredential && userCredential.user) {
        handleAuthSuccess(userCredential.user);
      } else {
        throw new Error("Sign in failed: No user data returned from Firebase.");
      }
    } catch (error) {
      console.error("Sign in error in AuthContext:", error);
      setLoading(false);
      throw error; 
    }
  }, [handleAuthSuccess]);

  const signUp = useCallback(async (email?: string, password?: string, displayName?: string) => {
    if (!email || !password || !displayName) {
       setLoading(false);
      throw new Error("Email, password, and display name are required.");
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(email, password, displayName);
      if (userCredential && userCredential.user) {
        handleAuthSuccess(userCredential.user);
      } else {
         throw new Error("Sign up failed: No user data returned from Firebase.");
      }
    } catch (error) {
      console.error("Sign up error in AuthContext:", error);
      setLoading(false);
      throw error;
    }
  }, [handleAuthSuccess]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(); // Using the aliased import
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
    // This effect handles redirection if user is not logged in and tries to access protected routes.
    // It relies on the onAuthStateChanged listener to set user and loading states.
    const protectedRoutes = ['/dashboard', '/generator', '/detector', '/saved', '/profile', '/settings'];
    if (!loading && !user && protectedRoutes.includes(pathname)) {
      localStorage.setItem('redirectAfterLogin', pathname);
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

