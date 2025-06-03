# app/services/llm_service.py
import os
from typing import List, Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

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
    
    try:
        prompt = ChatPromptTemplate.from_template(prompt_template_str)
        output_parser = StrOutputParser()
        
        # Erstelle die Kette: Prompt -> LLM -> Output Parser
        chain = prompt | chat_model | output_parser
        
        # Führe die Kette mit den Kontextdaten aus
        # Langchain's invoke ist jetzt asynchron für async llms
        generated_text = await chain.ainvoke(context_data)
        
        print(f"LOG_LLM: Text erfolgreich generiert (Auszug): {generated_text[:100]}...")
        return generated_text
    except Exception as e:
        print(f"ERROR_LLM: Fehler bei der Textgenerierung mit '{provider}': {e}")
        import traceback; traceback.print_exc()
        return f"Fehler bei der Textgenerierung: {str(e)}"