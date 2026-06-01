"use client";
import Link from "next/link";
import React from "react";
import {
  PieChartIcon,
  BoxIconLine,
  DollarLineIcon,
  CalenderIcon,
  UserIcon,
} from "@/icons";

const navButtonClass =
  "flex flex-col items-center justify-center gap-1 rounded-2xl py-2 px-3 transition duration-200 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500";

const MobileBottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-gray-200 dark:bg-gray-900/95 dark:border-gray-800 lg:hidden">
      <ul className="flex justify-between items-center py-2 px-2">
        <li className="flex-1 text-center">
          <Link href="/" className={navButtonClass} aria-label="Dashboard">
            <PieChartIcon className="h-5 w-5" />
            <span className="text-xs font-medium">Dashboard</span>
          </Link>
        </li>
        <li className="flex-1 text-center">
          <Link href="/reservasi" className={navButtonClass} aria-label="Reservasi">
            <BoxIconLine className="h-5 w-5" />
            <span className="text-xs font-medium">Reservasi</span>
          </Link>
        </li>
        <li className="flex-1 text-center">
          <Link href="/laporan" className={navButtonClass} aria-label="Laporan">
            <DollarLineIcon className="h-5 w-5" />
            <span className="text-xs font-medium">Laporan</span>
          </Link>
        </li>
        <li className="flex-1 text-center">
          <Link href="/kalender" className={navButtonClass} aria-label="Kalender">
            <CalenderIcon className="h-5 w-5" />
            <span className="text-xs font-medium">Kalender</span>
          </Link>
        </li>
        <li className="flex-1 text-center">
          <Link href="/profile" className={navButtonClass} aria-label="Profil">
            <UserIcon className="h-5 w-5" />
            <span className="text-xs font-medium">Profil</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
