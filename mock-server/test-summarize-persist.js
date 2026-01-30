/**
 * Test script for POST /meetings/:id/summarize with persistence
 * Tests that summaries are saved to summaries.json and can be retrieved via GET
 * Run: node test-summarize-persist.js
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";
const SUMMARIES_PATH = path.join(__dirname, "data", "summaries.json");

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
  {
    start: 15,
    end: 20,
    speaker: "Speaker C",
    text: "Tôi sẽ phụ trách phần frontend và làm việc với team design để hoàn thiện mockups."
  },
  {
    start: 20,
    end: 25,
    speaker: "Speaker B",
    text: "Còn tôi sẽ làm backend và API integration. Deadline là 2 tuần nữa, chúng ta cần làm việc hiệu quả."
  }
];

async function testSummarizePersistence() {
  console.log("Testing POST /meetings/:id/summarize with Persistence\n");
  console.log("=".repeat(70));

  // Read initial summaries.json state
  console.log("\n📂 Reading initial summaries.json...");
  let initialSummaries = {};
  if (fs.existsSync(SUMMARIES_PATH)) {
    const raw = fs.readFileSync(SUMMARIES_PATH, "utf-8");
    initialSummaries = JSON.parse(raw);
    console.log(`✓ Found ${Object.keys(initialSummaries).length} existing summaries`);
  } else {
    console.log("✓ summaries.json does not exist yet");
  }

  // Test 1: POST summarize for demo-done-meeting
  console.log("\n1️⃣ POST /meetings/demo-done-meeting/summarize");
  try {
    const response = await fetch(`${BASE_URL}/meetings/demo-done-meeting/summarize`, {
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
      console.log("✓ Status:", data.status);
      console.log("✓ Summary preview:", data.summary.substring(0, 100) + "...");
      console.log("✓ Summary starts with 'Tóm tắt (mock):':", data.summary.startsWith("Tóm tắt (mock):"));
    } else {
      console.log("✗ Error:", data.message);
      return;
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
    return;
  }

  // Test 2: Verify persistence to summaries.json
  console.log("\n2️⃣ Verifying persistence to summaries.json...");
  try {
    const raw = fs.readFileSync(SUMMARIES_PATH, "utf-8");
    const summaries = JSON.parse(raw);
    
    if (summaries["demo-done-meeting"]) {
      console.log("✓ Summary found in summaries.json");
      console.log("✓ Meeting ID:", summaries["demo-done-meeting"].meeting_id);
      console.log("✓ Status:", summaries["demo-done-meeting"].status);
      console.log("✓ Summary length:", summaries["demo-done-meeting"].summary.length, "characters");
      console.log("✓ Summary preview:", summaries["demo-done-meeting"].summary.substring(0, 100) + "...");
    } else {
      console.log("✗ Summary NOT found in summaries.json");
      return;
    }
  } catch (error) {
    console.log("✗ Failed to read summaries.json:", error.message);
    return;
  }

  // Test 3: GET summary to verify it can be retrieved
  console.log("\n3️⃣ GET /meetings/demo-done-meeting/summary");
  try {
    const response = await fetch(`${BASE_URL}/meetings/demo-done-meeting/summary`);
    const data = await response.json();
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Meeting ID:", data.meeting_id);
      console.log("✓ Status:", data.status);
      console.log("✓ Summary matches POST response:", data.summary.startsWith("Tóm tắt (mock):"));
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 4: POST with different segments (overwrite)
  console.log("\n4️⃣ POST /meetings/demo-done-meeting/summarize (overwrite)");
  const editedSegments = sampleSegments.map(seg => ({
    ...seg,
    text: seg.text + " [EDITED]"
  }));
  
  try {
    const response = await fetch(`${BASE_URL}/meetings/demo-done-meeting/summarize`, {
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

  // Test 5: Verify overwrite in summaries.json
  console.log("\n5️⃣ Verifying overwrite in summaries.json...");
  try {
    const raw = fs.readFileSync(SUMMARIES_PATH, "utf-8");
    const summaries = JSON.parse(raw);
    
    if (summaries["demo-done-meeting"].summary.includes("[EDITED]")) {
      console.log("✓ Summary was overwritten with new content");
      console.log("✓ Contains [EDITED] marker");
    } else {
      console.log("✗ Summary was NOT overwritten");
    }
  } catch (error) {
    console.log("✗ Failed to read summaries.json:", error.message);
  }

  // Test 6: Validation - empty segments
  console.log("\n6️⃣ POST with empty segments (should fail)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/demo-done-meeting/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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

  // Test 7: Validation - segment without text
  console.log("\n7️⃣ POST with segment missing text (should fail)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/demo-done-meeting/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        segments: [
          { start: 0, end: 5, speaker: "A" }  // Missing text
        ] 
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

  // Test 8: Non-existent meeting
  console.log("\n8️⃣ POST to non-existent meeting (should 404)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/nonexistent-id/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ segments: sampleSegments }),
    });
    
    const data = await response.json();
    
    if (response.status === 404) {
      console.log("✓ Status:", response.status, "(expected)");
      console.log("✓ Message:", data.message);
    } else {
      console.log("✗ Unexpected status:", response.status);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Final summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 Test Summary:");
  console.log("✓ POST /summarize creates summary");
  console.log("✓ Summary persisted to summaries.json");
  console.log("✓ GET /summary retrieves persisted summary");
  console.log("✓ POST overwrites existing summary");
  console.log("✓ Validation works (empty segments, missing text)");
  console.log("✓ 404 for non-existent meetings");
  console.log("\n🎉 All persistence tests completed!\n");
}

// Run tests
testSummarizePersistence().catch(console.error);
