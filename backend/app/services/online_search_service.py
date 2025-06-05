# app/services/online_search_service.py
import httpx
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
import asyncio # Für parallele Zusammenfassungen

from app.schemas.online_search_schemas import ArxivSearchRequest, ArxivPaperResult
# Importiere die neuen, spezifischen LLM-Funktionen
from app.services.llm_service import generate_arxiv_search_query, summarize_arxiv_abstract

ARXIV_API_URL = "http://export.arxiv.org/api/query"

def parse_arxiv_entry(entry: ET.Element, ns: Dict[str, str]) -> Optional[Dict[str, Any]]:
    try:
        arxiv_id_full = entry.findtext('atom:id', '', namespaces=ns)
        if not arxiv_id_full: return None
        arxiv_id_parts = arxiv_id_full.split('/abs/')
        if len(arxiv_id_parts) < 2: return None
        arxiv_id = arxiv_id_parts[1].split('v')[0]

        title = entry.findtext('atom:title', 'N/A', namespaces=ns).strip().replace('\n', ' ').replace('  ', ' ')
        authors_elements = entry.findall('atom:author', namespaces=ns)
        authors = [auth_el.findtext('atom:name', '', namespaces=ns) for auth_el in authors_elements if auth_el.findtext('atom:name', '', namespaces=ns)]
        published_date = entry.findtext('atom:published', 'N/A', namespaces=ns)
        updated_date = entry.findtext('atom:updated', 'N/A', namespaces=ns)
        full_abstract = entry.findtext('atom:summary', 'N/A', namespaces=ns).strip().replace('\n', ' ').replace('  ', ' ')
        pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
        arxiv_page_url = f"https://arxiv.org/abs/{arxiv_id}"
        primary_category_el = entry.find('arxiv:primary_category', namespaces=ns)
        primary_category = primary_category_el.get('term') if primary_category_el is not None else None

        return {
            "arxiv_id": arxiv_id, "title": title, "authors": authors,
            "published_date": published_date.split("T")[0],
            "updated_date": updated_date.split("T")[0],
            "full_abstract": full_abstract, "pdf_url": pdf_url,
            "arxiv_page_url": arxiv_page_url, "primary_category": primary_category,
        }
    except Exception as e:
        print(f"Error parsing arXiv entry: {e}")
        return None


async def search_arxiv_service(request_data: ArxivSearchRequest) -> List[ArxivPaperResult]:
    results_with_summaries: List[ArxivPaperResult] = []
    
    arxiv_query = await generate_arxiv_search_query(request_data.context_text, request_data.user_prompt)
    print(f"LOG_ARXIV_SERVICE: Generierte arXiv-Suchanfrage: {arxiv_query}")

    params = {
        "search_query": arxiv_query, "start": 0, "max_results": request_data.num_results,
        "sortBy": "relevance", "sortOrder": "descending"
    }

    async with httpx.AsyncClient(timeout=30.0) as client: # Erhöhter Timeout
        try:
            response = await client.get(ARXIV_API_URL, params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            print(f"ERROR_ARXIV_SERVICE: HTTP Fehler bei arXiv API: {e.response.status_code} - {e.response.text}")
            return []
        except httpx.RequestError as e:
            print(f"ERROR_ARXIV_SERVICE: Netzwerkfehler bei arXiv API: {e}")
            return []

    ns = {'atom': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}
    parsed_papers_temp: List[Dict[str, Any]] = []
    try:
        root = ET.fromstring(response.content)
        for entry in root.findall('atom:entry', ns):
            parsed_entry = parse_arxiv_entry(entry, ns)
            if parsed_entry:
                parsed_papers_temp.append(parsed_entry)
    except ET.ParseError as e:
        print(f"ERROR_ARXIV_SERVICE: Fehler beim Parsen der arXiv XML: {e}")
        return []

    if not parsed_papers_temp:
        print(f"LOG_ARXIV_SERVICE: Keine Paper von arXiv für Query '{arxiv_query}' gefunden.")
        return []

    # Parallele LLM-Zusammenfassungen der Abstracts
    summary_tasks = []
    for paper_data in parsed_papers_temp:
        summary_tasks.append(summarize_arxiv_abstract(paper_data["full_abstract"]))
    
    print(f"LOG_ARXIV_SERVICE: Starte {len(summary_tasks)} LLM-Zusammenfassungen parallel...")
    llm_summaries = await asyncio.gather(*summary_tasks, return_exceptions=True) # return_exceptions ist wichtig!
    print(f"LOG_ARXIV_SERVICE: LLM-Zusammenfassungen abgeschlossen.")

    for i, paper_data in enumerate(parsed_papers_temp):
        summary_result = llm_summaries[i]
        if isinstance(summary_result, Exception):
            print(f"ERROR_ARXIV_SERVICE: Fehler bei LLM-Zusammenfassung für {paper_data.get('arxiv_id', 'Unbekannt')}: {summary_result}")
            abstract_summary_llm = "Zusammenfassung konnte nicht generiert werden (Fehler)."
        elif not summary_result or "Fehler:" in summary_result: # Prüfe auch auf "Fehler:" von unserem LLM Service
             abstract_summary_llm = "Zusammenfassung konnte nicht generiert werden oder LLM gab Fehler zurück."
        else:
            abstract_summary_llm = summary_result
        
        results_with_summaries.append(ArxivPaperResult(
            **paper_data,
            abstract_summary_llm=abstract_summary_llm
        ))
            
    return results_with_summaries