chrome.storage.local.get("tabTimes", async ({ tabTimes }) => {
  if (!tabTimes) return;

  const labels = [];
  const data = [];
  
  for (const [tabId, ms] of Object.entries(tabTimes)) {
    try {
      const tab = await chrome.tabs.get(parseInt(tabId));
      labels.push(tab.title.substring(0, 20));
      data.push(Math.round(ms / 1000));
    } catch {
      labels.push("Closed Tab");
      data.push(Math.round(ms / 1000));
    }
  }

  new Chart(document.getElementById("chart"), {
    type: "pie",
    data: {
      labels,
      datasets: [{
        label: "Time (s)",
        data,
        backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56", "#4BC0C0", "#9966FF"]
      }]
    }
  });
});
