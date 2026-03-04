/**
 * Utility functions for generating unique filenames
 */

const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Generates a unique filename with the original extension
 * @param {string} originalName - Original filename from upload
 * @param {string} meetingId - UUID for the meeting
 * @returns {string} Unique filename (e.g., "abc-123.mp3")
 */
function generateUniqueFilename(originalName, meetingId) {
  const extension = path.extname(originalName).toLowerCase();
  return `${meetingId}${extension}`;
}

/**
 * Generates a new UUID for meeting ID
 * @returns {string} UUID v4
 */
function generateMeetingId() {
  return uuidv4();
}

/**
 * Extracts file extension from filename
 * @param {string} filename - Filename to extract extension from
 * @returns {string} Extension without dot (e.g., "mp3")
 */
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase().slice(1);
}

module.exports = {
  generateUniqueFilename,
  generateMeetingId,
  getFileExtension
};
