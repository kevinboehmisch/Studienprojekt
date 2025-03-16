import axios from "axios";

export async function sendMessageToLLM(userInput: string) {
    try {
        const response = await axios.post("http://127.0.0.1:8000/llm/", 
            { user_input: userInput },
            { headers: { "Content-Type": "application/json" } }
        );

        console.log("Rohdaten von der API:", response.data);  // Debugging

        return response.data.response;  // HIER! Nur die Antwort extrahieren
    } catch (error) {
        console.error("Fehler bei der API-Anfrage:", error);
        return "Fehler: Keine Antwort erhalten";  // Fehlerbehandlung
    }
}
