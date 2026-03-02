// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB4pC4KExBGkoNnQToXEFXNhIvyvrQdrDw",
  authDomain: "sla-admin-9ee7e.firebaseapp.com",
  projectId: "sla-admin-9ee7e",
  storageBucket: "sla-admin-9ee7e.firebasestorage.app",
  messagingSenderId: "971564804939",
  appId: "1:971564804939:web:17577b2df2869e6d0296ce",
  measurementId: "G-GWC1Y25RPS",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

export { db, auth };
export default app;
