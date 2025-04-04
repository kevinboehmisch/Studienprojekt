import streamlit as st
import ollama
from langchain_community.llms import Ollama
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
# Benötigt pypdf zum Lesen von PDFs
from langchain_community.document_loaders import PyPDFLoader
import tempfile
import os
import re

# --- Konfiguration ---
OLLAMA_BASE_URL = "http://localhost:11434"  # Passe dies ggf. an
LLM_MODEL = "llama3.2"  # Dein Llama 3.2 Modellname in Ollama
EMBEDDING_MODEL = "nomic-embed-text" # Ein Embedding Modell in Ollama oder "llama3" selbst
# EMBEDDING_MODEL = "mxbai-embed-large" # Alternative, oft gut

# --- Hilfsfunktionen ---

@st.cache_resource(show_spinner="Initialisiere LLM und Embeddings...")
def get_models():
    """Lädt LLM und Embedding-Modell."""
    try:
        llm = Ollama(model=LLM_MODEL, base_url=OLLAMA_BASE_URL)
        embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL, base_url=OLLAMA_BASE_URL)
        # Testaufruf, um sicherzustellen, dass die Modelle erreichbar sind
        llm.invoke("Hi")
        embeddings.embed_query("test")
        return llm, embeddings
    except Exception as e:
        st.error(f"Fehler beim Initialisieren der Ollama-Modelle ({OLLAMA_BASE_URL}): {e}")
        st.error(f"Stelle sicher, dass Ollama läuft und die Modelle '{LLM_MODEL}' und '{EMBEDDING_MODEL}' heruntergeladen sind (`ollama run {LLM_MODEL}`, `ollama run {EMBEDDING_MODEL}`).")
        return None, None

@st.cache_resource(show_spinner="Verarbeite PDF und erstelle Vektor-Datenbank...")
def setup_rag(_pdf_file, _embeddings_model):
    """Lädt PDF, splittet Text, erstellt Embeddings und FAISS Vektor-Datenbank."""
    if _pdf_file is None or _embeddings_model is None:
        return None, None

    try:
        # PDF temporär speichern, damit PyPDFLoader darauf zugreifen kann
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            tmp_file.write(_pdf_file.getvalue())
            tmp_file_path = tmp_file.name

        loader = PyPDFLoader(tmp_file_path)
        docs = loader.load()
        os.remove(tmp_file_path) # Temporäre Datei löschen

        if not docs:
             st.warning("Konnte keinen Text aus dem PDF extrahieren.")
             return None, None

        # Text splitten
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            add_start_index=True # Hilfreich für Referenzierung
        )
        splits = text_splitter.split_documents(docs)

        if not splits:
            st.warning("Konnte den PDF-Text nicht in Chunks aufteilen.")
            return None, None

        # Metadaten anreichern (Chunk-ID)
        for i, split in enumerate(splits):
             split.metadata["chunk_id"] = f"Chunk_{i+1}"
             split.metadata["source_doc"] = _pdf_file.name

        # FAISS Vektor-Datenbank erstellen
        vectorstore = FAISS.from_documents(splits, _embeddings_model)
        retriever = vectorstore.as_retriever(search_kwargs={"k": 5}) # Top 5 relevante Chunks

        return retriever, splits # Retriever und ursprüngliche Splits zurückgeben
    except Exception as e:
        st.error(f"Fehler bei der PDF-Verarbeitung oder RAG-Setup: {e}")
        return None, None

def generate_outline(llm, topic, question):
    """Generiert eine Gliederung mit dem LLM."""
    if not llm: return None
    prompt_text = f"""
    Erstelle eine detaillierte, logische Gliederung für eine Hausarbeit zum Thema "{topic}" mit der zentralen Frage "{question}".
    Die Gliederung sollte typische Abschnitte wie Einleitung, Hauptteil (mehrere Unterpunkte) und Schluss enthalten.
    Gib die Gliederung als nummerierte Liste oder Markdown-Liste zurück. Beispiel:
    1. Einleitung
       1.1 Hinführung zum Thema
       1.2 Vorstellung der Forschungsfrage
       1.3 Gang der Untersuchung
    2. Hauptteil A
       2.1 Aspekt 1
       2.2 Aspekt 2
    3. Hauptteil B
       ...
    4. Schlussfolgerung
       4.1 Zusammenfassung der Ergebnisse
       4.2 Beantwortung der Forschungsfrage
       4.3 Ausblick

    Gliederung:
    """
    try:
        response = llm.invoke(prompt_text)
        # Einfache Parsing-Logik (könnte verbessert werden)
        lines = [line.strip() for line in response.strip().split('\n') if line.strip()]
        # Entferne ggf. vorangestelltes "Gliederung:" etc.
        if lines and lines[0].lower().startswith("gliederung:"):
            lines = lines[1:]
        return lines
    except Exception as e:
        st.error(f"Fehler bei der Gliederungsgenerierung: {e}")
        return None

