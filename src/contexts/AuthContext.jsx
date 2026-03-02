import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase.js';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Check if user is admin (hardcoded admin email or first user)
        // Admin users have full access
        try {
          const staffDoc = await getDoc(doc(db, 'staff', user.uid));
          if (staffDoc.exists()) {
            const data = staffDoc.data();
            setStaffData(data);
            setIsAdmin(data.role === 'Admin');
          } else {
            // If no staff doc, treat as admin (original admin user)
            setStaffData(null);
            setIsAdmin(true);
          }
        } catch (err) {
          console.error('Error fetching staff data:', err);
          setStaffData(null);
          setIsAdmin(true);
        }
      } else {
        setStaffData(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    return signOut(auth);
  };

  // Check if user has access to a specific path
  const hasAccess = (path) => {
    // Admin has access to everything (user NOT in staff collection)
    if (isAdmin) return true;
    // No staff data means no access
    if (!staffData) return false;
    // Dashboard is admin-only
    if (path === '/') return false;
    // Check access array
    const accessPaths = staffData.access || [];
    return accessPaths.includes(path);
  };

  // Get the first accessible path for staff (used for redirect)
  const getDefaultPath = () => {
    if (isAdmin) return '/';
    if (!staffData) return '/';
    const accessPaths = staffData.access || [];
    return accessPaths.length > 0 ? accessPaths[0] : '/';
  };

  const value = {
    currentUser,
    staffData,
    isAdmin,
    loading,
    login,
    logout,
    hasAccess,
    getDefaultPath,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
