/**
 * Mock data generator for meeting details
 * Uses deterministic fake data based on meeting ID
 */

import type { TranscriptSegment, AISummary, ActionItem } from "@/types/meeting";

/**
 * Simple hash function to generate deterministic seed from meeting ID
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded random number generator for deterministic output
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

const SPEAKERS = ["Nguyễn Văn A", "Trần Thị B", "Lê Văn C", "Phạm Thị D"];

const TRANSCRIPT_PHRASES = [
  "Chào mọi người, hôm nay chúng ta sẽ thảo luận về dự án mới.",
  "Tôi nghĩ chúng ta nên tập trung vào việc cải thiện trải nghiệm người dùng.",
  "Đúng vậy, và chúng ta cũng cần xem xét về hiệu suất của hệ thống.",
  "Theo tôi, chúng ta nên ưu tiên các tính năng quan trọng nhất trước.",
  "Tôi đồng ý. Chúng ta có thể bắt đầu với module đăng nhập và xác thực.",
  "Về mặt kỹ thuật, chúng ta sẽ sử dụng công nghệ nào?",
  "Tôi đề xuất sử dụng React và TypeScript cho frontend.",
  "Còn backend thì sao? Chúng ta có nên dùng Node.js không?",
  "Đúng, Node.js với Express sẽ phù hợp cho dự án này.",
  "Chúng ta cần bao nhiêu thời gian để hoàn thành giai đoạn đầu?",
  "Tôi ước tính khoảng 2-3 tuần cho MVP.",
  "Được rồi, vậy chúng ta sẽ phân công công việc như thế nào?",
  "Tôi sẽ đảm nhận phần frontend và UI/UX.",
  "Tôi có thể làm backend và API integration.",
  "Tuyệt vời, còn ai sẽ phụ trách testing và QA?",
  "Tôi sẽ lo phần đó và viết test cases.",
  "Chúng ta cũng cần chuẩn bị tài liệu kỹ thuật.",
  "Đúng vậy, tôi sẽ soạn thảo tài liệu API.",
  "Còn về database schema thì sao?",
  "Tôi sẽ thiết kế schema và tạo migration scripts.",
  "Chúng ta có cần họp lại vào tuần sau không?",
  "Có, tôi nghĩ chúng ta nên họp vào thứ Hai.",
  "Được, vậy tôi sẽ gửi lịch họp cho mọi người.",
  "Cảm ơn mọi người đã tham gia cuộc họp hôm nay.",
];

const SUMMARY_TEMPLATES = [
  "Cuộc họp tập trung vào việc lập kế hoạch và phân công công việc cho dự án mới. Nhóm đã thảo luận về công nghệ sử dụng, timeline và phân chia trách nhiệm.",
  "Nhóm đã thảo luận chi tiết về kiến trúc hệ thống và các quyết định kỹ thuật quan trọng. Các thành viên đã đồng thuận về hướng đi và phân công nhiệm vụ cụ thể.",
  "Cuộc họp xem xét tiến độ dự án hiện tại và xác định các vấn đề cần giải quyết. Nhóm đã đưa ra các giải pháp và kế hoạch hành động cho giai đoạn tiếp theo.",
];

const HIGHLIGHTS_TEMPLATES = [
  [
    "Quyết định sử dụng React + TypeScript cho frontend",
    "Backend sẽ dùng Node.js với Express framework",
    "Timeline dự kiến: 2-3 tuần cho MVP",
    "Phân công rõ ràng trách nhiệm cho từng thành viên",
  ],
  [
    "Ưu tiên cải thiện trải nghiệm người dùng",
    "Tập trung vào các tính năng cốt lõi trước",
    "Cần chuẩn bị tài liệu kỹ thuật đầy đủ",
    "Lên lịch họp định kỳ để theo dõi tiến độ",
  ],
  [
    "Xác định các module ưu tiên: đăng nhập và xác thực",
    "Thiết kế database schema và migration",
    "Lập kế hoạch testing và QA",
    "Chuẩn bị tài liệu API cho team",
  ],
];

const ACTION_ITEMS_TEMPLATES = [
  [
    { text: "Thiết kế UI mockups cho các màn hình chính", assignee: "Nguyễn Văn A" },
    { text: "Setup project structure và cấu hình TypeScript", assignee: "Trần Thị B" },
    { text: "Viết API documentation cho các endpoints", assignee: "Lê Văn C" },
    { text: "Tạo database schema và migration scripts", assignee: "Phạm Thị D" },
    { text: "Lên lịch họp review vào tuần sau", assignee: "Nguyễn Văn A" },
  ],
  [
    { text: "Nghiên cứu và đề xuất thư viện UI components", assignee: "Trần Thị B" },
    { text: "Setup CI/CD pipeline cho dự án", assignee: "Lê Văn C" },
    { text: "Viết test cases cho các tính năng chính", assignee: "Phạm Thị D" },
    { text: "Chuẩn bị presentation cho stakeholders", assignee: "Nguyễn Văn A" },
  ],
  [
    { text: "Review và approve technical design document", assignee: "Lê Văn C" },
    { text: "Setup development environment cho team", assignee: "Trần Thị B" },
    { text: "Tạo project roadmap và milestones", assignee: "Nguyễn Văn A" },
    { text: "Liên hệ với team QA để lên kế hoạch testing", assignee: "Phạm Thị D" },
  ],
];

/**
 * Generate fake transcript segments for a meeting
 */
export function getFakeTranscript(meetingId: string): TranscriptSegment[] {
  const seed = hashCode(meetingId);
  const rng = new SeededRandom(seed);
  
  const segmentCount = rng.nextInt(15, 25);
  const segments: TranscriptSegment[] = [];
  
  let currentTime = 0;
  
  for (let i = 0; i < segmentCount; i++) {
    const speaker = rng.choice(SPEAKERS);
    const speakerLabel = `Speaker ${SPEAKERS.indexOf(speaker) + 1}`;
    const duration = rng.nextInt(5, 15);
    const text = rng.choice(TRANSCRIPT_PHRASES);
    
    segments.push({
      id: `segment-${i}`,
      speaker,
      speakerLabel,
      startTime: currentTime,
      endTime: currentTime + duration,
      text,
    });
    
    currentTime += duration + rng.nextInt(1, 3); // Add pause between segments
  }
  
  return segments;
}

/**
 * Generate fake AI summary for a meeting
 */
export function getFakeSummary(meetingId: string): AISummary {
  const seed = hashCode(meetingId);
  const rng = new SeededRandom(seed);
  
  const summaryIndex = rng.nextInt(0, SUMMARY_TEMPLATES.length - 1);
  const highlightsIndex = rng.nextInt(0, HIGHLIGHTS_TEMPLATES.length - 1);
  const actionItemsIndex = rng.nextInt(0, ACTION_ITEMS_TEMPLATES.length - 1);
  
  const actionItems: ActionItem[] = ACTION_ITEMS_TEMPLATES[actionItemsIndex].map(
    (item, index) => ({
      id: `action-${index}`,
      text: item.text,
      assignee: item.assignee,
      completed: rng.next() > 0.7, // 30% chance of being completed
    })
  );
  
  return {
    executiveSummary: SUMMARY_TEMPLATES[summaryIndex],
    keyHighlights: HIGHLIGHTS_TEMPLATES[highlightsIndex],
    actionItems,
  };
}

/**
 * Format time in seconds to MM:SS format
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
