import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen z-1 overflow-hidden">
      <ThemeProvider>
        {/* Latar Belakang Gambar */}
        <div 
          className="absolute inset-0 z-[-1] bg-cover bg-center bg-no-repeat blur-[8px] brightness-75 dark:brightness-50 transform scale-110"
          style={{ backgroundImage: "url('/images/bg-login.jpg')" }}
        />
        
        <div className="relative flex w-full min-h-screen items-center justify-center p-6 sm:p-0">
          {/* Card Form */}
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-8 sm:p-12 rounded-[2rem] shadow-2xl max-w-[500px] w-full mx-4 flex flex-col border border-white/20 dark:border-gray-800/50">
            {children}
          </div>
          
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
