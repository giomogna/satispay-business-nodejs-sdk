const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Formats a date as RFC 1123 in UTC with a numeric offset,
 * e.g. `Mon, 18 Mar 2019 15:10:24 +0000`.
 */
export function getFormattedCurrentDate(date: Date = new Date()): string {
  const day = DAYS[date.getUTCDay()]!;
  const month = MONTHS[date.getUTCMonth()]!;
  return `${day}, ${pad(date.getUTCDate())} ${month} ${date.getUTCFullYear()} ${pad(
    date.getUTCHours(),
  )}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} +0000`;
}
