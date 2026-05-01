const TAMIL_MONTHS = [
  "சித்திரை",
  "வைகாசி",
  "ஆனி",
  "ஆடி",
  "ஆவணி",
  "புரட்டாசி",
  "ஐப்பசி",
  "கார்த்திகை",
  "மார்கழி",
  "தை",
  "மாசி",
  "பங்குனி",
];

export { TAMIL_MONTHS };

const MONTH_START: Record<number, Record<string, string>> = {
  2024: {
    சித்திரை: "2024-04-14",
    வைகாசி: "2024-05-15",
    ஆனி: "2024-06-15",
    ஆடி: "2024-07-16",
    ஆவணி: "2024-08-17",
    புரட்டாசி: "2024-09-17",
    ஐப்பசி: "2024-10-18",
    கார்த்திகை: "2024-11-16",
    மார்கழி: "2024-12-16",
    தை: "2025-01-14",
    மாசி: "2025-02-13",
    பங்குனி: "2025-03-14",
  },
  2025: {
    சித்திரை: "2025-04-14",
    வைகாசி: "2025-05-15",
    ஆனி: "2025-06-15",
    ஆடி: "2025-07-16",
    ஆவணி: "2025-08-17",
    புரட்டாசி: "2025-09-17",
    ஐப்பசி: "2025-10-18",
    கார்த்திகை: "2025-11-16",
    மார்கழி: "2025-12-16",
    தை: "2026-01-14",
    மாசி: "2026-02-13",
    பங்குனி: "2026-03-14",
  },
  2026: {
    சித்திரை: "2026-04-14",
    வைகாசி: "2026-05-15",
    ஆனி: "2026-06-15",
    ஆடி: "2026-07-16",
    ஆவணி: "2026-08-17",
    புரட்டாசி: "2026-09-17",
    ஐப்பசி: "2026-10-18",
    கார்த்திகை: "2026-11-16",
    மார்கழி: "2026-12-16",
    தை: "2027-01-14",
    மாசி: "2027-02-13",
    பங்குனி: "2027-03-14",
  },
  2027: {
    சித்திரை: "2027-04-14",
    வைகாசி: "2027-05-15",
    ஆனி: "2027-06-15",
    ஆடி: "2027-07-16",
    ஆவணி: "2027-08-17",
    புரட்டாசி: "2027-09-17",
    ஐப்பசி: "2027-10-18",
    கார்த்திகை: "2027-11-16",
    மார்கழி: "2027-12-16",
    தை: "2028-01-14",
    மாசி: "2028-02-13",
    பங்குனி: "2028-03-14",
  },
};

function getTamilYear(d: Date): number {
  const year = d.getFullYear();
  const tamilNewYear = new Date(year, 3, 14);
  return d >= tamilNewYear ? year + 31 : year + 30;
}

export interface TamilDate {
  tamilDate: number;
  tamilMonth: string;
  tamilYear: number;
  display: string;
}

export function gregorianToTamil(dateStr: string): TamilDate {
  const target = new Date(dateStr + "T00:00:00");
  const gregYear = target.getFullYear();
  const tamilYear = getTamilYear(target);

  const yearsToCheck = [gregYear - 1, gregYear, gregYear + 1];
  let found: { month: string; date: number } | null = null;

  for (const yr of yearsToCheck) {
    const yearData = MONTH_START[yr] ?? MONTH_START[2026]!;
    const monthEntries = Object.entries(yearData);

    for (let i = 0; i < monthEntries.length; i++) {
      const [month, startStr] = monthEntries[i]!;
      const nextMonthEntry = monthEntries[i + 1];
      const startDate = new Date(startStr + "T00:00:00");

      let endDate: Date;
      if (nextMonthEntry) {
        endDate = new Date(nextMonthEntry[1] + "T00:00:00");
      } else {
        endDate = new Date(startDate.getTime() + 32 * 24 * 60 * 60 * 1000);
      }

      if (target >= startDate && target < endDate) {
        const diffMs = target.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        found = { month, date: diffDays + 1 };
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    const approxMonth = TAMIL_MONTHS[target.getMonth()] ?? "சித்திரை";
    found = { month: approxMonth, date: target.getDate() };
  }

  return {
    tamilDate: found.date,
    tamilMonth: found.month,
    tamilYear,
    display: `${found.month} ${found.date}, ${tamilYear}`,
  };
}

export function tamilToGregorian(
  tamilMonth: string,
  tamilDate: number,
  tamilYear: number
): string {
  const gregYear = tamilYear + 56;
  const yearsToCheck = [gregYear - 1, gregYear, gregYear + 1];

  for (const yr of yearsToCheck) {
    const yearData = MONTH_START[yr] ?? MONTH_START[2026]!;
    const startStr = yearData[tamilMonth];
    if (!startStr) continue;
    const startDate = new Date(startStr + "T00:00:00");
    const result = new Date(
      startDate.getTime() + (tamilDate - 1) * 24 * 60 * 60 * 1000
    );
    const y = result.getFullYear();
    const m = String(result.getMonth() + 1).padStart(2, "0");
    const d = String(result.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return new Date().toISOString().split("T")[0]!;
}

export function formatEnglishDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
