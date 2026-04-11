// utils/holidays.ts
// Fetch Indonesian national holidays from a public API

export async function fetchIndonesianHolidays(year: number): Promise<{ date: string; localName: string; }[]> {
  // Using the public API: https://date.nager.at/Api
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/ID`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch holidays');
  const data = await res.json();
  // Map to only needed fields
  return data.map((item: any) => ({ date: item.date, localName: item.localName }));
}
