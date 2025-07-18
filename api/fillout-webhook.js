// api/fillout-webhook.js
const { saveSubmission, broadcastToConnections } = require("../lib/storage.js");

// Function to generate pre-filled Referral link with URL parameter
function generateReferralLink(email) {
  const baseUrl = process.env.PARRAINAGE_URL || "https://example.com/referral";
  const urlWithParam = `${baseUrl}?filleul=${encodeURIComponent(email)}`;

  return {
    directLink: urlWithParam,
    email: email,
    instructions: `1. Click the link: ${urlWithParam}\n2. The extension will auto-detect and fill the email\n3. Click "Envoyer par e-mail" to send the referral`,
  };
}

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    if (req.query.email) {
      // Handle direct email query
      try {
        const email = req.query.email;
        const submissionId = `manual-${Date.now()}`;
        const formName = "Manual Entry";

        const referralInfo = generateReferralLink(email);

        const submissionData = {
          submissionId: submissionId,
          email: email,
          timestamp: new Date().toISOString(),
          formName: formName,
          referralInfo: referralInfo,
          source: "query_param",
        };

        await saveSubmission(submissionData);
        await broadcastToConnections({
          type: "new_submission",
          submission: submissionData,
        });

        return res.status(200).json({
          success: true,
          message: "Webhook processed successfully - Manual action required",
          submissionId: submissionId,
          email: email,
          source: "query_param",
          referralInfo: referralInfo,
          action: "Click the provided link and complete the form manually",
        });
      } catch (error) {
        console.error("Error processing direct email:", error);
        return res.status(500).json({
          success: false,
          error: "Internal server error",
          message: error.message,
        });
      }
    }

    return res.json({
      message: "Fillout Webhook Endpoint",
      usage: {
        fillout: "POST with Fillout webhook body",
        direct: "GET or POST with ?email=user@example.com",
      },
      examples: [
        `GET ${req.headers.host}/fillout-webhook?email=test@example.com`,
        `POST ${req.headers.host}/fillout-webhook?email=test@example.com`,
      ],
    });
  }

  if (req.method === "POST") {
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
      else if (
        req.body &&
        req.body.submission &&
        req.body.submission.questions
      ) {
        const submission = req.body.submission;
        const questions = submission.questions;

        // Find the email field (id: "f6di")
        const emailQuestion = questions.find((q) => q.id === "f6di");

        if (!emailQuestion || !emailQuestion.value) {
          console.error("Email not found in submission");

          await broadcastToConnections({
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

        await broadcastToConnections({
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

      const submissionData = {
        submissionId: submissionId,
        email: email,
        timestamp: new Date().toISOString(),
        formName: formName,
        referralInfo: referralInfo,
        source: req.query.email ? "query_param" : "fillout_webhook",
      };

      await saveSubmission(submissionData);

      console.log("Generated Referral link info:", referralInfo);
      console.log("📧 Email:", email);
      console.log("🔗 Link:", referralInfo.directLink);
      console.log("📝 Instructions:", referralInfo.instructions);

      // Broadcast to connected clients
      await broadcastToConnections({
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

      await broadcastToConnections({
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
  } else {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    res.status(405).json({ error: "Method not allowed" });
  }
};
