# 04 — Document Ingestion

> **Time to read:** ~15 minutes  
> **What you'll build:** `src/ingestion/ingest.js` — the script that reads your documents and saves them to the vector store.

---

## What Ingestion Does

Ingestion is the **one-time setup step** that converts your raw documents into searchable vectors.

```
my-documents/faq.txt
       │
       ▼  1. Read text
       ▼  2. Split into chunks (~400 words each)
       ▼  3. Embed each chunk (turn into 384 numbers)
       ▼  4. Save chunk text + vector to vector-store/
       │
       ▼
vector-store/ ← ready for searching!
```

You re-run this script whenever you add or change your documents.

---

## The Complete `ingest.js` — Annotated

Here is the full file with detailed comments explaining every line:

```js
// src/ingestion/ingest.js

// Load environment variables from .env file
// This makes process.env.OPENROUTER_API_KEY available
import 'dotenv/config';

import fs from 'fs';
import path from 'path';

// @xenova/transformers lets us run AI models locally in Node.js
// 'pipeline' is a helper that loads a model and wraps it in a simple function
import { pipeline } from '@xenova/transformers';

// vectra is our local vector store
// LocalIndex manages saving and searching vectors in a folder on disk
import { LocalIndex } from 'vectra';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

const DOCUMENTS_DIR = './my-documents';   // Where your .txt and .md files live
const VECTOR_STORE_DIR = './vector-store'; // Where vectra will save the vectors

// Chunk size: how many characters per chunk (roughly 300-500 words)
// Smaller = more precise retrieval but less context per chunk
// Larger = more context but less precise
const CHUNK_SIZE = 1500;

// Overlap: how many characters to repeat between chunks
// This prevents important sentences from being split awkwardly at boundaries
const CHUNK_OVERLAP = 200;

// ─── STEP 1: LOAD THE EMBEDDING MODEL ─────────────────────────────────────────

// The embedding model converts text → vectors (lists of numbers)
// 'feature-extraction' is the task type for generating embeddings
// 'Xenova/all-MiniLM-L6-v2' is the model name — it runs locally, no API key needed
// First run: downloads ~25MB. After that, it's cached locally.
async function loadEmbeddingModel() {
  console.log('Loading embedding model (this may take a moment on first run)...');
  
  const embedder = await pipeline(
    'feature-extraction',        // task type
    'Xenova/all-MiniLM-L6-v2'   // model: fast, lightweight, 384-dimensional output
  );
  
  console.log('✅ Embedding model loaded.');
  return embedder;
}

// ─── STEP 2: EMBED TEXT ───────────────────────────────────────────────────────

// Takes a string, returns a 384-number array (the vector)
async function embedText(embedder, text) {
  const result = await embedder(text, {
    pooling: 'mean',    // average the token vectors into one vector for the whole text
    normalize: true,    // scale the vector so its length = 1 (required for cosine similarity)
  });
  
  // result.data is a Float32Array — we convert it to a plain JS array
  return Array.from(result.data);
}

// ─── STEP 3: SPLIT DOCUMENT INTO CHUNKS ───────────────────────────────────────

// Long documents need to be split into smaller pieces so we can:
//   1. Embed them individually (the model has a token limit)
//   2. Return only the relevant piece, not the whole document
function splitIntoChunks(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    
    // Only save chunks that have meaningful content (skip empty chunks)
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
    
    // Move forward by (chunkSize - overlap) so the next chunk starts slightly
    // before where this one ended — this is the "overlap" that preserves context
    start += chunkSize - overlap;
  }
  
  return chunks;
}

// ─── STEP 4: READ ALL DOCUMENTS ───────────────────────────────────────────────

// Reads all .txt and .md files from the documents folder
function readDocuments(dir) {
  const documents = [];
  
  if (!fs.existsSync(dir)) {
    console.error(`❌ Documents folder not found: ${dir}`);
    console.error('Create the folder and add some .txt or .md files to it.');
    process.exit(1);
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    // Only process text and markdown files
    if (!file.endsWith('.txt') && !file.endsWith('.md')) continue;
    
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    documents.push({ filename: file, content });
    console.log(`📄 Read: ${file} (${content.length} characters)`);
  }
  
  if (documents.length === 0) {
    console.error('❌ No .txt or .md files found in my-documents/');
    console.error('Add some documents and try again.');
    process.exit(1);
  }
  
  return documents;
}

// ─── MAIN INGESTION FUNCTION ──────────────────────────────────────────────────

async function ingest() {
  console.log('\n🚀 Starting ingestion...\n');
  
  // Load the embedding model
  const embedder = await loadEmbeddingModel();
  
  // Set up the vector store
  // LocalIndex takes the folder path where it will save your vectors
  const index = new LocalIndex(VECTOR_STORE_DIR);
  
  // Create the index if it doesn't already exist
  // If it does exist, this is a fresh ingestion — we'll recreate it
  if (await index.isIndexCreated()) {
    console.log('🗑️  Clearing existing vector store for fresh ingestion...');
    // Delete the old folder and recreate
    fs.rmSync(VECTOR_STORE_DIR, { recursive: true, force: true });
  }
  await index.createIndex();
  console.log('✅ Vector store ready.\n');
  
  // Read all documents from the documents folder
  const documents = readDocuments(DOCUMENTS_DIR);
  
  let totalChunks = 0;
  
  // Process each document
  for (const doc of documents) {
    console.log(`\nProcessing: ${doc.filename}`);
    
    // Split the document into chunks
    const chunks = splitIntoChunks(doc.content);
    console.log(`  → Split into ${chunks.length} chunks`);
    
    // Embed and store each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Convert the chunk text into a vector
      const vector = await embedText(embedder, chunk);
      
      // Save the vector + the original text to the vector store
      // 'metadata' is where we store the text and any other info we want to retrieve later
      await index.insertItem({
        vector,
        metadata: {
          text: chunk,          // the actual text — returned during retrieval
          source: doc.filename, // which file it came from
          chunkIndex: i,        // which chunk number within that file
        },
      });
      
      process.stdout.write(`  → Embedded chunk ${i + 1}/${chunks.length}\r`);
    }
    
    totalChunks += chunks.length;
    console.log(`  ✅ Done: ${chunks.length} chunks saved`);
  }
  
  console.log(`\n✅ Ingestion complete!`);
  console.log(`   📦 ${documents.length} documents processed`);
  console.log(`   🧩 ${totalChunks} chunks stored in vector-store/`);
  console.log('\nYou can now run: node src/server/rag-server.js\n');
}

// Run the ingestion
ingest().catch((err) => {
  console.error('❌ Ingestion failed:', err);
  process.exit(1);
});
```

