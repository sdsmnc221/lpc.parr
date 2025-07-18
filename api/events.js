// api/events.js
// Simple polling endpoint for dashboard updates
const { getRecentSubmissions } = require("../lib/storage.js");

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET", "OPTIONS"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const submissions = getRecentSubmissions(50);

    res.json({
      type: "poll_response",
      submissions: submissions,
      timestamp: new Date().toISOString(),
      count: submissions.length,
    });
  } catch (error) {
    console.error("Error in events endpoint:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};
