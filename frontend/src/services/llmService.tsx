// src/services/llmService.ts (oder dein Service-File)
import axios from "axios";

// Interfaces für die API-Kommunikation mit dem /chat/ Endpunkt
interface SourceDetailFE {
    chunk_id: string;
    filename?: string | null;
    title?: string | null;
    author?: string | null;
    year?: number | null;
    page?: number | null;
    content_preview?: string | null;
    distance?: number | null;
}

export interface ChatResponseFE { // Exportiere, damit ChatInterface es verwenden kann
    session_id: string;
    ai_message: string | null;
    retrieved_sources: SourceDetailFE[];
}

// Dieses Interface MUSS dem ChatRequest Pydantic-Modell im Backend entsprechen
interface ChatRequestPayload {
    message: string;
    session_id?: string | null;
    num_sources?: number;
    use_rag?: boolean;
}

// Dieses Interface ist aus deinem ChatInterface.tsx
// Wir behalten es als Parameter für die Funktion, falls es später für das Prompting genutzt wird
export interface DocumentConfig {
  pageCount: number;
  citationStyle: string;
  documentType: string;
  language: string;
}

let currentChatSessionId: string | null = null;

export async function sendMessageToLLM( // Behalte den Namen, den dein ChatInterface verwendet
    userInput: string,
    docConfig: DocumentConfig, // Nimm die documentConfig entgegen
    useRagFlag: boolean = false, // Steuere RAG explizit, Standard auf false für deinen Test
    numSourcesValue: number = 3
): Promise<string> { // Gibt jetzt nur den ai_message String zurück, wie in deinem ChatInterface erwartet
    const requestStartTime = Date.now();
    console.log(`FRONTEND_TIMING: [${new Date(requestStartTime).toLocaleTimeString()}] Sende Request für: "${userInput.substring(0,30)}..."`);
    const payload: ChatRequestPayload = {
        message: userInput,
        num_sources: numSourcesValue,
        use_rag: useRagFlag
    };

    if (currentChatSessionId) {
        payload.session_id = currentChatSessionId;
    }

    console.log("SENDE AN /chat/ Payload:", JSON.stringify(payload, null, 2));
    // Logge auch die docConfig, um zu sehen, was ankommt
    console.log("DocumentConfig für diesen Aufruf:", docConfig);


    try {
        const response = await axios.post<ChatResponseFE>( // Erwarte ChatResponseFE
          
            "http://127.0.0.1:8000/chat/", // Korrekte URL für deinen Chat-Endpunkt
            payload,
            { headers: { "Content-Type": "application/json" } }
        );
         const requestEndTime = Date.now(); // Zeitstempel Frontend Ende
        const durationMs = requestEndTime - requestStartTime;
        console.log(`FRONTEND_TIMING: [${new Date(requestEndTime).toLocaleTimeString()}] Antwort erhalten. Gesamtdauer Frontend-Sicht: ${durationMs}ms`);
        console.log("Antwort vom /chat/ Endpunkt:", response.data);

        if (response.data && response.data.session_id) {
            currentChatSessionId = response.data.session_id;
            console.log("Aktualisierte session_id:", currentChatSessionId);
        }
        
        // Dein ChatInterface erwartet nur den ai_message String
        // Hier könntest du später entscheiden, wie du die sources im UI anzeigst,
        // aber für jetzt geben wir nur die Nachricht zurück.
        // Wenn du die Quellen im UI verarbeiten willst, musst du ChatResponseFE zurückgeben
        // und ChatInterface.tsx anpassen.
        return response.data.ai_message || "Keine Textantwort vom Assistenten.";

    } catch (error) {
      const requestEndTimeError = Date.now();
        const durationMsError = requestEndTimeError - requestStartTime;
        console.error(`FRONTEND_TIMING: [${new Date(requestEndTimeError).toLocaleTimeString()}] Fehler nach ${durationMsError}ms:`, error);
        console.error("Fehler bei der /chat/ API-Anfrage:", error);
        const errorDetails = (axios.isAxiosError(error) && error.response) ? error.response.data.detail : "Netzwerkfehler oder unbekannter Serverfehler";
        
        // Baue eine detailliertere Fehlermeldung, falls Pydantic-Fehler auftreten
        let errorMessage = "Fehler: Keine Antwort vom Server erhalten oder Serverfehler.";
        if (Array.isArray(errorDetails)) { // Pydantic-Fehler kommen als Array
            errorMessage = errorDetails.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join('; ');
        } else if (typeof errorDetails === 'string') {
            errorMessage = errorDetails;
        }
        
        console.error("Aufbereitete Fehlermeldung:", errorMessage);
        return `Fehler: ${errorMessage}`;
    }

    
}

// --- NEU: Für den simplen Google AI Endpunkt ---
interface SimpleGenerateRequestPayloadFE {
    prompt: string;
    model_name?: string; // z.B. "gemini-1.5-flash-latest"
}

interface SimpleGenerateResponseFE {
    generated_text: string;
}

export async function generateSimpleText(
    prompt: string,
    modelName: string = "gemini-1.5-flash-latest" // Standardmodell
): Promise<string> { // Gibt direkt den generierten Text oder eine Fehlermeldung zurück
    const requestStartTime = Date.now();
    console.log(`FRONTEND_TIMING_SIMPLE_GEN: [${new Date(requestStartTime).toLocaleTimeString()}] Sende Request für simplen Prompt: "${prompt.substring(0, 50)}..."`);

    const payload: SimpleGenerateRequestPayloadFE = {
        prompt: prompt,
        model_name: modelName
    };

    try {
        const response = await axios.post<SimpleGenerateResponseFE>(
            "http://127.0.0.1:8000/ai/generate-simple", // URL zum NEUEN Endpunkt
            payload,
            { headers: { "Content-Type": "application/json" } }
        );
        const requestEndTime = Date.now();
        const durationMs = requestEndTime - requestStartTime;
        console.log(`FRONTEND_TIMING_SIMPLE_GEN: [${new Date(requestEndTime).toLocaleTimeString()}] Antwort erhalten. Dauer: ${durationMs}ms`);
        console.log("Antwort vom /ai/generate-simple Endpunkt:", response.data);

        return response.data.generated_text || "Kein Text von der KI erhalten.";

    } catch (error) {
        const requestEndTimeError = Date.now();
        const durationMsError = requestEndTimeError - requestStartTime;
        console.error(`FRONTEND_TIMING_SIMPLE_GEN: [${new Date(requestEndTimeError).toLocaleTimeString()}] Fehler nach ${durationMsError}ms:`, error);
        
        let errorMessage = "Fehler bei der einfachen KI-Anfrage.";
        if (axios.isAxiosError(error) && error.response) {
            errorMessage = error.response.data.detail || "Serverfehler bei /ai/generate-simple";
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        console.error("Aufbereitete Fehlermeldung (simple KI):", errorMessage);
        return `Fehler: ${errorMessage}`; // Gibt Fehler als String zurück
    }
}