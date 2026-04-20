import { useEffect } from "react";
import { checkAndUpdateReservationStatus } from "@/utils/reservationUtils";

/**
 * Custom hook untuk memastikan auto-archive berjalan saat component mount
 * dan setiap kali page di-focus (ketika user kembali ke tab aplikasi)
 * 
 * Usage:
 * ```
 * const MyComponent = () => {
 *   useAutoArchiveReservations();
 *   // ... rest of component
 * }
 * ```
 */
export function useAutoArchiveReservations() {
  useEffect(() => {
    // Jalankan check saat component mount
    checkAndUpdateReservationStatus();

    // Setup listener untuk ketika page/tab di-focus kembali
    const handleFocus = () => {
      checkAndUpdateReservationStatus();
    };

    window.addEventListener("focus", handleFocus);

    // Cleanup
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
}

/**
 * Custom hook untuk periodic auto-archive dengan interval tertentu
 * 
 * @param intervalMs - Interval dalam milliseconds (default: 5 menit = 300000)
 * 
 * Usage:
 * ```
 * const MyComponent = () => {
 *   useAutoArchiveWithInterval(300000); // Check setiap 5 menit
 *   // ... rest of component
 * }
 * ```
 */
export function useAutoArchiveWithInterval(intervalMs: number = 300000) {
  useEffect(() => {
    // Jalankan check saat component mount
    checkAndUpdateReservationStatus();

    // Setup interval untuk periodic check
    const intervalId = setInterval(() => {
      checkAndUpdateReservationStatus();
    }, intervalMs);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [intervalMs]);
}
