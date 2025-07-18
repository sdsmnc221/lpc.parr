// background.js
console.log("Referral Auto-fill Helper background script loaded");

// Listen for extension installation
chrome.runtime.onInstalled.addListener(function () {
  console.log("Referral Auto-fill Helper installed");
});

// Optional: Listen for tab updates to show badge when on Referral
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === "complete" && tab.url) {
    if (tab.url.includes("process.env.PARRAINAGE_URL_SLUG")) {
      // Show badge when on Referral referral page
      chrome.action.setBadgeText({
        text: "!",
        tabId: tabId,
      });
      chrome.action.setBadgeBackgroundColor({
        color: "#007bff",
        tabId: tabId,
      });
    } else {
      // Clear badge on other pages
      chrome.action.setBadgeText({
        text: "",
        tabId: tabId,
      });
    }
  }
});
