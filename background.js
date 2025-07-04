let activeTabId = null;
let startTime = null;
let tabTimes = {};
let isIdle = false;

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
