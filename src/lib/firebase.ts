
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword, 
  signOut as firebaseSignOutAuth, 
  updateProfile, 
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword, // Added for changing password
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
  deleteDoc,
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
    // Not throwing to user, as this is a background task post-signup
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
     if (error.code === 'auth/user-not-found' || 
         error.code === 'auth/wrong-password' || 
         error.code === 'auth/invalid-credential' || // More generic invalid credential
         error.code === 'auth/invalid-email') {
       throw new Error("Invalid credentials. Please check your email and password, or sign up if you don't have an account.");
     }
     if (error.code === 'auth/too-many-requests') {
        throw new Error("Access to this account has been temporarily disabled due to many failed login attempts. You can try again later or reset your password.");
     }
     if (error.code && typeof error.code === 'string' && error.code.startsWith('auth/visibility-check-was-unavailable')) {
      throw new Error("Login verification unavailable. This might be due to browser settings (like third-party cookie blocking) or a network issue. Please try again. If it persists, check your browser settings or try another browser.");
    }
     console.error("Unexpected Firebase sign in error:", error.code, error.message);
     throw new Error(error.message || "An unexpected error occurred during sign in. Please try again.");
  }
};

export const createUserWithEmailAndPassword = async (email?: string, password?: string, displayName?: string) => {
   if (!email || !password) { // Display name is also crucial for profile update
    throw new Error("Email, password, and display name are required.");
  }
   if (!displayName) { // Explicit check for display name
    throw new Error("Display name is required for signup.");
  }
  
  try {
    const userCredential = await firebaseCreateUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // It's important to await profile update to ensure displayName is set before createUserInFirestore might read it.
    await updateProfile(user, { displayName });
    await createUserInFirestore(user); // Creates Firestore doc after profile update
    return userCredential;
  } catch (error: any) {
    console.error("Firebase sign up error:", error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("This email is already in use. Please try logging in or use a different email.");
    }
    if (error.code === 'auth/weak-password') {
      throw new Error("The password is too weak. Please choose a stronger password (at least 6 characters)."); // Firebase min is 6
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error("The email address is not valid. Please enter a correct email.");
    }
    throw new Error(error.message || "An unexpected error occurred during sign up. Please try again.");
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOutAuth(auth);
  } catch (error: any) {
    console.error("Firebase sign out error:", error);
    throw new Error(error.message || "Failed to sign out. Please try again.");
  }
};

export const sendPasswordReset = async (email: string) => {
  if (!email) {
    throw new Error("Email is required to send a password reset link.");
  }
  try {
    await firebaseSendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error("Firebase password reset error:", error);
    if (error.code === 'auth/invalid-email') {
        throw new Error("The email address is not valid. Please enter a correct email.");
    }
    // For security, user-not-found often isn't explicitly revealed.
    // The generic message in LoginForm is usually sufficient for the user.
    // However, we can throw a slightly more specific internal error if needed for logging.
    if (error.code === 'auth/user-not-found') {
         console.warn(`Password reset attempt for non-existent user: ${email}`);
         // Still throw a generic message to the user via the form.
         // This specific throw here is more for if other parts of the system needed to know.
         // For the current setup, the form's toast is the main user feedback.
         throw new Error("If an account exists for this email, a reset link will be sent. Please check your email.");
    }
    if (error.code === 'auth/too-many-requests') {
        throw new Error("Too many password reset requests. Please try again later.");
    }
    throw new Error(error.message || "Failed to send password reset email. Please try again.");
  }
};

