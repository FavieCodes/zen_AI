// ─── API KEYS ─────────────────────────────────────────────────────────────────
const CLAUDE_API_KEY = '[ENCRYPTION_KEY]'; 
const OPENAI_API_KEY = '[ENCRYPTION_KEY]';
const GEMINI_API_KEY  = '[ENCRYPTION_KEY]';
const GROQ_API_KEY = '[ENCRYPTION_KEY]';

// ─── PROVIDER ORDER  ───────────────
const PROVIDERS = ['claude', 'openai', 'gemini', 'groq'];


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

  // Try each provider in order
  const errors = [];

  for (const provider of PROVIDERS) {
    try {
      console.log(`[AI Summarizer] Trying provider: ${provider}`);
      const summary = await callProvider(provider, title, content);

      // Cache successful result
      await chrome.storage.local.set({ [cacheKey]: summary });
      return { success: true, summary, fromCache: false, provider };

    } catch (err) {
      console.warn(`[AI Summarizer] ${provider} failed: ${err.message}`);
      errors.push(`${provider}: ${err.message}`);
      // Continue to next provider automatically
    }
  }

  // All providers failed
  throw new Error(`All AI providers failed.\n${errors.join('\n')}`);
}

function callProvider(provider, title, content) {
  switch (provider) {
    case 'claude':  return callClaude(title, content);
    case 'openai':  return callOpenAI(title, content);
    case 'gemini':  return callGemini(title, content);
    case 'groq':    return callGroq(title, content);
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

// ─── CLAUDE ───────────────────────────────────────────────────────────────────
async function callClaude(title, content) {
  if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE') {
    throw new Error('No API key configured — skipping');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(title, content) }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return parseAIResponse(data.content[0].text);
}

// ─── OPENAI ───────────────────────────────────────────────────────────────────
async function callOpenAI(title, content) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
    throw new Error('No API key configured — skipping');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: 'You summarize web pages. Respond only with valid JSON, no markdown or backticks.',
        },
        { role: 'user', content: buildPrompt(title, content) },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return parseAIResponse(data.choices[0].message.content);
}

// ─── GEMINI ───────────────────────────────────────────────────────────────────
async function callGemini(title, content) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('No API key configured — skipping');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(title, content) }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return parseAIResponse(text);
}

// ─── GROQ (Free — Llama 3) ────────────────────────────────────────────────────
async function callGroq(title, content) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
    throw new Error('No API key configured — skipping');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: 'You summarize web pages. Respond only with valid JSON, no markdown or backticks.',
        },
        { role: 'user', content: buildPrompt(title, content) },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return parseAIResponse(data.choices[0].message.content);
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────
function buildPrompt(title, content) {
  return `You are a helpful assistant that summarizes web pages.

Page Title: ${title}
Page Content:
${content}

Respond ONLY with a valid JSON object — no markdown, no backticks, no extra text:
{
  "summary": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"],
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "readingTime": "X min read"
}`;
}

function parseAIResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse AI response as JSON');
  return JSON.parse(jsonMatch[0]);
}