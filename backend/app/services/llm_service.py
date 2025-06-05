# app/services/llm_service.py
import os
from typing import List, Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
import time

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "google").lower() # "google" oder später "ollama"
# Die Dimension hier ist nicht direkt für den LLM-Call relevant, aber gut zu wissen
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIMENSION", "768"))

_google_chat_model = None
# _ollama_chat_model = None # Für später

def get_llm_chat_model(provider: str = LLM_PROVIDER):
    global _google_chat_model #, _ollama_chat_model
    
    if provider == "google":
        if _google_chat_model is None:
            api_key = os.getenv("GOOGLE_API_KEY")
            # Wähle ein passendes Gemini-Modell für Textgenerierung
            # gemini-pro ist oft ein guter Allrounder. gemini-1.5-pro oder flash für andere Bedürfnisse
            model_name = os.getenv("GOOGLE_CHAT_MODEL_NAME", "gemini-2.0-flash") 
            if not api_key:
                print(f"WARN_LLM: GOOGLE_API_KEY nicht gefunden für Provider 'google'. Chat-Modell '{model_name}' nicht initialisiert.")
                return None
            print(f"LOG_LLM: Initialisiere ChatGoogleGenerativeAI mit Modell: {model_name}")
            try:
                # convert_system_message_to_human=True kann bei manchen Gemini-Versionen helfen,
                # wenn System-Prompts nicht direkt unterstützt werden oder anders behandelt werden.
                _google_chat_model = ChatGoogleGenerativeAI(
                    model=model_name,
                    google_api_key=api_key,
                    temperature=0.7, # Kreativität (0.0 - 1.0)
                    convert_system_message_to_human=True 
                )
                print("LOG_LLM: Google Chat-Modell erfolgreich initialisiert.")
            except Exception as e:
                print(f"ERROR_LLM: Fehler Init Google Chat-Modell: {e}"); return None
        return _google_chat_model
    # elif provider == "ollama":
        # ... (Implementierung für Ollama Chat später)
    else:
        raise ValueError(f"Unbekannter LLM-Provider: {provider}")

async def generate_text_with_llm(
    prompt_template_str: str, 
    context_data: Dict[str, Any], # Daten, die in den Prompt eingesetzt werden
    provider: str = LLM_PROVIDER
) -> Optional[str]:
    """
    Generiert Text basierend auf einem Prompt-Template und Kontextdaten mit dem spezifizierten LLM.
    """
    chat_model = get_llm_chat_model(provider)
    if not chat_model:
        print(f"WARN_LLM: Chat-Modell für Provider '{provider}' nicht verfügbar.")
        return "Fehler: Sprachmodell nicht verfügbar."

    print(f"LOG_LLM: Generiere Text mit Provider '{provider}'. Prompt-Template (Auszug): {prompt_template_str[:100]}...")
    print(f"LOG_LLM_TIMING: [{time.strftime('%H:%M:%S')}] Generiere Text mit Provider '{provider}'.")
    try:
        prompt = ChatPromptTemplate.from_template(prompt_template_str)
        output_parser = StrOutputParser()
        
        # Erstelle die Kette: Prompt -> LLM -> Output Parser
        chain = prompt | chat_model | output_parser
        
        # Führe die Kette mit den Kontextdaten aus
        # Langchain's invoke ist jetzt asynchron für async llms
        generated_text = await chain.ainvoke(context_data)
        
        print(f"LOG_LLM: Text erfolgreich generiert (Auszug): {generated_text[:100]}...")
        invoke_start_time = time.time()
        generated_text = await chain.ainvoke(context_data)
        invoke_duration = time.time() - invoke_start_time
        print(f"LOG_LLM_TIMING: [{time.strftime('%H:%M:%S')}] LLM-Aufruf (chain.ainvoke) beendet. Dauer: {invoke_duration:.2f}s.")
        return generated_text
    except Exception as e:
        print(f"ERROR_LLM: Fehler bei der Textgenerierung mit '{provider}': {e}")
        invoke_duration_error = time.time() - invoke_start_time if 'invoke_start_time' in locals() else -1
        print(f"ERROR_LLM_TIMING: LLM Fehler nach {invoke_duration_error:.2f}s: {e}")
        import traceback; traceback.print_exc()
        return f"Fehler bei der Textgenerierung: {str(e)}"


