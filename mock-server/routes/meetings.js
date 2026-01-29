/**
 * Meeting routes handler
 */

const express = require("express");
const router = express.Router();
const { upload, handleMulterError } = require("../middleware/upload");
const store = require("../utils/meetingStore");
const transcriptStore = require("../utils/transcriptStore");
const summaryStore = require("../utils/summaryStore");
const { generateMockSummary } = require("../utils/summarizeMock");

/**
 * GET /meetings
 * List all meetings (minimal fields, no audioUrl)
 */
router.get("/", (req, res) => {
  try {
    const meetings = store.readAll();
    
    // Return only public fields (no stored_filename, no audioUrl)
    const publicMeetings = meetings.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      original_filename: m.original_filename,
      created_at: m.created_at,
    }));
    
    res.json(publicMeetings);
  } catch (error) {
    console.error("Error reading meetings:", error);
    res
      .status(500)
      .json({ message: "Internal server error while reading meetings." });
  }
});

/**
 * GET /meetings/:id/transcript
 * Get transcript for a meeting
 * IMPORTANT: This route MUST come BEFORE /:id to avoid route conflict
 */
router.get("/:id/transcript", (req, res) => {
  try {
    const transcript = transcriptStore.getByMeetingId(req.params.id);
    
    if (!transcript) {
      return res.status(404).json({ message: "Transcript not found." });
    }
    
    res.json(transcript);
  } catch (error) {
    console.error("Error reading transcript:", error);
    res
      .status(500)
      .json({ message: "Internal server error while reading transcript." });
  }
});

/**
 * PATCH /meetings/:id/transcript
 * Update edited segments in transcript
 * IMPORTANT: This route MUST come BEFORE /:id to avoid route conflict
 */
router.patch("/:id/transcript", (req, res) => {
  try {
    const { segments: editedSegments } = req.body;
    
    // Validate request
    if (!editedSegments || !Array.isArray(editedSegments)) {
      return res.status(400).json({ 
        message: "Invalid request. Expected { segments: [{index, text}] }" 
      });
    }

    // Validate each segment
    for (const seg of editedSegments) {
      if (typeof seg.index !== 'number' || typeof seg.text !== 'string') {
        return res.status(400).json({ 
          message: "Invalid segment format. Expected {index: number, text: string}" 
        });
      }
    }

    // Update transcript
    const updatedTranscript = transcriptStore.updateSegments(
      req.params.id,
      editedSegments
    );
    
    if (!updatedTranscript) {
      return res.status(404).json({ message: "Transcript not found." });
    }

    console.log(
      `✓ Transcript updated: ${req.params.id} - ${editedSegments.length} segment(s) edited`
    );
    
    res.json(updatedTranscript);
  } catch (error) {
    console.error("Error updating transcript:", error);
    res
      .status(500)
      .json({ message: "Internal server error while updating transcript." });
  }
});

/**
 * POST /meetings/:id/summarize
 * Generate summary from provided transcript segments (frontend-driven)
 * IMPORTANT: This route MUST come BEFORE /:id to avoid route conflict
 */
router.post("/:id/summarize", (req, res) => {
  try {
    const { segments } = req.body;
    
    // Validate request
    if (!segments || !Array.isArray(segments)) {
      return res.status(400).json({ 
        message: "Invalid request. Expected { segments: [{start, end, speaker?, text}] }" 
      });
    }

    // Validate meeting exists
    const meeting = store.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found." });
    }

    // Generate mock summary from provided segments
    const summaryText = generateMockSummary(segments);

    // Return summary response
    const response = {
      meeting_id: req.params.id,
      status: "DONE",
      summary: summaryText,
    };

    console.log(
      `✓ Summary generated: ${req.params.id} - ${segments.length} segment(s) processed`
    );
    
    res.json(response);
  } catch (error) {
    console.error("Error generating summary:", error);
    res
      .status(500)
      .json({ message: "Internal server error while generating summary." });
  }
});

/**
 * GET /meetings/:id/summary
 * Get summary for a meeting (DEPRECATED - kept for backward compatibility)
 * IMPORTANT: This route MUST come BEFORE /:id to avoid route conflict
 */
router.get("/:id/summary", (req, res) => {
  try {
    const summary = summaryStore.getByMeetingId(req.params.id);
    
    if (!summary) {
      return res.status(404).json({ message: "Summary not found." });
    }
    
    // Check if summary is ready (status DONE)
    if (summary.status !== "DONE") {
      return res.status(404).json({ message: "Summary not ready yet." });
    }
    
    res.json(summary);
  } catch (error) {
    console.error("Error reading summary:", error);
    res
      .status(500)
      .json({ message: "Internal server error while reading summary." });
  }
});

/**
 * GET /meetings/:id
 * Get meeting detail with audioUrl
 * IMPORTANT: This route MUST come AFTER /:id/transcript to avoid route conflict
 */
router.get("/:id", (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const meeting = store.findByIdWithAudio(req.params.id, baseUrl);
    
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found." });
    }
    
    res.json(meeting);
  } catch (error) {
    console.error("Error reading meeting:", error);
    res
      .status(500)
      .json({ message: "Internal server error while reading meeting." });
  }
});

/**
 * POST /meetings
 * Upload a new meeting with audio file
 */
router.post("/", upload.single("audio"), handleMulterError, (req, res) => {
  try {
    const { title } = req.body;
    const file = req.file;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Title is required and cannot be empty.",
      });
    }

    if (!file) {
      return res.status(400).json({
        message: "Audio file is required.",
      });
    }

    // Get meeting ID that was generated during file upload
    const meetingId = req.meetingId;

    // Create meeting metadata with stored_filename (internal field)
    const meeting = {
      id: meetingId,
      title: title.trim(),
      status: "QUEUED",
      original_filename: file.originalname,
      created_at: new Date().toISOString(),
      stored_filename: file.filename, // Internal field for audioUrl computation
    };

    // Persist metadata to meetings.json
    store.add(meeting);

    console.log(
      `✓ Meeting created: ${meetingId} - "${title}" (${file.originalname})`,
    );

    // Return 201 with minimal metadata (no stored_filename, no audioUrl)
    res.status(201).json({
      id: meeting.id,
      title: meeting.title,
      status: meeting.status,
      original_filename: meeting.original_filename,
      created_at: meeting.created_at,
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({
      message: "Internal server error while creating meeting.",
    });
  }
});

module.exports = router;
