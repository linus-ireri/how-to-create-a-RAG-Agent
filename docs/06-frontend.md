# 06 — Frontend Chat UI

> **Time to read:** ~10 minutes  
> **What you'll build:** `src/frontend/index.html` + `chat.js` — a simple browser chat interface.

---

## Overview

The frontend is intentionally simple — plain HTML and JavaScript, no frameworks, no build tools. Open it in your browser and it's ready.

It:
- Shows a chat window where users type questions
- Sends the question to your local RAG server (`POST localhost:3001/rag`)
- Displays the answer
- Shows which documents were referenced

---

## `src/frontend/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RAG Chatbot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f0f2f5;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .chat-container {
      width: 700px;
      max-width: 95vw;
      height: 85vh;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-header {
      padding: 20px 24px;
      background: #1a1a2e;
      color: white;
    }

    .chat-header h1 { font-size: 1.2rem; font-weight: 600; }
    .chat-header p  { font-size: 0.8rem; opacity: 0.7; margin-top: 4px; }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 0.92rem;
      line-height: 1.5;
    }

    .message.user {
      align-self: flex-end;
      background: #1a1a2e;
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message.bot {
      align-self: flex-start;
      background: #f0f2f5;
      color: #1a1a2e;
      border-bottom-left-radius: 4px;
    }

    .message.bot .answer { margin-bottom: 10px; }

    .sources {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #ddd;
      font-size: 0.78rem;
      color: #666;
    }

    .sources strong { display: block; margin-bottom: 4px; color: #444; }

    .source-item {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 6px 10px;
      margin-top: 4px;
    }

    .source-item .source-name { font-weight: 600; color: #333; }
    .source-item .source-score { color: #888; font-size: 0.72rem; }
    .source-item .source-preview { color: #555; margin-top: 2px; }

    .message.loading { opacity: 0.6; font-style: italic; }

    .chat-input-area {
      padding: 16px 20px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 10px;
    }

    #question-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 10px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }

    #question-input:focus { border-color: #1a1a2e; }

    #send-btn {
      padding: 12px 20px;
      background: #1a1a2e;
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: opacity 0.2s;
    }

    #send-btn:hover { opacity: 0.85; }
    #send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .error-msg { color: #cc3333; font-size: 0.85rem; }
  </style>
</head>
<body>

<div class="chat-container">
  <div class="chat-header">
    <h1>🤖 RAG Chatbot</h1>
    <p>Ask questions about your documents</p>
  </div>

  <div class="chat-messages" id="chat-messages">
    <!-- Messages will be added here by chat.js -->
    <div class="message bot">
      <div class="answer">
        👋 Hello! Ask me anything about your documents. I'll search through them and give you a grounded answer.
      </div>
    </div>
  </div>

  <div class="chat-input-area">
    <input
      type="text"
      id="question-input"
      placeholder="Ask a question about your documents..."
      autocomplete="off"
    />
    <button id="send-btn">Send</button>
  </div>
</div>

<!-- Load our chat logic from a separate file -->
<script src="chat.js"></script>

</body>
</html>
```

---

## `src/frontend/chat.js`

```js
// chat.js — handles all the logic for the chat interface

// The URL of your local RAG server
// Change this to your production URL when you deploy
const RAG_SERVER_URL = 'http://localhost:3001/rag';

// Grab references to the DOM elements we'll interact with
const chatMessages = document.getElementById('chat-messages');
const questionInput = document.getElementById('question-input');
const sendBtn = document.getElementById('send-btn');

// ─── ADD A MESSAGE TO THE CHAT ────────────────────────────────────────────────

// type: 'user' | 'bot' | 'loading' | 'error'
// content: string (the message text)
// sources: optional array of source objects (for bot messages)
// returns the created element (so we can remove/replace it later)
function addMessage(type, content, sources = []) {
  const messageEl = document.createElement('div');
  messageEl.classList.add('message', type);
  
  if (type === 'bot' && sources.length > 0) {
    // Bot message with sources: show the answer + source cards
    messageEl.innerHTML = `
      <div class="answer">${escapeHtml(content)}</div>
      <div class="sources">
        <strong>📚 Sources used:</strong>
        ${sources.map(s => `
          <div class="source-item">
            <span class="source-name">${escapeHtml(s.source)}</span>
            <span class="source-score"> — relevance: ${(s.score * 100).toFixed(0)}%</span>
            <div class="source-preview">${escapeHtml(s.preview)}</div>
          </div>
        `).join('')}
      </div>
    `;
  } else if (type === 'error') {
    messageEl.innerHTML = `<span class="error-msg">⚠️ ${escapeHtml(content)}</span>`;
  } else {
    messageEl.textContent = content;
  }
  
  chatMessages.appendChild(messageEl);
  
  // Scroll to the bottom so the latest message is visible
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageEl;
}

// ─── ESCAPE HTML ──────────────────────────────────────────────────────────────

// Prevent XSS: never inject raw user input into innerHTML without escaping
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── SEND A QUESTION ──────────────────────────────────────────────────────────

async function sendQuestion() {
  const question = questionInput.value.trim();
  if (!question) return;
  
  // Clear the input and disable the button while waiting
  questionInput.value = '';
  sendBtn.disabled = true;
  questionInput.disabled = true;
  
  // Add the user's question to the chat
  addMessage('user', question);
  
  // Add a loading indicator
  const loadingEl = addMessage('loading', '🤔 Searching documents and generating answer...');
  
  try {
    // Send the question to the RAG server
    // fetch() is built into modern browsers — no libraries needed
    const response = await fetch(RAG_SERVER_URL, {
      method: 'POST',               // POST request (we're sending data)
      headers: {
        'Content-Type': 'application/json',  // we're sending JSON
      },
      body: JSON.stringify({ question }),    // convert JS object to JSON string
    });
    
    if (!response.ok) {
      // The server returned an error status (4xx or 5xx)
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }
    
    // Parse the JSON response from the server
    // data = { answer: "...", sources: [...] }
    const data = await response.json();
    
    // Remove loading indicator
    loadingEl.remove();
    
    // Add the bot's answer with sources
    addMessage('bot', data.answer, data.sources);
    
  } catch (err) {
    // Network error or server error
    loadingEl.remove();
    
    if (err.message.includes('Failed to fetch')) {
      // This usually means the server isn't running
      addMessage('error', 'Cannot connect to the RAG server. Make sure it is running: node src/server/rag-server.js');
    } else {
      addMessage('error', err.message);
    }
  } finally {
    // Re-enable input regardless of success or failure
    sendBtn.disabled = false;
    questionInput.disabled = false;
    questionInput.focus();
  }
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────

// Send on button click
sendBtn.addEventListener('click', sendQuestion);

// Send on Enter key press (Shift+Enter to add a newline, if you extend this)
questionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendQuestion();
  }
});

// Focus the input when the page loads
questionInput.focus();
```

---

## How to Open the Frontend

Simply open `src/frontend/index.html` in your browser:

```bash
# On macOS:
open src/frontend/index.html

# On Linux:
xdg-open src/frontend/index.html

# On Windows:
start src/frontend/index.html
```

Or drag the file into your browser window.

> ⚠️ **Important:** Your RAG server must be running before you open the frontend. Start it with `node src/server/rag-server.js`.

---

## Next Step

→ **[07 — Connecting to an LLM API](07-llm-apis.md)**  
*Learn how OpenRouter works and how to switch between LLMs.*
