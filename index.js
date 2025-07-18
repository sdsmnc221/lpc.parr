const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Store for SSE connections
let sseConnections = [];

// Function to broadcast to all SSE connections
function broadcastToSSE(data) {
  sseConnections.forEach((connection) => {
    try {
      connection.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error("Error broadcasting to SSE connection:", error);
    }
  });
}

// Function to generate pre-filled Referral link with URL parameter
function generateReferralLink(email) {
  const baseUrl = "process.env.PARRAINAGE_URL";
  const urlWithParam = `${baseUrl}?filleul=${encodeURIComponent(email)}`;

  return {
    directLink: urlWithParam,
    email: email,
    instructions: `1. Click the link: ${urlWithParam}\n2. The extension will auto-detect and fill the email\n3. Click "Envoyer par e-mail" to send the referral`,
  };
}

// Store recent submissions for easy access
let recentSubmissions = [];

// GET endpoint for easy testing
app.get("/fillout-webhook", (req, res) => {
  if (req.query.email) {
    // Redirect to POST with same query params
    return req.app.handle(Object.assign(req, { method: "POST" }), res);
  }

  res.json({
    message: "Fillout Webhook Endpoint",
    usage: {
      fillout: "POST with Fillout webhook body",
      direct: "GET or POST with ?email=user@example.com",
    },
    examples: [
      `GET ${req.protocol}://${req.get(
        "host"
      )}/fillout-webhook?email=test@example.com`,
      `POST ${req.protocol}://${req.get(
        "host"
      )}/fillout-webhook?email=test@example.com`,
    ],
  });
});

// Webhook endpoint for Fillout
app.post("/fillout-webhook", async (req, res) => {
  try {
    console.log("Received POST webhook data:");
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("Query params:", req.query);

    let email = null;
    let submissionId = null;
    let formName = "Manual Entry";

    // Check if email is in query params (direct call)
    if (req.query.email) {
      email = req.query.email;
      submissionId = `manual-${Date.now()}`;
      formName = "Manual Entry";
      console.log("Email from query params:", email);
    }
    // Check if it's a proper Fillout webhook
    else if (req.body && req.body.submission && req.body.submission.questions) {
      const submission = req.body.submission;
      const questions = submission.questions;

      // Find the email field (id: "f6di")
      const emailQuestion = questions.find((q) => q.id === "f6di");

      if (!emailQuestion || !emailQuestion.value) {
        console.error("Email not found in submission");

        // Broadcast error to SSE even if email not found
        broadcastToSSE({
          type: "webhook_error",
          error: "Email not found in submission",
          submissionId: submission.submissionId,
          timestamp: new Date().toISOString(),
          body: req.body,
          query: req.query,
        });

        return res.status(400).json({
          error: "Email not found in submission",
          submissionId: submission.submissionId,
        });
      }

      email = emailQuestion.value;
      submissionId = submission.submissionId;
      formName = req.body.formName || "Fillout Form";
      console.log("Email from Fillout submission:", email);
    }
    // No valid email source found
    else {
      console.error("No valid email source found");

      // Broadcast error to SSE
      broadcastToSSE({
        type: "webhook_error",
        error: "No valid email source found",
        timestamp: new Date().toISOString(),
        body: req.body,
        query: req.query,
      });

      return res.status(400).json({
        error:
          "No valid email source found. Expected either ?email=... in query params or Fillout webhook body",
        receivedBody: req.body,
        receivedQuery: req.query,
      });
    }

    // Generate Referral link info
    const referralInfo = generateReferralLink(email);

    // Store submission for easy access
    const submissionData = {
      submissionId: submissionId,
      email: email,
      timestamp: new Date().toISOString(),
      formName: formName,
      referralInfo: referralInfo,
      source: req.query.email ? "query_param" : "fillout_webhook",
    };

    recentSubmissions.unshift(submissionData);

    // Keep only last 50 submissions
    if (recentSubmissions.length > 50) {
      recentSubmissions = recentSubmissions.slice(0, 50);
    }

    console.log("Generated Referral link info:", referralInfo);
    console.log("📧 Email:", email);
    console.log("🔗 Link:", referralInfo.directLink);
    console.log("📝 Instructions:", referralInfo.instructions);

    // Broadcast to SSE connections
    broadcastToSSE({
      type: "new_submission",
      submission: submissionData,
    });

    res.status(200).json({
      success: true,
      message: "Webhook processed successfully - Manual action required",
      submissionId: submissionId,
      email: email,
      source: req.query.email ? "query_param" : "fillout_webhook",
      referralInfo: referralInfo,
      action: "Click the provided link and complete the form manually",
    });
  } catch (error) {
    console.error("Error processing webhook:", error);

    // Broadcast error to SSE
    broadcastToSSE({
      type: "webhook_error",
      error: error.message,
      timestamp: new Date().toISOString(),
      body: req.body,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

// Serve dashboard.html as the dashboard
const path = require("path");
app.get("/dashboard", (req, res) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// SSE endpoint for real-time updates
app.get("/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Send initial connection message
  res.write(
    `data: ${JSON.stringify({
      type: "connected",
      message: "Connected to live updates",
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  // Add connection to store
  sseConnections.push(res);

  // Send current submissions
  res.write(
    `data: ${JSON.stringify({
      type: "initial_data",
      submissions: recentSubmissions,
    })}\n\n`
  );

  // Handle connection close
  req.on("close", () => {
    sseConnections = sseConnections.filter((conn) => conn !== res);
    console.log("SSE connection closed");
  });

  req.on("error", (err) => {
    console.error("SSE connection error:", err);
    sseConnections = sseConnections.filter((conn) => conn !== res);
  });
});

// New endpoint to view recent submissions
app.get("/recent-submissions", (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const submissions = recentSubmissions.slice(0, limit);

  res.json({
    total: recentSubmissions.length,
    showing: submissions.length,
    submissions: submissions,
  });
});

// New endpoint to get specific submission
app.get("/submission/:id", (req, res) => {
  const submissionId = req.params.id;
  const submission = recentSubmissions.find(
    (s) => s.submissionId === submissionId
  );

  if (!submission) {
    return res.status(404).json({ error: "Submission not found" });
  }

  res.json(submission);
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "fillout-referral-webhook-manual",
    recentSubmissions: recentSubmissions.length,
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Fillout to Referral Webhook Service (Manual Processing)",
    endpoints: {
      webhook: "POST /fillout-webhook",
      dashboard: "GET /dashboard",
      recentSubmissions: "GET /recent-submissions",
      specificSubmission: "GET /submission/:id",
      health: "GET /health",
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
  console.log(`📝 Webhook endpoint: http://localhost:${PORT}/fillout-webhook`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
