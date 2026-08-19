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

  const handleLogout = () => {
    if (confirm("Apakah Anda yakin ingin keluar dari aplikasi?")) {
      localStorage.removeItem("activeStaff");
      localStorage.removeItem("isHardcodedAdmin");
      window.location.href = "/signin";
    }
  };

  const getNavButtonClass = (isActive: boolean) => {
    return `flex flex-col items-center justify-center gap-1 rounded-2xl py-2 px-2 transition-all duration-300 text-[11px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500
    ${
      isActive
        ? "text-brand-600 bg-brand-50 shadow-sm font-bold"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;
  };

  return (
    <nav className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-theme-xl border border-gray-200 dark:border-gray-800 lg:hidden">
      <ul className="flex justify-between items-center py-1.5 px-1.5">
        <li className="flex-1 text-center">
          <Link href="/" className={getNavButtonClass(pathname === "/")} aria-label="Dashboard">
            <PieChartIcon className="h-5 w-5" />
            <span className="mt-0.5">Beranda</span>
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
        <li className="flex-1 text-center">
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2 px-2 transition-all duration-300 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 w-full"
            aria-label="Keluar"
          >
            <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="mt-0.5">Keluar</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
