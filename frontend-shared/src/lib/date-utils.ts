export type FilterPreset =
  | "today"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "choose_month"
  | "custom";

export const FILTER_PRESETS: { value: FilterPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "choose_month", label: "Choose Month" },
  { value: "custom", label: "Range Date" },
];

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toBusinessDateStr(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return dateStr;
}

export const DEFAULT_CURRENCY = "TND";

export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function computeDateRange(
  preset: FilterPreset,
  selectedMonth: string,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const today = toBusinessDateStr(new Date());
  const [currentYear, currentMonth] = today.split("-").map(Number);
  const todayUtc = new Date(`${today}T00:00:00Z`);
  const utcDateString = (date: Date) => date.toISOString().slice(0, 10);

  switch (preset) {
    case "today": {
      return { from: today, to: today };
    }
    case "this_week": {
      const day = (todayUtc.getUTCDay() + 6) % 7; // Monday = 0
      const start = new Date(todayUtc);
      start.setUTCDate(todayUtc.getUTCDate() - day);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      return { from: utcDateString(start), to: utcDateString(end) };
    }
    case "last_week": {
      const day = (todayUtc.getUTCDay() + 6) % 7;
      const start = new Date(todayUtc);
      start.setUTCDate(todayUtc.getUTCDate() - day - 7);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      return { from: utcDateString(start), to: utcDateString(end) };
    }
    case "this_month": {
      const start = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
      const end = new Date(Date.UTC(currentYear, currentMonth, 0));
      return { from: utcDateString(start), to: utcDateString(end) };
    }
    case "last_month": {
      const start = new Date(Date.UTC(currentYear, currentMonth - 2, 1));
      const end = new Date(Date.UTC(currentYear, currentMonth - 1, 0));
      return { from: utcDateString(start), to: utcDateString(end) };
    }
    case "choose_month": {
      if (selectedMonth && /^\d{4}-\d{2}$/.test(selectedMonth)) {
        const [y, mo] = selectedMonth.split("-").map(Number);
        const start = new Date(Date.UTC(y, mo - 1, 1));
        const end = new Date(Date.UTC(y, mo, 0));
        return { from: utcDateString(start), to: utcDateString(end) };
      }
      const start = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
      const end = new Date(Date.UTC(currentYear, currentMonth, 0));
      return { from: utcDateString(start), to: utcDateString(end) };
    }
    case "custom": {
      const from = customFrom || today;
      const to = customTo || today;
      return { from, to };
    }
    default: {
      return { from: today, to: today };
    }
  }
}

