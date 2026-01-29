/**
 * Test script to verify minimal metadata model
 * Run: node test-minimal-metadata.js
 */

const fs = require('fs');
const path = require('path');

async function testMinimalMetadata() {
  console.log('Testing Minimal Metadata Model...\n');

  // Create a small test audio file
  const testFilePath = path.join(__dirname, 'test-audio.mp3');
  const testFileContent = Buffer.alloc(1024); // 1KB empty file
  fs.writeFileSync(testFilePath, testFileContent);

  try {
    const FormData = require('form-data');
    const fetch = require('node-fetch');

    const formData = new FormData();
    formData.append('title', 'Test Meeting - Minimal Metadata');
    formData.append('audio', fs.createReadStream(testFilePath), {
      filename: 'test-audio.mp3',
      contentType: 'audio/mpeg'
    });

    console.log('1. Testing POST /meetings...');
    
    const response = await fetch('http://localhost:3000/meetings', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✓ POST successful!\n');
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2));
      
      // Verify minimal metadata fields
      console.log('\n2. Verifying minimal metadata fields...');
      const requiredFields = ['id', 'title', 'status', 'original_filename', 'created_at'];
      const removedFields = ['fileSize', 'speakerMap', 'updatedAt', 'audioUrl', 'fileName', 'createdAt'];
      
      let allFieldsPresent = true;
      requiredFields.forEach(field => {
        if (data[field] !== undefined) {
          console.log(`✓ ${field}: ${data[field]}`);
        } else {
          console.log(`✗ ${field}: MISSING`);
          allFieldsPresent = false;
        }
      });
      
      console.log('\n3. Verifying removed fields are not present...');
      let noExtraFields = true;
      removedFields.forEach(field => {
        if (data[field] === undefined) {
          console.log(`✓ ${field}: correctly removed`);
        } else {
          console.log(`✗ ${field}: still present (should be removed)`);
          noExtraFields = false;
        }
      });
      
      // Test GET /meetings
      console.log('\n4. Testing GET /meetings...');
      const getResponse = await fetch('http://localhost:3000/meetings');
      const meetings = await getResponse.json();
      
      if (getResponse.ok && Array.isArray(meetings)) {
        console.log(`✓ GET /meetings returned array with ${meetings.length} meeting(s)`);
        
        // Verify meetings.json
        console.log('\n5. Verifying meetings.json persistence...');
        const dataPath = path.join(__dirname, 'data', 'meetings.json');
        if (fs.existsSync(dataPath)) {
          const fileContent = fs.readFileSync(dataPath, 'utf-8');
          const persistedMeetings = JSON.parse(fileContent);
          console.log(`✓ meetings.json exists with ${persistedMeetings.length} meeting(s)`);
          console.log('\nPersisted data:');
          console.log(JSON.stringify(persistedMeetings, null, 2));
        } else {
          console.log('✗ meetings.json not found');
        }
      } else {
        console.log('✗ GET /meetings failed');
      }
      
      if (allFieldsPresent && noExtraFields) {
        console.log('\n✅ All tests passed! Minimal metadata model working correctly.');
      } else {
        console.log('\n⚠️ Some tests failed. Check output above.');
      }
    } else {
      console.log('\n✗ POST failed!');
      console.log('Status:', response.status);
      console.log('Error:', data);
    }
  } catch (error) {
    console.error('\n✗ Test failed!');
    console.error('Error:', error.message);
    console.error('\nMake sure the mock server is running:');
    console.error('  npm run mock:server');
  } finally {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testMinimalMetadata();
