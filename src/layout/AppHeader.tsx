"use client";

import { useSidebar } from "@/context/SidebarContext";
import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const AppHeader: React.FC = () => {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        setAdminEmail(user.email);
      } else {
        setAdminEmail("Admin Homestay");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari aplikasi?")) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("SignOut error:", e);
      }
      localStorage.removeItem("activeStaff");
      localStorage.removeItem("isHardcodedAdmin");
      window.location.href = "/signin";
    }
  };

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <header className="sticky top-0 flex w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-50 shadow-sm overflow-hidden transition-colors">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6 relative z-10">
        <div className="flex items-center justify-between w-full gap-2 px-4 py-3 sm:gap-4 lg:justify-normal lg:px-0 lg:py-4">
          <button
            className="items-center justify-center w-10 h-10 text-gray-500 border border-gray-200 rounded-xl z-99999 dark:border-gray-800 flex dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>

          {/* Logo Brand Homestay */}
          <Link href="/" className="flex items-center gap-3 lg:gap-4 transition-opacity hover:opacity-80">
            <Image
              src="/images/logo/logo-rumah-etnik.png"
              alt="Logo Rumah Etnik Papua"
              width={160}
              height={50}
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* User / Admin Status & Logout Button */}
          <div className="flex items-center gap-2.5 ml-auto lg:ml-0">
            <div className="hidden sm:flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 px-3 py-1.5 rounded-full text-xs font-bold text-blue-700 dark:text-blue-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>🔑 {adminEmail || "Admin Homestay"}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
