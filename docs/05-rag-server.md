# 05 — The RAG Server

> **Time to read:** ~20 minutes  
> **What you'll build:** `src/server/rag-server.js` — the Express server that handles questions end-to-end.

---

## What the Server Does

The RAG server is the **brain** of the system. For every incoming question, it:

1. **Embeds the question** (turns it into a vector, same model as ingestion)
2. **Searches the vector store** (finds the most relevant document chunks)
3. **Builds a prompt** (combines the chunks + the question into instructions for the LLM)
4. **Calls the LLM API** (sends the prompt to OpenRouter/OpenAI)
5. **Returns the answer** (sends back the LLM's response as JSON)

---

## The Complete `rag-server.js` — Annotated

```js
// src/server/rag-server.js

// Load .env file — makes process.env.OPENROUTER_API_KEY etc. available
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { pipeline } from '@xenova/transformers';
import { LocalIndex } from 'vectra';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
const VECTOR_STORE_DIR = './vector-store';
const LLM_MODEL = process.env.LLM_MODEL || 'mistralai/mistral-7b-instruct:free';

// How many document chunks to retrieve for each question
// 3 is a good default — enough context without overwhelming the LLM
const TOP_K = 3;

// ─── SET UP EXPRESS ────────────────────────────────────────────────────────────

const app = express();

// cors() allows requests from different origins (like your HTML file opened locally)
// Without this, browsers block requests from file:// to localhost
app.use(cors());

// express.json() parses incoming request bodies as JSON
// Without this, req.body would be undefined
app.use(express.json());

// ─── LOAD RESOURCES AT STARTUP ────────────────────────────────────────────────

// We load the embedding model and vector store ONCE when the server starts,
// not on every request — this makes responses much faster.

let embedder;   // the embedding model (loaded from disk)
let index;      // the vector store (vectra LocalIndex)

async function loadResources() {
  console.log('Loading embedding model...');
  
  // Same model as ingest.js — must match, or the search won't work
  // (You can't search with a different model than you used to create the vectors)
  embedder = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2'
  );
  console.log('✅ Embedding model loaded.');
  
  console.log('Opening vector store...');
  index = new LocalIndex(VECTOR_STORE_DIR);
  
  // Check that the vector store has been created (i.e., ingestion was run)
  if (!(await index.isIndexCreated())) {
    throw new Error(
      'Vector store not found. Run "npm run ingest" first to process your documents.'
    );
  }
  console.log('✅ Vector store loaded.');
}

// ─── EMBEDDING HELPER ─────────────────────────────────────────────────────────

// Converts a text string into a 384-number vector
// This is the same function as in ingest.js — must use identical settings
async function embedText(text) {
  const result = await embedder(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(result.data);
}

// ─── RETRIEVAL HELPER ─────────────────────────────────────────────────────────

// Searches the vector store for chunks most similar to the question
// Returns the top K chunks as plain text strings
async function retrieveContext(question) {
  // 1. Embed the question
  const questionVector = await embedText(question);
  
  // 2. Search the vector store
  // queryItems(vector, k) returns the k most similar items
  const results = await index.queryItems(questionVector, TOP_K);
  
  // 3. Extract just the text from each result
  // results is an array of { item: { metadata: { text, source, chunkIndex } }, score }
  const chunks = results.map((result) => ({
    text: result.item.metadata.text,
    source: result.item.metadata.source,
    score: result.score,  // similarity score (0 to 1, higher = more relevant)
  }));
  
  return chunks;
}

// ─── PROMPT BUILDER ───────────────────────────────────────────────────────────

// This is one of the most important parts of RAG: how you format the prompt.
// The LLM needs clear instructions about:
//   - What role it's playing
//   - What context it has been given
//   - What to do if the context doesn't contain the answer
//   - The actual question

function buildPrompt(question, contextChunks) {
  // Join the retrieved chunks into a single context block
  const contextText = contextChunks
    .map((chunk, i) => `[Source ${i + 1}: ${chunk.source}]\n${chunk.text}`)
    .join('\n\n---\n\n');
  
  // The prompt instructs the LLM on how to behave
  return `You are a helpful assistant. Use ONLY the information provided in the context below to answer the question. 

If the context does not contain enough information to answer the question, say "I don't have information about that in my documents." Do not make up information.

CONTEXT:
${contextText}

QUESTION:
${question}

ANSWER:`;
}

// ─── LLM API CALL ─────────────────────────────────────────────────────────────

// Sends the prompt to OpenRouter and returns the LLM's text response
// OpenRouter accepts the same request format as OpenAI, so switching models is easy
async function callLLM(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is missing from your .env file.');
  }
  
  // The fetch() call sends an HTTP POST request to OpenRouter's API
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      // Authorization: the API key proves who we are
      'Authorization': `Bearer ${apiKey}`,
      
      // Content-Type: tells the server we're sending JSON
      'Content-Type': 'application/json',
      
      // HTTP-Referer and X-Title: optional but good practice with OpenRouter
      // Helps them understand where API traffic comes from
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'RAG Chatbot Guide',
    },
    body: JSON.stringify({
      model: LLM_MODEL,  // which LLM to use
      messages: [
        {
          role: 'user',       // 'user' = the human's turn in the conversation
          content: prompt,    // our fully built RAG prompt
        },
      ],
      max_tokens: 500,        // limit the response length
      temperature: 0.2,       // lower = more focused/deterministic, higher = more creative
    }),
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errorBody}`);
  }
  
  const data = await response.json();
  
  // OpenRouter (and OpenAI) return responses in this structure:
  // data.choices[0].message.content = the LLM's text response
  return data.choices[0].message.content.trim();
}

