# 08 — Running & Testing

> **Time to read:** ~10 minutes  
> **Goal:** Have a working RAG chatbot running locally in your browser.

---

## Pre-flight Checklist

Before starting, make sure:

- [ ] Node.js is installed (`node --version` ≥ 18)
- [ ] You've run `npm install`
- [ ] You have a `.env` file with your `OPENROUTER_API_KEY`
- [ ] You have at least one `.txt` or `.md` file in `my-documents/`

---

## Step 1: Ingest Your Documents

Run ingestion to embed your documents and build the vector store:

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

> **First run only:** The embedding model downloads (~25MB). This takes 10–30 seconds depending on your internet. Subsequent runs use the cached model and are instant.

If you see an error, check:
- Is there at least one `.txt` or `.md` file in `my-documents/`?
- Is the file readable (not empty, not binary)?

---

## Step 2: Start the RAG Server

In a **new terminal window**, start the server:

```bash
node src/server/rag-server.js
# or
npm start
```

**Expected output:**
```
Loading embedding model...
✅ Embedding model loaded.
Opening vector store...
✅ Vector store loaded.

🚀 RAG server running at http://localhost:3001
   POST http://localhost:3001/rag  → ask a question
   GET  http://localhost:3001/health → check server status

Ready to answer questions!
```

> Keep this terminal window open. The server runs continuously until you stop it with `Ctrl+C`.

---

## Step 3: Test the Server Directly (Optional)

Before opening the frontend, you can test the server is working using `curl`:

```bash
curl -X POST http://localhost:3001/rag \
  -H "Content-Type: application/json" \
  -d '{"question": "What is this document about?"}'
```

You should get back JSON with an `answer` field:

```json
{
  "answer": "Based on the provided context, this document is about...",
  "sources": [
    {
      "source": "example.txt",
      "score": 0.892,
      "preview": "..."
    }
  ]
}
```

You can also check the health endpoint in your browser:
```
http://localhost:3001/health
```

---

## Step 4: Open the Frontend

Open the chat interface in your browser:

```bash
# macOS
open src/frontend/index.html

# Linux
xdg-open src/frontend/index.html

# Windows
start src/frontend/index.html
```

You should see a chat window. Type a question about your documents and hit **Send**.

---

## What Good Output Looks Like

**Question:** "What is the refund policy?"  
**Expected behavior:**
1. The page shows a loading message briefly
2. An answer appears, grounded in your document's content
3. Below the answer, you see "Sources used" with the document name and relevance %

**Server terminal shows:**
```
❓ Question: What is the refund policy?
📚 Retrieved 3 chunks
  [1] Score: 0.923 | Source: policies.txt
  [2] Score: 0.841 | Source: faq.txt
  [3] Score: 0.712 | Source: example.txt
🤖 Calling LLM...
✅ Answer: According to the documents, the refund policy states that...
```

---

## Troubleshooting

### "Cannot connect to the RAG server"

The frontend can't reach your server. Check:
- Is the server running? Look for the `🚀 RAG server running` message.
- Is it on port 3001? Check your `.env` file's `PORT` setting.
- Did you get an error when starting the server?

### "Vector store not found. Run npm run ingest first."

You haven't run ingestion yet, or it failed. Run:
```bash
npm run ingest
```

### "OPENROUTER_API_KEY is missing"

Your `.env` file is missing or doesn't have the key. Check:
```bash
cat .env
```
Should show: `OPENROUTER_API_KEY=sk-or-v1-...`

### The LLM says "I don't have information about that"

This means retrieval found chunks, but they weren't relevant to your question. This is the correct behaviour — the LLM correctly refuses to make up an answer.

Try:
- Asking a question that's clearly covered by your documents
- Adding more documents to `my-documents/` and re-ingesting
- Checking that your document text is clear and well-written

### Very slow responses

The first embedding (after starting the server) is slow because the model warms up. Subsequent questions are faster.

If LLM responses are slow, it depends on the model provider's server load. Free models can be slower than paid ones.

---

## Running Both at Once (Advanced)

Instead of two terminals, you can use a tool like `concurrently`:

```bash
npm install -D concurrently
```

Add to `package.json` scripts:
```json
"dev": "concurrently \"npm run server\" \"echo Frontend: open src/frontend/index.html\""
```

---

## Next Step

→ **[09 — Going to Production](09-production.md)**  
*Deploy your RAG server to a free cloud VPS so anyone can use it.*
