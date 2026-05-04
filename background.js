const BACKEND_URL = 'https://ai-summarizer-backend-gamma.vercel.app/api/summarize/';
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarize') {
    handleSummarize(request.data).then(sendResponse).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
});

async function handleSummarize({ title, content, url }) {
  // Check cache first
  const cacheKey = `summary_${url}`;
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey]) {
    return { success: true, summary: cached[cacheKey], fromCache: true };
  }

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, content, url })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Backend request failed');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }

    // Cache successful result
    await chrome.storage.local.set({ [cacheKey]: data.summary });
    return { success: true, summary: data.summary, fromCache: false, provider: data.provider };

  } catch (err) {
    console.error('Backend error:', err);
    throw new Error(`Summarization failed: ${err.message}`);
  }
}