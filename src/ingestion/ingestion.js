/ src/ingestion/ingest.js
// Run this script once to process your documents into a searchable vector store.
// Re-run whenever you add or update documents.
//
// Usage: node src/ingestion/ingest.js
//        npm run ingest

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pipeline } from '@xenova/transformers';
import { LocalIndex } from 'vectra';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

const DOCUMENTS_DIR = './my-documents';
const VECTOR_STORE_DIR = './vector-store';
const CHUNK_SIZE = 1500;    // characters per chunk (~300 words)
const CHUNK_OVERLAP = 200;  // characters of overlap between chunks

// ─── EMBEDDING MODEL ──────────────────────────────────────────────────────────

async function loadEmbeddingModel() {
  console.log('Loading embedding model (downloads ~25MB on first run)...');
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('✅ Embedding model loaded.');
  return embedder;
}

async function embedText(embedder, text) {
  const result = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

// ─── CHUNKING ─────────────────────────────────────────────────────────────────

function splitIntoChunks(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start += chunkSize - overlap;
  }
  return chunks;
}

// ─── DOCUMENT READING ─────────────────────────────────────────────────────────

function readDocuments(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Folder not found: ${dir}`);
    console.error('Create my-documents/ and add .txt or .md files.');
    process.exit(1);
  }
  const documents = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.txt') && !file.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    documents.push({ filename: file, content });
    console.log(`📄 Read: ${file} (${content.length} chars)`);
  }
  if (documents.length === 0) {
    console.error('❌ No .txt or .md files found in my-documents/');
    process.exit(1);
  }
  return documents;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function ingest() {
  console.log('\n🚀 Starting ingestion...\n');

  const embedder = await loadEmbeddingModel();

  const index = new LocalIndex(VECTOR_STORE_DIR);
  if (await index.isIndexCreated()) {
    console.log('🗑️  Clearing old vector store...');
    fs.rmSync(VECTOR_STORE_DIR, { recursive: true, force: true });
  }
  await index.createIndex();
  console.log('✅ Vector store ready.\n');

  const documents = readDocuments(DOCUMENTS_DIR);
  let totalChunks = 0;

  for (const doc of documents) {
    console.log(`\nProcessing: ${doc.filename}`);
    const chunks = splitIntoChunks(doc.content);
    console.log(`  → ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const vector = await embedText(embedder, chunks[i]);
      await index.insertItem({
        vector,
        metadata: { text: chunks[i], source: doc.filename, chunkIndex: i },
      });
      process.stdout.write(`  → Embedded ${i + 1}/${chunks.length}\r`);
    }
    totalChunks += chunks.length;
    console.log(`  ✅ ${chunks.length} chunks saved           `);
  }

  console.log(`\n✅ Done! ${documents.length} docs, ${totalChunks} chunks stored.`);
  console.log('Run: node src/server/rag-server.js\n');
}

ingest().catch((err) => { console.error('❌ Ingestion failed:', err); process.exit(1); });
