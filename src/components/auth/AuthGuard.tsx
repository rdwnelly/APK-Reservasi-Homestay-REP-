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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const activeStaff = typeof window !== "undefined" ? localStorage.getItem("activeStaff") : null;
      setLoading(false);
      
      if (!currentUser && !activeStaff) {
        router.push("/signin");
      }
    });

    return unsubscribe;
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-sm font-bold animate-pulse flex items-center gap-2">
          <span>🔄 Memverifikasi Sesi Operasional...</span>
        </div>
      </div>
    );
  }

  const activeStaff = typeof window !== "undefined" ? localStorage.getItem("activeStaff") : null;
  if (!user && !activeStaff) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;