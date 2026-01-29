/**
 * Test script for summary endpoint
 * Run: node test-summary.js
 */

const BASE_URL = "http://localhost:3000";

async function testSummaryEndpoint() {
  console.log("Testing Summary Endpoint\n");
  console.log("=".repeat(50));

  // Test 1: Get summary for demo-done-meeting
  console.log("\n1. GET /meetings/demo-done-meeting/summary");
  try {
    const response = await fetch(`${BASE_URL}/meetings/demo-done-meeting/summary`);
    const data = await response.json();
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Meeting ID:", data.meeting_id);
      console.log("✓ Status:", data.status);
      console.log("✓ Summary preview:", data.summary.substring(0, 100) + "...");
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 2: Get summary for another meeting
  console.log("\n2. GET /meetings/5f7e4de4-dc55-4805-a6e6-8f798ffc316d/summary");
  try {
    const response = await fetch(`${BASE_URL}/meetings/5f7e4de4-dc55-4805-a6e6-8f798ffc316d/summary`);
    const data = await response.json();
    
    if (response.ok) {
      console.log("✓ Status:", response.status);
      console.log("✓ Meeting ID:", data.meeting_id);
      console.log("✓ Summary preview:", data.summary.substring(0, 100) + "...");
    } else {
      console.log("✗ Error:", data.message);
    }
  } catch (error) {
    console.log("✗ Request failed:", error.message);
  }

  // Test 3: Get summary for non-existent meeting (should 404)
  console.log("\n3. GET /meetings/nonexistent-id/summary (should 404)");
  try {
    const response = await fetch(`${BASE_URL}/meetings/nonexistent-id/summary`);
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

  console.log("\n" + "=".repeat(50));
  console.log("Summary endpoint tests completed!\n");
}

// Run tests
testSummaryEndpoint().catch(console.error);
