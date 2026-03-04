/**
 * Export meeting data to DOCX format
 * Uses docx library for client-side generation
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
} from "docx";
import type { Meeting, TranscriptSegment, AISummary } from "@/types/meeting";

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

export interface ExportOptions {
  meeting: Meeting;
  segments?: TranscriptSegment[];
  summary?: AISummary;
  includeSummary: boolean;
  includeTranscript: boolean;
}

/**
 * Generate DOCX document from meeting data
 */
export async function exportMeetingToDocx(options: ExportOptions): Promise<void> {
  const { meeting, segments, summary, includeSummary, includeTranscript } = options;

  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: meeting.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Metadata section
  children.push(
    new Paragraph({
      text: "Thông tin cuộc họp",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "ID: ", bold: true }),
        new TextRun(meeting.id),
      ],
      spacing: { after: 50 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Trạng thái: ", bold: true }),
        new TextRun(meeting.status),
      ],
      spacing: { after: 50 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "File gốc: ", bold: true }),
        new TextRun(meeting.original_filename),
      ],
      spacing: { after: 50 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Ngày tạo: ", bold: true }),
        new TextRun(formatDate(meeting.created_at)),
      ],
      spacing: { after: 200 },
    })
  );

  // Summary section
  if (includeSummary && summary) {
    children.push(
      new Paragraph({
        text: "Tóm tắt cuộc họp",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      })
    );

    // Executive Summary
    children.push(
      new Paragraph({
        text: "Tổng quan",
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      })
    );

    children.push(
      new Paragraph({
        text: summary.executiveSummary,
        spacing: { after: 200 },
      })
    );

    // Key Highlights
    if (summary.keyHighlights.length > 0) {
      children.push(
        new Paragraph({
          text: "Điểm nổi bật",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      summary.keyHighlights.forEach((highlight, index) => {
        children.push(
          new Paragraph({
            text: `${index + 1}. ${highlight}`,
            spacing: { after: 100 },
          })
        );
      });

      children.push(
        new Paragraph({
          text: "",
          spacing: { after: 100 },
        })
      );
    }

    // Action Items
    if (summary.actionItems.length > 0) {
      children.push(
        new Paragraph({
          text: "Công việc cần làm",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      summary.actionItems.forEach((item, index) => {
        children.push(
          new Paragraph({
            text: `☐ ${item}`,
            spacing: { after: 100 },
          })
        );
      });

      children.push(
        new Paragraph({
          text: "",
          spacing: { after: 200 },
        })
      );
    }
  }

  // Transcript section
  if (includeTranscript && segments && segments.length > 0) {
    children.push(
      new Paragraph({
        text: "Bản ghi âm chi tiết",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      })
    );

    segments.forEach((segment, index) => {
      const timestamp = `[${formatTimestamp(segment.start)} - ${formatTimestamp(segment.end)}]`;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: timestamp,
              color: "666666",
              size: 18,
            }),
            new TextRun({
              text: ` (${segment.speaker})`,
              bold: true,
              size: 20,
            }),
          ],
          spacing: { before: index === 0 ? 0 : 150, after: 50 },
        })
      );

      children.push(
        new Paragraph({
          text: segment.text,
          spacing: { after: 100 },
        })
      );
    });
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // Generate blob and trigger download
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${meeting.title || "meeting"}-${meeting.id}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
