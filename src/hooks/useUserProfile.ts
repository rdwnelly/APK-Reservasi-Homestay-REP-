import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  photoURL?: string;
  jabatan?: string;
  nomorHP?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const useUserProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({
              ...data,
              createdAt: data.createdAt.toDate(),
              updatedAt: data.updatedAt.toDate(),
            } as UserProfile);
          } else {
            // If no profile exists, create one from Google data
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              firstName: currentUser.displayName?.split(" ")[0] || "",
              lastName: currentUser.displayName?.split(" ").slice(1).join(" ") || "",
              email: currentUser.email || "",
              photoURL: currentUser.photoURL || undefined,
              jabatan: "",
              nomorHP: "",
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            setProfile(newProfile);
          }
        } catch (error: any) {
          console.warn("Error fetching user profile:", error?.message || error);
        }
      } else if (typeof window !== "undefined") {
        // Fallback for active staff logged in via PIN
        const staff = localStorage.getItem("activeStaff");
        if (staff) {
          try {
            const parsed = JSON.parse(staff);
            setProfile({
              uid: parsed.id || "staff-id",
              firstName: parsed.nama || "Staf",
              lastName: parsed.role ? `(${parsed.role})` : "",
              email: parsed.no_hp || "Staf Homestay",
              createdAt: new Date(),
              updatedAt: new Date(),
            } as UserProfile);
          } catch (e) {}
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, profile, loading };
};