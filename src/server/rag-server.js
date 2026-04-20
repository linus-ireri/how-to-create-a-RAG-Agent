// src/server/rag-server.js
// The Express server that powers the RAG chatbot.
// Receives questions → retrieves relevant context → calls LLM → returns answer.
//
// Usage: node src/server/rag-server.js
//        npm start

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pipeline } from '@xenova/transformers';
import { LocalIndex } from 'vectra';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
const VECTOR_STORE_DIR = './vector-store';
const LLM_MODEL = process.env.LLM_MODEL || 'z-ai/glm-4.5-air:free';
const TOP_K = 3; // number of chunks to retrieve per question

// ─── EXPRESS SETUP ────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// ─── LOAD RESOURCES ───────────────────────────────────────────────────────────

let embedder, index;

async function loadResources() {
  console.log('Loading embedding model...');
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('✅ Embedding model loaded.');

  console.log('Opening vector store...');
  index = new LocalIndex(VECTOR_STORE_DIR);
  if (!(await index.isIndexCreated())) {
    throw new Error('Vector store not found. Run "npm run ingest" first.');
  }
  console.log('✅ Vector store loaded.');
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function embedText(text) {
  const result = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

async function retrieveContext(question) {
  const vector = await embedText(question);
  const results = await index.queryItems(vector, TOP_K);
  return results.map((r) => ({
    text: r.item.metadata.text,
    source: r.item.metadata.source,
    score: r.score,
  }));
}

function buildPrompt(question, chunks) {
  const context = chunks
    .map((c, i) => `[Source ${i + 1}: ${c.source}]\n${c.text}`)
    .join('\n\n---\n\n');

  return `You are a helpful assistant. Use ONLY the context below to answer the question.
If the context does not contain the answer, say "I don't have information about that in my documents."
Do not make up information that isn't in the context.

CONTEXT:
${context}

QUESTION:
${question}

ANSWER:`;
}

async function callLLM(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing from .env file.');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'RAG Chatbot',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// POST /rag — main endpoint: takes a question, returns an answer
app.post('/rag', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Please provide a question.' });
    }

    console.log(`\n❓ Question: ${question}`);

    const chunks = await retrieveContext(question);
    console.log(`📚 Retrieved ${chunks.length} chunks:`);
    chunks.forEach((c, i) =>
      console.log(`  [${i + 1}] ${c.score.toFixed(3)} | ${c.source}`)
    );

    const prompt = buildPrompt(question, chunks);

    console.log('🤖 Calling LLM...');
    const answer = await callLLM(prompt);
    console.log(`✅ Answer: ${answer.slice(0, 80)}...`);

    res.json({
      answer,
      sources: chunks.map((c) => ({
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

// GET /health — simple status check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model: LLM_MODEL });
});

// ─── START ────────────────────────────────────────────────────────────────────

loadResources().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 RAG server running at http://localhost:${PORT}`);
    console.log(`   POST /rag    → ask a question`);
    console.log(`   GET  /health → check status`);
    console.log('\nReady!\n');
  });
}).catch((err) => {
  console.error('❌ Failed to start:', err.message);
  process.exit(1);
});
