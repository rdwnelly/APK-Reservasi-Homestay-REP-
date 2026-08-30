import { useEffect } from "react";
import { checkAndUpdateReservationStatus } from "@/utils/reservationUtils";

let lastCheckTime = 0;
const THROTTLE_MS = 60000; // Minimal interval 1 menit antar pengecekan

/**
 * Custom hook untuk memastikan auto-archive berjalan saat component mount
 * dan ketika user kembali ke tab aplikasi (dengan proteksi throttle 1 menit)
 */
export function useAutoArchiveReservations() {
  useEffect(() => {
    const now = Date.now();
    if (now - lastCheckTime > THROTTLE_MS) {
      lastCheckTime = now;
      checkAndUpdateReservationStatus();
    }

    const handleFocus = () => {
      const currentTime = Date.now();
      if (currentTime - lastCheckTime > THROTTLE_MS) {
        lastCheckTime = currentTime;
        checkAndUpdateReservationStatus();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
}

/**
 * Custom hook untuk periodic auto-archive dengan interval tertentu
 */
export function useAutoArchiveWithInterval(intervalMs: number = 300000) {
  useEffect(() => {
    const now = Date.now();
    if (now - lastCheckTime > THROTTLE_MS) {
      lastCheckTime = now;
      checkAndUpdateReservationStatus();
    }

    const intervalId = setInterval(() => {
      checkAndUpdateReservationStatus();
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [intervalMs]);
}
