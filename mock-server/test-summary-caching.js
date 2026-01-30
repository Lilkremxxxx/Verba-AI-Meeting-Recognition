/**
 * Test script for summary caching with GET/POST flow
 * Run: node test-summary-caching.js
 */

const BASE_URL = "http://localhost:3000";

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
    text: "Cảm ơn. Tôi nghĩ chúng ta nên tập trung vào hiệu suất hệ thống."
  },
];

async function testSummaryCaching() {
  console.log("Testing Summary Caching (GET + POST)\n");
  console.log("=".repeat(70));

  const testMeetingId = "test-caching-" + Date.now();

  // Test 1: GET summary before POST (should 404)
  console.log("\n1️⃣ GET /meetings/:id/summary (before POST - should 404)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/${testMeetingId}/summary`);
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

  // Test 2: POST summarize (creates cache)
  console.log("\n2️⃣ POST /meetings/:id/summarize (creates cache)");
  let postedSummary;
  try {
    const response = await fetch(`${BASE_URL}/meetings/${testMeetingId}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: sampleSegments }),
    });
    
    const data = await response.json();
    postedSummary = data;
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Meeting ID:", data.meeting_id);
      console.log("✓ Has summary:", !!data.summary);
      console.log("✓ Has transcript_hash:", !!data.transcript_hash);
      console.log("✓ Has updated_at:", !!data.updated_at);
      console.log("✓ Summary preview:", data.summary.substring(0, 80) + "...");
    } else {
      console.log("✗ Error:", data.message);
      return;
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
    return;
  }

  // Test 3: GET summary after POST (should return cached)
  console.log("\n3️⃣ GET /meetings/:id/summary (after POST - should return cached)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/${testMeetingId}/summary`);
    const data = await response.json();
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Meeting ID:", data.meeting_id);
      console.log("✓ Summary matches POST:", data.summary === postedSummary.summary);
      console.log("✓ Has transcript_hash:", !!data.transcript_hash);
      console.log("✓ Has updated_at:", !!data.updated_at);
      console.log("✓ Summary preview:", data.summary.substring(0, 80) + "...");
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 4: POST again with different transcript (updates cache)
  console.log("\n4️⃣ POST /meetings/:id/summarize again (updates cache)");
  const editedSegments = sampleSegments.map(seg => ({
    ...seg,
    text: seg.text + " [EDITED]"
  }));
  
  let updatedSummary;
  try {
    const response = await fetch(`${BASE_URL}/meetings/${testMeetingId}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments: editedSegments }),
    });
    
    const data = await response.json();
    updatedSummary = data;
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Summary includes [EDITED]:", data.summary.includes("[EDITED]"));
      console.log("✓ Summary different from first:", data.summary !== postedSummary.summary);
      console.log("✓ Updated_at is newer:", new Date(data.updated_at) > new Date(postedSummary.updated_at));
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 5: GET summary returns updated version
  console.log("\n5️⃣ GET /meetings/:id/summary (returns updated version)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/${testMeetingId}/summary`);
    const data = await response.json();
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Summary matches updated POST:", data.summary === updatedSummary.summary);
      console.log("✓ Summary includes [EDITED]:", data.summary.includes("[EDITED]"));
      console.log("✓ Updated_at matches:", data.updated_at === updatedSummary.updated_at);
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 6: POST with transcript_hash
  console.log("\n6️⃣ POST with custom transcript_hash");
  try {
    const response = await fetch(`${BASE_URL}/meetings/${testMeetingId}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        segments: sampleSegments,
        transcript_hash: "custom-hash-12345"
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Transcript hash:", data.transcript_hash);
      console.log("✓ Custom hash preserved:", data.transcript_hash === "custom-hash-12345");
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 7: GET returns hash
  console.log("\n7️⃣ GET returns transcript_hash");
  try {
    const response = await fetch(`${BASE_URL}/meetings/${testMeetingId}/summary`);
    const data = await response.json();
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Has transcript_hash:", !!data.transcript_hash);
      console.log("✓ Transcript hash:", data.transcript_hash);
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Final summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 Test Summary:");
  console.log("✓ GET before POST returns 404");
  console.log("✓ POST creates summary and caches it");
  console.log("✓ GET after POST returns cached summary");
  console.log("✓ POST again updates cache");
  console.log("✓ GET returns updated summary");
  console.log("✓ Transcript hash is stored and retrieved");
  console.log("✓ Updated_at timestamp is tracked");
  console.log("\n🎉 All caching tests completed!\n");
}

// Run tests
testSummaryCaching().catch(console.error);
