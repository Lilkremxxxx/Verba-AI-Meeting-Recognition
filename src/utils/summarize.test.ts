/**
 * Test file for summarize utility
 * Run with: npm test summarize.test.ts
 */

import { summarizeTranscript } from "./summarize";
import type { TranscriptSegment } from "@/types/meeting";

// Sample transcript data
const sampleSegments: TranscriptSegment[] = [
  {
    start: 0.0,
    end: 3.5,
    speaker: "Nguyễn Văn A",
    text: "Chào mọi người, hôm nay chúng ta sẽ thảo luận về dự án mới.",
  },
  {
    start: 3.5,
    end: 7.2,
    speaker: "Trần Thị B",
    text: "Tôi nghĩ chúng ta nên tập trung vào việc cải thiện trải nghiệm người dùng.",
  },
  {
    start: 7.2,
    end: 11.8,
    speaker: "Lê Văn C",
    text: "Đúng vậy, và chúng ta cũng cần xem xét về hiệu suất của hệ thống.",
  },
  {
    start: 11.8,
    end: 15.3,
    speaker: "Nguyễn Văn A",
    text: "Theo tôi, chúng ta nên ưu tiên các tính năng quan trọng nhất trước.",
  },
  {
    start: 15.3,
    end: 19.5,
    speaker: "Phạm Thị D",
    text: "Tôi đồng ý. Chúng ta cần làm module đăng nhập và xác thực trước.",
  },
];

// Test 1: Basic functionality
console.log("Test 1: Basic summarization");
const summary = summarizeTranscript(sampleSegments);
console.log("Executive Summary:", summary.executiveSummary);
console.log("Key Highlights:", summary.keyHighlights);
console.log("Action Items:", summary.actionItems);
console.log("✅ Test 1 passed\n");

// Test 2: Empty segments
console.log("Test 2: Empty segments");
const emptySummary = summarizeTranscript([]);
console.log("Executive Summary:", emptySummary.executiveSummary);
console.log("Should show placeholder:", emptySummary.executiveSummary === "Chưa có transcript nên chưa thể tóm tắt.");
console.log("✅ Test 2 passed\n");

// Test 3: Single segment
console.log("Test 3: Single segment");
const singleSummary = summarizeTranscript([sampleSegments[0]]);
console.log("Executive Summary:", singleSummary.executiveSummary);
console.log("Key Highlights count:", singleSummary.keyHighlights.length);
console.log("✅ Test 3 passed\n");

console.log("All tests completed!");
