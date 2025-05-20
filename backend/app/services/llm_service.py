import ollama
from app.models.llm import LLMRequest, LLMResponse

def create_system_prompt(config):
    """Erstellt einen System-Prompt basierend auf der Dokumentkonfiguration"""
    if not config:
        return "Du bist ein hilfreicher wissenschaftlicher Assistent."
    
    return f"""
    Du bist ein professioneller wissenschaftlicher Schreibassistent für {config.get('documentType', 'akademische')}-Arbeiten.
    
    Verbindliche Richtlinien für deine Antworten:
    1. Formatiere alle Quellenangaben strikt nach {config.get('citationStyle', 'APA')}-Standard.
    2. Schreibe in {config.get('language', 'Deutsch')} auf akademischem Niveau.
    3. Berücksichtige einen Gesamtumfang von ca. {config.get('pageCount', 10)} Seiten.
    4. Liefere gut strukturierte, wissenschaftlich fundierte Inhalte.
    5. Strukturiere deine Antworten klar und übersichtlich mit Markdown-Formatierung.
    """

def query_llm(request: LLMRequest) -> str:
    # System-Prompt basierend auf der Config erstellen
    system_message = {
        "role": "system",
        "content": create_system_prompt(request.document_config)
    }
    
    # Benutzeranfrage
    user_message = {
        "role": "user",
        "content": request.user_input
    }
    
    # Ollama-Anfrage mit System- und Benutzer-Message
    response = ollama.chat(
        model="llama3.2",
        messages=[system_message, user_message]
    )
    
    return response["message"]["content"]