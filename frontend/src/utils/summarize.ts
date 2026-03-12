/**
 * Summarize transcript segments using a simple heuristic approach.
 * This file is kept for older UI components that still expect AISummary.
 */

import type { TranscriptSegment, AISummary, ActionItem } from "@/types/meeting";

const IMPORTANT_KEYWORDS = [
  "muc tieu",
  "quyet dinh",
  "ket luan",
  "deadline",
  "van de",
  "giai phap",
  "quan trong",
  "uu tien",
  "can thiet",
  "ke hoach",
  "chien luoc",
];

const ACTION_KEYWORDS = [
  "can",
  "lam",
  "todo",
  "phai",
  "deadline",
  "giao",
  "assign",
  "phu trach",
  "hoan thanh",
  "thuc hien",
];

const FILLER_WORDS = [
  "a",
  "uh",
  "thi",
  "la",
  "cua",
  "va",
  "co",
  "duoc",
  "nay",
  "do",
];

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function calculateInformativenessScore(text: string): number {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/).filter(Boolean);
  const meaningfulWords = words.filter((word) => !FILLER_WORDS.includes(word));
  const hasImportantKeyword = IMPORTANT_KEYWORDS.some((keyword) => normalized.includes(keyword));

  let score = meaningfulWords.length;
  if (hasImportantKeyword) {
    score += 10;
  }

  if (words.length < 5) {
    score *= 0.5;
  }

  return score;
}

function isActionItem(text: string): boolean {
  const normalized = normalizeText(text);
  return ACTION_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 3)}...`;
}

function generateExecutiveSummary(segments: TranscriptSegment[]): string {
  if (segments.length === 0) {
    return "Khong co noi dung cuoc hop.";
  }

  const parts: string[] = [];

  if (segments[0]) {
    parts.push(truncate(segments[0].text, 150));
  }

  if (segments[1]) {
    parts.push(truncate(segments[1].text, 150));
  }

  if (segments.length > 2) {
    parts.push(truncate(segments[segments.length - 1].text, 150));
  }

  return parts.join(" ");
}

function extractKeyHighlights(segments: TranscriptSegment[]): string[] {
  if (segments.length === 0) return [];

  const scoredSegments = segments.map((segment) => ({
    text: segment.text,
    score: calculateInformativenessScore(segment.text),
  }));

  scoredSegments.sort((a, b) => b.score - a.score);

  const count = Math.min(5, Math.max(3, Math.floor(segments.length * 0.3)));
  return scoredSegments.slice(0, count).map((segment) => segment.text);
}

function extractActionItems(segments: TranscriptSegment[]): ActionItem[] {
  if (segments.length === 0) return [];

  const actionItems: ActionItem[] = [];

  for (const segment of segments) {
    if (!isActionItem(segment.text)) {
      continue;
    }

    actionItems.push({
      id: `action-${actionItems.length + 1}`,
      text: segment.text,
      completed: false,
    });
  }

  const cappedItems = actionItems.slice(0, 7);
  if (cappedItems.length > 0) {
    return cappedItems;
  }

  return [
    {
      id: "action-1",
      text: "Khong tim thay action item cu the trong cuoc hop.",
      completed: false,
    },
  ];
}

export function summarizeTranscript(segments: TranscriptSegment[]): AISummary {
  if (!segments || segments.length === 0) {
    return {
      executiveSummary: "Chua co transcript nen chua the tom tat.",
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
