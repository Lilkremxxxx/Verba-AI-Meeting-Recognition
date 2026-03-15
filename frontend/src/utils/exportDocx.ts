/**
 * Export meeting data to DOCX format
 * Uses docx library for client-side generation
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { Meeting, MeetingSummary, TranscriptSegment } from "@/types/meeting";

const SECTION_SPACING = {
  titleAfter: 200,
  sectionBefore: 300,
  headingAfter: 100,
  paragraphAfter: 200,
  itemAfter: 100,
  transcriptBefore: 150,
  transcriptHeaderAfter: 50,
} as const;

/**
 * Format seconds to MM:SS for transcript timestamps
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format date to Vietnamese format
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createHeading(
  text: string,
  heading: HeadingLevel,
  spacing?: { before?: number; after?: number },
): Paragraph {
  return new Paragraph({
    text,
    heading,
    spacing,
  });
}

function createLabelValueParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true }),
      new TextRun(value),
    ],
    spacing: { after: SECTION_SPACING.paragraphAfter },
  });
}

function createPlainParagraph(text: string, after = SECTION_SPACING.itemAfter): Paragraph {
  return new Paragraph({
    text,
    spacing: { after },
  });
}

function pushNumberedSection(
  children: Paragraph[],
  title: string,
  items: string[],
  mapItem?: (item: string, index: number) => string,
): void {
  if (items.length === 0) {
    return;
  }

  children.push(
    createHeading(title, HeadingLevel.HEADING_3, {
      before: 200,
      after: SECTION_SPACING.headingAfter,
    }),
  );

  items.forEach((item, index) => {
    const line = mapItem ? mapItem(item, index) : `${index + 1}. ${item}`;
    children.push(createPlainParagraph(line));
  });
}

function buildMetadataSection(meeting: Meeting): Paragraph[] {
  return [
    createHeading("Thông tin cuộc họp", HeadingLevel.HEADING_2, {
      before: 200,
      after: SECTION_SPACING.headingAfter,
    }),
    createLabelValueParagraph("File gốc: ", meeting.original_filename),
    createLabelValueParagraph("Ngày tạo: ", formatDate(meeting.created_at)),
  ];
}

function buildSummarySection(summary: MeetingSummary): Paragraph[] {
  const children: Paragraph[] = [
    createHeading("Tóm tắt cuộc họp", HeadingLevel.HEADING_2, {
      before: SECTION_SPACING.sectionBefore,
      after: SECTION_SPACING.headingAfter,
    }),
  ];

  if (summary.summary) {
    children.push(
      createHeading("Tổng quan", HeadingLevel.HEADING_3, {
        before: 200,
        after: SECTION_SPACING.headingAfter,
      }),
      createPlainParagraph(summary.summary, SECTION_SPACING.paragraphAfter),
    );
  }

  pushNumberedSection(children, "Quyết định và điểm quan trọng", summary.decisions);

  pushNumberedSection(
    children,
    "Công việc cần thực hiện",
    summary.tasks.map((item) =>
      [
        item.task,
        `Phụ trách: ${item.owner || "Chưa rõ"}`,
        `Hạn: ${item.deadline || "Chưa rõ"}`,
      ].join(" | "),
    ),
    (item, index) => `${index + 1}. ${item}`,
  );

  pushNumberedSection(
    children,
    "Mốc thời gian",
    summary.deadlines.map((deadline) => `${deadline.date}: ${deadline.item}`),
    (item, index) => `${index + 1}. ${item}`,
  );

  return children;
}

function createTranscriptHeader(segment: TranscriptSegment, isFirstSegment: boolean): Paragraph {
  const timestamp = `[${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}]`;
  const speakerLabel = typeof segment.speaker === "string" ? segment.speaker.trim() : "";
  const showSpeaker = speakerLabel && speakerLabel.toLowerCase() !== "null";

  return new Paragraph({
    children: [
      new TextRun({
        text: timestamp,
        color: "666666",
        size: 18,
      }),
      ...(showSpeaker
        ? [
            new TextRun({
              text: ` (${speakerLabel})`,
              bold: true,
              size: 20,
            }),
          ]
        : []),
    ],
    spacing: {
      before: isFirstSegment ? 0 : SECTION_SPACING.transcriptBefore,
      after: SECTION_SPACING.transcriptHeaderAfter,
    },
  });
}

function buildTranscriptSection(segments: TranscriptSegment[]): Paragraph[] {
  const children: Paragraph[] = [
    createHeading("Bản ghi âm chi tiết", HeadingLevel.HEADING_2, {
      before: SECTION_SPACING.sectionBefore,
      after: SECTION_SPACING.headingAfter,
    }),
  ];

  segments.forEach((segment, index) => {
    children.push(createTranscriptHeader(segment, index === 0));
    children.push(createPlainParagraph(segment.text));
  });

  return children;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ExportOptions {
  meeting: Meeting;
  segments?: TranscriptSegment[];
  summary?: MeetingSummary;
  includeSummary: boolean;
  includeTranscript: boolean;
}

/**
 * Generate DOCX document from meeting data
 */
export async function exportMeetingToDocx(options: ExportOptions): Promise<void> {
  const { meeting, segments, summary, includeSummary, includeTranscript } = options;

  const children: Paragraph[] = [
    new Paragraph({
      text: meeting.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: SECTION_SPACING.titleAfter },
    }),
    ...buildMetadataSection(meeting),
  ];

  if (includeSummary && summary) {
    children.push(...buildSummarySection(summary));
  }

  if (includeTranscript && segments && segments.length > 0) {
    children.push(...buildTranscriptSection(segments));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${meeting.title || "meeting"}-${meeting.id}.docx`);
}
