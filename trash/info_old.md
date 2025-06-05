# Hausarbeit Agent

## Project Overview

Hausarbeit Agent is a **Full-Stack Web Application** developed with **Next.js (Frontend) & FastAPI (Backend)**. The goal is to **automate the creation of academic papers** by:

- Generating **chapter suggestions**.
- Utilizing a **RAG-enhanced AI model (DeepSeek/OpenAI + ChromaDB)** to retrieve relevant sources.
- Iteratively refining the paper to produce up to **120 pages**.
- Generating a **structured academic paper with an introduction, chapters, and references**.

---

## Features

- AI-generated **chapter structure**
- **Retrieval-Augmented Generation (RAG)** for document reference management
- **Iterative AI-generated text**
- **Full academic paper output**, including citations and references
- **Next.js Frontend and FastAPI Backend**

---

## Technology Stack

| Component | Technology |
|------------|-------------|
| **Frontend** | Next.js, TypeScript, TailwindCSS |
| **Backend** | FastAPI, Python, LangChain |
| **Database** | PostgreSQL for metadata, ChromaDB for vector search |
| **AI Models** | DeepSeek/OpenAI for LLM |
| **Document Format** | Markdown to PDF/Word export |

---

## Project Structure

```
/hausarbeit-agent
│── /backend           # FastAPI Backend
│   ├── /app
│   │   ├── /api       # API Router
│   │   ├── /services  # Business Logic
│   │   ├── /models    # Database Models
│   │   ├── /repositories  # Database Access
│   │   ├── /core      # Configuration & Authentication
│   ├── main.py        # FastAPI Entry Point
│   ├── requirements.txt  # Python Dependencies
│── /frontend          # Next.js Frontend
│   ├── /src
│   ├── package.json   # Frontend Dependencies
│── README.md          # Main Project Documentation
│── .gitignore         # Ignored Files
│── .env               # Environment Variables
│── docker-compose.yml # Deployment Setup
```

---

## API Documentation

FastAPI provides an interactive API documentation interface.

### 📌 Accessing the API Docs

Once the backend is running, you can view the API documentation at:

- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) (Default)
- **ReDoc UI:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc) (Alternative)

### 📌 How to Use

- Explore available API endpoints.
- Send test requests directly from the browser.
- View request and response schemas.

### 📌 Customizing the API Docs

You can modify the FastAPI documentation title and description in `main.py`:

```python
app = FastAPI(
    title="Hausarbeit Agent API",
    description="API for automating academic paper generation using LLM & RAG.",
    version="1.0.0"
)
```

For further customization, refer to the FastAPI documentation.

## Installation Guide

### Prerequisites

Ensure the following tools are installed on your system:

- **Python 3.9+** (For the backend)
- **Node.js 18+** (For the Next.js frontend)
- **Git** (For version control)
- **PostgreSQL** (For database storage, if used)

Verify installations:

```sh
python --version  # Should display Python 3.9+
node -v           # Should display Node.js 18+
git --version     # Should display Git version
```

If Python or Node.js is not installed, download them here:

