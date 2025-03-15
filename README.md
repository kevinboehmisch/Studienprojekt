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

### Backend Installation (FastAPI + Uvicorn)

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
  venv\Scripts\activate
  ```
- **Mac/Linux**
  ```sh
  source venv/bin/activate
  ```

3. Install dependencies:
```sh
pip install -r requirements.txt
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
DATABASE_URL=postgresql://user:password@localhost:5432/hausarbeit
CHROMADB_PATH=./chroma_db
OPENAI_API_KEY=your_api_key
```

5. Start the backend:
```sh
uvicorn main:app --reload
```
The backend will be available at `http://127.0.0.1:8000`, with API documentation at `http://127.0.0.1:8000/docs`.

---

### Frontend Installation (Next.js)

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



