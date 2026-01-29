/**
 * Time formatting utilities
 */

/**
 * Formats a date as relative time in Vietnamese
 * @param date - ISO timestamp string or Date object
 * @returns Formatted string like "5 phút trước", "2 giờ trước", "3 ngày trước"
 */
export function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - past.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return "Vừa xong";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  } else if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  } else if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} tuần trước`;
  } else if (diffMonths < 12) {
    return `${diffMonths} tháng trước`;
  } else {
    return `${diffYears} năm trước`;
  }
}

/**
 * Formats a date as full date string in Vietnamese
 * @param date - ISO timestamp string or Date object
 * @returns Formatted string like "28/01/2026 17:30"
 */
export function formatFullDate(date?: string | Date): string {
  if (!date) return "--";

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) return "--";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}
