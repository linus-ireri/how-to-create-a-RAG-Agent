# 🤖 Build a RAG Chatbot — Beginner's Guide

> **RAG** = **R**etrieval-**A**ugmented **G**eneration  
> A technique where an AI first *retrieves* relevant facts from your own documents, then *generates* an answer grounded in those facts — instead of hallucinating.

---

## 🗺️ What You'll Build

A chatbot that:
1. **Reads your documents** (text files, markdown, etc.)
2. **Stores their meaning** as vectors in a local vector store
3. **Searches** the vector store when a user asks a question
4. **Sends** the relevant snippets + the question to an LLM
5. **Returns** a grounded, accurate answer

```
User Question
     │
     ▼
┌─────────────────┐
│  Node.js Server  │  ← your rag-server.js
│                 │
│  1. Embed query  │──► Vector Store (finds similar chunks)
│  2. Retrieve ctx │◄── Top matching document chunks
│  3. Build prompt │
│  4. Call LLM API │──► OpenRouter / OpenAI
│  5. Return answer│◄── LLM response
└─────────────────┘
     │
     ▼
  Frontend (HTML/JS chat UI)
```

---

## 📚 Table of Contents

| Guide | What you'll learn |
|-------|-------------------|
| [01 – How RAG Works](docs/01-how-rag-works.md) | Core concepts explained simply |
| [02 – Embeddings & Vector Stores](docs/02-embeddings-and-vector-stores.md) | What vectors are and how similarity search works |
| [03 – Project Setup](docs/03-project-setup.md) | Folder structure and installing dependencies |
| [04 – Document Ingestion](docs/04-document-ingestion.md) | Reading docs and storing them as vectors |
| [05 – RAG Server](docs/05-rag-server.md) | Building the Node.js server that answers questions |
| [06 – Frontend Chat UI](docs/06-frontend.md) | Simple HTML/JS chat interface |
| [07 – Connecting to an LLM API](docs/07-llm-apis.md) | OpenRouter, OpenAI — how they work |
| [08 – Running & Testing](docs/08-running-and-testing.md) | Start everything up and test it |
| [09 – Going to Production](docs/09-production.md) | Deploy your server to a free VPS |

---

## 🧰 Tech Stack (Beginner-Friendly)

| Layer | Tool | Why |
|-------|------|-----|
| Server | **Node.js + Express** | Simple HTTP server, no complex framework needed |
| Embeddings | **@xenova/transformers** | Run embedding models *locally*, no API key needed |
| Vector Store | **vectra** | Local JSON-based vector store, perfect for learning |
| LLM | **OpenRouter API** | One API key gives access to many models (free tiers available) |
| Frontend | **Plain HTML + CSS + JS** | No build tools, works in any browser |

---

## ⚡ Quick Start

```bash
# 1. Clone this repo
git clone https://github.com/your-username/rag-chatbot-guide
cd rag-chatbot-guide

# 2. Install dependencies
npm install

# 3. Add your API key
cp .env.example .env
# Edit .env and paste your OpenRouter key

# 4. Ingest your documents
node src/ingestion/ingest.js

# 5. Start the RAG server
node src/server/rag-server.js

# 6. Open the frontend
# Open src/frontend/index.html in your browser
```

---

## 📁 Project Structure

```
rag-chatbot-guide/
├── docs/                        # Step-by-step guides (read these!)
│   ├── 01-how-rag-works.md
│   ├── 02-embeddings-and-vector-stores.md
│   ├── 03-project-setup.md
│   ├── 04-document-ingestion.md
│   ├── 05-rag-server.md
│   ├── 06-frontend.md
│   ├── 07-llm-apis.md
│   ├── 08-running-and-testing.md
│   └── 09-production.md
├── src/
│   ├── ingestion/
│   │   └── ingest.js            # Reads docs → embeds → saves to vector store
│   ├── server/
│   │   └── rag-server.js        # Express server: retrieves context + calls LLM
│   └── frontend/
│       ├── index.html           # Chat UI
│       └── chat.js              # Handles user input & API calls
├── my-documents/                # Put YOUR .txt or .md files here
├── vector-store/                # Auto-generated: stores your embedded vectors
├── .env.example                 # Template for environment variables
├── package.json
└── README.md
```

---

## 🔑 Getting an API Key

1. Go to [openrouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Click **"API Keys"** → **"Create Key"**
4. Copy the key into your `.env` file:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
```

OpenRouter has **free models** you can use with no credit card. This guide uses `mistralai/mistral-7b-instruct:free` by default.

---

## 🙋 New to this? Start Here

→ **[Read Guide 01: How RAG Works](docs/01-how-rag-works.md)**

---

## 📄 License

MIT — free to use, modify, and share.

Built by Ireri Linus
