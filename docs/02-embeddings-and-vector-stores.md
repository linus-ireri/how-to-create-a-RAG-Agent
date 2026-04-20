# 02 — Embeddings & Vector Stores

> **Time to read:** ~15 minutes  
> **Prerequisites:** [01 — How RAG Works](01-how-rag-works.md)

---

## What Is an Embedding?

An **embedding** is a way of converting text (words, sentences, paragraphs) into a list of numbers — called a **vector** — that captures the *meaning* of that text.

Example (simplified):

```
"The dog chased the ball."   →  [0.82, -0.14, 0.55, 0.03, ...]
"A puppy ran after the toy." →  [0.79, -0.11, 0.51, 0.06, ...]
"The stock market crashed."  →  [-0.33, 0.72, -0.18, 0.91, ...]
```

Notice that the two sentences about dogs produce *similar* numbers (close together), while the finance sentence produces very *different* numbers (far apart). That's the magic — **similar meaning → similar vectors**.

Real embeddings have 384, 768, or even 1536 numbers per vector (called *dimensions*). The exact numbers don't matter to us — what matters is that we can use math to compare them.

---

## How Similarity Search Works

Once all your text chunks are converted to vectors, finding the most relevant ones for a given question is just **math** — specifically, measuring the distance between vectors.

The most common measurement is called **cosine similarity**:

- Score of **1.0** = vectors point in the same direction = very similar meaning
- Score of **0.0** = vectors are unrelated
- Score of **-1.0** = vectors point in opposite directions = very different meaning

```
Question vector:    [0.81, -0.12, 0.53, 0.04, ...]
                         ↑ compare to all stored vectors
Chunk A vector:     [0.79, -0.11, 0.51, 0.06, ...]  → similarity: 0.98 ✅ (very close!)
Chunk B vector:     [-0.33, 0.72, -0.18, 0.91, ...]  → similarity: 0.12 ❌ (very different)
```

So "searching" the vector store = embed the question → compare against all stored vectors → return the top N most similar chunks.

---

## What Embedding Model Do We Use?

We use **`@xenova/transformers`**, which lets you run embedding models *entirely locally* in Node.js — **no API key, no internet, no cost**.

The specific model is **`Xenova/all-MiniLM-L6-v2`**:
- Produces **384-dimensional** vectors
- Fast and lightweight (runs on CPU)
- Great quality for a beginner project
- Downloads automatically the first time you run it (~25MB)

```js
// This is all it takes to embed text with @xenova/transformers:
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const result = await embedder("What is the refund policy?", { pooling: 'mean', normalize: true });
const vector = Array.from(result.data); // → [0.23, -0.45, 0.81, ...]
```

The model runs on your machine. No data leaves your computer during embedding.

---

## What Is a Vector Store?

A **vector store** is a database that stores:
1. The **text** of each chunk (so you can return it to the LLM)
2. The **vector** of each chunk (so you can search by similarity)

There are many options:

| Vector Store | Type | Best For |
|---|---|---|
| **Vectra** | Local JSON file | ✅ Learning, small projects |
| FAISS | Local file, binary | Medium datasets, still local |
| Pinecone | Cloud service | Large scale, production |
| Weaviate | Cloud or self-hosted | Production with rich filtering |
| Chroma | Local or cloud | Python-first, popular in Python RAG |

**We use Vectra** — it saves everything to a local JSON file. You can open it and read it. No setup, no accounts, no servers. Perfect for learning.

---

## How Vectra Works

Vectra creates a folder on disk. Inside, it stores your chunks and their vectors as JSON. When you search, it loads the vectors into memory and does cosine similarity math to find the best matches.

```js
import { LocalIndex } from 'vectra';

// Create or open the vector store
const index = new LocalIndex('./vector-store');
await index.createIndex(); // only needed once

// Add a chunk
await index.insertItem({
  vector: [0.23, -0.45, 0.81, ...],  // 384 numbers
  metadata: {
    text: "Our refund policy allows returns within 30 days...",
    source: "policies.txt",
    chunk: 0
  }
});

// Search for the most relevant chunks
const results = await index.queryItems(questionVector, 3); // top 3 matches
// results[0].item.metadata.text → the most relevant chunk
```

That's it. Your entire knowledge base lives in a folder called `vector-store/`.

---

## Chunking — Splitting Documents into Pieces

Before embedding, you split each document into **chunks**. Here's why chunk size matters:

**Too large (e.g., 2000 words per chunk):**
- You retrieve big blocks that contain lots of irrelevant text
- Wastes LLM context window space
- The LLM may miss the specific relevant sentence

**Too small (e.g., 20 words per chunk):**
- Each chunk has no context — a sentence alone may be meaningless
- The LLM doesn't have enough to work with

**Sweet spot: 200–500 words per chunk**, with a small **overlap** between chunks (e.g. 50 words) so that sentences near chunk boundaries aren't cut off from their context.

```
Document:  [paragraph 1] [paragraph 2] [paragraph 3] [paragraph 4] [paragraph 5]

Chunks:    [p1 + p2 half]
                [p2 half + p3 + p4 start]   ← overlap keeps context
                          [p4 rest + p5]
```

---

## Putting It Together

Here's the full picture of what happens during **ingestion**:

```
my-documents/policies.txt
        │
        ▼
  Read file text
        │
        ▼
  Split into chunks (e.g., every 400 words, 50-word overlap)
        │
        ▼
  For each chunk:
    → Run through embedding model
    → Get back a 384-number vector
    → Save (text + vector) to vector store
        │
        ▼
  vector-store/ folder now has all your knowledge ✅
```

And during **retrieval** (when a user asks a question):

```
  User question: "How do I get a refund?"
        │
        ▼
  Embed the question → [0.81, -0.12, ...]
        │
        ▼
  Search vector store → top 3 matching chunks
        │
        ▼
  Return the text of those 3 chunks to rag-server.js
```

---

## Next Step

→ **[03 — Project Setup](03-project-setup.md)**  
*Install dependencies and set up the project structure.*
