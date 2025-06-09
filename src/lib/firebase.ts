
// MOCK Firebase configuration and utility functions
// In a real application, this file would initialize Firebase and export auth, firestore, etc.

// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Mock Firebase App (conceptual)
// let app: any;
// if (typeof window !== 'undefined' && !getApps().length) {
//   app = initializeApp(firebaseConfig);
// }

// Mock Auth (conceptual)
// export const auth = app ? getAuth(app) : null;

// Mock Firestore (conceptual)
// export const db = app ? getFirestore(app) : null;

// This is a placeholder. In a real app, you'd use Firebase SDK.
export const mockSignInWithEmailAndPassword = async (email?: string, password?: string) => {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (email === "user@example.com" && password === "password123") {
    return {
      user: {
        uid: "mock-user-id",
        email: email,
        displayName: "Test User", // Default display name for test user
      },
    };
  }
  // Simulate a new user if not the test user
  const storedUserString = localStorage.getItem('veritas-user-signup-' + email);
  if (storedUserString) {
    const storedUser = JSON.parse(storedUserString);
    if (storedUser.password === password) {
        return {
            user: {
                uid: storedUser.uid,
                email: storedUser.email,
                displayName: storedUser.displayName,
            }
        };
    }
  }

  throw new Error("Invalid credentials");
};

export const mockCreateUserWithEmailAndPassword = async (email?: string, password?: string, displayName?: string) => {
   if (!email || !password) {
    throw new Error("Email and password are required.");
  }
   if (!displayName) {
    throw new Error("Display name is required.");
  }
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
   // Simulate successful user creation
   const newUser = {
      uid: `mock-new-user-${Date.now()}`,
      email: email,
      displayName: displayName || email.split('@')[0], 
      password: password, // Storing password in mock for login simulation
   };
   // Store this mock user for login simulation
   localStorage.setItem('veritas-user-signup-' + email, JSON.stringify(newUser));

  return {
    user: {
      uid: newUser.uid,
      email: newUser.email,
      displayName: newUser.displayName,
    },
  };
};

export const mockSignOut = async () => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
};

// Add more mock functions as needed (e.g., for Firestore interactions)
export const mockSaveArticle = async (userId: string, articleData: any) => {
  console.log(`Mock saving article for user ${userId}:`, articleData);
  await new Promise(resolve => setTimeout(resolve, 500));
  return { id: `mock-article-${Date.now()}`, ...articleData };
};

export const mockFetchUserArticles = async (userId: string) => {
  console.log(`Mock fetching articles for user ${userId}`);
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Return some mock data
  return [
    { id: 'gen1', type: 'generated', title: 'Mock Generated Article 1', content: 'This is a mock generated article.', topic: 'Tech', category: 'AI', tone: 'Neutral', timestamp: new Date().toISOString(), userId },
    { id: 'det1', type: 'detected', text: 'This is an article to be detected.', result: { label: 'Fake', confidence: 85.3 }, timestamp: new Date().toISOString(), userId },
  ];
};
