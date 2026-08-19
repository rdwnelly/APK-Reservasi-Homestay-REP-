"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  PieChartIcon,
  BoxIconLine,
  DollarLineIcon,
  CalenderIcon,
  DocsIcon,
  PlugInIcon,
  HorizontaLDots,
} from "@/icons";

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-brand-500 text-white h-[calc(100vh-64px)] lg:h-screen transition-all duration-300 ease-in-out z-50 border-r border-brand-600
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
        <div className="absolute inset-0 bg-papua-pattern pointer-events-none mix-blend-overlay"></div>
        <div
        className={`py-8 flex relative z-10 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isMobileOpen || isHovered ? (
            <div className="flex items-center py-2">
              <Image
                src="/images/logo/logo-rumah-etnik.png"
                alt="Logo Rumah Etnik Papua"
                width={180}
                height={60}
                className="w-auto h-14 object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <Image
                src="/images/logo/logo-rumah-etnik.png"
                alt="Logo"
                width={40}
                height={40}
                className="w-auto h-8 object-contain"
              />
            </div>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar relative z-10">
        <nav className="mb-6">
          <ul className="mb-6 flex flex-col gap-1.5">
            {/* Menu 1: Dashboard Utama */}
            <li>
              <Link
                href="/"
                className={`group menu-item ${
                  pathname === "/" ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    pathname === "/"
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  <PieChartIcon className="w-6 h-6" />
                </span>
                <span className={isExpanded || isHovered || isMobileOpen ? "block" : "hidden"}>Dashboard Utama</span>
              </Link>
            </li>

            {/* Menu 2: Kelola Reservasi */}
            <li>
              <Link
                href="/reservasi"
                className={`group menu-item ${
                  pathname === "/reservasi" ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    pathname === "/reservasi"
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  <BoxIconLine className="w-6 h-6" />
                </span>
                <span className={isExpanded || isHovered || isMobileOpen ? "block" : "hidden"}>Kelola Reservasi</span>
              </Link>
            </li>

            {/* Menu 3: Laporan Pemasukan */}
            <li>
              <Link
                href="/laporan"
                className={`group menu-item ${
                  pathname === "/laporan" ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    pathname === "/laporan"
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  <DollarLineIcon className="w-6 h-6" />
                </span>
                <span className={isExpanded || isHovered || isMobileOpen ? "block" : "hidden"}>Laporan Pemasukan</span>
              </Link>
            </li>

            {/* Menu 4: Kalender Reservasi */}
            <li>
              <Link
                href="/kalender"
                className={`group menu-item ${
                  pathname === "/kalender" ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    pathname === "/kalender"
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  <CalenderIcon className="w-6 h-6" />
                </span>
                <span className={isExpanded || isHovered || isMobileOpen ? "block" : "hidden"}>Kalender Reservasi</span>
              </Link>
            </li>

            {/* Menu 5: Riwayat Kunjungan */}
            <li>
              <Link
                href="/riwayat-kunjungan"
                className={`group menu-item ${
                  pathname === "/riwayat-kunjungan" ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    pathname === "/riwayat-kunjungan"
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  <DocsIcon className="w-6 h-6" />
                </span>
                <span className={isExpanded || isHovered || isMobileOpen ? "block" : "hidden"}>Riwayat Kunjungan</span>
              </Link>
            </li>

            {/* Menu 7: Pengaturan */}
            <li>
              <Link
                href="/pengaturan"
                className={`group menu-item ${
                  pathname === "/pengaturan" ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    pathname === "/pengaturan"
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  <HorizontaLDots className="w-6 h-6" />
                </span>
                <span className={isExpanded || isHovered || isMobileOpen ? "block" : "hidden"}>Pengaturan</span>
              </Link>
            </li>

            {/* Menu 8: Keluar Aplikasi */}
            <li className="mt-4 border-t border-white/20 pt-3">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Apakah Anda yakin ingin keluar dari aplikasi?")) {
                    localStorage.removeItem("activeStaff");
                    localStorage.removeItem("isHardcodedAdmin");
                    window.location.href = "/signin";
                  }
                }}
                className="group menu-item text-rose-200 hover:bg-rose-600/30 hover:text-white w-full text-left"
              >
                <span className="menu-item-icon-inactive text-rose-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </span>
                <span className={isExpanded || isHovered || isMobileOpen ? "block font-bold text-rose-200" : "hidden"}>Keluar Aplikasi</span>
              </button>
            </li>
          </ul>
        </nav>

      </div>
    </aside>
  );
};

export default AppSidebar;
