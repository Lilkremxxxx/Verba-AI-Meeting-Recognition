/**
 * Multer configuration and file validation middleware
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateUniqueFilename, generateMeetingId, getFileExtension } = require('../utils/filename');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed file configurations
const ALLOWED_EXTENSIONS = ['mp3', 'wav'];
const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-wav'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate meeting ID and attach to request for later use
    const meetingId = generateMeetingId();
    req.meetingId = meetingId;
    
    const uniqueFilename = generateUniqueFilename(file.originalname, meetingId);
    cb(null, uniqueFilename);
  }
});

/**
 * File filter to validate file type
 */
const fileFilter = function (req, file, cb) {
  // Check MIME type
  const mimeType = file.mimetype.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return cb(
      new Error(`Invalid MIME type. Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed.`),
      false
    );
  }

  // Check file extension
  const extension = getFileExtension(file.originalname);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(
      new Error(`Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`),
      false
    );
  }

  cb(null, true);
};

/**
 * Multer upload configuration
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

/**
 * Error handling middleware for multer errors
 */
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Unexpected field name. Use "audio" for the file field.'
      });
    }
    return res.status(400).json({
      message: err.message
    });
  }

  if (err) {
    return res.status(400).json({
      message: err.message
    });
  }

  next();
}

module.exports = {
  upload,
  handleMulterError
};
