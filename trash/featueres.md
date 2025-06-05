

frontend: richtexteditor implementieren und es schaffen das KI dort ausgibt


vorlage hochschule esslignen generieren

-- 1. pgvector-Erweiterung aktivieren
CREATE EXTENSION IF NOT EXISTS vector;
-- Erwartete Ausgabe nach erfolgreicher Aktivierung: CREATE EXTENSION

-- 2. Tabelle für die Dokumente erstellen
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
);
-- Erwartete Ausgabe: CREATE TABLE

-- 3. Tabelle für die Text-Chunks erstellen
-- ACHTUNG: Stelle sicher, dass die Dimension (768) hier zu deinem OLLAMA_EMBEDDING_MODEL passt!
-- (768 ist für nomic-embed-text)
CREATE TABLE IF NOT EXISTS chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    page_number INTEGER,
    embedding VECTOR(768),
    metadata jsonb -- JSONB Spalte für flexible Metadaten
);
-- Erwartete Ausgabe: CREATE TABLE

-- 4. Index für schnelle Vektorsuche erstellen
-- Index-Name 'idx_chunks_embedding_ivfflat' kannst du frei wählen
-- lists = 100 ist ein Startwert, kann später optimiert werden
-- IF NOT EXISTS verhindert Fehler, falls du den Befehl mehrmals ausführst
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivfflat ON chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
-- Erwartete Ausgabe: CREATE INDEX

-- 5. Tabelle für Bilder erstellen (optional, aber empfohlen für Multimodalität)
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER,
    image_path VARCHAR(512) NOT NULL, -- Pfad oder URL zum Bild
    image_type VARCHAR(50), -- z.B. 'table', 'figure', 'formula', 'page_image'
    bbox jsonb, -- Bounding Box (optional)
    associated_text TEXT -- OCR Text (optional)
);
-- Erwartete Ausgabe: CREATE TABLE


backend setup:

dependencies installieren:

cd backend
pip install -r requirements.txt

datenbank setup:

docker compose up -d
docker ps 
docker compose down -v #um auch volumes zu löschen (also alle Daten in der Datenbank + Konfiguration)

docker über terminal:

docker exec -it studienprojekt-db-1 psql -U postgres -d paperpilot_db
\q oder exit um zu verlassen


damit backend richtig läuft über venv starten:

Erstelle eine venv im Root verzeichnis: python -m venv .venv
Aktiviere die venv:
Windows: .venv\Scripts\activate
Linux/macOS: source .venv/bin/activate
Navigiere in das backend-Verzeichnis: cd backend
Installiere die Pakete INNERHALB dieser aktiven venv: pip install -r requirements.txt

tesseract auf system installieren, damit ocr funktioniert:
https://github.com/UB-Mannheim/tesseract/wiki
tesseract.exe ausführen