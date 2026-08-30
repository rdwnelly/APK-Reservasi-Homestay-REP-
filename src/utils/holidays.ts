// utils/holidays.ts
// Fetch Indonesian national holidays from public API with offline fallback

export interface HolidayItem {
  date: string;
  localName: string;
  name?: string;
}

const FALLBACK_HOLIDAYS_2026: HolidayItem[] = [
  { date: "2026-01-01", localName: "Tahun Baru 2026 Masehi" },
  { date: "2026-01-16", localName: "Isra Mi'raj Nabi Muhammad SAW" },
  { date: "2026-02-17", localName: "Tahun Baru Imlek 2577 Kongzili" },
  { date: "2026-03-20", localName: "Hari Suci Nyepi (Tahun Baru Saka 1948)" },
  { date: "2026-03-21", localName: "Hari Raya Idul Fitri 1447 Hijriah" },
  { date: "2026-03-22", localName: "Hari Raya Idul Fitri 1447 Hijriah (Hari Ke-2)" },
  { date: "2026-04-03", localName: "Wafat Yesus Kristus (Jumat Agung)" },
  { date: "2026-04-05", localName: "Kebangkitan Yesus Kristus (Paskah)" },
  { date: "2026-05-01", localName: "Hari Buruh Internasional" },
  { date: "2026-05-14", localName: "Kenaikan Yesus Kristus" },
  { date: "2026-05-27", localName: "Hari Raya Idul Adha 1447 Hijriah" },
  { date: "2026-05-31", localName: "Hari Raya Waisak 2570 BE" },
  { date: "2026-06-01", localName: "Hari Lahir Pancasila" },
  { date: "2026-06-16", localName: "Tahun Baru Islam 1448 Hijriah" },
  { date: "2026-08-17", localName: "Hari Kemerdekaan Republik Indonesia" },
  { date: "2026-08-25", localName: "Maulid Nabi Muhammad SAW" },
  { date: "2026-12-25", localName: "Hari Raya Natal" },
];

export async function fetchIndonesianHolidays(
  year: number = new Date().getFullYear()
): Promise<HolidayItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/ID`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error("Failed to fetch holidays");
    const data = await res.json();
    return data.map((item: { date: string; localName: string; name?: string }) => ({
      date: item.date,
      localName: item.localName,
      name: item.name,
    }));
  } catch (err) {
    console.warn("Using fallback Indonesian holidays for year", year);
    return FALLBACK_HOLIDAYS_2026;
  }
}
