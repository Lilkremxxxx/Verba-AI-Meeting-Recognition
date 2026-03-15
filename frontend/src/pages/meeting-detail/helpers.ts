import type { MeetingSummary } from "@/types/meeting";

export const SUMMARY_LOADING_MESSAGES = [
  "Đang lấy bản tóm tắt từ hệ thống...",
  "Đang gom các quyết định quan trọng...",
  "Đang sắp xếp đầu việc và mốc thời gian...",
] as const;

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function createEmptySummary(): MeetingSummary {
  return {
    summary: "",
    decisions: [],
    tasks: [],
    deadlines: [],
  };
}

export function cloneSummary(summary: MeetingSummary): MeetingSummary {
  return {
    summary: summary.summary,
    decisions: [...summary.decisions],
    tasks: summary.tasks.map((task) => ({ ...task })),
    deadlines: summary.deadlines.map((deadline) => ({ ...deadline })),
  };
}

export function normalizeMeetingSummary(
  summary: Partial<MeetingSummary> | null | undefined,
): MeetingSummary {
  return {
    summary: typeof summary?.summary === "string" ? summary.summary : "",
    decisions: Array.isArray(summary?.decisions)
      ? summary.decisions.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    tasks: Array.isArray(summary?.tasks)
      ? summary.tasks.map((task) => ({
          task: typeof task?.task === "string" ? task.task : "",
          owner: typeof task?.owner === "string" ? task.owner : "",
          deadline: typeof task?.deadline === "string" ? task.deadline : "",
        }))
      : [],
    deadlines: Array.isArray(summary?.deadlines)
      ? summary.deadlines.map((deadline) => ({
          date: typeof deadline?.date === "string" ? deadline.date : "",
          item: typeof deadline?.item === "string" ? deadline.item : "",
        }))
      : [],
  };
}

export function hasSummaryContent(summary: MeetingSummary | null): boolean {
  if (!summary) {
    return false;
  }

  return Boolean(
    summary.summary.trim() ||
      summary.decisions.some((item) => item.trim()) ||
      summary.tasks.some(
        (item) => item.task.trim() || item.owner.trim() || item.deadline.trim(),
      ) ||
      summary.deadlines.some((item) => item.date.trim() || item.item.trim()),
  );
}
