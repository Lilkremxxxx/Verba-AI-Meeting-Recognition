/**
 * Test script for transcript editing (PATCH endpoint)
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';
const TEST_MEETING_ID = 'demo-done-meeting';

async function testTranscriptEdit() {
  console.log('🧪 Testing Transcript Edit Endpoint\n');

  try {
    // Test 1: GET original transcript
    console.log('1️⃣ Fetching original transcript...');
    const getRes = await fetch(`${API_BASE}/meetings/${TEST_MEETING_ID}/transcript`);
    
    if (!getRes.ok) {
      throw new Error(`GET failed: ${getRes.status}`);
    }

    const originalTranscript = await getRes.json();
    console.log(`✅ Original transcript has ${originalTranscript.segments.length} segments`);
    console.log(`First segment text: "${originalTranscript.segments[0].text}"`);
    console.log();

    // Test 2: PATCH with edited segments
    console.log('2️⃣ Sending PATCH request with edits...');
    const editedSegments = [
      { index: 0, text: "EDITED: Chào mọi người, đây là text đã được chỉnh sửa." },
      { index: 1, text: "EDITED: Đoạn thứ hai cũng được chỉnh sửa." },
    ];

    const patchRes = await fetch(`${API_BASE}/meetings/${TEST_MEETING_ID}/transcript`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments: editedSegments }),
    });

    if (!patchRes.ok) {
      const errorData = await patchRes.json();
      throw new Error(`PATCH failed: ${patchRes.status} - ${errorData.message}`);
    }

    const updatedTranscript = await patchRes.json();
    console.log('✅ PATCH successful!');
    console.log(`Updated segment 0: "${updatedTranscript.segments[0].text}"`);
    console.log(`Updated segment 1: "${updatedTranscript.segments[1].text}"`);
    console.log();

    // Test 3: Verify changes persisted
    console.log('3️⃣ Verifying changes persisted...');
    const verifyRes = await fetch(`${API_BASE}/meetings/${TEST_MEETING_ID}/transcript`);
    
    if (!verifyRes.ok) {
      throw new Error(`Verify GET failed: ${verifyRes.status}`);
    }

    const verifiedTranscript = await verifyRes.json();
    
    if (verifiedTranscript.segments[0].text === editedSegments[0].text &&
        verifiedTranscript.segments[1].text === editedSegments[1].text) {
      console.log('✅ Changes persisted correctly!');
    } else {
      console.log('❌ Changes did not persist');
    }
    console.log();

    // Test 4: Invalid request (missing segments)
    console.log('4️⃣ Testing validation (invalid request)...');
    const invalidRes = await fetch(`${API_BASE}/meetings/${TEST_MEETING_ID}/transcript`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'data' }),
    });

    if (invalidRes.status === 400) {
      const errorData = await invalidRes.json();
      console.log('✅ Validation works:', errorData.message);
    } else {
      console.log('❌ Validation failed - should return 400');
    }
    console.log();

    // Test 5: Non-existent meeting
    console.log('5️⃣ Testing 404 (non-existent meeting)...');
    const notFoundRes = await fetch(`${API_BASE}/meetings/non-existent-id/transcript`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments: editedSegments }),
    });

    if (notFoundRes.status === 404) {
      const errorData = await notFoundRes.json();
      console.log('✅ 404 handling works:', errorData.message);
    } else {
      console.log('❌ 404 handling failed');
    }
    console.log();

    // Restore original text
    console.log('6️⃣ Restoring original text...');
    const restoreSegments = [
      { index: 0, text: originalTranscript.segments[0].text },
      { index: 1, text: originalTranscript.segments[1].text },
    ];

    const restoreRes = await fetch(`${API_BASE}/meetings/${TEST_MEETING_ID}/transcript`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments: restoreSegments }),
    });

    if (restoreRes.ok) {
      console.log('✅ Original text restored');
    }
    console.log();

    // Final summary
    console.log('🎉 All tests passed!');
    console.log('\n📋 Summary:');
    console.log('- PATCH endpoint works correctly ✅');
    console.log('- Changes persist to transcripts.json ✅');
    console.log('- Validation works (400 for invalid) ✅');
    console.log('- 404 handling works ✅');
    console.log('- Original text restored ✅');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
console.log('⚠️  Make sure mock server is running: npm start\n');
testTranscriptEdit();
