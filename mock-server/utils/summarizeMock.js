/**
 * Mock AI summarization utility
 * Generates a fake summary from transcript segments
 */

/**
 * Generate a mock summary from transcript segments
 * @param {Array} segments - Array of transcript segments
 * @returns {string} - Generated summary text
 */
function generateMockSummary(segments) {
  if (!segments || segments.length === 0) {
    return "Cuộc họp không có nội dung transcript để tóm tắt.";
  }

  // Extract all text
  const allText = segments.map(seg => seg.text).join(" ");
  
  // Simple mock: take first 200 chars + middle section + last 100 chars
  const firstPart = allText.substring(0, 200);
  const middleStart = Math.floor(allText.length / 2) - 50;
  const middlePart = allText.substring(middleStart, middleStart + 100);
  const lastPart = allText.substring(Math.max(0, allText.length - 100));

  // Count speakers
  const speakers = new Set(segments.map(seg => seg.speaker).filter(Boolean));
  const speakerCount = speakers.size;

  // Generate mock summary
  const summary = `Cuộc họp có ${segments.length} đoạn hội thoại với ${speakerCount} người tham gia. ` +
    `Nội dung chính: ${firstPart.trim()}... ` +
    `Các vấn đề được thảo luận bao gồm: ${middlePart.trim()}... ` +
    `Kết luận: ${lastPart.trim()}`;

  return summary;
}

module.exports = {
  generateMockSummary,
};
