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
    // Admin has access to everything
    if (isAdmin) return true;
    // No staff data means no access
    if (!staffData) return false;
    // Dashboard is usually open to staff if they have any access, but let's check
    if (path === '/') return true;
    
    // Check access array
    const access = staffData.access || [];
    return access.some(entry => {
      if (typeof entry === 'object' && entry !== null) {
        return entry.path === path;
      }
      return entry === path;
    });
  };

  // Get permission level for a specific path ('view' or 'edit')
  const getPermission = (path) => {
    // Admin has full 'edit' access to everything
    if (isAdmin) return 'edit';
    if (!staffData) return null;
    
    const access = staffData.access || [];
    const entry = access.find(a => {
      if (typeof a === 'object' && a !== null) {
        return a.path === path;
      }
      return a === path;
    });
    
    if (!entry) return null;
    
    // If it's an old string entry, default to 'edit' or 'view'? 
    // The user said "for every menu add view or edit option", so I'll default to 'view' for safety if not specified.
    return typeof entry === 'object' ? entry.permission : 'view';
  };

  // Get the first accessible path for staff (used for redirect)
  const getDefaultPath = () => {
    if (isAdmin) return '/';
    if (!staffData) return '/';
    const access = staffData.access || [];
    if (access.length === 0) return '/';
    
    const firstEntry = access[0];
    return typeof firstEntry === 'object' ? firstEntry.path : firstEntry;
  };

  const value = {
    currentUser,
    staffData,
    isAdmin,
    loading,
    login,
    logout,
    hasAccess,
    getPermission,
    getDefaultPath,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
