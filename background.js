let activeTabId = null;
let startTime = null;
let tabTimes = {};
let tabMetadata = {}; // Store tab titles and URLs
let deletedTabs = {}; // Store deleted tab data
let isIdle = false;

console.log("🔄 Tab Time Tracker service worker loaded.");

function getTodayDateStr() {
  const now = new Date();
  return now.toISOString().split("T")[0]; // e.g., "2025-07-04"
}

async function checkAndResetIfNewDay() {
  const { lastTrackedDate, tabTimes, tabMetadata, deletedTabs } = await chrome.storage.local.get(["lastTrackedDate", "tabTimes", "tabMetadata", "deletedTabs"]);
  const today = getTodayDateStr();

  if (lastTrackedDate !== today) {
    console.log("🧹 New day detected — resetting tabTimes.");
    await chrome.storage.local.set({
      lastTrackedDate: today,
      tabTimes: {}, // Reset daily times
      tabMetadata: {}, // Reset metadata
      deletedTabs: {} // Reset deleted tabs
    });
  }
}

// Store tab metadata when tracking starts
async function storeTabMetadata(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    tabMetadata[tabId] = {
      title: tab.title,
      url: tab.url,
      favicon: tab.favIconUrl
    };
    await chrome.storage.local.set({ tabMetadata });
  } catch (error) {
    console.log("Could not get tab metadata for:", tabId);
  }
}

// Handle tab removal to store deleted tab data
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const timeSpent = tabTimes[tabId] || 0;
  const metadata = tabMetadata[tabId];
  
  // Only store if tab was active for more than 1 hour (3600000 ms)
  if (timeSpent > 3600000 && metadata) {
    deletedTabs[tabId] = {
      title: metadata.title,
      url: metadata.url,
      timeSpent: timeSpent,
      deletedAt: Date.now()
    };
    await chrome.storage.local.set({ deletedTabs });
  }
  
  // Clean up current tracking data
  delete tabTimes[tabId];
  delete tabMetadata[tabId];
  await chrome.storage.local.set({ tabTimes, tabMetadata });
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!isIdle) await handleTabChange(activeInfo.tabId);
});

chrome.windows.onFocusChanged.addListener(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!isIdle && tab) await handleTabChange(tab.id);
});

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
  
  // Store metadata for new active tab
  await storeTabMetadata(newTabId);
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

// Load data from storage on startup
chrome.storage.local.get(['tabTimes', 'tabMetadata', 'deletedTabs']).then(result => {
  tabTimes = result.tabTimes || {};
  tabMetadata = result.tabMetadata || {};
  deletedTabs = result.deletedTabs || {};
  console.log('Data loaded from storage');
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  checkAndResetIfNewDay();
});

// Initialize when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  checkAndResetIfNewDay();
});

checkAndResetIfNewDay();
setInterval(checkAndResetIfNewDay, 60 * 60 * 1000);