# --- Funktion für arXiv Suche ---
ARXIV_QUERY_PROMPT_TEMPLATE = """
Basierend auf dem folgenden Kontext und der Nutzeranfrage, formuliere EINE prägnante Suchanfrage für die wissenschaftliche Datenbank arXiv.
Die Suchanfrage sollte die arXiv Such-Syntax verwenden (z.B. 'ti:"Titel Keywords"', 'au:"Autor Name"', 'abs:"Abstract Keywords"', 'cat:cs.AI', boolesche Operatoren AND, OR, ANDNOT).
Konzentriere dich auf die wichtigsten Schlüsselbegriffe und kombiniere sie sinnvoll. Gib NUR die Suchanfrage zurück, ohne zusätzliche Erklärungen.

Vorhandener Kontext/Text:
{context_text}

Spezifische Nutzeranfrage:
{user_prompt}

Formulierte arXiv Suchanfrage:
""".strip()

ARXIV_ABSTRACT_SUMMARY_PROMPT_TEMPLATE = """
Fasse diesen wissenschaftlichen Abstract in 1-2 prägnanten Sätzen für eine schnelle Übersicht zusammen.
Betone das Hauptergebnis, die Hauptmethode oder die Kernfrage des Papers. Gib NUR die Zusammenfassung zurück.

Abstract:
{abstract}

Zusammenfassung (1-2 Sätze):
""".strip()

async def generate_arxiv_search_query(context_text: Optional[str], user_prompt: Optional[str]) -> str:
    context_data = {
        "context_text": context_text or "Kein spezifischer Kontext vorhanden.",
        "user_prompt": user_prompt or "Allgemeine wissenschaftliche Forschung."
    }
    print(f"LOG_LLM_ARXIV: Generiere arXiv Suchanfrage. Kontext: {str(context_data)[:200]}...")
    query = await generate_text_with_llm(ARXIV_QUERY_PROMPT_TEMPLATE, context_data)
    if query and ("Fehler:" in query or not query.strip()): # Einfache Fehlerprüfung
        print(f"WARN_LLM_ARXIV: LLM gab fehlerhafte Suchanfrage zurück: {query}")
        # Fallback-Query, falls LLM fehlschlägt oder Unsinn liefert
        return "all:\"research paper\"" if not user_prompt else f"all:\"{user_prompt.strip()}\""
    
    # Einfache Bereinigung, falls das LLM zusätzliche Formatierung hinzufügt
    cleaned_query = query.replace("Formulierte arXiv Suchanfrage:", "").strip()
    if not cleaned_query: # Fallback, wenn nach Bereinigung leer
        return "all:\"research paper\"" if not user_prompt else f"all:\"{user_prompt.strip()}\""
    return cleaned_query


async def summarize_arxiv_abstract(abstract: str) -> str:
    context_data = {"abstract": abstract}
    # print(f"LOG_LLM_ARXIV: Generiere Zusammenfassung für Abstract (Auszug): {abstract[:100]}...") # Kann sehr lang sein
    summary = await generate_text_with_llm(ARXIV_ABSTRACT_SUMMARY_PROMPT_TEMPLATE, context_data)
    if summary and ("Fehler:" in summary or not summary.strip()):
        print(f"WARN_LLM_ARXIV: LLM gab fehlerhafte Zusammenfassung zurück: {summary}")
        return "Zusammenfassung konnte nicht generiert werden."
    
    # Bereinigung
    cleaned_summary = summary.replace("Zusammenfassung (1-2 Sätze):", "").strip()
    if not cleaned_summary:
        return "Zusammenfassung konnte nicht generiert werden."
    return cleaned_summary