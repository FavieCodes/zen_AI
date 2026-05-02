const summarizeBtn = document.getElementById('summarize-btn');
const clearBtn     = document.getElementById('clear-btn');
const copyBtn      = document.getElementById('copy-btn');
const loading      = document.getElementById('loading');
const loadingText  = document.getElementById('loading-text');
const errorBox     = document.getElementById('error-box');
const errorMsg     = document.getElementById('error-msg');
const summaryBox   = document.getElementById('summary-box');
const summaryList  = document.getElementById('summary-list');
const insightsList = document.getElementById('insights-list');
const tagsRow      = document.getElementById('tags-row');
const readingTime  = document.getElementById('reading-time');
const wordCount    = document.getElementById('word-count');
const cacheBadge   = document.getElementById('cache-badge');
const pageTitle    = document.getElementById('page-title');

// Rotating loading messages so the wait feels alive
const loadingMessages = [
  'Extracting page content...',
  'Analyzing article structure...',
  'Sending to AI for analysis...',
  'Building your summary...',
  'Almost ready...',
];
let loadingInterval = null;

// Get current tab info on load
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    pageTitle.textContent = tabs[0].title || 'Unknown Page';
  }
});

summarizeBtn.addEventListener('click', async () => {
  showLoading();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Guard: can't inject into chrome
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot summarize this page. Try a regular website.');
    }

    // Inject content script fresh
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-script.js'],
    });

    // Small delay to let the script initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    // Extract content from the page
    const extractResponse = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractContent',
    });

    if (!extractResponse?.success) {
      throw new Error('Could not extract page content.');
    }

    // Send to background service worker for AI summarization
    const summaryResponse = await chrome.runtime.sendMessage({
      action: 'summarize',
      data: extractResponse.data,
    });

    if (!summaryResponse?.success) {
      throw new Error(summaryResponse?.error || 'Summarization failed.');
    }

    displaySummary(summaryResponse.summary, summaryResponse.fromCache);

  } catch (err) {
    showError(err.message);
  }
});

clearBtn.addEventListener('click', resetUI);

copyBtn.addEventListener('click', () => {
  const bullets   = [...summaryList.querySelectorAll('li')].map(li => '• ' + li.textContent).join('\n');
  const insights  = [...insightsList.querySelectorAll('li')].map(li => '→ ' + li.textContent).join('\n');
  const time      = readingTime.textContent;
  const wc        = wordCount.textContent;
  const text      = `${pageTitle.textContent}\n\nSummary:\n${bullets}\n\nKey Insights:\n${insights}\n\n${time}  ${wc}`;

  navigator.clipboard.writeText(text);
  copyBtn.textContent = '✓ Copied!';
  setTimeout(() => { copyBtn.textContent = 'Copy Summary'; }, 2000);
});

// ─── UI STATE HELPERS ─────────────────────────────────────────────────────────

function showLoading() {
  loading.style.display     = 'flex';
  summaryBox.style.display  = 'none';
  errorBox.style.display    = 'none';
  summarizeBtn.disabled     = true;
  clearBtn.style.display    = 'none';

  // Rotate loading messages
  let i = 0;
  loadingText.textContent = loadingMessages[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[i];
  }, 1800);
}

function displaySummary(summary, fromCache) {
  clearInterval(loadingInterval);
  loading.style.display     = 'none';
  summaryBox.style.display  = 'block';
  clearBtn.style.display    = 'inline-block';
  summarizeBtn.disabled     = false;

  // Summary bullets
  summaryList.innerHTML = (summary.summary || [])
    .map(item => `<li>${sanitize(item)}</li>`)
    .join('');

  // Key insights
  insightsList.innerHTML = (summary.keyInsights || [])
    .map(item => `<li>${sanitize(item)}</li>`)
    .join('');

  // Topic tags (new)
  tagsRow.innerHTML = '';
  if (summary.topicTags && summary.topicTags.length) {
    summary.topicTags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = sanitize(tag);
      tagsRow.appendChild(span);
    });
  }

  // Meta row
  readingTime.textContent = summary.readingTime  || '';
  wordCount.textContent   = summary.wordCount    ? `· ${summary.wordCount}` : '';
  cacheBadge.style.display = fromCache ? 'inline' : 'none';
}

function showError(msg) {
  clearInterval(loadingInterval);
  loading.style.display   = 'none';
  errorBox.style.display  = 'block';
  errorMsg.textContent    = msg;
  summarizeBtn.disabled   = false;
}

function resetUI() {
  clearInterval(loadingInterval);
  summaryBox.style.display  = 'none';
  errorBox.style.display    = 'none';
  clearBtn.style.display    = 'none';
  summarizeBtn.disabled     = false;
  loading.style.display     = 'none';
  tagsRow.innerHTML         = '';
}

// XSS prevention
function sanitize(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}