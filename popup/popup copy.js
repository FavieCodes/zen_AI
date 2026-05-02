const summarizeBtn = document.getElementById('summarize-btn');
const clearBtn = document.getElementById('clear-btn');
const copyBtn = document.getElementById('copy-btn');
const loading = document.getElementById('loading');
const errorBox = document.getElementById('error-box');
const errorMsg = document.getElementById('error-msg');
const summaryBox = document.getElementById('summary-box');
const summaryList = document.getElementById('summary-list');
const insightsList = document.getElementById('insights-list');
const readingTime = document.getElementById('reading-time');
const cacheBadge = document.getElementById('cache-badge');
const pageTitle = document.getElementById('page-title');

// Get current tab info on load
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    pageTitle.textContent = tabs[0].title || 'Unknown Page';
  }
});

summarizeBtn.addEventListener('click', async () => {
  showLoading();

  try {
    // 1. Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 2. Ask content script to extract page content
    const extractResponse = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractContent',
    });

    if (!extractResponse?.success) {
      throw new Error('Could not extract page content');
    }

    // 3. Send to background for AI summarization
    const summaryResponse = await chrome.runtime.sendMessage({
      action: 'summarize',
      data: extractResponse.data,
    });

    if (!summaryResponse?.success) {
      throw new Error(summaryResponse?.error || 'Summarization failed');
    }

    // 4. Display the summary
    displaySummary(summaryResponse.summary, summaryResponse.fromCache);

  } catch (err) {
    showError(err.message);
  }
});

clearBtn.addEventListener('click', () => {
  resetUI();
});

copyBtn.addEventListener('click', () => {
  const bullets = [...summaryList.querySelectorAll('li')].map(li => '• ' + li.textContent).join('\n');
  const insights = [...insightsList.querySelectorAll('li')].map(li => '→ ' + li.textContent).join('\n');
  const text = `Summary:\n${bullets}\n\nKey Insights:\n${insights}`;
  navigator.clipboard.writeText(text);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => copyBtn.textContent = 'Copy Summary', 2000);
});

function showLoading() {
  loading.style.display = 'flex';
  summaryBox.style.display = 'none';
  errorBox.style.display = 'none';
  summarizeBtn.disabled = true;
}

function displaySummary(summary, fromCache) {
  loading.style.display = 'none';
  summaryBox.style.display = 'block';
  clearBtn.style.display = 'inline-block';

  summaryList.innerHTML = summary.summary
    .map(item => `<li>${sanitize(item)}</li>`).join('');
  insightsList.innerHTML = summary.keyInsights
    .map(item => `<li>${sanitize(item)}</li>`).join('');
  readingTime.textContent = summary.readingTime;
  cacheBadge.style.display = fromCache ? 'inline' : 'none';
}

function showError(msg) {
  loading.style.display = 'none';
  errorBox.style.display = 'block';
  errorMsg.textContent = msg;
  summarizeBtn.disabled = false;
}

function resetUI() {
  summaryBox.style.display = 'none';
  errorBox.style.display = 'none';
  clearBtn.style.display = 'none';
  summarizeBtn.disabled = false;
  loading.style.display = 'none';
}

function sanitize(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}