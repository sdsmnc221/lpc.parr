// content.js
console.log("Referral Auto-fill Helper loaded");

// Auto-fill from URL parameter when page loads
let autoFillAttempted = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "fillEmail") {
    const success = fillEmailField(request.email);
    sendResponse({ success: success });
  } else if (request.action === "fillEmailAndSend") {
    const success = fillEmailField(request.email);
    let sent = false;
    if (success) {
      // Try to click the 'Envoyer par e-mail' button
      setTimeout(() => {
        const sendBtn = document.querySelector(
          "#sharing-button, button#sharing-button"
        );
        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
          sent = true;
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
      }, 300); // Wait a bit for the button to enable
      return true; // Keep the message channel open for async response
    } else {
      sendResponse({ success: false });
    }
  }
});

function fillEmailField(email) {
  try {
    // Multiple selectors to find the email input
    const selectors = [
      'input[id="email"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="mail"]',
      '.form-control[type="text"]',
      "input.form-control",
    ];

    let emailInput = null;

    // Try each selector
    for (let selector of selectors) {
      emailInput = document.querySelector(selector);
      if (emailInput) {
        console.log("Found email input with selector:", selector);
        break;
      }
    }

    if (!emailInput) {
      console.error("Email input not found");
      return false;
    }

    // Fill the email
    emailInput.value = email;
    emailInput.focus();

    // Trigger various events that might be needed
    const events = ["input", "change", "keyup", "keydown", "blur", "focusout"];
    events.forEach((eventType) => {
      emailInput.dispatchEvent(new Event(eventType, { bubbles: true }));
    });

    // Wait a bit then try to enable buttons
    setTimeout(() => {
      enableButtons();
    }, 500);

    console.log("Email filled successfully:", email);
    return true;
  } catch (error) {
    console.error("Error filling email:", error);
    return false;
  }
}

function enableButtons() {
  try {
    // Try to enable the share button
    const shareButton = document.querySelector(
      '#sharing-button, button[id="sharing-button"]'
    );
    if (shareButton) {
      shareButton.disabled = false;
      shareButton.removeAttribute("disabled");
      shareButton.setAttribute("data-advantage-code", "");
      shareButton.setAttribute("data-code-promo", "3SJ6NWJX");
      shareButton.setAttribute("data-prescriber-type", "2");
      console.log("Share button enabled");
    }

    document.querySelector("#sharing-button").click(); // Trigger the sharing button click

    // Try to enable the PDF button
    const pdfButton = document.querySelector(
      '#sharing-pdf, a[id="sharing-pdf"]'
    );
    if (pdfButton) {
      pdfButton.disabled = false;
      pdfButton.removeAttribute("disabled");
      console.log("PDF button enabled");
    }

    // Visual feedback
    const emailInput = document.querySelector('input[id="email"]');
    if (emailInput) {
      emailInput.style.borderColor = "#28a745";
      emailInput.style.boxShadow = "0 0 5px rgba(40, 167, 69, 0.3)";

      // Reset after 3 seconds
      setTimeout(() => {
        emailInput.style.borderColor = "";
        emailInput.style.boxShadow = "";
      }, 3000);
    }
  } catch (error) {
    console.error("Error enabling buttons:", error);
  }
}

// Function to get URL parameter
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Function to auto-fill from URL parameter
function autoFillFromUrl() {
  if (autoFillAttempted) return;
  autoFillAttempted = true;

  const emailFromUrl = getUrlParameter("filleul");

  if (emailFromUrl) {
    console.log("Found email parameter in URL:", emailFromUrl);

    // Wait for page to be ready
    setTimeout(() => {
      const success = fillEmailField(emailFromUrl);
      if (success) {
        showAutoFillNotification(emailFromUrl);
      }
    }, 1000);
  }
}

// Auto-detect when page is loaded and show notification
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", pageLoaded);
} else {
  pageLoaded();
}

function pageLoaded() {
  // Check if we're on the referral page
  if (window.location.pathname.includes("/parrainage-prescripteur")) {
    console.log("Referral referral page detected");

    // Try to auto-fill from URL
    autoFillFromUrl();

    // Show notification
    showNotification();
  }
}

function showNotification() {
  const emailFromUrl = getUrlParameter("filleul");

  // Create notification element
  const notification = document.createElement("div");
  notification.id = "referral-helper-notification";
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${emailFromUrl ? "#28a745" : "#007bff"};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        transition: all 0.3s ease;
        max-width: 300px;
    `;

  if (emailFromUrl) {
    notification.innerHTML = `🐾 Auto-filled: ${emailFromUrl}<br><small>Click "Envoyer par e-mail" to send!</small>`;
  } else {
    notification.innerHTML =
      "🐾 Referral Helper ready! Click extension icon to auto-fill email.";
  }

  // Add hover effect
  notification.addEventListener("mouseenter", function () {
    this.style.background = emailFromUrl ? "#1e7e34" : "#0056b3";
  });

  notification.addEventListener("mouseleave", function () {
    this.style.background = emailFromUrl ? "#28a745" : "#007bff";
  });

  // Remove on click
  notification.addEventListener("click", function () {
    this.remove();
  });

  document.body.appendChild(notification);

  // Auto-remove after longer time if auto-filled
  setTimeout(
    () => {
      if (notification.parentNode) {
        notification.remove();
      }
    },
    emailFromUrl ? 8000 : 5000
  );
}

function showAutoFillNotification(email) {
  // Create success notification
  const notification = document.createElement("div");
  notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 16px;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        max-width: 350px;
        animation: slideIn 0.3s ease-out;
    `;

  notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">✅ Auto-filled Successfully!</div>
        <div style="font-size: 14px; opacity: 0.9;">Email: ${email}</div>
        <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">
            Next: Click "Envoyer par e-mail" button
        </div>
    `;

  // Add CSS animation
  if (!document.getElementById("referral-helper-styles")) {
    const style = document.createElement("style");
    style.id = "referral-helper-styles";
    style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideIn 0.3s ease-out reverse";
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  }, 5000);
}
