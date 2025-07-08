// Format time from milliseconds to HH:MM:SS, MM:SS, or SS format
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  } else if (minutes > 0) {
    return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  } else {
    return `${seconds.toString().padStart(2, '0')}`;
  }
}

// Convert object to CSV string
function toCSV(obj) {
  let csv = "Tab Title,Time Spent\
";
  for (const [title, ms] of Object.entries(obj)) {
    csv += `"${title.replace(/"/g, '""')}","${formatTime(ms)}"\
`;
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

// Display active tabs in real-time
async function displayActiveTabs() {
  const { tabTimes, tabMetadata, deletedTabs } = await chrome.storage.local.get(['tabTimes', 'tabMetadata', 'deletedTabs']);
  const activeTabsList = document.getElementById('active-tabs-list');
  
  // Combine active and deleted tabs
  const allTabs = [];
  
  // Add active tabs
  for (const [tabId, timeMs] of Object.entries(tabTimes || {})) {
    const metadata = tabMetadata[tabId];
    if (metadata) {
      allTabs.push({
        id: tabId,
        title: metadata.title,
        time: timeMs,
        isDeleted: false,
        favicon: metadata.favicon
      });
    }
  }
  
  // Add deleted tabs
  for (const [tabId, data] of Object.entries(deletedTabs || {})) {
    allTabs.push({
      id: tabId,
      title: data.title + ' (deleted)',
      time: data.timeSpent,
      isDeleted: true,
      favicon: null
    });
  }
  
  // Sort by time spent (descending) and take top 5
  allTabs.sort((a, b) => b.time - a.time);
  const topTabs = allTabs.slice(0, 5);
  
  // Clear current content
  activeTabsList.innerHTML = '';
  
  if (topTabs.length === 0) {
    activeTabsList.innerHTML = '<div class="no-tabs">No tabs tracked yet today</div>';
    return;
  }
  
  // Create tab entries
  topTabs.forEach((tab, index) => {
    const tabElement = document.createElement('div');
    tabElement.className = `tab-item ${tab.isDeleted ? 'deleted' : 'active'}`;
    
    tabElement.innerHTML = `
      <div class="tab-header">
        <div class="tab-info">
          <span class="tab-rank">#${index + 1}</span>
          <span class="tab-title" title="${tab.title}">${truncateTitle(tab.title)}</span>
        </div>
        <div class="tab-time">${formatTime(tab.time)}</div>
      </div>
      <div class="tab-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(100, (tab.time / Math.max(...topTabs.map(t => t.time))) * 100)}%"></div>
        </div>
      </div>
    `;
    
    activeTabsList.appendChild(tabElement);
  });
}

// Truncate long titles
function truncateTitle(title) {
  return title.length > 35 ? title.substring(0, 35) + '...' : title;
}

// Update display every second
setInterval(displayActiveTabs, 1000);

// Initial display
displayActiveTabs();

// Export functions with improved format
document.getElementById("export-csv").addEventListener("click", async () => {
  const { tabTimes, tabMetadata, deletedTabs } = await chrome.storage.local.get(['tabTimes', 'tabMetadata', 'deletedTabs']);
  const exportData = {};

  // Add active tabs
  for (const [tabId, timeMs] of Object.entries(tabTimes || {})) {
    const metadata = tabMetadata[tabId];
    if (metadata) {
      exportData[metadata.title.substring(0, 50)] = timeMs;
    }
  }

  // Add deleted tabs
  for (const [tabId, data] of Object.entries(deletedTabs || {})) {
    exportData[data.title.substring(0, 50) + ' (deleted)'] = data.timeSpent;
  }

  const csv = toCSV(exportData);
  downloadFile("tab_times.csv", csv, "text/csv");
});

document.getElementById("export-json").addEventListener("click", async () => {
  const { tabTimes, tabMetadata, deletedTabs } = await chrome.storage.local.get(['tabTimes', 'tabMetadata', 'deletedTabs']);
  const exportData = {};

  // Add active tabs
  for (const [tabId, timeMs] of Object.entries(tabTimes || {})) {
    const metadata = tabMetadata[tabId];
    if (metadata) {
      exportData[metadata.title.substring(0, 50)] = formatTime(timeMs);
    }
  }

  // Add deleted tabs
  for (const [tabId, data] of Object.entries(deletedTabs || {})) {
    exportData[data.title.substring(0, 50) + ' (deleted)'] = formatTime(data.timeSpent);
  }

  const json = JSON.stringify(exportData, null, 2);
  downloadFile("tab_times.json", json, "application/json");
});