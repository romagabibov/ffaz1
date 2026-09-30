import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  dbUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: string;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  dbUser: null,
  loading: true,
  isAdmin: false,
  userRole: 'user',
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [publicData, setPublicData] = useState<any | null>(null);
  const [privateData, setPrivateData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubPublic: (() => void) | undefined;
    let unsubPrivate: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (unsubPublic) {
        unsubPublic();
        unsubPublic = undefined;
      }
      if (unsubPrivate) {
        unsubPrivate();
        unsubPrivate = undefined;
      }

      if (user) {
        // 1. Subscribe to public profile document
        const publicDocRef = doc(db, 'users', user.uid);
        unsubPublic = onSnapshot(publicDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setPublicData({ id: docSnap.id, ...docSnap.data() });
          } else {
            setPublicData(null);
          }
          setLoading(false);
        }, (error) => {
          console.warn("[AuthContext] Public doc subscription warning:", error);
          setLoading(false);
        });

        // 2. Subscribe to private account document
        const privateDocRef = doc(db, 'users', user.uid, 'private', 'account');
        unsubPrivate = onSnapshot(privateDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setPrivateData(docSnap.data());
          } else {
            // Lazy init private account document if not created yet
            setDoc(privateDocRef, {
              email: user.email || '',
              blockedUsers: [],
              createdAt: serverTimestamp()
            }, { merge: true }).catch(() => {});
          }
        }, (error) => {
          console.warn("[AuthContext] Private doc subscription warning:", error);
        });
      } else {
        setPublicData(null);
        setPrivateData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubPublic) unsubPublic();
      if (unsubPrivate) unsubPrivate();
    };
  }, []);

  // Merge public profile and private account state seamlessly
  const dbUser: User | null = publicData ? ({
    ...publicData,
    ...(privateData || {}),
    email: privateData?.email || currentUser?.email || publicData?.email || '',
    subscriptionTier: privateData?.subscriptionTier || publicData?.subscriptionTier || 'free',
    singleJobCredits: privateData?.singleJobCredits ?? publicData?.singleJobCredits ?? 0,
    hasJobPostingAccess: privateData?.hasJobPostingAccess ?? publicData?.hasJobPostingAccess ?? false,
    warnings: privateData?.warnings ?? publicData?.warnings ?? 0,
    blockedUsers: privateData?.blockedUsers || publicData?.blockedUsers || []
  } as User) : null;

  const role = dbUser?.role || 'user';
  const isAdmin = ['superadmin', 'admin'].includes(role) || 
                  (currentUser?.email != null && ['vnsbek@gmail.com', 'admin@ffaz.az'].includes(currentUser.email.toLowerCase()));

  return (
    <AuthContext.Provider value={{ currentUser, dbUser, loading, isAdmin, userRole: role }}>
      {children}
    </AuthContext.Provider>
  );
};
