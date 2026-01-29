/**
 * Simple test script to verify mock server upload functionality
 * Run: node test-upload.js
 */

const fs = require('fs');
const path = require('path');

async function testUpload() {
  console.log('Testing Mock Server Upload...\n');

  // Create a small test audio file (empty but valid)
  const testFilePath = path.join(__dirname, 'test-audio.mp3');
  const testFileContent = Buffer.alloc(1024); // 1KB empty file
  fs.writeFileSync(testFilePath, testFileContent);

  try {
    const FormData = require('form-data');
    const fetch = require('node-fetch');

    const formData = new FormData();
    formData.append('title', 'Test Meeting from Script');
    formData.append('audio', fs.createReadStream(testFilePath), {
      filename: 'test-audio.mp3',
      contentType: 'audio/mpeg'
    });

    console.log('Sending POST request to http://localhost:3000/meetings...');
    
    const response = await fetch('http://localhost:3000/meetings', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      console.log('\n✓ Upload successful!');
      console.log('\nResponse:');
      console.log(JSON.stringify(data, null, 2));
      console.log(`\nAudio URL: ${data.audioUrl}`);
      console.log('\nTest passed! ✓');
    } else {
      console.log('\n✗ Upload failed!');
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

testUpload();
