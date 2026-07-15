const MINUTES_PER_HOUR = 60;
const MINUTES_PER_MONTH = 60 * 24 * 30;

export function formatWatchDuration(totalMinutes: number): string {
  const months = Math.floor(totalMinutes / MINUTES_PER_MONTH);
  const remainingAfterMonths = totalMinutes % MINUTES_PER_MONTH;
  const hours = Math.floor(remainingAfterMonths / MINUTES_PER_HOUR);
  const minutes = remainingAfterMonths % MINUTES_PER_HOUR;

  const parts: string[] = [];
  if (months > 0) parts.push(`${months}mo`);
  if (months > 0 || hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(' ');
}
