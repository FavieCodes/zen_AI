# 🧠 ZenAI Page Summarizer — Chrome Extension

A **Manifest V3** Chrome Extension that extracts content from any webpage and uses AI to generate a structured, detailed summary — including bullet points, key insights, estimated reading time, word count, and topic tags — right inside your browser toolbar.

---

## 📸 What It Does

When you're on any article, blog post, or documentation page:

1. Click the extension icon in your Chrome toolbar
2. Click **"✦ Summarize Page"**
3. The extension extracts the page's readable content (stripping ads, navbars, and sidebars)
4. Sends it securely to the backend API
5. Displays a rich, formatted summary with:
   - **7 detailed bullet-point summary items** with specific facts and context
   - **3 key insights** — the most important, actionable takeaways
   - **Estimated reading time** for the original article
   - **Approximate word count**
   - **Topic tags** for quick context
   - A **"Copy Summary"** button to copy everything to clipboard
   - A **"Cached"** badge on repeat visits (no repeat API calls)

---

## 🗂️ Project Structure
```
ai-page-summarizer/
├── manifest.json           # Extension configuration (Manifest V3)
├── background.js           # Service worker — AI API calls, caching, fallback logic
├── content-script.js       # Injected into pages — extracts readable text
├── popup/
│   ├── popup.html          # Popup UI markup
│   ├── popup.js            # Popup logic and Chrome messaging
│   └── popup.css           # Popup styles
├── icons/
│   ├── icon16.png          # Toolbar icon (16x16)
│   ├── icon48.png          # Extension management icon (48x48)
│   └── icon128.png         # Install icon (128x128)
└── README.md               # This file
```

---

## ⚙️ Setup Instructions

### Prerequisites

