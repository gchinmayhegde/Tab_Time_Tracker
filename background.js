let activeTabId = null;
let startTime = null;
let tabTimes = {};
let isIdle = false;

console.log("🔄 Tab Time Tracker service worker loaded.");

function getTodayDateStr() {
  const now = new Date();
  return now.toISOString().split("T")[0]; // e.g., "2025-07-04"
}

async function checkAndResetIfNewDay() {
  const { lastTrackedDate, tabTimes } = await chrome.storage.local.get(["lastTrackedDate", "tabTimes"]);
  const today = getTodayDateStr();

  if (lastTrackedDate !== today) {
    console.log("🧹 New day detected — resetting tabTimes.");
    await chrome.storage.local.set({
      lastTrackedDate: today,
      tabTimes: {} // Optional: you could archive old data instead
    });
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!isIdle) await handleTabChange(activeInfo.tabId);
});

chrome.windows.onFocusChanged.addListener(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!isIdle && tab) await handleTabChange(tab.id);
});

// ⏳ Handle idle changes
chrome.idle.onStateChanged.addListener((newState) => {
  if (newState === "idle" || newState === "locked") {
    console.log("User is idle...");
    pauseTracking();
    isIdle = true;
  } else if (newState === "active") {
    console.log("User is active again.");
    resumeTracking();
    isIdle = false;
  }
});

function pauseTracking() {
  if (activeTabId !== null && startTime !== null) {
    const timeSpent = Date.now() - startTime;
    tabTimes[activeTabId] = (tabTimes[activeTabId] || 0) + timeSpent;
    startTime = null;
    chrome.storage.local.set({ tabTimes });
  }
}

function resumeTracking() {
  startTime = Date.now();
}

async function handleTabChange(newTabId) {
  const currentTime = Date.now();
  if (activeTabId !== null && startTime !== null) {
    const timeSpent = currentTime - startTime;
    tabTimes[activeTabId] = (tabTimes[activeTabId] || 0) + timeSpent;
  }
  activeTabId = newTabId;
  startTime = Date.now();
  await chrome.storage.local.set({ tabTimes });
}

setInterval(async () => {
  if (activeTabId !== null && startTime !== null && !isIdle) {
    const now = Date.now();
    const timeSpent = now - startTime;
    tabTimes[activeTabId] = (tabTimes[activeTabId] || 0) + timeSpent;
    startTime = now;
    await chrome.storage.local.set({ tabTimes });
  }
}, 10000);

checkAndResetIfNewDay();
setInterval(checkAndResetIfNewDay, 60 * 60 * 1000);