def generate_section(llm, retriever, section_title, topic, question, pdf_name):
    """Generiert einen Abschnitt mittels RAG."""
    if not llm or not retriever: return None, None

    # 1. Retrieval
    try:
        retrieved_docs = retriever.invoke(f"{section_title} im Kontext von {topic} und {question}")
    except Exception as e:
        st.error(f"Fehler beim Abrufen von Dokumenten für Abschnitt '{section_title}': {e}")
        return f"Fehler beim Abrufen von Dokumenten für '{section_title}'.", []

    if not retrieved_docs:
        st.warning(f"Keine relevanten Informationen im PDF für '{section_title}' gefunden.")
        # Optional: LLM bitten, dies zu vermerken oder ohne Kontext zu schreiben (weniger ideal)
        # return f"Hinweis: Keine spezifischen Informationen für '{section_title}' im bereitgestellten PDF gefunden.", []
        # Versuch, ohne Kontext zu schreiben (auf eigenes Risiko)
        context_str = "Kein spezifischer Kontext aus dem PDF gefunden."
        retrieved_metadata = []
    else:
        # Kontext für LLM vorbereiten und Metadaten sammeln
        context_items = []
        retrieved_metadata = []
        for i, doc in enumerate(retrieved_docs):
            source_id = doc.metadata.get('chunk_id', f'Quelle_{i+1}')
            page = doc.metadata.get('page', 'Unbekannt')
            content_preview = doc.page_content[:200] + "..." # Kurzer Preview
            context_items.append(f"[{source_id} / Seite {page}]: {doc.page_content}")
            retrieved_metadata.append({
                "id": source_id,
                "page": page,
                "content_preview": content_preview,
                "full_content": doc.page_content # Voller Inhalt für Referenz
            })
        context_str = "\n\n".join(context_items)

    # 2. Generation Prompt Template
    system_prompt = f"""
    Du bist ein wissenschaftlicher Assistent. Deine Aufgabe ist es, einen Abschnitt für eine Hausarbeit zu schreiben.
    Thema der Hausarbeit: "{topic}"
    Zentrale Frage: "{question}"
    Aktueller Abschnitt: "{section_title}"
    Quelle: Das hochgeladene PDF namens "{pdf_name}"

    Anweisungen:
    - Schreibe den Abschnitt '{section_title}' klar, präzise und in einem akademischen Stil.
    - Verwende **ausschließlich** die Informationen aus dem untenstehenden 'Kontext aus PDF'. Mache keine Annahmen oder füge externes Wissen hinzu.
    - Wenn der Kontext Informationen liefert, integriere sie sinnvoll in den Text.
    - Wenn der Kontext für einen Aspekt des Abschnitts keine Informationen liefert, erwähne dies kurz oder lasse den Aspekt weg, anstatt zu spekulieren.
    - Beziehe dich indirekt auf die Quelle, z.B. "Laut der Quelle...", "Das Dokument beschreibt...".
    - Füge am Ende des generierten Textes für diesen Abschnitt eine Liste der verwendeten Quell-IDs in eckigen Klammern hinzu, basierend auf den IDs im Kontext (z.B. [Chunk_1, Chunk_5]). Identifiziere die IDs, die *tatsächlich* relevante Informationen für den geschriebenen Text enthielten.

    Kontext aus PDF:
    ---
    {context_str}
    ---

    Generierter Text für Abschnitt '{section_title}':
    """
    prompt = ChatPromptTemplate.from_messages([("system", system_prompt)])
    chain = prompt | llm

    # 3. LLM Call
    try:
        response = chain.invoke({}) # Kein 'input' im Prompt Template, da alles im System-Prompt ist
        # Extrahiere verwendeten Quellen (sehr einfache Methode, LLM muss Format einhalten)
        used_sources_match = re.search(r"\[([\w\s,_-]+)\]$", response.strip())
        used_source_ids = []
        section_text = response.strip()
        if used_sources_match:
            used_source_ids = [s.strip() for s in used_sources_match.group(1).split(',')]
            # Entferne die Quellenangabe am Ende aus dem Haupttext
            section_text = section_text[:used_sources_match.start()].strip()

        # Finde die Metadaten der *tatsächlich* verwendeten Quellen
        final_sources_metadata = [m for m in retrieved_metadata if m["id"] in used_source_ids]
        # Wenn LLM keine IDs genannt hat, nimm alle abgerufenen als potenziell verwendet
        if not final_sources_metadata and retrieved_metadata:
             # final_sources_metadata = retrieved_metadata # Nimm alle als verwendet an
             st.warning(f"LLM hat keine verwendeten Quellen für '{section_title}' genannt. Liste alle abgerufenen auf.")
             final_sources_metadata = retrieved_metadata # Zeige alle an, die abgerufen wurden
             # Füge einen Hinweis hinzu, dass diese nur abgerufen, nicht zwingend verwendet wurden.


        return section_text, final_sources_metadata

    except Exception as e:
        st.error(f"Fehler beim Generieren von Abschnitt '{section_title}': {e}")
        return f"Fehler beim Generieren von Abschnitt '{section_title}'.", []


