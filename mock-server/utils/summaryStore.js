/**
 * Summary store for managing meeting summaries
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
 * Add or update summary for a meeting
 * @param {string} meetingId - Meeting ID
 * @param {Object} summary - Summary data
 */
function set(meetingId, summary) {
  const summaries = readAll();
  summaries[meetingId] = summary;
  fs.writeFileSync(DATA_PATH, JSON.stringify(summaries, null, 2), "utf-8");
}

module.exports = {
  readAll,
  getByMeetingId,
  set,
};
