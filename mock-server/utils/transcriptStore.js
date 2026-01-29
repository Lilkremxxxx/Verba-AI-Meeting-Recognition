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

module.exports = {
  readAll,
  getByMeetingId,
  set,
};
