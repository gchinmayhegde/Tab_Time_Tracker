// Convert object to CSV string
function toCSV(obj) {
  let csv = "Tab Title,Time Spent (seconds)\n";
  for (const [title, seconds] of Object.entries(obj)) {
    csv += `"${title.replace(/"/g, '""')}",${seconds}\n`;
  }
  return csv;
}

// Trigger download of a string as a file
function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

document.getElementById("export-csv").addEventListener("click", async () => {
  const { tabTimes } = await chrome.storage.local.get("tabTimes");
  const exportData = {};

  for (const [tabId, ms] of Object.entries(tabTimes || {})) {
    try {
      const tab = await chrome.tabs.get(parseInt(tabId));
      exportData[tab.title.substring(0, 30)] = Math.round(ms / 1000);
    } catch {
      exportData["Closed Tab " + tabId] = Math.round(ms / 1000);
    }
  }

  const csv = toCSV(exportData);
  downloadFile("tab_times.csv", csv, "text/csv");
});

document.getElementById("export-json").addEventListener("click", async () => {
  const { tabTimes } = await chrome.storage.local.get("tabTimes");
  const exportData = {};

  for (const [tabId, ms] of Object.entries(tabTimes || {})) {
    try {
      const tab = await chrome.tabs.get(parseInt(tabId));
      exportData[tab.title.substring(0, 30)] = Math.round(ms / 1000);
    } catch {
      exportData["Closed Tab " + tabId] = Math.round(ms / 1000);
    }
  }

  const json = JSON.stringify(exportData, null, 2);
  downloadFile("tab_times.json", json, "application/json");
});
