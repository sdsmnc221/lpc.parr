// lib/storage.js
// Simple external storage for serverless functions
const fs = require("fs");
const path = require("path");

// Use /tmp directory for temporary file storage
const STORAGE_FILE = path.join("/tmp", "submissions.json");

function getStoredSubmissions() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading storage file:", error);
  }
  return [];
}

function saveToFile(submissions) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(submissions, null, 2));
    console.log("Saved to file:", submissions.length, "submissions");
  } catch (error) {
    console.error("Error saving to file:", error);
  }
}

function getRecentSubmissions(limit = 50) {
  const submissions = getStoredSubmissions();
  console.log("Retrieved from storage:", submissions.length, "submissions");
  return submissions.slice(0, limit);
}

function getSubmissionById(submissionId) {
  const submissions = getStoredSubmissions();
  return submissions.find((s) => s.submissionId === submissionId);
}

async function saveSubmission(submissionData) {
  try {
    const submissions = getStoredSubmissions();
    submissions.unshift(submissionData);

    // Keep only last 50 submissions
    if (submissions.length > 50) {
      submissions.splice(50);
    }

    saveToFile(submissions);
    console.log("Submission saved successfully:", submissionData.email);
    return submissionData;
  } catch (error) {
    console.error("Error saving submission:", error);
    return submissionData;
  }
}

function addSSEConnection(connectionId, response) {
  // Not used in serverless
  console.log("SSE connection attempt (not supported in serverless)");
}

function removeSSEConnection(connectionId) {
  // Not used in serverless
  console.log("SSE disconnection (not supported in serverless)");
}

async function broadcastToConnections(data) {
  // For serverless, we can't maintain persistent connections
  console.log("Broadcasting data (serverless mode):", data.type);
  return Promise.resolve();
}

function getConnectionsCount() {
  return 0; // No persistent connections in serverless
}

module.exports = {
  getRecentSubmissions,
  getSubmissionById,
  saveSubmission,
  addSSEConnection,
  removeSSEConnection,
  broadcastToConnections,
  getConnectionsCount,
};
