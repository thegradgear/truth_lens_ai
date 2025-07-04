
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  auth,
  sendPasswordReset,
  updateUserPasswordInFirebase, // Added
} from '@/lib/firebase';
import type { User as AuthUserType } from '@/types';
import type { User as FirebaseUserType } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext<{
  user: AuthUserType | null;
  loading: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signUp: (email?: string, password?: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>; // Added
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
        localStorage.setItem('veritas-user', JSON.stringify(appUser));
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
      await firebaseSignOut();
      setUser(null);
      localStorage.removeItem('veritas-user');
      router.push('/login');
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    if (!email) {
      throw new Error("Email is required.");
    }
    try {
      await sendPasswordReset(email);
    } catch (error) {
      console.error("Send password reset email error in AuthContext:", error);
      throw error; 
    }
  }, []);

  const updateUserPassword = useCallback(async (newPassword: string) => {
    if (!newPassword) {
      throw new Error("New password is required.");
    }
    // setLoading(true); // Consider if global loading is desired for this action
    try {
      await updateUserPasswordInFirebase(newPassword);
    } catch (error) {
      console.error("Update password error in AuthContext:", error);
      // setLoading(false);
      throw error; // Re-throw to be caught by the calling component
    } finally {
      // setLoading(false);
    }
  }, []);


  useEffect(() => {
    const protectedRoutes = ['/dashboard', '/generator', '/detector', '/saved', '/profile', '/settings'];
    if (!loading && !user && protectedRoutes.includes(pathname)) {
      localStorage.setItem('redirectAfterLogin', pathname);
      router.push('/login');
    }
  }, [user, loading, pathname, router]);


  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, sendPasswordResetEmail, updateUserPassword }}>
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
