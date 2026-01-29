/**
 * Transcript store for managing meeting transcripts
 */

const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "transcripts.json");

/**
 * Read all transcripts from JSON file
 * @returns {Object} Transcripts object keyed by meeting ID
 */
function readAll() {
  if (!fs.existsSync(DATA_PATH)) return {};
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return raw ? JSON.parse(raw) : {};
}

/**
 * Get transcript by meeting ID
 * @param {string} meetingId - Meeting ID
 * @returns {Object|null} Transcript object or null if not found
 */
function getByMeetingId(meetingId) {
  const transcripts = readAll();
  return transcripts[meetingId] || null;
}

/**
 * Add or update transcript for a meeting
 * @param {string} meetingId - Meeting ID
 * @param {Object} transcript - Transcript data
 */
function set(meetingId, transcript) {
  const transcripts = readAll();
  transcripts[meetingId] = transcript;
  fs.writeFileSync(DATA_PATH, JSON.stringify(transcripts, null, 2), "utf-8");
}

/**
 * Update specific segments in a transcript
 * @param {string} meetingId - Meeting ID
 * @param {Array} editedSegments - Array of {index, text} objects
 * @returns {Object|null} Updated transcript or null if not found
 */
function updateSegments(meetingId, editedSegments) {
  const transcripts = readAll();
  const transcript = transcripts[meetingId];
  
  if (!transcript) {
    return null;
  }

  // Update segments by index
  editedSegments.forEach(({ index, text }) => {
    if (transcript.segments[index]) {
      transcript.segments[index].text = text;
    }
  });

  // Save updated transcript
  transcripts[meetingId] = transcript;
  fs.writeFileSync(DATA_PATH, JSON.stringify(transcripts, null, 2), "utf-8");
  
  return transcript;
}

module.exports = {
  readAll,
  getByMeetingId,
  set,
  updateSegments,
};
