// api/index.js
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

  const baseUrl = `https://${req.headers.host}`;

  res.json({
    message: "Fillout to Referral Webhook Service (Vercel Serverless)",
    endpoints: {
      webhook: `${baseUrl}/fillout-webhook`,
      dashboard: `${baseUrl}/dashboard`,
      recentSubmissions: `${baseUrl}/recent-submissions`,
      specificSubmission: `${baseUrl}/submission/{id}`,
      health: `${baseUrl}/health`,
    },
    usage: {
      webhook: "POST to /fillout-webhook with Fillout webhook payload",
      direct: "GET /fillout-webhook?email=user@example.com for manual testing",
    },
  });
};
