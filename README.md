# 🧠 ZenAI Page Summarizer — Chrome Extension

A **Manifest V3** Chrome Extension that extracts content from any webpage and uses AI to generate a structured, detailed summary — including bullet points, key insights, estimated reading time, word count, and topic tags — right inside your browser toolbar.

Built with a **multi-provider AI fallback chain**: Claude → OpenAI → Gemini → Groq. If one provider is out of credits, the next one takes over automatically.

---

## 📸 What It Does

When you're on any article, blog post, or documentation page:

1. Click the extension icon in your Chrome toolbar
2. Click **"✦ Summarize Page"**
3. The extension extracts the page's readable content (stripping ads, navbars, and sidebars)
4. Sends it securely to an AI provider via the background service worker
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
- At least **one** API key from any of these free/paid providers:
  - [Anthropic Claude](https://console.anthropic.com) — paid
  - [OpenAI](https://platform.openai.com) — paid (cheap with gpt-4o-mini)
  - [Google Gemini](https://aistudio.google.com) — **free tier available**
  - [Groq](https://console.groq.com) — **free tier, very generous**
- No Node.js, no build tools, no npm — this is plain HTML/CSS/JS

---

### Step 1 — Download the Project

**Option A — Clone via Git:**
```bash
git clone https://github.com/YOUR_USERNAME/ai-page-summarizer.git
cd ai-page-summarizer
```

**Option B — Download ZIP:**
1. Go to the GitHub repository page
2. Click the green **"Code"** button then **"Download ZIP"**
3. Extract the ZIP to any folder on your computer (e.g., Desktop)

---

### Step 2 — Add Your API Key(s)

Open `background.js` in any text editor (Notepad, VS Code, etc.).

At the top of the file, find these lines:

```javascript
const CLAUDE_API_KEY = 'YOUR_CLAUDE_API_KEY_HERE';
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
const GROQ_API_KEY   = 'YOUR_GROQ_API_KEY_HERE';
```

Replace any placeholder with your actual key. You **only need one** to get started. Providers with placeholder values are automatically skipped.

**Recommended free option — Groq:**
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (no credit card required)
3. Click **API Keys** then **Create API Key**
4. Paste the key into `GROQ_API_KEY`

**Recommended free option — Gemini:**
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **"Get API key"** then **"Create API key"**
4. Paste into `GEMINI_API_KEY`

Save `background.js` when done.

> Warning: Before pushing to GitHub, replace real keys with the placeholder text again. Never commit live API keys to version control. See the Security section for details.

---

### Step 3 — Load the Extension into Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Toggle **"Developer mode"** ON (top-right corner)
4. Click **"Load unpacked"**
5. Select your `ai-page-summarizer` folder in the file picker
6. The extension appears in your list with its icon

---

### Step 4 — Pin to Toolbar

1. Click the **puzzle piece icon** in the Chrome toolbar
2. Find **"ZenAI Page Summarizer"**
3. Click the **pin icon** next to it
4. The extension icon is now permanently visible in your toolbar

---

### Step 5 — Use It

1. Go to any news article, blog post, Wikipedia page, or documentation site
2. Click the **ZenAI** icon in your toolbar
3. Click **"Summarize Page"**
4. Wait 3-10 seconds (first request — no cache)
5. Read your detailed summary!

Tip: Revisit the same page URL and the summary loads instantly from cache — no API call needed.

---

## 🏗️ Architecture Explanation

The extension is split into **4 isolated layers** that communicate using Chrome's message-passing API:

```
CHROME BROWSER
│
├── popup.html / popup.js / popup.css
│   The UI the user sees and interacts with.
│   Coordinates the full flow. Never touches API keys.
│
├── background.js  (MV3 Service Worker)
│   The secure AI gateway. Holds API keys.
│   Runs the fallback chain: Claude → OpenAI → Gemini → Groq.
│   Manages chrome.storage caching.
│
└── content-script.js  (injected into active tab)
    Reads the live webpage DOM.
    Extracts clean article text.
    Never sends data anywhere — only responds to popup requests.
    │
    └── External AI APIs (HTTPS only, from background.js)
        api.anthropic.com
        api.openai.com
        generativelanguage.googleapis.com
        api.groq.com
```

### Component Breakdown

#### `manifest.json` — The Extension Blueprint
Declares the extension's identity, permissions, and file wiring to Chrome. Uses **Manifest V3** — the current and required standard — which mandates service workers instead of persistent background pages, resulting in better performance and a smaller security surface.

#### `content-script.js` — The Page Reader
Injected programmatically into the active tab when the user clicks "Summarize". It uses a priority list of semantic selectors (`article`, `[role="main"]`, `main`, `.post-content`, etc.) to target the primary content element, falling back to `document.body` if none match. It clones the element (never touching the live DOM), strips noise elements (nav, footer, aside, ads, sidebars), caps content at 8,000 characters, and returns the clean text with metadata.

#### `popup.js` — The Coordinator
The brains of the UI layer. On button click it: gets the active tab, guards against unsupported pages, injects `content-script.js` programmatically (preventing "receiving end does not exist" errors), requests content extraction, forwards data to `background.js`, and renders the structured summary using safe DOM methods. Shows rotating loading messages during the wait so the UI feels alive.

#### `background.js` — The Secure AI Gateway
The only component that ever touches API keys or makes external network requests. Runs as a **Manifest V3 service worker** — it has no DOM context and cannot be inspected from any webpage's DevTools. It validates messages, checks the cache, iterates the provider fallback chain, constructs a detailed AI prompt, parses and validates the JSON response, and caches the result before returning it to the popup.

---

## 🤖 AI Integration Explanation

### Multi-Provider Fallback Chain

The extension supports 4 AI providers with automatic failover:

| Priority | Provider | Model | Cost |
|---|---|---|---|
| 1 | Anthropic Claude | claude-sonnet-4-20250514 | Paid |
| 2 | OpenAI | gpt-4o-mini | Paid (very cheap) |
| 3 | Google Gemini | gemini-1.5-flash | Free tier (1,500 req/day) |
| 4 | Groq | llama-3.3-70b-versatile | Free tier (~14,400 req/day) |

If a provider fails for any reason (quota exceeded, invalid key, network error), the next one is tried automatically and silently. The user never needs to know which provider responded.

### Prompt Engineering

The prompt instructs the AI to be specific — include actual names, numbers, and facts from the content rather than vague generalizations — and to return a strict JSON schema:

```json
{
  "summary": ["7 detailed bullets with specific facts"],
  "keyInsights": ["3 actionable, specific takeaways"],
  "readingTime": "X min read",
  "wordCount": "approximately X words",
  "topicTags": ["tag1", "tag2", "tag3"]
}
```

Requesting strict JSON output makes response parsing deterministic. A regex cleanup step strips markdown code fences in case a model wraps its output in triple backticks.

### Why Cap at 8,000 Characters?
Most AI models handle far more, but 8,000 characters covers the meaningful portion of nearly any article while keeping token usage and cost low. It is roughly equivalent to a 1,500-word article — longer than most web content. This cap is a single constant and easy to increase if needed.

### Caching Strategy
Results are stored in `chrome.storage.local` keyed by the full page URL. On revisiting the same URL, the cached summary loads in under 100ms with no API call. A green "Cached" badge in the popup indicates this.

---

## 🔐 Security Decisions

### 1. API Keys Isolated to the Service Worker
All API keys live exclusively in `background.js`. Service workers have no DOM context and are not accessible from any webpage's DevTools inspector. Content scripts and popup scripts never see any key.

### 2. Keys Removed Before Version Control
Before committing to GitHub, all real keys are replaced with `YOUR_X_API_KEY_HERE` placeholders. The README instructs anyone cloning the project to insert their own keys locally.

### 3. XSS Prevention
All AI-generated text is inserted using `document.createTextNode()` — never directly with `innerHTML`. Even if an AI response contained `<script>` tags, they would render as escaped plain text.

```javascript
function sanitize(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}
```

### 4. Minimal Permissions

| Permission | Why It's Needed |
|---|---|
| `activeTab` | Read the current tab's URL and title |
| `scripting` | Programmatically inject `content-script.js` |
| `storage` | Cache summaries in chrome.storage.local |
| `host_permissions: <all_urls>` | Allow content script on any page |

No access to browsing history, cookies, bookmarks, downloads, or any other sensitive Chrome API.

### 5. Message Validation
The background service worker checks `request.action === 'summarize'` before processing. Unrecognized messages are silently ignored, preventing unexpected or injected messages from triggering API calls.

### 6. Injection Guard
`content-script.js` sets `window.__aiSummarizerInjected = true` on first run and checks this flag before registering event listeners, preventing duplicate listeners if the script is injected multiple times on the same page.

---

## ⚖️ Trade-offs and Design Decisions

| Decision | Chosen Approach | Why | Trade-off |
|---|---|---|---|
| **API key storage** | Hardcoded in `background.js` | Simple for a local extension; no server required | Must replace keys before committing to git. A backend proxy would be more secure for a public release. |
| **Content extraction** | Custom DOM heuristic | Zero dependencies; works on 90%+ of pages | Readability.js would handle edge cases more robustly but adds bundle complexity. |
| **Content length cap** | 8,000 characters | Low cost, fast response, covers most articles | Very long documents get truncated. Increasing to 16,000+ is a one-line change. |
| **Caching** | `chrome.storage.local`, no expiry | Instant repeat access; no wasted API calls | Summaries can go stale on frequently-updated pages. Cache TTL would fix this. |
| **AI response format** | Strict JSON schema in prompt | Reliable parsing, clean UI rendering | Depends on model instruction-following. Regex fallback handles markdown-wrapped responses. |
| **On-demand injection** | `chrome.scripting.executeScript` per click | Eliminates "receiving end does not exist" on pre-existing tabs | Slight overhead per click vs. auto-injected scripts — imperceptible in practice. |
| **No build tools** | Plain HTML/CSS/JS | Easy to inspect, load, debug, and submit | Doesn't scale to a large codebase. Vite or esbuild would be added for production. |
| **Multi-provider fallback** | 4 providers in priority order | Maximises uptime; free tiers mean near-zero cost | Adds code complexity; acceptable trade-off for a local development tool. |

---

## 🐛 Troubleshooting

**"Cannot summarize this page"**
The extension cannot run on `chrome://` pages or the Chrome Web Store. Navigate to a regular website such as a news article or blog post.

**"All AI providers failed"**
Check that at least one API key in `background.js` is valid and has available quota. For Groq and Gemini, free tiers reset daily.

**Extension not loading after "Load unpacked"**
Ensure you selected the folder `ai-page-summarizer/`, not a file inside it. Verify all 3 PNG icon files exist under `icons/`. Check `chrome://extensions/` for the specific error message.

**Summary is vague or short**
The page may have very little extractable text (image-heavy pages, JavaScript-rendered SPAs, paywalled content). Refresh the page and try again.

**Stale summary shown**
Click "Clear" to reset the UI. To delete the cached entry: open Chrome DevTools on any page, go to Application, find Extension Storage, and delete the key starting with `summary_`.

---

## 🛠️ Potential Improvements

- [ ] Settings page — let users enter API keys via a UI form instead of editing code
- [ ] Cache expiry — invalidate summaries older than 24 hours automatically
- [ ] Highlight mode — highlight key sentences directly on the webpage
- [ ] Quick Summary mode — summarize in exactly 3 bullets for fast scanning
- [ ] PDF support — summarize PDFs open in the Chrome PDF viewer
- [ ] Export to Markdown — save summary as a .md file
- [ ] Readability.js integration — more robust content extraction for complex pages

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Acknowledgements

- [Anthropic Claude](https://www.anthropic.com) — claude-sonnet-4
- [OpenAI](https://openai.com) — gpt-4o-mini
- [Google Gemini](https://ai.google.dev) — gemini-1.5-flash
- [Groq](https://groq.com) — llama-3.3-70b (free tier)
- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/mv3/) — Manifest V3 reference