// lib/storage.js - Upstash Redis version
const { Redis } = require("@upstash/redis");

// Initialize Redis
const redis = Redis.fromEnv();

const RECENT_SUBMISSIONS_KEY = "recent-submissions";

async function getRecentSubmissions(limit = 50) {
  try {
    const submissions = await redis.get(RECENT_SUBMISSIONS_KEY);

    // Ensure we always return an array
    const submissionsArray = Array.isArray(submissions) ? submissions : [];

    console.log(
      "Retrieved from Redis:",
      submissionsArray.length,
      "submissions"
    );
    console.log(
      "Data type:",
      typeof submissions,
      "Array check:",
      Array.isArray(submissions)
    );

    return submissionsArray.slice(0, limit);
  } catch (error) {
    console.error("Error getting submissions from Redis:", error);
    return [];
  }
}

async function getSubmissionById(submissionId) {
  try {
    // First try to get from individual key
    const submission = await redis.get(`submission:${submissionId}`);
    if (submission) {
      return submission;
    }

    // Fallback: search in recent submissions list
    const submissions = (await redis.get(RECENT_SUBMISSIONS_KEY)) || [];
    return submissions.find((s) => s.submissionId === submissionId);
  } catch (error) {
    console.error("Error getting submission by ID:", error);
    return null;
  }
}

async function saveSubmission(submissionData) {
  try {
    // Get existing submissions
    const existingData = await redis.get(RECENT_SUBMISSIONS_KEY);
    const submissions = Array.isArray(existingData) ? existingData : [];

    console.log("Current submissions before save:", submissions.length);

    // Add new submission to the beginning
    submissions.unshift(submissionData);

    // Keep only last 50 submissions
    if (submissions.length > 50) {
      submissions.splice(50);
    }

    // Save the updated list back to Redis
    await redis.set(RECENT_SUBMISSIONS_KEY, submissions);

    // Also save individual submission with expiration (30 days)
    await redis.set(
      `submission:${submissionData.submissionId}`,
      submissionData,
      {
        ex: 30 * 24 * 60 * 60, // 30 days in seconds
      }
    );

    console.log("Submission saved to Redis. Total now:", submissions.length);
    console.log("New submission email:", submissionData.email);
    return submissionData;
  } catch (error) {
    console.error("Error saving submission to Redis:", error);
    return submissionData;
  }
}

async function clearAllSubmissions() {
  try {
    await redis.del(RECENT_SUBMISSIONS_KEY);
    console.log("All submissions cleared from Redis");
    return true;
  } catch (error) {
    console.error("Error clearing submissions:", error);
    return false;
  }
}

async function getStorageStats() {
  try {
    const submissionsData = await redis.get(RECENT_SUBMISSIONS_KEY);
    const submissions = Array.isArray(submissionsData) ? submissionsData : [];
    const keys = await redis.keys("submission:*");

    return {
      totalSubmissions: submissions.length,
      individualKeys: keys.length,
      redisConnected: true,
    };
  } catch (error) {
    console.error("Error getting storage stats:", error);
    return {
      totalSubmissions: 0,
      individualKeys: 0,
      redisConnected: false,
      error: error.message,
    };
  }
}

function addSSEConnection(connectionId, response) {
  console.log("SSE connection attempt (not supported in serverless)");
}

function removeSSEConnection(connectionId) {
  console.log("SSE disconnection (not supported in serverless)");
}

async function broadcastToConnections(data) {
  console.log("Broadcasting data (serverless mode):", data.type);
  // In the future, you could implement Redis pub/sub here for real-time updates
  return Promise.resolve();
}

function getConnectionsCount() {
  return 0;
}

module.exports = {
  getRecentSubmissions,
  getSubmissionById,
  saveSubmission,
  clearAllSubmissions,
  getStorageStats,
  addSSEConnection,
  removeSSEConnection,
  broadcastToConnections,
  getConnectionsCount,
};
