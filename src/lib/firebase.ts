
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword, signOut as firebaseSignOutAuth, updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp, orderBy, type Timestamp } from 'firebase/firestore';
import type { Article } from '@/types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Export auth and db instances
export const auth = getAuth(app);
export const db = getFirestore(app);

export const signInWithEmailAndPassword = async (email?: string, password?: string) => {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
  try {
    const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
     console.error("Firebase sign in error:", error);
     if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
       throw new Error("Invalid credentials. Please check your email and password. The mock user is user@example.com / password123, or sign up if you don't have an account.");
     }
     throw new Error(error.message || "An unexpected error occurred during sign in.");
  }
};

export const createUserWithEmailAndPassword = async (email?: string, password?: string, displayName?: string) => {
   if (!email || !password) {
    throw new Error("Email and password are required.");
  }
   if (!displayName) {
    throw new Error("Display name is required.");
  }
  
  try {
    const userCredential = await firebaseCreateUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    return userCredential;
  } catch (error: any) {
    console.error("Firebase sign up error:", error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("This email is already in use. Please try logging in or use a different email.");
    }
    throw new Error(error.message || "An unexpected error occurred during sign up.");
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOutAuth(auth);
  } catch (error) {
    console.error("Firebase sign out error:", error);
    throw error;
  }
};

const ARTICLES_COLLECTION = 'articles';

export const saveArticle = async (userId: string, articleData: Omit<Article, 'id' | 'timestamp'> & { timestamp?: any }) => {
  if (!userId) {
    throw new Error("User ID is required to save an article.");
  }
  try {
    const docRef = await addDoc(collection(db, ARTICLES_COLLECTION), {
      ...articleData,
      userId,
      timestamp: serverTimestamp(), 
    });
    const { timestamp, ...restOfArticleData } = articleData; 
    return { id: docRef.id, ...restOfArticleData, userId, timestamp: new Date().toISOString() }; 
  } catch (error) {
    console.error("Error saving article to Firestore:", error);
    throw new Error("Failed to save article.");
  }
};

export const fetchUserArticles = async (userId: string): Promise<Article[]> => {
  if (!userId) {
    console.warn("No user ID provided to fetchUserArticles, returning empty array.");
    return [];
  }
  try {
    const articlesRef = collection(db, ARTICLES_COLLECTION);
    const q = query(articlesRef, where("userId", "==", userId), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const firestoreTimestamp = data.timestamp as Timestamp;
      return {
        id: doc.id,
        ...data,
        timestamp: firestoreTimestamp ? firestoreTimestamp.toDate().toISOString() : new Date().toISOString(),
      } as Article;
    });
  } catch (error) {
    console.error("Error fetching user articles from Firestore:", error);
    throw new Error("Failed to fetch articles.");
  }
};
