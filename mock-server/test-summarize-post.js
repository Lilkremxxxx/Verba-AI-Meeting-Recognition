/**
 * Test script for POST /meetings/:id/summarize endpoint
 * Run: node test-summarize-post.js
 */

const BASE_URL = "http://localhost:3000";

async function testSummarizeEndpoint() {
  console.log("Testing POST /meetings/:id/summarize Endpoint\n");
  console.log("=".repeat(60));

  // Sample transcript segments
  const sampleSegments = [
    {
      start: 0,
      end: 5,
      speaker: "Speaker A",
      text: "Chào mọi người, hôm nay chúng ta sẽ thảo luận về dự án mới."
    },
    {
      start: 5,
      end: 10,
      speaker: "Speaker B",
      text: "Cảm ơn. Tôi nghĩ chúng ta nên tập trung vào trải nghiệm người dùng."
    },
    {
      start: 10,
      end: 15,
      speaker: "Speaker A",
      text: "Đồng ý. Chúng ta cũng cần cải thiện hiệu suất hệ thống."
    },
    {
      start: 15,
      end: 20,
      speaker: "Speaker C",
      text: "Tôi sẽ phụ trách phần frontend và UI/UX design."
    },
    {
      start: 20,
      end: 25,
      speaker: "Speaker B",
      text: "Còn tôi sẽ làm backend và API integration. Deadline là 2 tuần nữa."
    }
  ];

  // Test 1: Summarize with valid segments
  console.log("\n1. POST /meetings/demo-done-meeting/summarize (valid segments)");
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
      console.log("✓ Summary preview:", data.summary.substring(0, 150) + "...");
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 2: Summarize with edited transcript
  console.log("\n2. POST /meetings/demo-done-meeting/summarize (edited transcript)");
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
      console.log("✓ Summary includes edited content:", data.summary.includes("[EDITED]"));
      console.log("✓ Summary preview:", data.summary.substring(0, 150) + "...");
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 3: Summarize with empty segments (edge case)
  console.log("\n3. POST /meetings/demo-done-meeting/summarize (empty segments)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/demo-done-meeting/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ segments: [] }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Summary:", data.summary);
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 4: Invalid request (missing segments)
  console.log("\n4. POST /meetings/demo-done-meeting/summarize (invalid - no segments)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/demo-done-meeting/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
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

  // Test 5: Non-existent meeting
  console.log("\n5. POST /meetings/nonexistent-id/summarize (should 404)");
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

  console.log("\n" + "=".repeat(60));
  console.log("POST summarize endpoint tests completed!\n");
}

// Run tests
testSummarizeEndpoint().catch(console.error);
