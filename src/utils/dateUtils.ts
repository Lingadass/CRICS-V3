/**
 * Local date helpers that use the device's local year, month, and day
 * rather than UTC ISO timestamps. Accepts an optional IANA timeZone for tests.
 */
export function getLocalDateParts(
  date: Date = new Date(),
  timeZone?: string
): { year: string; month: string; day: string } {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
      const year = parts.find((p) => p.type === 'year')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      if (year && month && day) {
        return { year, month, day };
      }
    } catch {
      // Fall back to Date local getters if Intl timeZone is unrecognized
    }
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return { year, month, day };
}

export function getLocalDateString(
  date: Date = new Date(),
  timeZone?: string
): string {
  const { year, month, day } = getLocalDateParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

export function getLocalYearString(
  date: Date = new Date(),
  timeZone?: string
): string {
  return getLocalDateParts(date, timeZone).year;
}

export function computeBackupAgeDays(
  lastBackupTimestamp?: number,
  now: number = Date.now()
): number | null {
  if (!lastBackupTimestamp || lastBackupTimestamp <= 0) return null;
  const diffMs = Math.max(0, now - lastBackupTimestamp);
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}
