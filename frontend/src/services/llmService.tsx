import axios from "axios";


interface DocumentConfig {
  pageCount: number;
  citationStyle: string;
  documentType: string;
  language: string;
}

export async function sendMessageToLLM(userInput: string, config: DocumentConfig) {
    try {
        const response = await axios.post("http://127.0.0.1:8000/llm/",
            { 
              user_input: userInput,
              document_config: config
            },
            { headers: { "Content-Type": "application/json" } }
        );
        console.log("Rohdaten von der API:", response.data);
        return response.data.response;  // HIER! Nur die Antwort extrahieren
    } catch (error) {
        console.error("Fehler bei der API-Anfrage:", error);
        return "Fehler: Keine Antwort erhalten";
    }
}