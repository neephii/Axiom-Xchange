import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, isAdmin: false });

const SUPER_ADMIN_EMAILS = [
  'shawnexchange82@gmail.com',
  'axiomxchange82@gmail.com',
  'neephi8@gmail.com',
  'eemmpatech@gmail.com'
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(() => {
    try {
      const cached = localStorage.getItem('axiom_cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return localStorage.getItem('axiom_cached_admin') === 'true';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubAdmin: (() => void) | null = null;
    let isMounted = true;

    // Safety timeout ensures the UI never hangs or ceases if Firebase network latency occurs
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1200);

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!isMounted) return;
        clearTimeout(safetyTimer);
        setUser(currentUser);
        
        // Cleanup previous listeners
        if (unsubProfile) unsubProfile();
        if (unsubAdmin) unsubAdmin();

        if (currentUser) {
          // Compute immediate admin status for known super admins
          const userEmail = (currentUser.email || '').toLowerCase();
          const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
          setIsAdmin(isSuperAdmin);
          try {
            localStorage.setItem('axiom_cached_admin', String(isSuperAdmin));
          } catch {}

          // Optimistic default profile so UI loads in 0ms without waiting for firestore
          setProfile((prev: any) => {
            const opt = {
              email: currentUser.email,
              username: currentUser.email?.split('@')[0] || "User",
              tier: 1,
              verified: isSuperAdmin,
              totalTradeVolume: 0,
              walletBalance: 0,
              ...(prev || {})
            };
            try {
              localStorage.setItem('axiom_cached_profile', JSON.stringify(opt));
            } catch {}
            return opt;
          });

          // Ensure profile document exists in background without blocking
          const checkProfile = async () => {
            try {
              const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
              if (!profileDoc.exists()) {
                await setDoc(doc(db, 'users', currentUser.uid), {
                  email: currentUser.email,
                  username: currentUser.email?.split('@')[0] || "User",
                  tier: 1,
                  verified: isSuperAdmin,
                  totalTradeVolume: 0,
                  walletBalance: 0,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                }, { merge: true });
              }
            } catch (err) {
              console.warn("Profile check notice (offline/transient):", err);
            }
          };
          checkProfile().catch(() => {});

          // Listen for profile changes with resilient error handling
          unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              setProfile(data);
              try {
                localStorage.setItem('axiom_cached_profile', JSON.stringify(data));
              } catch {}
            }
          }, (err) => {
            console.warn("Profile sync notice:", err?.message || err);
          });
          
          // Listen for admin status changes with fallback
          unsubAdmin = onSnapshot(doc(db, 'admins', currentUser.uid), (snapshot) => {
            const adminStatus = snapshot.exists() || isSuperAdmin;
            setIsAdmin(adminStatus);
            try {
              localStorage.setItem('axiom_cached_admin', String(adminStatus));
            } catch {}
          }, (err) => {
            console.warn("Admin check note:", err?.message || err);
            setIsAdmin(isSuperAdmin);
          });
        } else {
          setProfile(null);
          setIsAdmin(false);
          try {
            localStorage.removeItem('axiom_cached_profile');
            localStorage.removeItem('axiom_cached_admin');
          } catch {}
        }
        
        setLoading(false);
      },
      (authError) => {
        console.warn("Firebase Auth listener notice:", authError);
        clearTimeout(safetyTimer);
        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
      if (unsubAdmin) unsubAdmin();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
