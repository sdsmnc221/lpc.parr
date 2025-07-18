// api/recent-submissions.js
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
    const limit = parseInt(req.query.limit) || 10;
    const submissions = getRecentSubmissions(limit);

    console.log(
      "Recent submissions request - found:",
      submissions.length,
      "submissions"
    );

    res.json({
      total: submissions.length,
      showing: submissions.length,
      submissions: submissions,
      debug: {
        timestamp: new Date().toISOString(),
        limit: limit,
        memoryState: "fresh_start_each_call",
      },
    });
  } catch (error) {
    console.error("Error fetching recent submissions:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};
