// api/recent-submissions.js
const storage = require("../lib/storage.js");

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
    const submissions = await storage.getRecentSubmissions(limit);

    console.log(
      "Recent submissions request - found:",
      submissions ? submissions.length : "null/undefined",
      "submissions"
    );
    console.log(
      "Submissions type:",
      typeof submissions,
      "Is array:",
      Array.isArray(submissions)
    );

    // Ensure submissions is always an array
    const submissionsArray = Array.isArray(submissions) ? submissions : [];

    res.json({
      total: submissionsArray.length,
      showing: submissionsArray.length,
      submissions: submissionsArray,
      debug: {
        timestamp: new Date().toISOString(),
        limit: limit,
        storageType: "redis",
        originalType: typeof submissions,
        isArray: Array.isArray(submissions),
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
