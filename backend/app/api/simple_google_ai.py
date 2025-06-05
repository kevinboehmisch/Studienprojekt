# app/api/simple_google_ai.py
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Langchain spezifische Imports
from langchain_core.prompts import ChatPromptTemplate # Gut für Chat Modelle
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI # Für Gemini Chat Modelle
# Alternativ, für ältere oder non-chat Text-Completion Modelle:
# from langchain_google_genai import GoogleGenerativeAI

# Lade .env Datei, falls vorhanden
load_dotenv()

router = APIRouter(prefix="/ai", tags=["Simple Langchain Google AI"])

# --- Google AI Konfiguration ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("WARNUNG: GOOGLE_API_KEY nicht gefunden. Der /ai/generate-simple-langchain Endpunkt wird nicht voll funktionsfähig sein.")

# Pydantic Modelle für den Request und die Response (bleiben gleich)
class SimpleGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Der vollständige Prompt für das KI-Modell.")
    # model_name wird hier an das Langchain-Modell übergeben.
    # Beispiele: "gemini-pro", "gemini-1.0-pro", "gemini-1.5-flash-latest"
    model_name: str = Field("gemini-1.5-flash-latest", description="Google AI Modellname (z.B. gemini-pro, gemini-1.5-flash-latest).")
    temperature: float = Field(0.7, ge=0.0, le=1.0, description="Kreativität der Antwort.")


class SimpleGenerateResponse(BaseModel):
    generated_text: str

# Ich benenne den Endpunkt um, um Verwirrung zu vermeiden, da er jetzt Langchain nutzt.
# Du kannst ihn auch gleich lassen, wenn du den alten Code überschreibst.
@router.post("/generate-simple", response_model=SimpleGenerateResponse)
async def generate_text_from_langchain_google_ai(request: SimpleGenerateRequest):
    if not GOOGLE_API_KEY:
        raise HTTPException(
            status_code=503, # Service Unavailable
            detail="Google API Key ist nicht konfiguriert. KI-Funktion nicht verfügbar."
        )

    print(f"LOG_LANGCHAIN_SIMPLE_AI: Empfange Anfrage für Modell '{request.model_name}' mit Prompt: '{request.prompt[:100]}...'")

    try:
        # Initialisiere das Langchain Google Chat Modell
        # Wichtig: `convert_system_message_to_human=True` kann bei einigen Modellen oder
        #            älteren Langchain-Versionen nötig sein, wenn man System-Prompts nutzt
        #            und das Modell diese nicht direkt unterstützt. Für einfache User-Prompts
        #            ist es oft nicht notwendig.
        llm = ChatGoogleGenerativeAI(
            model=request.model_name,
            google_api_key=GOOGLE_API_KEY,
            temperature=request.temperature,
            # convert_system_message_to_human=True # Bei Bedarf einkommentieren
        )

        # Für einfache Prompts können wir ihn direkt übergeben.
        # Für komplexere Interaktionen oder wenn man spezifische Rollen (system, human, ai)
        # nutzen will, ist ein ChatPromptTemplate besser.
        # Hier ein Beispiel für einen direkten Aufruf mit dem User-Prompt:
        # response_content = llm.invoke(request.prompt)
        # generated_text = response_content.content # .content bei AIMessage

        # Oder mit einem einfachen Prompt Template und Parser für robustere Handhabung:
        prompt_template = ChatPromptTemplate.from_messages([
            ("human", "{user_prompt}")
        ])
        output_parser = StrOutputParser()

        chain = prompt_template | llm | output_parser
        
        # Die Eingabe für die Kette muss dem Platzhalter im Template entsprechen
        generated_text = await chain.ainvoke({"user_prompt": request.prompt})

    except Exception as e:
        # Hier spezifischere Langchain- oder Google-API-Fehler abfangen, falls bekannt.
        # z.B. google.api_core.exceptions.PermissionDenied, google.api_core.exceptions.InvalidArgument
        # oder Fehler von Langchain selbst.
        error_message = f"Fehler bei der KI-Textgenerierung mit Langchain: {str(e)}"
        print(f"ERROR_LANGCHAIN_SIMPLE_AI: {error_message}")
        import traceback
        traceback.print_exc() # Gibt mehr Details im Server-Log aus
        raise HTTPException(status_code=500, detail=error_message)

    if not generated_text or not generated_text.strip():
        generated_text = "KI hat keinen Text generiert (Langchain). Bitte Prompt prüfen."
        print(f"WARN_LANGCHAIN_SIMPLE_AI: Leerer Text von KI erhalten für Prompt: '{request.prompt[:100]}...'")

    print(f"LOG_LANGCHAIN_SIMPLE_AI: Generierter Text: '{generated_text[:100]}...'")
    return SimpleGenerateResponse(generated_text=generated_text)

# Wichtig: Diesen Router (oder den geänderten) in deiner FastAPI Hauptanwendung (main.py) registrieren!
# from app.api import simple_google_ai  # oder wie auch immer du die Datei nennst
# app.include_router(simple_google_ai.router)