- Google Chrome (version 88 or later)
- A running instance of the [AI Summarizer Backend](https://github.com/FavieCodes/ai-summarizer-backend)

---

### Step 1 — Download the Extension

**Option A — Clone via Git:**
```bash
git clone https://github.com/FavieCodes/zen_AI.git
cd zen_AI
git clone https://github.com/FavieCodes/zen_AI.git
cd zen_AI
```

**Option B — Download ZIP:**
1. Go to the GitHub repository page
2. Click the green **"Code"** button then **"Download ZIP"**
3. Extract the ZIP to any folder on your computer (e.g., Desktop)

### Step 2 — Configure Backend URL
The extension needs to know where your backend is running. Open background.js and update the BACKEND_URL constant:

```javascript
const BACKEND_URL = 'https://your-backend-url.com/api/summarize/';
```
Note: For backend setup instructions (API keys, deployment, configuration), please refer to the AI Summarizer Backend Repository.

### Step 3 — Load the Extension into Chrome
Open Google Chrome
Navigate to chrome://extensions/
Toggle "Developer mode" ON (top-right corner)
Click "Load unpacked"
Select your ai-page-summarizer folder
The extension appears in your list with its icon

### Step 4 — Pin to Toolbar
Click the puzzle piece icon in the Chrome toolbar
Find "ZenAI Page Summarizer"
Click the pin icon next to it

### Step 5 — Use It
Go to any news article, blog post, or documentation site
Click the ZenAI icon in your toolbar
Click "Summarize Page"
Wait a few seconds for the summary to generate
Read your detailed summary!
Tip: Revisit the same page URL and the summary loads instantly from cache — no backend call needed.

## 🏗️ Extension Architecture
```text
CHROME BROWSER
│
├── popup.html / popup.js / popup.css
│   The UI the user sees and interacts with.
│   Coordinates the full flow.
│
├── background.js (MV3 Service Worker)
│   Communicates with the backend API.
│   Manages chrome.storage caching.
│
├── content-script.js (injected into active tab)
│   Reads the live webpage DOM.
│   Extracts clean article text.
│
└── External Backend API (HTTPS)
    Handles AI summarization with multi-provider fallback
```

## Component Breakdown
**manifest.json — The Extension Blueprint**
Declares the extension's identity, permissions, and file wiring to Chrome using Manifest V3.

**content-script.js — The Page Reader**
Injected into the active tab when the user clicks "Summarize". It uses semantic selectors (article, [role="main"], main, etc.) to find the primary content, clones it, strips noise elements (nav, footer, ads, sidebars), caps content at 8,000 characters, and returns clean text with metadata.

**popup.js — The Coordinator**
Handles UI interactions: gets the active tab, injects the content script, requests content extraction, communicates with the background service worker, and renders the structured summary.

**background.js — The API Gateway**
Service worker that validates messages, checks local cache, makes HTTPS requests to the backend, and returns results. No API keys are stored here — all AI provider keys are managed by the backend.

## 🔐 Security Features
1. No API Keys in Extension
All AI provider keys are stored on the backend server. The extension only communicates via HTTPS and never handles API keys directly.

2. XSS Prevention
All AI-generated text is inserted using document.createTextNode() — never with innerHTML.

```javascript
function sanitize(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}
```
3. Minimal Permissions
Permission	Why It's Needed
activeTab	Read the current tab's URL and title
scripting	Programmatically inject content script
storage	Cache summaries locally
host_permissions: <all_urls>	Allow content script on any page
No access to browsing history, cookies, bookmarks, downloads, or other sensitive APIs.

4. Message Validation
The background service worker validates request.action === 'summarize' before processing, ignoring unrecognized messages.

5. Injection Guard
content-script.js sets window.__aiSummarizerInjected = true on first run to prevent duplicate listeners.

## ⚖️ Design Decisions
Decision	Chosen Approach	Why
API key storage	Backend server	Maximum security; users don't manage keys
Content extraction	Custom DOM heuristic	Zero dependencies; works on 90%+ pages
Content length cap	8,000 characters	Low cost, fast response, covers most articles
Caching	chrome.storage.local	Instant repeat access; no wasted API calls
AI response format	Strict JSON schema	Reliable parsing, clean UI rendering
On-demand injection	Per click injection	Eliminates "receiving end does not exist" errors
No build tools	Plain HTML/CSS/JS	Easy to inspect, load, and debug

## 🐛 Troubleshooting
**"Cannot summarize this page"**
The extension cannot run on chrome:// pages or the Chrome Web Store. Navigate to a regular website.

**"Backend request failed"**
Check that your backend is running and accessible
Verify the BACKEND_URL in background.js is correct
Check your internet connection
See browser console (F12 → Console) for detailed errors

**"Could not extract page content"**
Some JavaScript-heavy pages may need a moment to load. Refresh and try again.

Extension not loading
Ensure you selected the folder, not a file inside it
Verify all 3 PNG icon files exist under icons/
Check chrome://extensions/ for error messages
Summary is vague or short
The page may have little extractable text (image-heavy, paywalled, or login-required content).

Stale summary shown
Click "Clear" to reset. To delete cache: DevTools → Application → Extension Storage → delete keys starting with summary_.

## 🛠️ Backend Setup
This extension requires a backend server to handle AI summarization.

## 📦 Backend Repository: [AI Summarizer Backend](https://github.com/FavieCodes/ai-summarizer-backend)
Please refer to the backend repository's README for:
Installation and setup instructions
API key configuration (Claude, OpenAI, Gemini, Groq)
Deployment options (Vercel, Railway, Docker)
Environment variables
Rate limiting and security settings

## 🔄 Extension API Contract
The extension expects the backend to respond with this JSON structure:

```json
{
  "success": true,
  "summary": {
    "summary": ["Bullet point 1", "Bullet point 2", ...],
    "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
    "readingTime": "5 min read",
    "wordCount": "approximately 1,200 words",
    "topicTags": ["Technology", "AI", "Machine Learning"]
  }
}
```
Request format: The extension sends a POST request with:

```json
{
  "title": "Page Title",
  "content": "Extracted article text...",
  "url": "https://example.com/article"
}
```
## 🛠️ Potential Improvements
Settings page — configure backend URL from UI
Cache expiry — invalidate summaries after 24 hours
Highlight mode — highlight key sentences on the webpage
Quick Summary mode — 3-bullet fast summaries
PDF support — summarize PDFs in Chrome viewer
Export to Markdown — save summaries as .md files
Keyboard shortcut — Ctrl+Shift+S to summarize

## 📄 License
MIT License — free to use, modify, and distribute.

## 🙏 Acknowledgements
Chrome Extensions Docs — Manifest V3 reference
AI providers: Anthropic Claude, OpenAI, Google Gemini, Groq (integrated via backend)

