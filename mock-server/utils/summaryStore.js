/**
 * Summary store for managing meeting summaries with caching
 */

const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "summaries.json");

/**
 * Read all summaries from JSON file
 * @returns {Object} Summaries object keyed by meeting ID
 */
function readAll() {
  if (!fs.existsSync(DATA_PATH)) return {};
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return raw ? JSON.parse(raw) : {};
}

/**
 * Get summary by meeting ID
 * @param {string} meetingId - Meeting ID
 * @returns {Object|null} Summary object or null if not found
 */
function getByMeetingId(meetingId) {
  const summaries = readAll();
  return summaries[meetingId] || null;
}

/**
 * Add or update summary for a meeting (upsert)
 * @param {string} meetingId - Meeting ID
 * @param {Object} summaryData - Summary data { meeting_id, summary, transcript_hash?, updated_at? }
 */
function upsert(meetingId, summaryData) {
  const summaries = readAll();
  
  // Ensure updated_at is set
  if (!summaryData.updated_at) {
    summaryData.updated_at = new Date().toISOString();
  }
  
  summaries[meetingId] = summaryData;
  fs.writeFileSync(DATA_PATH, JSON.stringify(summaries, null, 2), "utf-8");
}

/**
 * Alias for upsert (backward compatibility)
 */
function set(meetingId, summary) {
  upsert(meetingId, summary);
}

/**
 * Alias for upsert (backward compatibility)
 */
function saveSummary(meetingId, summaryObject) {
  upsert(meetingId, summaryObject);
}

module.exports = {
  readAll,
  getByMeetingId,
  upsert,
  set,
  saveSummary,
};
