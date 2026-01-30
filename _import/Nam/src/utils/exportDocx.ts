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
import type { Meeting, TranscriptSegment } from "@/types/meeting";

export interface ExportSummary {
  text: string;
  updated_at?: string;
}

export interface ExportOptions {
  meeting: Meeting;
  segments?: TranscriptSegment[];
  summary?: ExportSummary;
  includeSummary: boolean;
  includeTranscript: boolean;
}

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
  if (includeSummary) {
    if (summary && summary.text) {
      children.push(
        new Paragraph({
          text: "Tóm tắt cuộc họp",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      // Summary text
      children.push(
        new Paragraph({
          text: summary.text,
          spacing: { after: 100 },
        })
      );

      // Updated timestamp if available
      if (summary.updated_at) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Cập nhật: ${formatDate(summary.updated_at)}`,
                italics: true,
                size: 18,
                color: "666666",
              }),
            ],
            spacing: { after: 200 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            text: "",
            spacing: { after: 200 },
          })
        );
      }
    } else {
      // Summary selected but not available - show placeholder
      children.push(
        new Paragraph({
          text: "Tóm tắt cuộc họp",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "(Chưa có tóm tắt)",
              italics: true,
              color: "999999",
            }),
          ],
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
