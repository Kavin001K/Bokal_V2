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
] as const;

export { TAMIL_MONTHS };

const TAMIL_NUMERALS = ["௦", "௧", "௨", "௩", "௪", "௫", "௬", "௭", "௮", "௯"] as const;

export function toTamilNumeral(n: number): string {
  return String(n)
    .split("")
    .map((d) => TAMIL_NUMERALS[Number(d)] ?? d)
    .join("");
}

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
  2028: {
    சித்திரை: "2028-04-14",
    வைகாசி: "2028-05-15",
    ஆனி: "2028-06-15",
    ஆடி: "2028-07-16",
    ஆவணி: "2028-08-17",
    புரட்டாசி: "2028-09-17",
    ஐப்பசி: "2028-10-18",
    கார்த்திகை: "2028-11-16",
    மார்கழி: "2028-12-16",
    தை: "2029-01-14",
    மாசி: "2029-02-13",
    பங்குனி: "2029-03-14",
  },
  2029: {
    சித்திரை: "2029-04-14",
    வைகாசி: "2029-05-15",
    ஆனி: "2029-06-15",
    ஆடி: "2029-07-16",
    ஆவணி: "2029-08-17",
    புரட்டாசி: "2029-09-17",
    ஐப்பசி: "2029-10-18",
    கார்த்திகை: "2029-11-16",
    மார்கழி: "2029-12-16",
    தை: "2030-01-14",
    மாசி: "2030-02-13",
    பங்குனி: "2030-03-14",
  },
  2030: {
    சித்திரை: "2030-04-14",
    வைகாசி: "2030-05-15",
    ஆனி: "2030-06-15",
    ஆடி: "2030-07-16",
    ஆவணி: "2030-08-17",
    புரட்டாசி: "2030-09-17",
    ஐப்பசி: "2030-10-18",
    கார்த்திகை: "2030-11-16",
    மார்கழி: "2030-12-16",
    தை: "2031-01-14",
    மாசி: "2031-02-13",
    பங்குனி: "2031-03-14",
  },
};

const LOOKUP_YEARS = Object.keys(MONTH_START).map(Number).sort((a, b) => a - b);
const DEFAULT_LOOKUP_YEAR = 2026;

function getLookupYearForGregorian(gregYear: number): number {
  if (MONTH_START[gregYear]) return gregYear;
  if (gregYear < LOOKUP_YEARS[0]!) return LOOKUP_YEARS[0]!;
  if (gregYear > LOOKUP_YEARS[LOOKUP_YEARS.length - 1]!) {
    return LOOKUP_YEARS[LOOKUP_YEARS.length - 1]!;
  }
  return DEFAULT_LOOKUP_YEAR;
}

/** Tamil calendar year (e.g. 2083 for Gregorian 2025 after Chithirai). */
export function getTamilYear(d: Date): number {
  const year = d.getFullYear();
  const tamilNewYear = new Date(year, 3, 14);
  return d >= tamilNewYear ? year + 58 : year + 57;
}

export interface TamilDate {
  tamilDate: number;
  tamilMonth: string;
  tamilYear: number;
  display: string;
}

function findTamilMonthDay(target: Date): { month: string; date: number } | null {
  const gregYear = target.getFullYear();
  const yearsToCheck = [gregYear - 1, gregYear, gregYear + 1];

  for (const yr of yearsToCheck) {
    const yearData = MONTH_START[getLookupYearForGregorian(yr)] ?? MONTH_START[DEFAULT_LOOKUP_YEAR]!;
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
        return { month, date: diffDays + 1 };
      }
    }
  }

  return null;
}

export function gregorianToTamil(dateStr: string): TamilDate {
  const target = new Date(dateStr + "T00:00:00");
  const tamilYear = getTamilYear(target);
  const found = findTamilMonthDay(target);

  if (!found) {
    const approxMonth = TAMIL_MONTHS[target.getMonth()] ?? TAMIL_MONTHS[0];
    const fallback = { month: approxMonth, date: target.getDate() };
    return {
      tamilDate: fallback.date,
      tamilMonth: fallback.month,
      tamilYear,
      display: `${fallback.month} ${fallback.date}, ${tamilYear}`,
    };
  }

  return {
    tamilDate: found.date,
    tamilMonth: found.month,
    tamilYear,
    display: `${found.month} ${found.date}, ${tamilYear}`,
  };
}

export function getDaysInTamilMonth(tamilMonth: string, tamilYear: number): number {
  const gregCandidates = [tamilYear - 58, tamilYear - 57, tamilYear - 56, tamilYear - 55];

  for (const gregYear of gregCandidates) {
    const yearData = MONTH_START[getLookupYearForGregorian(gregYear)];
    if (!yearData) continue;

    const startStr = yearData[tamilMonth];
    if (!startStr) continue;

    const monthIdx = TAMIL_MONTHS.indexOf(tamilMonth as (typeof TAMIL_MONTHS)[number]);
    const nextMonth = TAMIL_MONTHS[monthIdx + 1];
    const startDate = new Date(startStr + "T00:00:00");

    if (nextMonth && yearData[nextMonth]) {
      const endDate = new Date(yearData[nextMonth] + "T00:00:00");
      return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    }

    return 32;
  }

  return 30;
}

/** Tamil years for picker: current ± 3 years in Tamil calendar. */
export function getTamilYearOptions(): number[] {
  const current = getTamilYear(new Date());
  return [current - 1, current, current + 1, current + 2, current + 3];
}

export function tamilToGregorian(
  tamilMonth: string,
  tamilDate: number,
  tamilYear: number
): string {
  const gregCandidates = [tamilYear - 58, tamilYear - 57, tamilYear - 56];

  for (const gregYear of gregCandidates) {
    const yearData = MONTH_START[getLookupYearForGregorian(gregYear)];
    if (!yearData) continue;

    const startStr = yearData[tamilMonth];
    if (!startStr) continue;

    const startDate = new Date(startStr + "T00:00:00");
    const maxDays = getDaysInTamilMonth(tamilMonth, tamilYear);
    const safeDay = Math.min(Math.max(1, tamilDate), maxDays);
    const result = new Date(startDate.getTime() + (safeDay - 1) * 24 * 60 * 60 * 1000);
    const y = result.getFullYear();
    const m = String(result.getMonth() + 1).padStart(2, "0");
    const d = String(result.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return todayStr();
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
