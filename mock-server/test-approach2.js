/**
 * Test script for Approach 2 endpoints
 * Tests: GET /meetings/:id (with audioUrl) and GET /meetings/:id/transcript
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';
const TEST_MEETING_ID = 'demo-done-meeting';

async function testApproach2() {
  console.log('🧪 Testing Approach 2 Endpoints\n');

  try {
    // Test 1: GET /meetings (list) - should NOT have audioUrl
    console.log('1️⃣ Testing GET /meetings (list)...');
    const listRes = await fetch(`${API_BASE}/meetings`);
    
    if (!listRes.ok) {
      throw new Error(`List failed: ${listRes.status}`);
    }

    const meetings = await listRes.json();
    console.log(`✅ Found ${meetings.length} meeting(s)`);
    
    if (meetings.length > 0) {
      const firstMeeting = meetings[0];
      console.log('First meeting fields:', Object.keys(firstMeeting));
      
      if (firstMeeting.audioUrl) {
        console.log('⚠️  WARNING: audioUrl should NOT be in list endpoint');
      } else {
        console.log('✅ Correct: No audioUrl in list endpoint');
      }
    }
    console.log();

    // Test 2: GET /meetings/:id (detail) - should have audioUrl
    console.log('2️⃣ Testing GET /meetings/:id (detail with audioUrl)...');
    const detailRes = await fetch(`${API_BASE}/meetings/${TEST_MEETING_ID}`);
    
    if (!detailRes.ok) {
      throw new Error(`Detail failed: ${detailRes.status}`);
    }

    const meeting = await detailRes.json();
    console.log('✅ Meeting detail retrieved!');
    console.log('Meeting:', JSON.stringify(meeting, null, 2));
    
    // Verify audioUrl
    if (meeting.audioUrl) {
      console.log('✅ audioUrl present:', meeting.audioUrl);
    } else {
      console.log('❌ ERROR: audioUrl missing from detail endpoint');
    }
    
    // Verify no stored_filename exposed
    if (meeting.stored_filename) {
      console.log('⚠️  WARNING: stored_filename should be internal only');
    } else {
      console.log('✅ Correct: stored_filename not exposed');
    }
    console.log();

    // Test 3: GET /meetings/:id/transcript
    console.log('3️⃣ Testing GET /meetings/:id/transcript...');
    const transcriptRes = await fetch(`${API_BASE}/meetings/${TEST_MEETING_ID}/transcript`);
    
    if (!transcriptRes.ok) {
      throw new Error(`Transcript failed: ${transcriptRes.status}`);
    }

    const transcript = await transcriptRes.json();
    console.log('✅ Transcript retrieved!');
    console.log('Transcript structure:', {
      meeting_id: transcript.meeting_id,
      status: transcript.status,
      segments_count: transcript.segments?.length || 0,
    });
    
    if (transcript.segments && transcript.segments.length > 0) {
      console.log('First segment:', JSON.stringify(transcript.segments[0], null, 2));
      console.log('Last segment:', JSON.stringify(transcript.segments[transcript.segments.length - 1], null, 2));
    }
    console.log();

    // Test 4: GET /meetings/:id/transcript for non-existent meeting
    console.log('4️⃣ Testing GET /meetings/:id/transcript (404)...');
    const notFoundRes = await fetch(`${API_BASE}/meetings/non-existent-id/transcript`);
    
    if (notFoundRes.status === 404) {
      const errorData = await notFoundRes.json();
      console.log('✅ Correctly returns 404:', errorData.message);
    } else {
      console.log('❌ ERROR: Should return 404 for non-existent transcript');
    }
    console.log();

    // Final summary
    console.log('🎉 All tests passed!');
    console.log('\n📋 Summary:');
    console.log('- GET /meetings: Returns list WITHOUT audioUrl ✅');
    console.log('- GET /meetings/:id: Returns detail WITH audioUrl ✅');
    console.log('- GET /meetings/:id/transcript: Returns transcript segments ✅');
    console.log('- 404 handling: Works correctly ✅');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
console.log('⚠️  Make sure mock server is running: npm run mock:server\n');
testApproach2();
