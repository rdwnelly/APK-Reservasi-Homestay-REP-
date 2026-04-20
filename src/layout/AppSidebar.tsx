"use client";
import React from "react";
import Link from "next/link";
import { useSidebar } from "../context/SidebarContext";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Rumah Etnik <span className="text-amber-500">Papua</span>
          </span>
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <ul className="mb-6 flex flex-col gap-1.5">
            {/* Menu 1: Dashboard Utama */}
            <li>
              <Link
                href="/"
                className="group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
              >
                <span className="text-xl">📊</span>
                Dashboard Utama
              </Link>
            </li>

            {/* Menu 2: Kelola Reservasi */}
            <li>
              <Link
                href="/reservasi"
                className="group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
              >
                <span className="text-xl">🛏️</span>
                Kelola Reservasi
              </Link>
            </li>

            {/* Menu 3: Laporan Pemasukan */}
            <li>
              <Link
                href="/laporan"
                className="group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
              >
                <span className="text-xl">💰</span>
                Laporan Pemasukan
              </Link>
            </li>

            {/* Menu 4: Kalender Reservasi */}
            <li>
              <Link
                href="/kalender"
                className="group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
              >
                <span className="text-xl">📅</span>
                Kalender Reservasi
              </Link>
            </li>

            {/* Menu 5: Riwayat Kunjungan */}
            <li>
              <Link
                href="/riwayat-kunjungan"
                className="group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
              >
                <span className="text-xl">📜</span>
                Riwayat Kunjungan
              </Link>
            </li>
          </ul>
        </nav>

      </div>
    </aside>
  );
};

export default AppSidebar;
