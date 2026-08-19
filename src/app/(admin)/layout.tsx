"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import AuthGuard from "@/components/auth/AuthGuard";
import dynamic from "next/dynamic";
import React from "react";

const MobileBottomNav = dynamic(
  () => import("@/components/layout/MobileBottomNav"),
  {
    ssr: false,
  }
);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <AuthGuard>
      <div className="min-h-screen xl:flex">
        {/* Sidebar and Backdrop */}
        <AppSidebar />
        <Backdrop />
        {/* Main Content Area */}
        <div
          className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
        >
          {/* Header */}
          <AppHeader />
          {/* Page Content */}
          <div className="p-3.5 sm:p-4 md:p-6 pb-28 lg:pb-8 mx-auto max-w-full">{children}</div>
        </div>
        {/* Mobile bottom navigation for easy touch access */}
        <div className="lg:hidden">
          <MobileBottomNav />
        </div>
      </div>
    </AuthGuard>
  );
}
