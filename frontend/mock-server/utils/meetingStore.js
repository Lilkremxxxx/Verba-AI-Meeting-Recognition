const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "meetings.json");

function readAll() {
  if (!fs.existsSync(DATA_PATH)) return [];
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return raw ? JSON.parse(raw) : [];
}

function writeAll(meetings) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(meetings, null, 2), "utf-8");
}

function add(meeting) {
  const meetings = readAll();
  meetings.push(meeting);
  writeAll(meetings);
  return meeting;
}

function findById(id) {
  const meetings = readAll();
  return meetings.find((m) => m.id === id) || null;
}

/**
 * Get meeting with audioUrl computed from stored_filename
 * @param {string} id - Meeting ID
 * @param {string} baseUrl - Base URL for media (e.g., "http://localhost:3000")
 * @returns {Object|null} Meeting with audioUrl or null
 */
function findByIdWithAudio(id, baseUrl) {
  const meeting = findById(id);
  if (!meeting) return null;

  // If meeting has stored_filename, compute audioUrl
  if (meeting.stored_filename) {
    return {
      id: meeting.id,
      title: meeting.title,
      status: meeting.status,
      original_filename: meeting.original_filename,
      created_at: meeting.created_at,
      audioUrl: `${baseUrl}/media/${meeting.stored_filename}`,
    };
  }

  // Return meeting as-is if no stored_filename
  return {
    id: meeting.id,
    title: meeting.title,
    status: meeting.status,
    original_filename: meeting.original_filename,
    created_at: meeting.created_at,
  };
}

module.exports = { readAll, writeAll, add, findById, findByIdWithAudio };

