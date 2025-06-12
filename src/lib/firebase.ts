
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword, 
  signOut as firebaseSignOutAuth, 
  updateProfile, 
  type User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  serverTimestamp, 
  orderBy, 
  doc, 
  setDoc, 
  type Timestamp 
} from 'firebase/firestore';
import type { Article, GeneratedArticle, DetectedArticle } from '@/types';

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


// Function to create a user document in Firestore
const createUserInFirestore = async (firebaseUser: FirebaseUser) => {
  if (!firebaseUser.email) {
    console.warn("User email is null, cannot create Firestore document properly.");
  }
  const userRef = doc(db, 'users', firebaseUser.uid);
  try {
    await setDoc(userRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email || 'N/A', 
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User',
      createdAt: serverTimestamp(),
    });
    console.log("User document created in Firestore for UID:", firebaseUser.uid);
  } catch (error) {
    console.error("Error creating user document in Firestore:", error);
  }
};


export const signInWithEmailAndPassword = async (email?: string, password?: string) => {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
  try {
    const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error: any) {
     if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
       // This is an expected error type, user will get a toast.
       throw new Error("Invalid credentials. Please check your email and password, or sign up if you don't have an account.");
     }
     // For other, unexpected Firebase errors, log them and then re-throw.
     console.error("Unexpected Firebase sign in error:", error);
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
    const user = userCredential.user;
    await updateProfile(user, { displayName });
    await createUserInFirestore(user); 
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


export const saveArticle = async (userId: string, articleDataToSave: Omit<Article, 'id' | 'timestamp'> & { timestamp?: any }) => {
  if (!userId) {
    throw new Error("User ID is required to save an article.");
  }
  try {
    const userArticlesCollectionRef = collection(db, 'users', userId, 'articles');

    // Create a mutable copy for Firestore and add server timestamp
    const firestorePayload: { [key: string]: any } = {
      ...articleDataToSave,
      timestamp: serverTimestamp(),
    };

    // Remove optional fields if they are undefined, as Firestore doesn't allow undefined.
    if (articleDataToSave.type === 'detected') {
      const detectedData = articleDataToSave as Omit<DetectedArticle, 'id' | 'timestamp'>;
      if (detectedData.justification === undefined) {
        delete firestorePayload.justification;
      }
      if (detectedData.factChecks === undefined) {
        delete firestorePayload.factChecks;
      }
      // detectionMethod is required in the form, so it should be present.
      // If it could be undefined, it would need: if (detectedData.detectionMethod === undefined) delete firestorePayload.detectionMethod;
    } else if (articleDataToSave.type === 'generated') {
      const generatedData = articleDataToSave as Omit<GeneratedArticle, 'id' | 'timestamp'>;
      if (generatedData.imageUrl === undefined) {
        delete firestorePayload.imageUrl;
      }
    }

    const docRef = await addDoc(userArticlesCollectionRef, firestorePayload);
    
    // Return the article with its new ID and the original structure (which might include undefined for client-side state).
    // The client-side timestamp is for immediate UI update consistency.
    const finalReturnedArticle: Article = {
        id: docRef.id,
        ...articleDataToSave, // Uses the original data passed in
        timestamp: new Date().toISOString(), 
    };
    // Ensure userId is part of the final object if it wasn't already in articleDataToSave (it should be)
    if (!finalReturnedArticle.userId) {
        finalReturnedArticle.userId = userId;
    }
    
    return finalReturnedArticle;
  } catch (error) {
    console.error("Error saving article to Firestore:", error);
    if (error instanceof Error && error.message.includes("invalid data")) {
        console.error("Data intended for Firestore (after potential modifications):", articleDataToSave);
        throw new Error(`Failed to save article due to invalid data. Firestore error: ${error.message}. Check server console for data details.`);
    }
    throw new Error("Failed to save article.");
  }
};

export const fetchUserArticles = async (userId: string): Promise<Article[]> => {
  if (!userId) {
    console.warn("No user ID provided to fetchUserArticles, returning empty array.");
    return [];
  }
  try {
    const userArticlesCollectionRef = collection(db, 'users', userId, 'articles');
    const q = query(userArticlesCollectionRef, orderBy("timestamp", "desc"));
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
    throw new Error( (error as Error).message || "Failed to fetch articles from Firestore. Check browser console for more details.");
  }
};
