// src/services/documentService.ts
import axios from 'axios';

// Dieses Interface sollte dem Pydantic Schema DocumentDisplay aus app/schemas/document_schemas.py entsprechen
export interface DocumentDisplayFE {
    id: string; // UUID wird im Frontend als string behandelt
    original_filename: string;
    title?: string | null;
    author?: string | null;
    publication_year?: number | null;
    processed_document_id: string;
    // created_at: string; // Falls du Timestamps hinzufügst und im Frontend brauchst
    // chunk_count: number; // Falls du die Anzahl der Chunks anzeigen willst
}

// Dieses Interface sollte dem Pydantic Schema PdfProcessingResult aus app/schemas/processing_schemas.py entsprechen
// (oder zumindest den Teilen, die du im Frontend nach dem Upload brauchst)
export interface PdfProcessingResultFE {
    message: string;
    document_id: string; // UUID des erstellten Dokuments
    original_filename: string;
    processed_document_id: string;
    title?: string | null;
    author?: string | null;
    publication_year?: number | null;
    // ... weitere Felder, die dein Backend-Endpunkt zurückgibt
}


const API_BASE_URL = "http://127.0.0.1:8000/pdf-processor"; // Basis-URL für Dokumenten-Endpunkte

/**
 * Ruft eine Liste aller verarbeiteten Dokumente vom Backend ab.
 */
export async function getDocuments(skip: number = 0, limit: number = 100): Promise<DocumentDisplayFE[]> {
    try {
        const response = await axios.get<DocumentDisplayFE[]>(`${API_BASE_URL}/documents`, {
            params: { skip, limit }
        });
        return response.data;
    } catch (error) {
        console.error("Fehler beim Abrufen der Dokumente:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data.detail || "Fehler beim Laden der Dokumente vom Server.");
        }
        throw new Error("Netzwerkfehler oder unbekannter Fehler beim Laden der Dokumente.");
    }
}

/**
 * Löscht ein spezifisches Dokument anhand seiner ID.
 * @param documentId Die UUID des zu löschenden Dokuments.
 * @returns Das gelöschte Dokument.
 */
export async function deleteDocument(documentId: string): Promise<DocumentDisplayFE> {
    try {
        console.log(`SERVICE: Lösche Dokument mit ID: ${documentId}`);
        const response = await axios.delete<DocumentDisplayFE>(`${API_BASE_URL}/documents/${documentId}`);
        console.log(`SERVICE: Dokument ${documentId} gelöscht, Antwort:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Fehler beim Löschen des Dokuments ${documentId}:`, error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data.detail || `Fehler beim Löschen des Dokuments (ID: ${documentId}) vom Server.`);
        }
        throw new Error(`Netzwerkfehler oder unbekannter Fehler beim Löschen des Dokuments (ID: ${documentId}).`);
    }
}

/**
 * Lädt eine PDF-Datei hoch, verarbeitet sie und speichert sie.
 * @param file Die hochzuladende PDF-Datei.
 * @returns Das Ergebnis der Verarbeitung und Speicherung.
 */
export async function uploadAndStorePdf(file: File): Promise<PdfProcessingResultFE> {
    const formData = new FormData();
    formData.append("uploaded_file", file); // Der Name "uploaded_file" muss mit dem Backend übereinstimmen

    try {
        const response = await axios.post<PdfProcessingResultFE>(`${API_BASE_URL}/extract-and-store`, formData, {
            headers: {
                // 'Content-Type': 'multipart/form-data' wird von Axios automatisch gesetzt, wenn FormData verwendet wird.
            },
        });
        return response.data;
    } catch (error) {
        console.error("Fehler beim Hochladen und Speichern der PDF:", error);
        if (axios.isAxiosError(error) && error.response) {
            const detail = error.response.data.detail;
            // Pydantic-Validierungsfehler können als Array von Objekten kommen
            if (Array.isArray(detail)) {
                const errorMessages = detail.map((err: any) => `${err.loc.join('.')} - ${err.msg}`).join('; ');
                throw new Error(`Validierungsfehler: ${errorMessages}`);
            }
            throw new Error(String(detail) || "Fehler beim Hochladen der PDF vom Server.");
        }
        throw new Error("Netzwerkfehler oder unbekannter Fehler beim Hochladen der PDF.");
    }
}




