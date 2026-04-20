# 03 — Project Setup

> **Time to read:** ~10 minutes  
> **Prerequisites:** Node.js installed on your machine

---

## Install Node.js (if you haven't)

Go to [nodejs.org](https://nodejs.org) and download the **LTS version** (the one labelled "Recommended for most users").

Check it's installed:
```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
```

---

## Clone This Repo

```bash
git clone https://github.com/your-username/rag-chatbot-guide
cd rag-chatbot-guide
```

Or if you're starting from scratch, create the folder yourself:

```bash
mkdir rag-chatbot-guide
cd rag-chatbot-guide
git init
```

---

## Project Folder Structure

Here's what the full project looks like. You don't need to create these manually — they're already in this repo:

```
rag-chatbot-guide/
│
├── docs/                        # 📚 The guides you're reading now
│
├── src/
│   ├── ingestion/
│   │   └── ingest.js            # Script to read docs + create vector store
│   │
│   ├── server/
│   │   └── rag-server.js        # Express server that answers questions
│   │
│   └── frontend/
│       ├── index.html           # Chat UI — open this in your browser
│       └── chat.js              # JavaScript for the chat interface
│
├── my-documents/                # 📂 Put YOUR .txt or .md files here
│   └── example.txt              # A sample document to get you started
│
├── vector-store/                # 🔒 Auto-generated — don't edit manually
│
├── .env.example                 # Template for your API key
├── .env                         # Your actual API key (NOT committed to git)
├── .gitignore
└── package.json
```

---

## Install Dependencies

```bash
npm install
```

This installs:

| Package | What it does |
|---------|-------------|
| `express` | Creates the HTTP server that listens for questions |
| `@xenova/transformers` | Runs embedding models locally (no API key needed) |
| `vectra` | Local vector store — saves/searches your document vectors |
| `dotenv` | Loads your `.env` file so your API key is available as `process.env.OPENROUTER_API_KEY` |
| `cors` | Allows your HTML frontend to talk to your local server |
| `node-fetch` | Makes HTTP requests to the LLM API (built into Node 18+, listed for older versions) |

---

## Set Up Your Environment Variables

Environment variables are a safe way to store secrets like API keys — they live in a file called `.env` that **never gets committed to git**.

```bash
# Copy the template
cp .env.example .env
```

Now open `.env` in any text editor:

```env
# .env

# Your OpenRouter API key
# Get one free at https://openrouter.ai → API Keys → Create Key
OPENROUTER_API_KEY=sk-or-v1-paste-your-key-here

# The LLM model to use (this one is free on OpenRouter)
LLM_MODEL=mistralai/mistral-7b-instruct:free

# The port your RAG server will run on
PORT=3001
```

> **Never share your `.env` file or commit it to GitHub.**  
> The `.gitignore` in this repo already excludes it.

---

## Add Your Documents

Put any `.txt` or `.md` files you want the chatbot to know about in the `my-documents/` folder.

You can start with the included `example.txt`, or add your own:

```bash
my-documents/
├── example.txt           # Included sample about a fictional company
├── my-company-faq.txt    # Add your own!
└── product-manual.md     # Markdown works too
```

**Tips for document quality:**
- Plain text works best
- Break up very long documents into separate files by topic
- PDFs need to be converted to text first (you can use tools like `pdftotext`)

---

## What's in `package.json`?

```json
{
  "name": "rag-chatbot-guide",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "ingest": "node src/ingestion/ingest.js",
    "server": "node src/server/rag-server.js",
    "start": "npm run server"
  },
  "dependencies": {
    "@xenova/transformers": "^2.17.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.3",
    "vectra": "^0.8.0"
  }
}
```

Note: `"type": "module"` means we use modern ES module syntax (`import`/`export`) instead of `require()`.

---

## Quick Sanity Check

Make sure everything is ready:

```bash
# Check Node.js is working
node -e "console.log('Node OK:', process.version)"

# Check your API key is loaded (should NOT print "undefined")
node -e "import('dotenv/config').then(() => console.log('Key starts with:', process.env.OPENROUTER_API_KEY?.slice(0,10)))"
```

---

## Next Step

→ **[04 — Document Ingestion](04-document-ingestion.md)**  
*Read your documents, embed them, and save them to the vector store.*
