"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for hardcoded admin login
    const isHardcodedAdmin = localStorage.getItem("isHardcodedAdmin") === "true";
    
    if (isHardcodedAdmin) {
      // Mock user object to bypass the null check
      setUser({ uid: "admin", email: "admin@rep.com" } as User);
      setLoading(false);
      return () => {}; // Return empty cleanup
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (!user) {
        router.push("/signin");
      }
    });
    return unsubscribe;
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;