export const updateUserPasswordInFirebase = async (newPassword: string): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error("No authenticated user found. Please sign in again.");
  }
  if (!newPassword) { // This check is good, though Zod validation should catch it first.
    throw new Error("New password cannot be empty.");
  }
  try {
    await firebaseUpdatePassword(auth.currentUser, newPassword);
  } catch (error: any) {
    console.error("Firebase update password error:", error);
    if (error.code === 'auth/requires-recent-login') {
      throw new Error("This operation is sensitive and requires recent authentication. Please sign out and sign back in, then try changing your password again.");
    }
    if (error.code === 'auth/weak-password') {
      // Zod schema should catch this first, but this is a good fallback.
      throw new Error("The new password is too weak. Please choose a stronger password that meets all criteria.");
    }
    if (error.code === 'auth/too-many-requests') {
        throw new Error("Too many attempts to change password. Please try again later.");
    }
    throw new Error(error.message || "Failed to update password. Please try again.");
  }
};


export const saveArticle = async (userId: string, articleDataToSave: Omit<Article, 'id' | 'timestamp'> & { timestamp?: any }) => {
  if (!userId) {
    throw new Error("User ID is required to save an article.");
  }
  try {
    const userArticlesCollectionRef = collection(db, 'users', userId, 'articles');

    const firestorePayload: { [key:string]: any } = {
      ...articleDataToSave,
      timestamp: serverTimestamp(), // Use Firestore server timestamp for consistency
    };

    // Explicitly remove undefined fields which Firestore might reject if not handled by rules
    if (articleDataToSave.type === 'detected') {
      const detectedData = articleDataToSave as Omit<DetectedArticle, 'id' | 'timestamp'>;
      if (detectedData.justification === undefined) delete firestorePayload.justification;
      if (detectedData.factChecks === undefined) delete firestorePayload.factChecks;
    } else if (articleDataToSave.type === 'generated') {
      const generatedData = articleDataToSave as Omit<GeneratedArticle, 'id' | 'timestamp'>;
      if (generatedData.imageUrl === undefined) delete firestorePayload.imageUrl;
    }


    const docRef = await addDoc(userArticlesCollectionRef, firestorePayload);
    
    // Construct the object to return, using a client-generated timestamp for immediate UI update consistency.
    // The serverTimestamp handles the actual stored value.
    const finalReturnedArticle: Article = {
        id: docRef.id,
        ...articleDataToSave,
        timestamp: new Date().toISOString(), // Client timestamp for immediate feedback
    };
    if (!finalReturnedArticle.userId) { // Ensure userId is part of the returned object if not already
        finalReturnedArticle.userId = userId;
    }
    
    return finalReturnedArticle;
  } catch (error: any) {
    console.error("Error saving article to Firestore:", error);
    if (error instanceof Error && error.message.toLowerCase().includes("invalid data")) { // More robust check
        console.error("Data intended for Firestore (after potential modifications):", articleDataToSave); // For server logs
        throw new Error(`Failed to save article: The data provided was in an incorrect format. Please check the content and try again.`);
    }
    throw new Error((error as Error).message || "Failed to save article. Please try again.");
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
      const firestoreTimestamp = data.timestamp as Timestamp; // Assuming 'timestamp' is stored as Firestore Timestamp
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string for client-side consistency
        timestamp: firestoreTimestamp ? firestoreTimestamp.toDate().toISOString() : new Date().toISOString(),
      } as Article; // Cast to Article type
    });
  } catch (error: any) {
    console.error("Error fetching user articles from Firestore:", error);
    // Provide a user-friendly message
    throw new Error( "Failed to fetch your articles due to a server issue. Please try again later.");
  }
};

export const deleteArticle = async (userId: string, articleId: string): Promise<void> => {
  if (!userId) {
    throw new Error("User ID is required to delete an article.");
  }
  if (!articleId) {
    throw new Error("Article ID is required to delete an article.");
  }
  try {
    const articleDocRef = doc(db, 'users', userId, 'articles', articleId);
    await deleteDoc(articleDocRef);
  } catch (error: any) {
    console.error("Error deleting article from Firestore:", error);
    if (error.code === 'permission-denied') {
      throw new Error("Failed to delete article: You do not have permission for this action. Please ensure you are logged in correctly.");
    }
    // More generic user-friendly message
    throw new Error("Failed to delete article due to a server issue. Please try again.");
  }
};

