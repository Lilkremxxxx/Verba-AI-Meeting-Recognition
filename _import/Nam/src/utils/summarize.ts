/**
 * Summarize transcript segments using heuristic approach
 * No AI backend - simple deterministic rules
 */

import type { TranscriptSegment, AISummary } from "@/types/meeting";

// Keywords for identifying important sentences
const IMPORTANT_KEYWORDS = [
  "mục tiêu",
  "quyết định",
  "kết luận",
  "deadline",
  "vấn đề",
  "giải pháp",
  "quan trọng",
  "ưu tiên",
  "cần thiết",
  "kế hoạch",
  "chiến lược",
];

// Keywords for identifying action items
const ACTION_KEYWORDS = [
  "cần",
  "làm",
  "todo",
  "phải",
  "deadline",
  "giao",
  "assign",
  "đảm nhận",
  "phụ trách",
  "hoàn thành",
  "thực hiện",
];

// Filler words to exclude when counting "informative" content
const FILLER_WORDS = [
  "à",
  "ừ",
  "ờ",
  "thì",
  "là",
  "của",
  "và",
  "có",
  "được",
  "này",
  "đó",
];

/**
 * Calculate informativeness score for a sentence
 * Higher score = more informative
 */
function calculateInformativenessScore(text: string): number {
  const words = text.split(/\s+/);
  const wordCount = words.length;

  // Filter out filler words
  const meaningfulWords = words.filter(
    (word) => !FILLER_WORDS.includes(word.toLowerCase())
  );

  // Check for important keywords
  const hasImportantKeyword = IMPORTANT_KEYWORDS.some((keyword) =>
    text.toLowerCase().includes(keyword)
  );

  // Score = meaningful word count + bonus for keywords
  let score = meaningfulWords.length;
  if (hasImportantKeyword) {
    score += 10; // Bonus for important keywords
  }

  // Penalty for very short sentences
  if (wordCount < 5) {
    score *= 0.5;
  }

  return score;
}

/**
 * Check if a sentence looks like an action item
 */
function isActionItem(text: string): boolean {
  const lowerText = text.toLowerCase();
  return ACTION_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

/**
 * Truncate text to max length with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Generate executive summary from transcript segments
 * Uses first 1-2 segments + last segment
 */
function generateExecutiveSummary(segments: TranscriptSegment[]): string {
  if (segments.length === 0) {
    return "Không có nội dung cuộc họp.";
  }

  const parts: string[] = [];

  // Take first segment
  if (segments[0]) {
    parts.push(truncate(segments[0].text, 150));
  }

  // Take second segment if available
  if (segments.length > 1 && segments[1]) {
    parts.push(truncate(segments[1].text, 150));
  }

  // Take last segment if different from first two
  if (segments.length > 2) {
    const lastSegment = segments[segments.length - 1];
    parts.push(truncate(lastSegment.text, 150));
  }

  return parts.join(" ");
}

/**
 * Extract key highlights from transcript
 * Picks 3-5 most informative sentences
 */
function extractKeyHighlights(segments: TranscriptSegment[]): string[] {
  if (segments.length === 0) return [];

  // Score all segments
  const scoredSegments = segments.map((segment) => ({
    text: segment.text,
    score: calculateInformativenessScore(segment.text),
  }));

  // Sort by score descending
  scoredSegments.sort((a, b) => b.score - a.score);

  // Take top 3-5 (depending on total count)
  const count = Math.min(5, Math.max(3, Math.floor(segments.length * 0.3)));
  const highlights = scoredSegments.slice(0, count).map((s) => s.text);

  return highlights;
}

/**
 * Extract action items from transcript
 * Finds sentences that look like tasks
 */
function extractActionItems(segments: TranscriptSegment[]): string[] {
  if (segments.length === 0) return [];

  const actionItems: string[] = [];

  for (const segment of segments) {
    if (isActionItem(segment.text)) {
      actionItems.push(segment.text);
    }
  }

  // Cap to 3-7 items
  const cappedItems = actionItems.slice(0, 7);

  // If we have too few, return at least something
  if (cappedItems.length === 0 && segments.length > 0) {
    return ["Không tìm thấy action items cụ thể trong cuộc họp."];
  }

  return cappedItems;
}

/**
 * Main function: Summarize transcript segments
 * Returns AISummary object with executive summary, key highlights, and action items
 */
export function summarizeTranscript(segments: TranscriptSegment[]): AISummary {
  if (!segments || segments.length === 0) {
    return {
      executiveSummary: "Chưa có transcript nên chưa thể tóm tắt.",
      keyHighlights: [],
      actionItems: [],
    };
  }

  return {
    executiveSummary: generateExecutiveSummary(segments),
    keyHighlights: extractKeyHighlights(segments),
    actionItems: extractActionItems(segments),
  };
}
