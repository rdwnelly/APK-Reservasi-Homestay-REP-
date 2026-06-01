"use client";
import Link from "next/link";
import React from "react";

const MobileBottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-gray-200 dark:bg-gray-900/95 dark:border-gray-800 lg:hidden">
      <ul className="flex justify-between items-center py-2 px-3">
        <li className="flex-1 text-center">
          <Link href="/" className="flex flex-col items-center gap-1 py-2 px-3 touch-manipulation">
            <span className="text-lg">📊</span>
            <span className="text-xs">Dashboard</span>
          </Link>
        </li>
        <li className="flex-1 text-center">
          <Link href="/reservasi" className="flex flex-col items-center gap-1 py-2 px-3 touch-manipulation">
            <span className="text-lg">🛏️</span>
            <span className="text-xs">Reservasi</span>
          </Link>
        </li>
        <li className="flex-1 text-center">
          <Link href="/laporan" className="flex flex-col items-center gap-1 py-2 px-3 touch-manipulation">
            <span className="text-lg">💰</span>
            <span className="text-xs">Laporan</span>
          </Link>
        </li>
        <li className="flex-1 text-center">
          <Link href="/kalender" className="flex flex-col items-center gap-1 py-2 px-3 touch-manipulation">
            <span className="text-lg">📅</span>
            <span className="text-xs">Kalender</span>
          </Link>
        </li>
        <li className="flex-1 text-center">
          <Link href="/profile" className="flex flex-col items-center gap-1 py-2 px-3 touch-manipulation">
            <span className="text-lg">👤</span>
            <span className="text-xs">Profil</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