- [Download Python](https://www.python.org/downloads/)
- [Download Node.js](https://nodejs.org/)

---

## Ollama Installation Guide

This guide provides step-by-step instructions to install Ollama, verify the installation, download a model, and test it.

## 1. Install Ollama

1. Download Ollama from [https://ollama.com/](https://ollama.com/) and install it.
2. Verify the installation:

```sh
ollama --version
```

## 2. Download and Test a Model

1. Pull the **Llama 3.2** model:

```sh
ollama pull llama3.2
```

3. Start the server:

```sh
"Explain quantum mechanics."
```

4. Run an interactive chat session:

```sh
"ollama run llama3.2"
```

5. Stop the server:

```sh
"ollama serve stop"
```

## Backend Installation (FastAPI + Uvicorn)

1. Clone the repository:

```sh
git clone https://github.com/YOUR_USERNAME/hausarbeit-agent.git
cd hausarbeit-agent/backend
```

2. Create and activate a virtual environment:

```sh
python -m venv venv
```

- **Windows (PowerShell)**

  ```sh
  .venv\Scripts\activate
  ```

- **Mac/Linux**

  ```sh
  source venv/bin/activate
  ```

3. Install dependencies:

```sh
pip install -r requirements.txt
pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu128
```

If `requirements.txt` does not exist, create it with the following:

```txt
fastapi
uvicorn
pydantic
sqlalchemy
psycopg2
chromadb
langchain
```

4. Set environment variables:
Create a `.env` file with:

```ini
DATABASE_URL=postgresql://postgres:password@localhost:5433/paperpilot_db

```

5. Navigate to the folder backend:

```sh
cd ../backend
```

5. Run the following command in the terminal:

```sh
uvicorn main:app --reload
```

The backend will be available at `http://127.0.0.1:8000`, with API documentation at `http://127.0.0.1:8000/docs`.

---

## Frontend Installation (Next.js)

1. Navigate to the frontend directory:

```sh
cd ../frontend
```

2. Install dependencies:

```sh
npm install
```

3. Start the frontend:

```sh
npm run dev
```

The frontend will be available at `http://localhost:3000`.

---

## Dependency Overview

### Python Dependencies (Backend)

| Library      | Purpose |
|-------------|------------------------------------------------------------|
| **FastAPI** | The core web framework handling API requests asynchronously. |
| **Uvicorn** | ASGI server that runs FastAPI applications. |
| **Pydantic** | Data validation and serialization for API request handling. |
| **SQLAlchemy** | ORM for managing PostgreSQL database interactions. |
| **ChromaDB** | Vector database for RAG (Retrieval-Augmented Generation). |
| **LangChain** | Framework for managing interactions with LLMs (DeepSeek, OpenAI). |

### JavaScript Dependencies (Frontend)

| Library      | Purpose |
|-------------|----------------------------------------------|
| **Next.js** | React-based framework for server-side rendering. |
| **TailwindCSS** | Utility-first CSS framework for styling. |
| **ECharts** | Charting library for visualizing research data. |

---

## Additional Notes

- **If new dependencies are added, update this document accordingly.**
- For a complete package list, refer to `requirements.txt` (backend) or `package.json` (frontend).

---

## Team & Contact

For contributions or questions, refer to the team section in the documentation or contact us through GitHub.


# Marker

Tool um PDFs in Markdown umzuwandeln

cuda installieren von nvidia

pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128

pip install marker


- cuda notwendig

- pytorch notwendig

# searxng

container runterladen

# crawl4ai

container runterladen

# postgres vectordatenbank


# virtuelle umgebung

.venv ordner erstellen
python -m venv .venv  
.venv\Scripts\activate

cd backend
pip install -r requirements.txt
pip install -r requirements2.txt --extra-index-url https://download.pytorch.org/whl/cu128

ablauf:

zuerst marker output zum laufen bringen
bilderpfade korrekt
in vector db speichern (extra funktion mit der man alles reinspeichern kann!)

dann auch noch websites mit searxng
dann auch quellen mit arxiv
dann auch mit crawl4ai scrapen

dann in vector db speichern (gleiche funktion!)


dann möglichkeit aus vector db rauszuziehen

falls es zu fehlern kommt zuerst diese torch sachen installieren und danach marker-pdf[full]

pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
pip install "marker-pdf[full]"


# datenbank setup:

docker compose up -d
psql -h localhost -p 5433 -U postgres -d paperpilot_db
CREATE EXTENSION IF NOT EXISTS vector;


.env hinzufügen:


# backend/.env

# --- Datenbank Einstellungen ---
DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5433/paperpilot_db"

# --- Pfad für verarbeitete Dateien ---
PROCESSED_FILES_BASE_DIR="./processed_files" # <--- NEUER PFAD

# --- Embedding Modell Einstellungen ---
EMBEDDING_SERVICE_PROVIDER="google" # Optionen: "ollama", "google"

# --- Ollama Embedding Modell Einstellungen ---
EMBEDDING_MODEL_OLLAMA="nomic-embed-text"
EMBEDDING_DIMENSION=768

# --- Google Embedding Modell Schlüssel und Einstellungen ---
GOOGLE_API_KEY="googleapikey"
GOOGLE_EMBEDDING_MODEL_NAME="models/text-embedding-004"
GOOGLE_CHAT_MODEL_NAME="gemini-2.0-flash"

# --- Haupt LLM Einstellungen ---
MAIN_LLM_MODEL="llama3.2:latest"
OLLAMA_BASE_URL="http://localhost:11434"

# --- RAG Parameter ---
RAG_CHUNK_LIMIT=5
RAG_MAX_IMAGES=5

# --- System Instruktionen (Optional) ---
# SYSTEM_INSTRUCTION_RAG="..."

# --- Text Splitter Einstellungen ---
TEXT_CHUNK_SIZE=1000
TEXT_CHUNK_OVERLAP=200
