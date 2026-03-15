/**
 * Mock API Server for Meeting Uploads
 * Provides endpoints for uploading and serving audio files
 */

const express = require("express");
const cors = require("cors");
const path = require("path");

// Import meetings router with safe fallback for ESM/CommonJS compatibility
const meetingsModule = require("./routes/meetings");
const meetingsRouter = meetingsModule.default ?? meetingsModule;

const app = express();

const PORT = process.env.PORT || 3000;

// CORS configuration - allow frontend dev server
const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:8080"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
  credentials: true,
};

app.use(cors(corsOptions));

// Body parser for JSON (if needed for other endpoints)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use("/meetings", meetingsRouter);

// Serve uploaded audio files statically
app.use(
  "/media",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      // Set appropriate content-type for audio files
      if (filePath.endsWith(".mp3")) {
        res.setHeader("Content-Type", "audio/mpeg");
      } else if (filePath.endsWith(".wav")) {
        res.setHeader("Content-Type", "audio/wav");
      }
      // Enable range requests for audio seeking
      res.setHeader("Accept-Ranges", "bytes");
    },
  }),
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Mock Meeting API Server",
    version: "1.0.0",
    endpoints: {
      "POST /meetings": "Upload a new meeting with audio file",
      "GET /media/:filename": "Serve uploaded audio files",
      "GET /health": "Health check",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Endpoint not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║         Mock Meeting API Server                        ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ CORS enabled for: ${corsOptions.origin.join(", ")}`);
  console.log(`✓ Upload endpoint: POST http://localhost:${PORT}/meetings`);
  console.log(`✓ Media endpoint: GET http://localhost:${PORT}/media/:filename`);
  console.log(`✓ Health check: GET http://localhost:${PORT}/health\n`);
  console.log("Press Ctrl+C to stop the server\n");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\nSIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received. Shutting down gracefully...");
  process.exit(0);
});
