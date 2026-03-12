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
} from "docx";
import type { Meeting, TranscriptSegment, MeetingSummary } from "@/types/meeting";

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
  summary?: MeetingSummary;
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
      text: "Thong tin cuoc hop",
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
        new TextRun({ text: "Trang thai: ", bold: true }),
        new TextRun(meeting.status),
      ],
      spacing: { after: 50 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "File goc: ", bold: true }),
        new TextRun(meeting.original_filename),
      ],
      spacing: { after: 50 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Ngay tao: ", bold: true }),
        new TextRun(formatDate(meeting.created_at)),
      ],
      spacing: { after: 200 },
    })
  );

  if (includeSummary && summary) {
    children.push(
      new Paragraph({
        text: "Tom tat cuoc hop",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      })
    );

    if (summary.summary) {
      children.push(
        new Paragraph({
          text: "Tong quan",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      children.push(
        new Paragraph({
          text: summary.summary,
          spacing: { after: 200 },
        })
      );
    }

    if (summary.decisions.length > 0) {
      children.push(
        new Paragraph({
          text: "Quyet dinh va diem quan trong",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      summary.decisions.forEach((decision, index) => {
        children.push(
          new Paragraph({
            text: `${index + 1}. ${decision}`,
            spacing: { after: 100 },
          })
        );
      });
    }

    if (summary.tasks.length > 0) {
      children.push(
        new Paragraph({
          text: "Cong viec can thuc hien",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      summary.tasks.forEach((item, index) => {
        const line = `${index + 1}. ${item.task} | Phu trach: ${item.owner || "Chua ro"} | Han: ${item.deadline || "Chua ro"}`;
        children.push(
          new Paragraph({
            text: line,
            spacing: { after: 100 },
          })
        );
      });
    }

    if (summary.deadlines.length > 0) {
      children.push(
        new Paragraph({
          text: "Moc thoi gian",
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );

      summary.deadlines.forEach((deadline, index) => {
        children.push(
          new Paragraph({
            text: `${index + 1}. ${deadline.date}: ${deadline.item}`,
            spacing: { after: 100 },
          })
        );
      });
    }
  }

  if (includeTranscript && segments && segments.length > 0) {
    children.push(
      new Paragraph({
        text: "Ban ghi am chi tiet",
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

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

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