---

## Run Ingestion

```bash
node src/ingestion/ingest.js
# or
npm run ingest
```

**Expected output:**
```
🚀 Starting ingestion...

Loading embedding model (this may take a moment on first run)...
✅ Embedding model loaded.
✅ Vector store ready.

📄 Read: example.txt (3420 characters)

Processing: example.txt
  → Split into 4 chunks
  ✅ Done: 4 chunks saved

✅ Ingestion complete!
   📦 1 documents processed
   🧩 4 chunks stored in vector-store/
```

First run downloads the model (~25MB). Subsequent runs are instant.

---

## What's in the Vector Store?

After ingestion, vectra creates a `vector-store/` folder:

```
vector-store/
├── index.json      ← metadata about the index
└── items/
    ├── 0.json      ← chunk 0: { text: "...", vector: [0.23, -0.45, ...] }
    ├── 1.json      ← chunk 1
    └── ...
```

You can open these files to see your data. Each `.json` file is one chunk of your document.

---

## When to Re-Run Ingestion

Re-run whenever you:
- Add new documents to `my-documents/`
- Edit existing documents
- Remove documents

```bash
npm run ingest
```

This clears the old vector store and rebuilds from scratch.

---

## Next Step

→ **[05 — RAG Server](05-rag-server.md)**  
*Build the Express server that receives questions, searches the vector store, and calls the LLM.*
