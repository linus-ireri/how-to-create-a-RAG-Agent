# 01 — How RAG Works

> **Time to read:** ~10 minutes  
> **Prerequisites:** None — this is pure concepts, no code yet.

---

## The Problem RAG Solves

Large Language Models (LLMs) like GPT-4 or Mistral are incredibly smart, but they have a hard limitation: **they only know what they were trained on**, and that training happened at a fixed point in time.

If you ask an LLM:
- *"What does our company refund policy say?"* → It doesn't know.
- *"What's in the PDF I uploaded last week?"* → It doesn't know.
- *"Summarize our internal wiki on onboarding."* → It doesn't know.

You could paste your documents directly into the prompt — but most documents are too long, and LLMs have **context window limits** (a cap on how much text they can process at once).

**RAG solves this by being smart about which parts of your documents to include in the prompt.**

---

## How RAG Works — Step by Step

Here's the full flow, explained in plain English:

### Phase 1: Ingestion (done once, offline)

This is a **setup phase** — you run it once (or whenever your documents change).

```
Your Documents (.txt, .md, .pdf, etc.)
         │
         ▼
   [Split into chunks]       ← break long docs into smaller pieces
         │
         ▼
   [Embed each chunk]        ← convert each chunk into a list of numbers (a vector)
         │
         ▼
   [Save to vector store]    ← store chunks + their vectors in a local database
```

**Why chunks?** If a document is 50 pages, you don't want to retrieve all 50 pages for every question. You split it into small pieces (e.g. 300–500 words each), so you can retrieve only the 2–3 most relevant chunks.

**Why vectors?** Computers can't directly compare "meaning." But if you convert text into a list of numbers (a vector), you can use math to measure how *similar* two pieces of text are — even if they use different words.

---

### Phase 2: Retrieval + Generation (runs on every user question)

```
User asks: "What is your refund policy?"
         │
         ▼
   [Embed the question]       ← turn the question into a vector too
         │
         ▼
   [Search vector store]      ← find the chunks whose vectors are closest to the question's vector
         │
         ▼
   [Top 3 chunks returned]    ← e.g. the paragraph about refunds from your policy doc
         │
         ▼
   [Build a prompt]           ← combine the chunks + the question into one prompt
         │
         ▼
   [Send to LLM]              ← e.g. Mistral, GPT-4, Claude
         │
         ▼
   [LLM answers]              ← grounded in your actual documents
         │
         ▼
   User sees the answer ✅
```

---

## An Analogy

Think of it like an **open-book exam**:

- The **LLM** is a very smart student.
- The **vector store** is a well-organized textbook.
- **RAG** is the process of the student quickly finding the right pages in the textbook before writing the answer.

Without RAG = closed-book exam. The student can only use what they memorized (training data).  
With RAG = open-book exam. The student can look things up and give accurate, grounded answers.

---

## Why Not Just Paste Everything Into the Prompt?

You could, for small documents. But:

| Approach | Problem |
|----------|---------|
| Paste whole doc | Most LLMs have a context limit (~4k–128k tokens). Large docs won't fit. |
| Paste whole doc | Costs more (you pay per token with most APIs). |
| Paste whole doc | LLMs can get "lost" in very long prompts and miss key details. |
| **RAG** ✅ | Only sends the *relevant* parts. Efficient, cheap, accurate. |

---

## The Key Insight

> RAG doesn't make the LLM smarter. It makes the LLM *better informed* by giving it the right context before asking it to answer.

The LLM's job becomes much easier: instead of trying to recall something from training, it just needs to read 3 paragraphs and summarize the answer.

---

## What You'll Build

In this guide, you'll build a system with two main scripts:

1. **`ingest.js`** — Runs once. Reads your documents, embeds them, and saves the vectors to disk.
2. **`rag-server.js`** — Runs as a server. Receives questions, finds relevant chunks, calls the LLM, returns answers.

And a simple **HTML frontend** so you can chat with it in your browser.

---

## Next Step

→ **[02 — Embeddings & Vector Stores](02-embeddings-and-vector-stores.md)**  
*Learn what vectors actually are and how similarity search works.*
