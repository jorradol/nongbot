import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser,
  signInAnonymously,
  GoogleAuthProvider
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp 
} from "firebase/firestore";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "../firebase";
import { UserProfile } from "../types";

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  deductCredit: () => Promise<boolean>;
  addCredits: (amount: number) => Promise<void>;
  accessToken: string | null;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitor Auth state changes
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      // Unsubscribe from any active snapshot listener before setting up next state
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      setFirebaseUser(fUser);
      
      if (fUser) {
        localStorage.removeItem("nongbot_demo_user");
        const userDocRef = doc(db, "users", fUser.uid);
        
        // Listen to changes in credit count in real-time
        unsubUserDoc = onSnapshot(userDocRef, async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            let parsedCreatedAt = new Date().toISOString();
            if (data.createdAt) {
              if (typeof data.createdAt.seconds === "number") {
                parsedCreatedAt = new Date(data.createdAt.seconds * 1000).toISOString();
              } else if (typeof data.createdAt === "string") {
                parsedCreatedAt = data.createdAt;
              }
            }

            setUser({
              uid: fUser.uid,
              name: data.name || fUser.displayName || "Online Seller",
              email: data.email || fUser.email || "seller@nongbot.app",
              credits: typeof data.credits === "number" ? data.credits : 50,
              createdAt: parsedCreatedAt
            });
          } else {
            // Document doesn't exist, create it with 50 starter credits
            const newUserProfile = {
              uid: fUser.uid,
              name: fUser.displayName || "Online Seller",
              email: fUser.email || "seller@nongbot.app",
              credits: 50,
              createdAt: new Date().toISOString()
            };
            
            try {
              await setDoc(userDocRef, {
                uid: newUserProfile.uid,
                name: newUserProfile.name,
                email: newUserProfile.email,
                credits: newUserProfile.credits,
                createdAt: serverTimestamp()
              });
              
              setUser(newUserProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${fUser.uid}`);
            }
          }
          setLoading(false);
        }, (err) => {
          console.warn("User document listener encountered a transient error:", err.message);
          setLoading(false);
        });
      } else {
        const storedDemoUser = localStorage.getItem("nongbot_demo_user");
        if (storedDemoUser) {
          try {
            setUser(JSON.parse(storedDemoUser));
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
    } catch (error) {
      console.error("Google login failed:", error);
      setLoading(false);
      throw error;
    }
  };

  const loginDemo = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      console.warn("Firebase Anonymous Auth is not enabled on this project. Falling back to local demo mode:", error.message);
      const demoUserProfile = {
        uid: "demo_user_nongbot",
        name: "ผู้เยี่ยมชมทดลองระบบ (Demo Mode)",
        email: "demo@nongbot.app",
        credits: 50,
        createdAt: new Date().toISOString(),
        isDemo: true
      };
      localStorage.setItem("nongbot_demo_user", JSON.stringify(demoUserProfile));
      setUser(demoUserProfile);
      setFirebaseUser(null);
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem("nongbot_demo_user");
      await signOut(auth);
      setAccessToken(null);
    } catch (error) {
      console.error("Logout failed:", error);
      setLoading(false);
    }
  };

  // Deduct 1 credit for generating a post
  const deductCredit = async (): Promise<boolean> => {
    if (!user) return false;

    if (user.credits <= 0) {
      alert("ขออภัยครับ! เครดิตของคุณหมดแล้ว โปรดสมัครเชื่อมต่อด้วยระบบจริงหรือติดต่อผู้ดูแล");
      return false;
    }

    if ((user as any).isDemo) {
      const updatedUser = { ...user, credits: user.credits - 1 };
      localStorage.setItem("nongbot_demo_user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      return true;
    }

    if (!firebaseUser) return false;
    const userDocRef = doc(db, "users", firebaseUser.uid);
    try {
      await updateDoc(userDocRef, {
        credits: user.credits - 1
      });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
      return false;
    }
  };

  // Grant credits (for topups or demo testing)
  const addCredits = async (amount: number) => {
    if (!user) return;

    if ((user as any).isDemo) {
      const updatedUser = { ...user, credits: user.credits + amount };
      localStorage.setItem("nongbot_demo_user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      return;
    }

    if (!firebaseUser) return;
    const userDocRef = doc(db, "users", firebaseUser.uid);
    try {
      await updateDoc(userDocRef, {
        credits: user.credits + amount
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      loginWithGoogle,
      loginDemo,
      logout,
      deductCredit,
      addCredits,
      accessToken,
      setAccessToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
