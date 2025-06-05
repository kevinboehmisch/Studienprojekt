# app/services/embedding_service.py
import os
from typing import List, Optional, Literal
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.embeddings import OllamaEmbeddings # Für Ollama
from dotenv import load_dotenv

load_dotenv()

EMBEDDING_SERVICE_PROVIDER = os.getenv("EMBEDDING_SERVICE_PROVIDER", "google").lower() # "google" or "ollama"
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIMENSION", "768"))

_google_embedding_model = None
_ollama_embedding_model = None

def get_embedding_model(provider: Literal["google", "ollama"] = EMBEDDING_SERVICE_PROVIDER):
    global _google_embedding_model, _ollama_embedding_model
    
    if provider == "google":
        if _google_embedding_model is None:
            api_key = os.getenv("GOOGLE_API_KEY")
            model_name = os.getenv("GOOGLE_EMBEDDING_MODEL_NAME", "models/text-embedding-004")
            if not api_key:
                print(f"WARN_EMBED: GOOGLE_API_KEY nicht gefunden für Provider 'google'. Modell '{model_name}' nicht initialisiert.")
                return None
            print(f"LOG_EMBED: Initialisiere GoogleEmbeddings: {model_name}")
            try:
                _google_embedding_model = GoogleGenerativeAIEmbeddings(
                    model=model_name, google_api_key=api_key, task_type="retrieval_document"
                )
            except Exception as e:
                print(f"ERROR_EMBED: Fehler Init GoogleEmbeddings: {e}"); return None
        return _google_embedding_model
    
    elif provider == "ollama":
        if _ollama_embedding_model is None:
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            model_name = os.getenv("OLLAMA_EMBEDDING_MODEL_NAME", "nomic-embed-text")
            print(f"LOG_EMBED: Initialisiere OllamaEmbeddings: {model_name} @ {base_url}")
            try:
                # Stelle sicher, dass Ollama läuft und das Modell `model_name` verfügbar ist (`ollama pull nomic-embed-text`)
                _ollama_embedding_model = OllamaEmbeddings(model=model_name, base_url=base_url)
            except Exception as e:
                print(f"ERROR_EMBED: Fehler Init OllamaEmbeddings: {e}"); return None
        return _ollama_embedding_model
    else:
        raise ValueError(f"Unbekannter Embedding-Provider: {provider}")

def generate_embeddings(texts: List[str], 
                        provider: Literal["google", "ollama"] = EMBEDDING_SERVICE_PROVIDER,
                        task_type: str = "retrieval_document" # Für Google: "retrieval_query" für Suchanfragen
                        ) -> Optional[List[List[float]]]:
    model = get_embedding_model(provider)
    if not model:
        print(f"WARN_EMBED: Embedding-Modell für Provider '{provider}' nicht verfügbar. Gebe Dummy-Embeddings zurück.")
        return [[0.0] * EMBEDDING_DIM for _ in texts] 
    if not texts: return []

    # Spezifische Anpassung für Google-Modelle und task_type
    if provider == "google" and hasattr(model, 'task_type'):
        # Temporäres Setzen des task_type, falls das Modell es unterstützt und es sich vom Default unterscheidet
        original_task_type = model.task_type
        if task_type != original_task_type:
            model.task_type = task_type 
            print(f"LOG_EMBED: Google task_type temporär auf '{task_type}' gesetzt.")

    print(f"LOG_EMBED: Generiere Embeddings für {len(texts)} Texte mit Provider '{provider}'...")
    try:
        if provider == "google" and task_type == "retrieval_query" and len(texts) == 1:
            # GoogleGenerativeAIEmbeddings hat separate Methode für einzelne Querys
            embeddings = [model.embed_query(texts[0])]
        else:
            embeddings = model.embed_documents(texts)
        
        if embeddings and isinstance(embeddings[0], list) and len(embeddings[0]) == EMBEDDING_DIM:
             print(f"LOG_EMBED: Embeddings generiert. Anzahl: {len(embeddings)}, Dimension: {len(embeddings[0])}")
        else:
            print(f"ERROR_EMBED: Unerwartetes Format/Dimension. Erwartet: {EMBEDDING_DIM}, Erhalten: {len(embeddings[0]) if embeddings and embeddings[0] else 'N/A'}")
            return [[0.0] * EMBEDDING_DIM for _ in texts]
        return embeddings
    except Exception as e:
        print(f"ERROR_EMBED: Fehler bei Embedding-Generierung mit '{provider}': {e}")
        import traceback; traceback.print_exc()
        return [[0.0] * EMBEDDING_DIM for _ in texts]
    finally:
        # Setze task_type zurück, falls geändert
        if provider == "google" and hasattr(model, 'task_type') and task_type != original_task_type:
            model.task_type = original_task_type