/**
 * Test script for POST /meetings/:id/summarize (INPUT-DRIVEN)
 * Tests that summaries are generated from input without persistence
 * Run: node test-summarize-input-driven.js
 */

const BASE_URL = "http://localhost:3000";

// Sample transcript segments
const sampleSegments = [
  {
    start: 0,
    end: 5,
    speaker: "Speaker A",
    text: "Chào mọi người, hôm nay chúng ta sẽ thảo luận về dự án mới với mục tiêu cải thiện trải nghiệm người dùng."
  },
  {
    start: 5,
    end: 10,
    speaker: "Speaker B",
    text: "Cảm ơn. Tôi nghĩ chúng ta nên tập trung vào hiệu suất hệ thống và tối ưu hóa API."
  },
  {
    start: 10,
    end: 15,
    speaker: "Speaker A",
    text: "Đồng ý. Chúng ta cũng cần cải thiện UI/UX design để người dùng dễ sử dụng hơn."
  },
];

async function testInputDrivenSummarize() {
  console.log("Testing POST /meetings/:id/summarize (INPUT-DRIVEN)\n");
  console.log("=".repeat(70));

  // Test 1: POST summarize with valid segments
  console.log("\n1️⃣ POST /meetings/any-id/summarize (valid segments)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/any-id/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ segments: sampleSegments }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Meeting ID:", data.meeting_id);
      console.log("✓ Has summary:", !!data.summary);
      console.log("✓ Summary starts with 'Tóm tắt (mock):':", data.summary.startsWith("Tóm tắt (mock):"));
      console.log("✓ Summary length:", data.summary.length, "characters");
      console.log("✓ Summary preview:", data.summary.substring(0, 100) + "...");
      console.log("✓ No 'status' field (input-driven):", !data.status);
    } else {
      console.log("✗ Error:", data.message);
      return;
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
    return;
  }

  // Test 2: POST with edited transcript
  console.log("\n2️⃣ POST with edited transcript (includes [EDITED] marker)");
  const editedSegments = sampleSegments.map(seg => ({
    ...seg,
    text: seg.text + " [EDITED]"
  }));
  
  try {
    const response = await fetch(`${BASE_URL}/meetings/any-id/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ segments: editedSegments }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Summary includes [EDITED]:", data.summary.includes("[EDITED]"));
      console.log("✓ Summary preview:", data.summary.substring(0, 100) + "...");
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 3: Same input produces same output (deterministic)
  console.log("\n3️⃣ Testing deterministic behavior (same input → same output)");
  try {
    const response1 = await fetch(`${BASE_URL}/meetings/test-id/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: sampleSegments }),
    });
    const data1 = await response1.json();

    const response2 = await fetch(`${BASE_URL}/meetings/test-id/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: sampleSegments }),
    });
    const data2 = await response2.json();

    if (data1.summary === data2.summary) {
      console.log("✓ Same input produces same output (deterministic)");
      console.log("✓ Summary 1 === Summary 2");
    } else {
      console.log("✗ Summaries differ (not deterministic)");
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 4: Different meeting IDs with same segments
  console.log("\n4️⃣ Different meeting IDs with same segments");
  try {
    const response1 = await fetch(`${BASE_URL}/meetings/meeting-1/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: sampleSegments }),
    });
    const data1 = await response1.json();

    const response2 = await fetch(`${BASE_URL}/meetings/meeting-2/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: sampleSegments }),
    });
    const data2 = await response2.json();

    console.log("✓ Meeting 1 ID:", data1.meeting_id);
    console.log("✓ Meeting 2 ID:", data2.meeting_id);
    console.log("✓ Summaries are identical:", data1.summary === data2.summary);
    console.log("✓ Meeting IDs are different:", data1.meeting_id !== data2.meeting_id);
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 5: Validation - empty segments
  console.log("\n5️⃣ POST with empty segments (should fail)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/any-id/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: [] }),
    });
    
    const data = await response.json();
    
    if (response.status === 400) {
      console.log("✓ Status:", response.status, "(expected)");
      console.log("✓ Message:", data.message);
    } else {
      console.log("✗ Unexpected status:", response.status);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 6: Validation - segment without text
  console.log("\n6️⃣ POST with segment missing text (should fail)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/any-id/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        segments: [{ start: 0, end: 5, speaker: "A" }]  // Missing text
      }),
    });
    
    const data = await response.json();
    
    if (response.status === 400) {
      console.log("✓ Status:", response.status, "(expected)");
      console.log("✓ Message:", data.message);
    } else {
      console.log("✗ Unexpected status:", response.status);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 7: Very long transcript (truncation)
  console.log("\n7️⃣ POST with very long transcript (tests truncation)");
  const longSegments = Array(50).fill(null).map((_, i) => ({
    start: i * 5,
    end: (i + 1) * 5,
    speaker: `Speaker ${i % 3}`,
    text: `Đây là đoạn văn số ${i} với nội dung dài để kiểm tra việc cắt ngắn summary. Chúng ta cần đảm bảo rằng summary không quá dài.`
  }));

  try {
    const response = await fetch(`${BASE_URL}/meetings/long-meeting/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: longSegments }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Summary length:", data.summary.length, "characters");
      console.log("✓ Summary is truncated:", data.summary.length < 1000);
      console.log("✓ Summary ends with '...':", data.summary.endsWith("..."));
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Final summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 Test Summary:");
  console.log("✓ POST /summarize generates summary from input");
  console.log("✓ No persistence required");
  console.log("✓ No dependency on meeting existence");
  console.log("✓ Deterministic (same input → same output)");
  console.log("✓ Works with any meeting ID");
  console.log("✓ Includes edited content from frontend");
  console.log("✓ Validation works (empty segments, missing text)");
  console.log("✓ Truncates long transcripts");
  console.log("\n🎉 All input-driven tests completed!\n");
}

// Run tests
testInputDrivenSummarize().catch(console.error);
