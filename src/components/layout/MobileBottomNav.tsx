"use client";
import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import {
  PieChartIcon,
  BoxIconLine,
  DollarLineIcon,
  CalenderIcon,
} from "@/icons";

const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { isMobileOpen } = useSidebar();

  if (isMobileOpen) return null;

  const getNavButtonClass = (isActive: boolean) => {
    return `flex flex-col items-center justify-center gap-1 rounded-2xl py-2 px-3 transition-all duration-300 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500
    ${
      isActive
        ? "text-brand-600 bg-brand-50 shadow-sm"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;
  };

  return (
    <nav className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-theme-xl border border-gray-200 dark:border-gray-800 lg:hidden">
      <ul className="flex justify-between items-center py-1.5 px-2">
        <li className="flex-1 text-center">
          <Link href="/" className={getNavButtonClass(pathname === "/")} aria-label="Dashboard">
            <PieChartIcon className="h-5 w-5" />
            <span className="mt-0.5">Dashboard</span>
          </Link>
        </li>
        <li className="flex-1 text-center">
          <Link href="/reservasi" className={getNavButtonClass(pathname === "/reservasi")} aria-label="Reservasi">
            <BoxIconLine className="h-5 w-5" />
            <span className="mt-0.5">Reservasi</span>
          </Link>
        </li>
        <li className="flex-1 text-center">
          <Link href="/laporan" className={getNavButtonClass(pathname === "/laporan")} aria-label="Laporan">
            <DollarLineIcon className="h-5 w-5" />
            <span className="mt-0.5">Laporan</span>
          </Link>
        </li>
        <li className="flex-1 text-center">
          <Link href="/kalender" className={getNavButtonClass(pathname === "/kalender")} aria-label="Kalender">
            <CalenderIcon className="h-5 w-5" />
            <span className="mt-0.5">Kalender</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
