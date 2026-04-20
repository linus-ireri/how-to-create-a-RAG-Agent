// src/frontend/chat.js
// Handles user input, communicates with the RAG server, and renders responses.

// ── Change this URL when deploying to production ──────────────────────────────
const RAG_SERVER_URL = 'http://localhost:3001/rag';

const chatMessages  = document.getElementById('chat-messages');
const questionInput = document.getElementById('question-input');
const sendBtn       = document.getElementById('send-btn');

// ─── RENDER A MESSAGE ─────────────────────────────────────────────────────────

function addMessage(type, content, sources = []) {
  const el = document.createElement('div');
  el.classList.add('message', type);

  if (type === 'bot' && sources.length > 0) {
    el.innerHTML = `
      <div class="answer">${escapeHtml(content)}</div>
      <div class="sources">
        <strong>📚 Sources used:</strong>
        ${sources.map(s => `
          <div class="source-item">
            <span class="source-name">${escapeHtml(s.source)}</span>
            <span class="source-score">— ${Math.round(s.score * 100)}% match</span>
            <div class="source-preview">${escapeHtml(s.preview)}</div>
          </div>
        `).join('')}
      </div>`;
  } else if (type === 'error') {
    el.innerHTML = `<span class="error-msg">⚠️ ${escapeHtml(content)}</span>`;
  } else {
    el.textContent = content;
  }

  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return el;
}

// Prevent XSS: escape user-supplied text before putting it in innerHTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── SEND QUESTION ────────────────────────────────────────────────────────────

async function sendQuestion() {
  const question = questionInput.value.trim();
  if (!question) return;

  questionInput.value = '';
  sendBtn.disabled = true;
  questionInput.disabled = true;

  addMessage('user', question);
  const loadingEl = addMessage('loading', '🤔 Searching documents...');

  try {
    const response = await fetch(RAG_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `Server error ${response.status}`);
    }

    const data = await response.json();
    loadingEl.remove();
    addMessage('bot', data.answer, data.sources);

  } catch (err) {
    loadingEl.remove();
    const msg = err.message.includes('Failed to fetch')
      ? 'Cannot reach the RAG server. Is it running? (node src/server/rag-server.js)'
      : err.message;
    addMessage('error', msg);
  } finally {
    sendBtn.disabled = false;
    questionInput.disabled = false;
    questionInput.focus();
  }
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────

sendBtn.addEventListener('click', sendQuestion);
questionInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuestion(); }
});
questionInput.focus();