# --- Streamlit App ---

st.set_page_config(layout="wide", page_title="KI Hausarbeit Agent")
st.title("🤖 KI Hausarbeit Agent (Prototyp)")
st.markdown(f"Verwendet Ollama mit `{LLM_MODEL}` und `{EMBEDDING_MODEL}`.")

# Initialisiere Modelle
llm, embeddings_model = get_models()

# Session State für Daten über Reloads hinweg
if 'outline' not in st.session_state:
    st.session_state.outline = None
if 'generated_sections' not in st.session_state:
    st.session_state.generated_sections = {}
if 'all_sources' not in st.session_state:
    st.session_state.all_sources = {}
if 'retriever' not in st.session_state:
    st.session_state.retriever = None
if 'uploaded_pdf_name' not in st.session_state:
     st.session_state.uploaded_pdf_name = None
if 'full_text' not in st.session_state:
    st.session_state.full_text = ""


# --- UI Layout ---
left_column, right_column = st.columns(2)

with left_column:
    st.header("1. Eingabe")
    topic = st.text_input("Thema der Hausarbeit:", placeholder="z.B. Die Auswirkungen des Klimawandels auf die Biodiversität")
    question = st.text_input("Konkrete Frage / Forschungsfrage:", placeholder="z.B. Welche spezifischen Mechanismen verbinden steigende Temperaturen mit dem Artensterben in alpinen Regionen?")
    uploaded_file = st.file_uploader("Lade deine PDF-Quelle hoch:", type=['pdf'])

    # Knopf zum Verarbeiten des PDFs (nur wenn Datei hochgeladen wurde)
    if uploaded_file is not None and llm and embeddings_model:
        if st.button("PDF verarbeiten & RAG vorbereiten"):
            # Nur neu verarbeiten, wenn sich die Datei geändert hat
            if st.session_state.uploaded_pdf_name != uploaded_file.name:
                st.session_state.retriever, _ = setup_rag(uploaded_file, embeddings_model)
                if st.session_state.retriever:
                    st.session_state.uploaded_pdf_name = uploaded_file.name
                    st.success(f"PDF '{uploaded_file.name}' erfolgreich verarbeitet und RAG ist bereit.")
                    # Alte Ergebnisse zurücksetzen
                    st.session_state.outline = None
                    st.session_state.generated_sections = {}
                    st.session_state.all_sources = {}
                    st.session_state.full_text = ""
                else:
                    st.error("PDF konnte nicht verarbeitet werden.")
            else:
                 st.info("PDF wurde bereits verarbeitet.")


    # Knopf zum Generieren (nur wenn RAG bereit und Thema/Frage vorhanden)
    if st.session_state.retriever and topic and question and llm:
        if st.button("Hausarbeit generieren (Gliederung & Abschnitte)"):
            st.session_state.generated_sections = {}
            st.session_state.all_sources = {}
            st.session_state.full_text = ""

            # 1. Gliederung generieren
            with st.spinner("Generiere Gliederung..."):
                st.session_state.outline = generate_outline(llm, topic, question)

            if st.session_state.outline:
                st.success("Gliederung erstellt.")
                st.subheader("Generierte Gliederung:")
                st.markdown("\n".join([f"- {item}" for item in st.session_state.outline]))

                # 2. Abschnitte generieren
                full_text_parts = []
                st.subheader("Generiere Abschnitte...")
                progress_bar = st.progress(0)
                status_text = st.empty()

                for i, section_title in enumerate(st.session_state.outline):
                     # Einfache Erkennung von Hauptpunkten vs Unterpunkten (optional)
                     # Man könnte hier komplexere Logik einbauen, um nur für bestimmte Ebenen zu generieren
                     clean_title = re.sub(r"^\d+(\.\d+)*\s*", "", section_title).strip() # Nummerierung entfernen

                     status_text.text(f"Generiere Abschnitt: {clean_title}...")
                     with st.spinner(f"Generiere Abschnitt: {clean_title}..."):
                         section_text, sources = generate_section(
                             llm,
                             st.session_state.retriever,
                             clean_title, # Nur den Titel ohne Nummerierung übergeben
                             topic,
                             question,
                             st.session_state.uploaded_pdf_name
                         )

                     if section_text:
                         st.session_state.generated_sections[section_title] = section_text
                         st.session_state.all_sources[section_title] = sources
                         # Füge Abschnittsüberschrift und Text zusammen
                         full_text_parts.append(f"## {section_title}\n\n{section_text}\n\n")
                     else:
                         st.session_state.generated_sections[section_title] = f"*Konnte Abschnitt '{clean_title}' nicht generieren.*"
                         st.session_state.all_sources[section_title] = []
                         full_text_parts.append(f"## {section_title}\n\n*Konnte Abschnitt '{clean_title}' nicht generieren.*\n\n")

                     progress_bar.progress((i + 1) / len(st.session_state.outline))

                status_text.text("Alle Abschnitte generiert!")
                st.success("Hausarbeit generiert!")
                # Füge einen Titel hinzu
                st.session_state.full_text = f"# {topic}\n\n**Forschungsfrage:** {question}\n\n" + "".join(full_text_parts)


            else:
                st.error("Gliederung konnte nicht erstellt werden.")
    elif not st.session_state.retriever and uploaded_file:
         st.warning("Bitte zuerst das PDF verarbeiten.")


