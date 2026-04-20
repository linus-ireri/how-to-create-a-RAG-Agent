# 07 — Connecting to an LLM API

> **Time to read:** ~10 minutes  
> **Prerequisites:** You have an OpenRouter account (free)

---

## What Is an LLM API?

An LLM API lets you send a text prompt to a large language model hosted on a server and get a text response back — over HTTP.

You don't run the LLM yourself. The model runs on powerful servers (owned by OpenAI, Anthropic, Mistral, etc.) and you interact with it via the internet.

```
Your code                         LLM Provider's Servers
    │                                       │
    │── POST /chat/completions ────────────►│
    │   { model: "...", messages: [...] }   │  ← AI processes your prompt
    │                                       │
    │◄─ { choices: [{ message: {...} }] } ──│
    │                                       │
You get the answer
```

---

## Why OpenRouter?

[OpenRouter](https://openrouter.ai) is a **gateway** that gives you access to many different LLMs through one API key:

| Without OpenRouter | With OpenRouter |
|---|---|
| Separate API key for OpenAI | One API key |
| Separate API key for Anthropic | One API key |
| Separate API key for Mistral | One API key |
| Different request formats per provider | Same request format everywhere |

It also has **free models** — great for learning and prototyping without a credit card.

---

## Getting Your API Key

1. Go to [openrouter.ai](https://openrouter.ai)
2. Sign up (free — no credit card required)
3. Click **"API Keys"** in the left sidebar
4. Click **"Create Key"**
5. Copy the key (it starts with `sk-or-v1-`)
6. Paste it in your `.env` file:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Free Models on OpenRouter

These models are free (`:free` suffix) — perfect for this guide:

| Model | Strengths | Use for |
|-------|-----------|---------|
| `mistralai/mistral-7b-instruct:free` | Fast, good general purpose | Default choice |
| `google/gemma-2-9b-it:free` | Good instruction following | General Q&A |
| `meta-llama/llama-3-8b-instruct:free` | Meta's open model | General Q&A |
| `microsoft/phi-3-mini-128k-instruct:free` | Long context window | Long documents |

Change the model in your `.env` file:

```env
LLM_MODEL=mistralai/mistral-7b-instruct:free
```

---

## How the API Call Works (in detail)

Here's the request we make in `rag-server.js`, broken down piece by piece:

```js
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,  // ← your API key proves who you are
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'mistralai/mistral-7b-instruct:free',  // ← which LLM to use
    messages: [
      {
        role: 'user',       // ← 'user' = the human speaking
        content: prompt,    // ← your RAG prompt (context + question)
      }
    ],
    max_tokens: 500,    // ← maximum length of the response
    temperature: 0.2,   // ← how deterministic vs creative (0=strict, 1=creative)
  }),
});
```

**The `messages` array** uses a chat format:
- `role: 'user'` — a human turn
- `role: 'assistant'` — an AI turn
- `role: 'system'` — background instructions

For a single-turn RAG question, we just need one `user` message containing the full prompt.

**The response** looks like this:

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Based on the provided context, the refund policy states..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 342,
    "completion_tokens": 87,
    "total_tokens": 429
  }
}
```

We extract: `response.choices[0].message.content`

---

## Using OpenAI Instead

OpenRouter uses the same API format as OpenAI. To use OpenAI directly, just change the URL and key:

```js
// OpenRouter:
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', { ... });

// OpenAI (just change the URL):
const response = await fetch('https://api.openai.com/v1/chat/completions', { ... });
```

And change your `.env`:

```env
OPENROUTER_API_KEY=sk-xxxxxxx  # or OPENAI_API_KEY if you rename it in the code
LLM_MODEL=gpt-4o-mini
```

The rest of the code is identical.

---

## Understanding Tokens

LLMs don't process words — they process **tokens**, which are chunks of text (roughly 3/4 of a word on average).

| Text | Tokens |
|------|--------|
| "Hello world" | ~2 tokens |
| "The quick brown fox" | ~4 tokens |
| 1 page of text (~500 words) | ~667 tokens |

**Why it matters:**
- Most free models have a context limit (e.g., 4096 tokens for inputs + outputs combined)
- If your prompt is too long (too many chunks), it won't fit
- `max_tokens: 500` in our code limits the *response* to 500 tokens (~375 words)

For a RAG chatbot, a good budget is:
- System + instructions: ~200 tokens
- Retrieved context (3 chunks × 400 words): ~1600 tokens
- User question: ~50 tokens
- Response: ~500 tokens
- **Total: ~2350 tokens** — well within most model limits

---

## What If I Want to Run the LLM Locally?

You can! Tools like [Ollama](https://ollama.ai) let you run open-source LLMs on your own machine.

To switch to Ollama:

```js
// Ollama runs locally and has an OpenAI-compatible API
const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'mistral',          // name of the locally downloaded model
    messages: [{ role: 'user', content: prompt }],
    stream: false,
  }),
});

const data = await response.json();
const answer = data.message.content;
```

No API key, no internet, no cost — but requires a decent computer (8GB+ RAM).

---

## Next Step

→ **[08 — Running & Testing](08-running-and-testing.md)**  
*Start everything up and test it works end to end.*
