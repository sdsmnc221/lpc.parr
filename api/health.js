// api/health.js
import { getRecentSubmissions, getConnectionsCount } from "../lib/storage.js";

export default async function handler(req, res) {
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
    const submissions = getRecentSubmissions();

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "fillout-referral-webhook-vercel",
      recentSubmissions: submissions.length,
      connections: getConnectionsCount(),
      environment: "serverless",
    });
  } catch (error) {
    console.error("Error in health check:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
}