with right_column:
    st.header("2. Generierte Hausarbeit (Entwurf)")

    if st.session_state.full_text:
        # Verwende st.text_area für Bearbeitbarkeit
        edited_text = st.text_area(
            "Bearbeitbarer Entwurf:",
            value=st.session_state.full_text,
            height=600,
            key="hausarbeit_output" # Key ist wichtig, damit der State erhalten bleibt
        )
        # Optional: Knopf zum Speichern der Änderungen im Session State
        if edited_text != st.session_state.full_text:
             if st.button("Änderungen im State speichern"):
                  st.session_state.full_text = edited_text
                  st.rerun() # Neu laden, um die gespeicherte Version anzuzeigen


        # Quellen anzeigen
        st.header("3. Verwendete Quellen (pro Abschnitt)")
        if st.session_state.all_sources:
            for section_title, sources in st.session_state.all_sources.items():
                 with st.expander(f"Quellen für: {section_title} ({len(sources)} Chunks)"):
                     if sources:
                         for src in sources:
                             st.markdown(f"**ID:** {src['id']} (Seite {src['page']})")
                             st.caption(f"Vorschau: *{src['content_preview']}*")
                             # Optional: vollen Text anzeigen
                             # with st.popover("Vollen Chunk anzeigen"):
                             #    st.text(src['full_content'])
                     else:
                         st.write("Keine spezifischen Quellen für diesen Abschnitt gefunden/genannt.")
        else:
             st.info("Noch keine Abschnitte generiert oder keine Quellen gefunden.")

    else:
        st.info("Hier erscheint der Entwurf der Hausarbeit nach der Generierung.")


# --- Anforderungen & Ausführung ---
st.sidebar.title("Anleitung & Info")
st.sidebar.markdown("""
1.  **Ollama starten:** Stelle sicher, dass dein Ollama-Server läuft und die Modelle `llama3` (oder dein spezifisches Llama-Modell) und `nomic-embed-text` (oder dein gewähltes Embedding-Modell) verfügbar sind.
    ```bash
    ollama run llama3
    ollama run nomic-embed-text
    ```
2.  **Python-Pakete installieren:**
    ```bash
    pip install streamlit ollama langchain langchain-community langchain-core faiss-cpu pypdf langchain-text-splitters
    ```
3.  **App starten:**
    ```bash
    streamlit run your_script_name.py
    ```
4.  **Benutzung:** Gib Thema und Frage ein, lade **genau eine PDF-Datei** hoch, klicke auf "PDF verarbeiten..." und dann auf "Hausarbeit generieren...".
""")
st.sidebar.warning("""
**Wichtiger Hinweis:**
Dies ist ein **Prototyp**. Die Qualität der generierten Texte hängt stark von der Qualität des LLMs (Llama 3.2), der Prompts und der Informationsdichte im PDF ab.
- **Keine Garantie für Korrektheit oder Vollständigkeit.** Immer kritisch prüfen!
- **Plagiatsgefahr:** Der Text basiert direkt auf der Quelle. Eine menschliche Überarbeitung und korrekte Zitation sind **zwingend** erforderlich.
- **Reflexion/Verbesserung:** Die automatische Selbstverbesserung ist hier nur rudimentär implementiert (via Prompt). Echte Reflexion wäre deutlich komplexer.
- **Formatierung:** Die Ausgabe ist Markdown-basiert. Wissenschaftliche Formatierung (Zitation, Fußnoten etc.) muss manuell ergänzt werden.
""")