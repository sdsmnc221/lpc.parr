// popup.js

document.addEventListener("DOMContentLoaded", function () {
  const emailInput = document.getElementById("email");
  const fillButton = document.getElementById("fillButton");
  const openButton = document.getElementById("openReferral");
  const statusDiv = document.getElementById("status");
  const recentList = document.getElementById("recentList");
  const clearButton = document.getElementById("clearHistory");

  // Load recent emails
  loadRecentEmails();

  // Check current tab for URL parameter first, then load stored email
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];

    // Check if current tab has email parameter
    if (currentTab.url && currentTab.url.includes("filleul=")) {
      const urlParams = new URLSearchParams(new URL(currentTab.url).search);
      const emailFromUrl = urlParams.get("filleul");

      if (emailFromUrl) {
        emailInput.value = decodeURIComponent(emailFromUrl);
        showStatus("Email detected from URL: " + emailFromUrl, "success");
        return;
      }
    }

    // Fallback to stored email if no URL parameter
    chrome.storage.local.get(["lastEmail"], function (result) {
      if (result.lastEmail && !emailInput.value) {
        emailInput.value = result.lastEmail;
      }
    });
  });

  // Fill button click
  fillButton.addEventListener("click", function () {
    const email = emailInput.value.trim();

    if (!email) {
      showStatus("Please enter an email address", "error");
      return;
    }

    if (!isValidEmail(email)) {
      showStatus("Please enter a valid email address", "error");
      return;
    }

    // Save email to storage
    chrome.storage.local.set({ lastEmail: email });
    addToRecentEmails(email);

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: "fillEmail",
          email: email,
        },
        function (response) {
          if (chrome.runtime.lastError) {
            showStatus(
              "Error: Make sure you are on the Referral referral page",
              "error"
            );
          } else if (response && response.success) {
            showStatus("Email filled successfully!", "success");
          } else {
            showStatus(
              "Failed to fill email. Are you on the right page?",
              "error"
            );
          }
        }
      );
    });
  });

  // Open Referral button
  openButton.addEventListener("click", function () {
    fetch(chrome.runtime.getURL("config.json"))
      .then((response) => response.json())
      .then((config) => {
        chrome.tabs.create({ url: config.referral_url });
      })
      .catch(() => {
        console.error("Failed to load config.json");
      });
  });

  // Clear history button
  clearButton.addEventListener("click", function () {
    chrome.storage.local.set({ recentEmails: [] });
    loadRecentEmails();
    showStatus("History cleared", "success");
  });

  // Helper functions
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function showStatus(message, type) {
    statusDiv.className = type;
    statusDiv.textContent = message;
    statusDiv.style.display = "block";

    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 3000);
  }

  function addToRecentEmails(email) {
    chrome.storage.local.get(["recentEmails"], function (result) {
      let recentEmails = result.recentEmails || [];

      // Remove if already exists
      recentEmails = recentEmails.filter((e) => e !== email);

      // Add to beginning
      recentEmails.unshift(email);

      // Keep only last 10
      recentEmails = recentEmails.slice(0, 10);

      chrome.storage.local.set({ recentEmails: recentEmails });
      loadRecentEmails();
    });
  }

  function loadRecentEmails() {
    chrome.storage.local.get(["recentEmails"], function (result) {
      const recentEmails = result.recentEmails || [];
      recentList.innerHTML = "";

      if (recentEmails.length === 0) {
        recentList.innerHTML =
          '<div style="font-style: italic; color: #666;">No recent emails</div>';
        return;
      }

      recentEmails.forEach((email) => {
        const div = document.createElement("div");
        div.className = "recent-email";
        div.textContent = email;
        div.addEventListener("click", function () {
          emailInput.value = email;
        });
        recentList.appendChild(div);
      });
    });
  }
});