// ─── THE /rag ENDPOINT ────────────────────────────────────────────────────────

// This is the main endpoint your frontend will call.
// POST /rag with body { "question": "What is..." }
// Returns { "answer": "...", "sources": [...] }

app.post('/rag', async (req, res) => {
  try {
    const { question } = req.body;
    
    // Validate input
    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({ error: 'Please provide a question.' });
    }
    
    console.log(`\n❓ Question: ${question}`);
    
    // Step 1: Retrieve relevant document chunks
    const contextChunks = await retrieveContext(question);
    console.log(`📚 Retrieved ${contextChunks.length} chunks`);
    contextChunks.forEach((c, i) =>
      console.log(`  [${i + 1}] Score: ${c.score.toFixed(3)} | Source: ${c.source}`)
    );
    
    // Step 2: Build the prompt
    const prompt = buildPrompt(question, contextChunks);
    
    // Step 3: Call the LLM
    console.log('🤖 Calling LLM...');
    const answer = await callLLM(prompt);
    console.log(`✅ Answer: ${answer.slice(0, 100)}...`);
    
    // Step 4: Return the answer + source info to the frontend
    res.json({
      answer,
      sources: contextChunks.map((c) => ({
        source: c.source,
        score: parseFloat(c.score.toFixed(3)),
        preview: c.text.slice(0, 150) + '...',
      })),
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── HEALTH CHECK ENDPOINT ────────────────────────────────────────────────────

// A simple endpoint to check that the server is running
// Visit http://localhost:3001/health in your browser
app.get('/health', (req, res) => {
  res.json({ status: 'ok', model: LLM_MODEL });
});

// ─── START THE SERVER ─────────────────────────────────────────────────────────

// We load resources first, then start listening for requests
// This ensures the model is ready before any requests come in
loadResources()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 RAG server running at http://localhost:${PORT}`);
      console.log(`   POST http://localhost:${PORT}/rag  → ask a question`);
      console.log(`   GET  http://localhost:${PORT}/health → check server status`);
      console.log('\nReady to answer questions!\n');
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });
```

---

## Understanding the Response

When you call `POST /rag` with `{ "question": "What is your refund policy?" }`, you get back:

```json
{
  "answer": "According to our policy, you can return items within 30 days of purchase for a full refund, provided the item is in its original condition.",
  "sources": [
    {
      "source": "policies.txt",
      "score": 0.923,
      "preview": "Our refund policy allows customers to return items within 30 days..."
    },
    {
      "source": "faq.txt",
      "score": 0.841,
      "preview": "Frequently asked questions about returns and exchanges..."
    }
  ]
}
```

- **`answer`** — the LLM's response, grounded in your documents
- **`sources`** — which document chunks were used, with similarity scores (0–1)
- **`score`** — how similar that chunk was to the question (higher = more relevant)

---

## Why `temperature: 0.2`?

Temperature controls how "creative" the LLM is:
- **0.0** — very deterministic, same question → same answer every time
- **0.2** — mostly focused, slight variation
- **1.0** — creative and varied
- **2.0** — very random

For RAG chatbots answering factual questions from documents, low temperature (0.0–0.3) is best. We want accurate answers, not creative paraphrases.

---

## Next Step

→ **[06 — Frontend Chat UI](06-frontend.md)**  
*Build the HTML chat interface that talks to your server.*
