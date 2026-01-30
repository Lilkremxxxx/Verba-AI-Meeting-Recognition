/**
 * Mock AI summarization utility
 * Generates a fake summary from transcript segments
 * 
 * FAKE SUMMARY GENERATION LOGIC:
 * 1. Join all segment.text into one string
 * 2. Take first 300-500 characters
 * 3. Prefix with "Tóm tắt (mock): "
 * 4. No AI call - purely deterministic
 */

/**
 * Generate a mock summary from transcript segments
 * @param {Array} segments - Array of transcript segments
 * @returns {string} - Generated fake summary text
 */
function generateMockSummary(segments) {
  if (!segments || segments.length === 0) {
    return "Tóm tắt (mock): Cuộc họp không có nội dung transcript để tóm tắt.";
  }

  // Join all text from segments
  const allText = segments.map(seg => seg.text).join(" ");
  
  // Take first 300-500 characters (aim for ~400)
  const maxLength = 400;
  let summaryText = allText.substring(0, maxLength);
  
  // If we cut off mid-word, try to end at last complete word
  if (allText.length > maxLength) {
    const lastSpace = summaryText.lastIndexOf(" ");
    if (lastSpace > maxLength * 0.8) { // Only trim if we don't lose too much
      summaryText = summaryText.substring(0, lastSpace);
    }
    summaryText += "...";
  }

  // Add prefix
  return `Tóm tắt (mock): ${summaryText}`;
}

module.exports = {
  generateMockSummary,
};
