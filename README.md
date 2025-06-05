# PaperPilot: Dein KI-gestützter Assistent für wissenschaftliche Arbeiten

PaperPilot ist ein intelligenter Richtexteditor zur Unterstützung beim wissenschaftlichen Schreiben. Es kombiniert PDF-Verarbeitung, semantische Suche und KI-gestützte Textgenerierung zu einem leistungsfähigen Werkzeug für Studierende und Forschende. Ziel ist es, den Prozess von der Literaturauswertung bis zur fertigen Hausarbeit oder Thesis zu automatisieren und zu erleichtern.

## Inhaltsverzeichnis
1.  [Projektübersicht](#1-projektübersicht)
2.  [Kernfunktionalitäten](#2-kernfunktionalitäten)
    *   [Implementiert](#implementiert)
    *   [Geplant / In Entwicklung](#geplant--in-entwicklung)
3.  [Technologie-Stack & Architekturentscheidungen](#3-technologie-stack--architekturentscheidungen)
4.  [Projektstruktur](#4-projektstruktur)
    *   [Backend (FastAPI)](#backend-fastapi)
    *   [Frontend (Next.js) - Grundstruktur](#frontend-nextjs---grundstruktur)
5.  [Installationsanleitung & Setup](#5-installationsanleitung--setup)
    *   [Voraussetzungen](#voraussetzungen)
    *   [Backend-Setup (FastAPI)](#backend-setup-fastapi)
    *   [Frontend-Setup (Next.js)](#frontend-setup-nextjs)
    *   [Externe Dienste (Docker Compose)](#externe-dienste-docker-compose)
        *   [PostgreSQL mit pgvector](#postgresql-mit-pgvector)
        *   [SearXNG (für Web-Suche)](#searxng-für-web-suche)
        *   [Crawl4AI (für Web-Crawling)](#crawl4ai-für-web-crawling)
        *   [Ollama (Optional für lokale LLMs)](#ollama-optional-für-lokale-llms)
6.  [API-Dokumentation (Backend)](#6-api-dokumentation-backend)
7.  [Verwendung](#7-verwendung)
8.  [Nächste Entwicklungsschritte & Zukünftige Features](#8-nächste-entwicklungsschritte--zukünftige-features)
9.  [Team & Kontakt](#9-team--kontakt)

---

## 1. Projektübersicht

Paperpilot wurde mit Next.js für das Frontend und FastAPI für das Backend entwickelt und ermöglicht es Nutzern, ihre Quellen bzw. PDF-Dokumente hochzuladen, deren Inhalte (Text, Metadaten, Bilder) intelligent zu extrahieren und zu strukturieren. Eine Kernkomponente ist das Retrieval Augmented Generation (RAG)-System, das auf einer Vektordatenbank (PostgreSQL mit pgvector) basiert. Dieses System erlaubt eine semantische Suche in den Dokumenteninhalten und dient als Wissensbasis für einen KI-Assistenten, der bei der Textgenerierung, Beantwortung von Fragen, Zitieren von Quellen und Strukturierung der wissenschaftlichen Arbeit hilft. PaperPilot zielt darauf ab, den gesamten Workflow von der ersten Gliederungsidee bis zur Erstellung umfangreicher Texte mit korrekten Zitationen und Referenzen zu unterstützen.

---

## 2. Kernfunktionalitäten

### Implementiert

*   **PDF-Ingestion & Verarbeitung:**
    *   Upload von PDF-Dateien über eine API.
    *   Extraktion von Standard-Metadaten (Titel, Autor, Jahr) mittels PyMuPDF.
    *   Konvertierung von PDF-Inhalten in hochwertigen Markdown-Text (inkl. LaTeX-Formeln) und Extraktion von Bildern mittels der Marker-PDF Bibliothek.
*   **Datenpersistenz & Chunking:**
    *   Speicherung von Dokument-Metadaten in einer PostgreSQL-Datenbank.
    *   Intelligentes Aufteilen (Chunking) des extrahierten Markdown-Textes in semantisch sinnvolle Abschnitte unter heuristischer Berücksichtigung von Seitenzahlen (basierend auf Markern im Markdown).
    *   Generierung von Vektor-Embeddings für jeden Text-Chunk (aktuell mit Google Generative AI Embeddings, optional Ollama).
    *   Speicherung der Chunks (Inhalt, Seite, Embedding) in PostgreSQL mit pgvector.
*   **Semantisches Retrieval (RAG-Basis):**
    *   API-Endpunkt (`/retrieval/find-similar`) für die Ähnlichkeitssuche in den gechunkten Dokumenteninhalten basierend auf einer Textanfrage.
*   **Quellenbasierte Textgenerierung (RAG):**
    *   API-Endpunkt (`/generation/generate-from-query`) der relevante Quellen zu einer Nutzeranfrage findet und ein LLM (aktuell Google Gemini) anweist, darauf basierend einen neuen Text zu generieren, inklusive Verweisen auf die Quell-Chunks.
*   **Interaktiver Chat-Assistent (RAG):**
    *   API-Endpunkt (`/chat/`) für eine konversationelle Schnittstelle.
    *   Verwaltet Chat-Sessions und speichert die Nachrichten-Historie in der Datenbank.
    *   Nutzt RAG, um kontextbezogene Antworten basierend auf den indexierten Dokumenten zu generieren.
    *   Optionale Deaktivierung von RAG für allgemeine Konversationen.

### Geplant / In Entwicklung

*   **KI-generierte Gliederungsvorschläge:** Basierend auf einem Thema oder existierenden Dokumenten.
*   **Iterative Textverfeinerung:** Möglichkeit für den Nutzer, generierte Texte zu bearbeiten und das LLM um Überarbeitungen oder Ergänzungen zu bitten.
*   **Umfassende Zitations- und Referenzverwaltung:** Automatische Erstellung eines Literaturverzeichnisses und präzisere In-Text-Zitationen gemäß wählbaren Stilen (z.B. APA, MLA).
*   **Integration von Web-Recherche (SearXNG):** Ermöglicht dem System, aktuelle Informationen oder zusätzliche Quellen aus dem Internet zu beziehen.
*   **Gezieltes Web-Crawling (Crawl4AI):** Extraktion von Informationen von spezifischen Webseiten zur Erweiterung der Wissensbasis.
*   **Exportfunktionen:** Generierte wissenschaftliche Arbeiten als Markdown, PDF oder Word-Dokument exportieren.
*   **Nutzerauthentifizierung und -verwaltung:** Um Projekte und Dokumente nutzerspezifisch zu speichern.
*   **Verbesserte UI/UX im Frontend:** Insbesondere für die Interaktion mit generiertem Text und die Verwaltung von Quellen.
*   **Unterstützung weiterer Dokumentformate:** Neben PDF auch DOCX, EPUB etc. (Marker-PDF bietet hierfür schon Grundlagen).

---

## 3. Technologie-Stack & Architekturentscheidungen

| Komponente           | Technologie                               | Begründung                                                                                                                                                              |
| :------------------- | :---------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**         | Next.js, TypeScript, TailwindCSS, TipTap  | **Next.js & React:** Industriestandard für performante, serverseitig gerenderte oder statisch generierte Webanwendungen. Ermöglicht eine reiche User Experience. **TypeScript:** Erhöht Codequalität und Wartbarkeit durch statische Typisierung. **TailwindCSS:** Effizientes, utility-first CSS-Framework für schnelles Prototyping und konsistentes Design. **TipTap:** Leistungsstarker, erweiterbarer Rich-Text-Editor als Basis für den Schreibbereich. |
| **Backend**          | FastAPI, Python                           | **FastAPI:** Modernes, asynchrones Python-Framework, ideal für schnelle API-Entwicklung mit automatischer Validierung (Pydantic) und OpenAPI-Dokumentation. Gute Performance für I/O-lastige Aufgaben. **Python:** De-facto-Standard für KI und Machine Learning, mit exzellenter Bibliotheksunterstützung. |
| **Datenbank**        | PostgreSQL, pgvector                      | **PostgreSQL:** Robuste, etablierte relationale Open-Source-Datenbank mit JSONB-Unterstützung für flexible Metadaten. **pgvector:** Effiziente Erweiterung für Vektorspeicherung und Ähnlichkeitssuche, Grundlage für RAG. |
| **PDF-Verarbeitung** | Marker-PDF, PyMuPDF (fitz)                | **Marker-PDF:** Konvertiert diverse Dokumentformate (insb. PDF) in qualitativ hochwertigen Markdown, extrahiert Bilder und behält komplexe Strukturen wie LaTeX bei. **PyMuPDF:** Leichtgewichtige und schnelle Bibliothek zur Extraktion von Standard-PDF-Metadaten. |
| **Text Chunking**    | Langchain (RecursiveCharacterTextSplitter)| **Langchain:** Umfassendes Framework zur Entwicklung von LLM-Anwendungen. Der `RecursiveCharacterTextSplitter` ist eine flexible Methode, Texte semantisch sinnvoll und mit konfigurierbarer Größe/Überlappung zu zerlegen. |
| **Embeddings**       | Google Generative AI / Ollama (nomic-embed-text) | **Google Embeddings (`models/text-embedding-004`):** Liefern qualitativ hochwertige Embeddings über eine API. **Ollama mit `nomic-embed-text`:** Eine starke Open-Source-Alternative für lokale Embeddings, bietet Kontrolle und potenziell Kostenvorteile. Die Flexibilität, zwischen Cloud und Lokal zu wählen, ist vorteilhaft. |
| **LLM (Generierung/Chat)**| Google Gemini / Ollama (z.B. Llama 3)     | **Google Gemini (`gemini-1.5-flash` oder `gemini-pro`):** Leistungsstarke API-basierte Modelle für komplexe Textgenerierung und Dialogführung. **Ollama:** Ermöglicht den lokalen Einsatz diverser Open-Source LLMs, was für Experimente, Datenschutz und Kostenkontrolle nützlich ist. |
| **Web-Suche**        | SearXNG (via Docker)                      | Eine datenschutzfreundliche Metasuchmaschine zur Integration von Web-Recherche-Ergebnissen als zusätzliche Informationsquellen.                                   |
| **Web-Crawling**     | Crawl4AI (via Docker)                     | Ein spezialisiertes Tool zur automatisierten Extraktion von Inhalten von Ziel-Webseiten, um die Wissensbasis des RAG-Systems zu erweitern.                             |
| **Deployment**       | Docker, Docker Compose                    | Standardwerkzeuge für Containerisierung, die eine konsistente Entwicklungsumgebung über verschiedene Systeme hinweg und eine vereinfachte Bereitstellung gewährleisten.      |

---

## 4. Projektstruktur

### Backend (FastAPI)

```
backend/
├── .env # Umgebungsvariablen
├── .venv/ # Virtuelle Python-Umgebung
├── app/ # Hauptanwendungsverzeichnis
│ ├── init.py
│ ├── api/ # API Endpunkte (Router)
│ │ ├── init.py
│ │ ├── chat_endpoints.py
│ │ ├── generation_endpoints.py
│ │ ├── pdf_processing.py
│ │ └── routes.py
│ ├── core/ # Kernkonfiguration
│ │ ├── init.py
│ │ └── config.py
│ ├── db/ # Datenbank-Module
│ │ ├── init.py
│ │ ├── crud/ # Datenzugriffsschicht (Repositories)
│ │ │ ├── init.py
│ │ │ ├── crud_chat.py
│ │ │ ├── crud_chunk.py
│ │ │ ├── crud_document.py
│ │ │ └── crud_retrieval.py
│ │ ├── models/ # SQLAlchemy-Modelle
│ │ │ ├── init.py
│ │ │ ├── base_class.py
│ │ │ ├── chat_model.py
│ │ │ ├── chunk_model.py
│ │ │ └── document_model.py
│ │ └── session.py
│ ├── schemas/ # Pydantic-Modelle für API-Daten
│ │ ├── init.py
│ │ ├── chat_schemas.py
│ │ ├── generation_schemas.py
│ │ └── processing_schemas.py
│ ├── services/ # Geschäftslogik
│ │ ├── init.py
│ │ ├── chat_service.py
│ │ ├── embedding_service.py
│ │ ├── generation_service.py
│ │ ├── llm_service.py
│ │ └── pdf_processing_service.py
│ └── dependencies.py
├── extracted_images/ # Speicherort für extrahierte Bilder
├── main.py # FastAPI App-Initialisierung
└── requirements.txt # Python-Abhängigkeiten (Basis)
└── requirements2.txt # Python-Abhängigkeiten (PyTorch-spezifisch)
```


### Frontend (Next.js) - Grundstruktur

```
frontend/
├── src/
│ ├── app/ # Next.js App Router (Seiten, Layouts)
│ ├── components/ # Wiederverwendbare UI-Komponenten (z.B. ChatInterface, TextEditor)
│ ├── services/ # API-Aufrufe an das Backend (z.B. llmService.ts)
│ ├── styles/ # Globale Styles, Tailwind-Konfiguration
│ └── utils/ # Hilfsfunktionen
├── public/ # Statische Assets
├── package.json # Frontend-Abhängigkeiten und Skripte
└── next.config.js # Next.js Konfiguration
```

---

## 5. Installationsanleitung & Setup

### Voraussetzungen
- **Python 3.10+** (`python --version`)
- **Node.js 18+** (`node -v`)
- **Git** (`git --version`)
- **Docker & Docker Compose** (`docker --version`, `docker compose version`)
- **NVIDIA GPU & CUDA Toolkit (Optional):** Für GPU-Beschleunigung. Prüfe mit `nvidia-smi`.
- **Ollama**

Falls Python oder Node.js nicht installiert sein sollten hierüber installieren:

- [Download Python](https://www.python.org/downloads/)
- [Download Node.js](https://nodejs.org/)

### Ollama Installation Guide

This guide provides step-by-step instructions to install Ollama, verify the installation, download a model, and test it.

1. **Installiere Ollama**

- Downloade und installiere Ollama von [https://ollama.com/](https://ollama.com/).
- Verifiziere die Installation:

```sh
ollama --version
```

2. **Downloade und Teste ein Modell**

- Pull das **Llama 3.2** Modell:

```sh
ollama pull llama3.2
```

3. **Starte den server:**

```sh
"Explain quantum mechanics."
```

4. **Lasse eine interaktive Chat Session laufen:**

```sh
"ollama run llama3.2"
```

5. **Stoppe den server:**

```sh
"ollama serve stop"
```

## Backend-Setup (FastAPI)

1.  **Projekt klonen:**
    ```bash
    git clone https://github.com/kevinboehmisch/Studienprojekt.git
    ```
2.  **Virtuelle Umgebung:**
    ```bash
    python -m venv .venv
    ```
    *   Windows (PowerShell): `.venv\Scripts\activate`
    *   Linux/macOS: `source .venv/bin/activate`
3.  **Python-Abhängigkeiten installieren:**
    *   *Empfohlene Reihenfolge für Nvidia-GPU-Nutzer (ersetze `cu128` mit deiner CUDA Version, z.B. `cu121`):*
        ```bash
        pip install -r requirements.txt
        pip install -r requirements2.txt --index-url https://download.pytorch.org/whl/cu128 
        ```
    *   *Für CPU-Nutzer oder wenn PyTorch Probleme macht:*
        ```bash
        pip install -r requirements.txt 
        pip install -r requirements2.txt
        ```
4.  **Externe Dienste (PostgreSQL, Searxng, Crawl4ai) mit Docker Compose starten:**
    Stelle sicher, dass Docker Desktop läuft. Im Hauptverzeichnis des Projekts (`Studienprojekt/`):
    ```bash
    docker compose up -d
    ```
    Erstelle die `pgvector`-Erweiterung (nur einmalig):
    ```bash
    docker exec -it studienprojekt-db-1 psql -U postgres -d paperpilot_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
    ```
5.  **Umgebungsvariablen (`.env`-Datei):**
    Erstelle eine `.env` Datei im backend-Verzeichnis und füge API Schlüssel und Konfiguration hinzu: 
    ```bash
    # backend/.env

    # --- Datenbank Einstellungen ---
    DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5433/paperpilot_db"

    # --- Pfad für verarbeitete Dateien ---
    PROCESSED_FILES_BASE_DIR="./processed_files" 

    # --- Embedding Modell Einstellungen ---
    EMBEDDING_SERVICE_PROVIDER="google" # Optionen: "ollama", "google"

    # --- Ollama Embedding Modell Einstellungen ---
    EMBEDDING_MODEL_OLLAMA="nomic-embed-text"
    EMBEDDING_DIMENSION=768

    # --- Google Embedding Modell Schlüssel und Einstellungen ---
    GOOGLE_API_KEY="AIzaSyCNxC6IdbCghQZAPn7EWBns3d9V5WCAfO8"
    GOOGLE_EMBEDDING_MODEL_NAME="models/text-embedding-004"
    GOOGLE_CHAT_MODEL_NAME="gemini-2.0-flash"

    # --- Haupt LLM Einstellungen  ---
    MAIN_LLM_MODEL="llama3.2:latest"
    OLLAMA_BASE_URL="http://localhost:11434"

    # --- RAG Parameter ---
    RAG_CHUNK_LIMIT=5
    RAG_MAX_IMAGES=5

    # --- Text Splitter Einstellungen ---
    TEXT_CHUNK_SIZE=1000
    TEXT_CHUNK_OVERLAP=200
    ```

6.  **FastAPI-Backend starten:**
    Navigiere ins `backend`-Verzeichnis:
    ```bash
    uvicorn main:app --reload
    ```
    Server läuft auf `http://127.0.0.1:8000`. Tabellen werden beim ersten Start erstellt.

## Frontend-Setup (Next.js)

1.  **Navigiere ins Frontend-Verzeichnis:** 
```bash
cd ../frontend
```
2.  **Abhängigkeiten installieren:** 
```
bash`npm install
``` 

3.  **Entwicklungs-Server starten:** 
```bash
npm run dev
```
    Frontend ist unter `http://localhost:3000` erreichbar.

## Externe Dienste (Docker Compose)
Das `docker-compose.yml` im Hauptverzeichnis des Projekts verwaltet folgende Dienste:

#### PostgreSQL mit pgvector
*   **Zweck:** Speicherung von Dokument-Metadaten, Text-Chunks und deren Vektor-Embeddings.
*   **Image:** `pgvector/pgvector:pg16`
*   **Port (Host):** `5433` (intern `5432`)
*   **Zugangsdaten:** User `postgres`, Passwort `password`, DB `paperpilot_db` (konfigurierbar in `.env` für die Anwendung).

#### SearXNG (für Web-Suche)
*   **Zweck:** Private und anpassbare Metasuchmaschine.
*   **Konfiguration:** Über `./searxng-docker/` Verzeichnis und Caddy.
*   **Zugriff (Standard):** Über Caddy  `http://localhost:8080`.

#### Crawl4AI (für Web-Crawling)
*   **Zweck:** Gezielte Extraktion von Inhalten von Webseiten.
*   **Konfiguration:** Über Umgebungsvariablen und ggf. gemountete Volumes.

#### Ollama (Optional für lokale LLMs)
*   Nicht direkt im `docker-compose.yml` enthalten, aber die Installationsanleitung ist beigefügt. Wird für lokale Embedding- und LLM-Nutzung benötigt.

---

## 6. API-Dokumentation (Backend)

Interaktive API-Dokumentation ist nach dem Start des Backends verfügbar:
*   **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
*   **ReDoc UI:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 7. Verwendung

1.  **PDFs hochladen:** Nutze den Endpunkt `/pdf-processor/extract-and-store`, um Dokumente zu verarbeiten und in der Datenbank zu indexieren.
2.  **Quellen finden:** Sende Anfragen an `/retrieval/find-similar`, um semantisch ähnliche Textpassagen zu finden.
3.  **Text generieren:** Verwende `/generation/generate-from-query`, um basierend auf gefundenen Quellen neuen Text zu erstellen.
4.  **Chatten:** Interagiere mit dem Assistenten über den `/chat/`-Endpunkt.

---

## 8. Nächste Entwicklungsschritte & Zukünftige Features

*   **Frontend-Integration:** Vollständige Anbindung aller Backend-Funktionen an die Next.js-Oberfläche mit TipTap-Editor.
*   **Verbesserung der Seitenzuordnung:** Optimierung des `robust_markdown_page_splitter` für noch präzisere Seitenzahlen bei den Chunks.
*   **Verfeinerung des Prompt Engineerings:** Für qualitativ hochwertigere und präziser zitierte LLM-Antworten und Textgenerierungen.
*   **Ollama-Integration:** Vollständige Implementierung und Test der Nutzung lokaler Embedding- und Chat-Modelle über Ollama als Alternative zu Cloud-APIs.
*   **SearXNG & Crawl4AI Integration:** Anbindung dieser Dienste an den RAG-Workflow zur dynamischen Informationsbeschaffung.
*   **Iterative Textbearbeitung:** Funktionen, die es dem Nutzer erlauben, generierten Text zu verfeinern und das LLM um spezifische Modifikationen zu bitten.
*   **Gliederungsfunktionen:** KI-gestützte Erstellung und Bearbeitung von Dokumentgliederungen.
*   **Nutzerauthentifizierung:** Implementierung eines sicheren Login-Systems.
*   **Exportfunktionen:** (Markdown, PDF, Word).
*   **Performance-Optimierung:** Für große Dokumentenmengen und viele Nutzer.
*   **Ausführliche Tests:** Unit-, Integrations- und E2E-Tests.

---

