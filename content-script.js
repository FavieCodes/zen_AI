// content-script.js

// Guard against being injected multiple times on the same page
if (!window.__aiSummarizerInjected) {
  window.__aiSummarizerInjected = true;

  function extractPageContent() {
    const selectors = [
      'article', '[role="main"]', 'main',
      '.post-content', '.article-body', '.entry-content', '#content',
    ];

    let mainEl = null;
    for (const selector of selectors) {
      mainEl = document.querySelector(selector);
      if (mainEl) break;
    }

    const target = mainEl || document.body;
    const clone = target.cloneNode(true);

    const junk = ['nav', 'header', 'footer', 'aside', 'script',
                   'style', 'noscript', 'iframe', 'form', 'button',
                   '.advertisement', '.ads', '.sidebar', '.comments'];
    junk.forEach(sel => {
      clone.querySelectorAll(sel).forEach(el => el.remove());
    });

    const text = clone.innerText || clone.textContent || '';

    return {
      title: document.title,
      url: window.location.href,
      content: text.trim().slice(0, 8000),
      wordCount: text.trim().split(/\s+/).length,
    };
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
      const data = extractPageContent();
      sendResponse({ success: true, data });
    }
    return true;
  });
}