// --- NEU: Für Online-Suche (arXiv) ---
// Schemas, die vom Backend /online-search/arxiv kommen
export interface ArxivPaperResultFE { // Entspricht ArxivPaperResult aus Backend
    arxiv_id: string;
    title: string;
    authors: string[];
    published_date: string; // z.B. "2023-04-28"
    updated_date: string;
    abstract_summary_llm: string;
    full_abstract: string;
    pdf_url: string;
    arxiv_page_url: string;
    primary_category?: string | null;
}

export interface ArxivSearchResponseFE { // Entspricht ArxivSearchResponse aus Backend
    results: ArxivPaperResultFE[];
    message?: string | null;
}

// Schemas für den Request an /online-search/arxiv
interface ArxivSearchRequestPayloadFE { // Entspricht ArxivSearchRequest aus Backend
    context_text?: string | null;
    user_prompt?: string | null;
    num_results?: number;
}

export async function searchArxivOnline(
    userPrompt: string,
    contextText?: string,
    numResults: number = 3
): Promise<ArxivSearchResponseFE> {
    const payload: ArxivSearchRequestPayloadFE = {
        user_prompt: userPrompt,
        context_text: contextText,
        num_results: numResults,
    };
    try {
        // Passe die URL an, falls du einen Prefix wie /v1 in routes.py hast
        const response = await axios.post<ArxivSearchResponseFE>(
            `http://127.0.0.1:8000/online-search/arxiv`, // Oder ohne /v1
            payload
        );
        return response.data;
    } catch (error) {
        console.error("Fehler bei der Online-Suche (arXiv):", error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data.detail || "Fehler bei der Online-Suche vom Server.");
        }
        throw new Error("Netzwerkfehler oder unbekannter Fehler bei der Online-Suche.");
    }
}


// --- NEU: Für Batch-Import ---
// Schemas, die an das Backend /pdf-processor/batch-import-from-urls gehen
export interface ImportFromUrlPayloadFE { // Entspricht ImportFromUrlRequest aus Backend
    pdf_url: string;
    original_filename: string;
    title?: string | null;
    authors?: string[] | null;
    publication_year?: number | null;
    arxiv_id?: string | null;
}

interface BatchImportFromUrlPayloadFE { // Entspricht BatchImportFromUrlRequest aus Backend
    papers: ImportFromUrlPayloadFE[];
}

// Schemas, die vom Backend /pdf-processor/batch-import-from-urls kommen
export interface BatchImportResultItemFE { // Entspricht BatchImportResultItem aus Backend
    original_filename: string;
    arxiv_id?: string | null;
    status: "success" | "error";
    message: string;
    processed_document_id?: string | null;
}

export interface BatchImportFromUrlResponseFE { // Entspricht BatchImportFromUrlResponse aus Backend
    results: BatchImportResultItemFE[];
}

export async function batchImportPdfsFromUrls(
    papersToImport: ImportFromUrlPayloadFE[]
): Promise<BatchImportFromUrlResponseFE> {
    const payload: BatchImportFromUrlPayloadFE = { papers: papersToImport };
    try {
        const response = await axios.post<BatchImportFromUrlResponseFE>(
            `http://127.0.0.1:8000/pdf-processor/batch-import-from-urls`,
            payload
        );
        return response.data;
    } catch (error) {
        console.error("Fehler beim Batch-Import von URLs:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data.detail || "Fehler beim Batch-Import vom Server.");
        }
        throw new Error("Netzwerkfehler oder unbekannter Fehler beim Batch-Import.");
    }
}


