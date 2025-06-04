# Paperpilot defintion der Anwendung:
- Schreibassistenz für wissenschaftliche Dokumentationen.
- Es handelt sich um einen Texteditor und um keinen Chatbot primär geht es darum selbst text zu schreiben
  die KI unterstützt einen nur dabei
- KI gestützt und mit eigenen Quellen gefüttert -> KI hat erweitertes wissen
- Man soll schreiben können und KI findet automatisch die geeignete Quelle und zitiert korrekt
- Man soll textstellen markieren können und die KI findet geeigntet Quelle und zitiert korrekt
- Man soll schreiben können und die KI generiert Inline neuen Text
- Man soll Quellen in einem extra Menü selbst hinzufügen können, damit die KI das zusätzliche wissen bekommt
- In einem extra Chatfenster kann man auch so mit der KI schreiben und optional den generierten text in den
  Texteditor laden
- Es soll beim "Onboarding" die Möglichkeit geben sein thema zu nennen und basierend darauf eine Gliederung zu erstellen
- Es soll beim Onboarding die Möglichkeit geben mit der Gliederung und den hinzugefügten Quellen und eingestellten 
  Parametern (zB Zeichenanzahl, Seitenanzahl, Zitierstiel (IEE,APA, etc) die komplette Hausarbeit generiert werden)

## aktuell implementierte features:

### Backend:
- man kann pdfs als context reinladen über marker, extrahiert funktionen, tables, und bilder
  LLM kann auf diese Informationen dauerhaft zugreifen (Backend API Schnittstelle)
- generation mithilfe von RAG aus der Datenbank, der generierte Text basiert auf den reingeladenden PDFs
  es wird die ID des TextChunks mitgegeben, mit dem man dann später die Quelle zitieren kann (Backend API Schnittstelle)
- markieren von text und dann eine auswahl an passenden quellen erhalten zum auswählen (Backend API Schnittstelle)

### Frontend:

1. Zitationsfunktion: man kann zitieren jetzt anhand der quellen
2. Textüberarbeitung: text kann überarbeitet werden
3. Chat: chat angebunden an backend

## Features die noch implementiert werden müssen:

### Frontend:

**1. Zitationsfunktion:**
- Design des aufploppenden modals anpassen, chunk_content als Markdown rendern (für bessere Lesbarkeit von Formatierungen/Formeln im Preview). am besten in markdown anzeigen
- Autorenanzeige im Modal: Bei mehreren Autoren nur den ersten anzeigen, gefolgt von "et al." (Standardformatierung für Vorschau).
- verlinken mit der ursprünglichen quelle, dieser tag sollte so sein, dass wenn man darauf drückt zur eigentlichen quelle (PDF) weitergeleitet wird, aktuell wird nur alert ausgelöst!
- (nicht wichtig erstmal) Zurzeit nur über Format, es wird Dringend empfohlen das über Chunk ID zu machen! damit nicht nur (Author, Jahr, Seite) erkannt wird sondern zb auch IEEE style [1]

**2. Textüberarbeitung:** 
- Zurzeit an billigen Google Endpoint simple_google_ai.py (api datei in backend) angebunden, hier prompt engineering "prompt erweitern", dass quellen behalten werden also layout und er gepromptet ist auf
 wissenschaftlicher schreibstil, 
- es sollte im frontend vllt über ein fenster noch text eingegeben werden können dass man zb text markiert
  dann entweder direkt auf generieren drücken kann oder ein dropdown fenster hat um zusätzlichen 
  prompt reinzuschreiben, "schreibe dass weniger wie chatgpt" und er das auch mit ins backend gesendet bekommt

**3. Chat:**
- zurzeit antwortet der Chat etwas komisch, da er auf zitieren anhand der quellen gepromptet ist, prompt in der zuständigen backend datei anpassen, sodass er auch normal schreiben kann
-> Im frontend muss das geändert werden, möglicherweise prompt im backend ändern, dass dieser sich nicht unbedingt auf quellen bezieht, wenn man eine frage hat die sich nicht auf das Thema bezieht (zB wie ist das wetter heute)

**4. Generation:**
- generieren anhand des bereits existierenden textes und der quellen in der Vectordatenbank
- endpoint http://127.0.0.1:8000/generation/generate-from-query existiert bereits im backend unter api/generation.py frontend muss angebunden werden
- text soll nicht den bereits vorhandenen text ersetzen, sondern dahinter eingefügt werden, sehr wichtig ist, dass Quellen korrekt zitiert werden
- es soll entweder der komplette text mitgegeben werden als context aus dem pdf file, oder nur der markierte text
- es soll auch hier wieder die möglichkeit eines promptfensters geben, falls man möchte kann man noch sagen zB "generiere mir jetzt einen neuen abschnitt mit dem Thema HCS12 Assembler" 

**5. Quellen: Auswählen und laden der quellen**
- im backend existiert bereits der endpunkt: http://127.0.0.1:8000/pdf-processor/extract-and-store das frontend muss noch eingebunden werden
- am besten eine art side menü wo die quellen aufgelistet werden mit einem + button um quellen hochzuladen
- quellen müssen dann in reihe hintereinander verarbeitet werden endpunkt ist apu/pdf_processing im backend

**6. Wissenschafltiche Arbeiten erstellen:**
- es soll die möglichkeit geben unterschiedliche wissenschaftliche Arbeiten zu erstellen, diesen soll eine id zugeordnet werden können

### Backend:

**llm:**
- schauen ob man auch ollama llm zum laufen bekommt wichtig für prasentation!

**retrieval:**
- prompt engineering in datei generation_service, sodass nicht mehr gleiche quellen ganze zeit liefert
- oder im frontend anpassen, dass es rausgeschnitten wird der id tag

**strukturierungsfeature:**
- es soll markdown generiert werden
- es soll auch direkt die gliederung und struktur und bereits existierenden kontext miteinbeziehen
  damit es dann zb überschriften, unterpunkte etc auch generieren kann

**Dokumente in Datenbank:**
- die einzelnen wissenschaftlichen Arbeiten werden noch nicht als einzelne in der Datenbank abgebildet, das sollte am besten auch existieren dass man auch dokumentid und chatsessionid  zuordnen kann

---

## zukünftige features (kann man gerade eher vernachlässigen):

### backend:

extratktion:
- direkte arxiv api am besten auch einbauen und pfds  downlaoden (searxng, crawl4ai docker, marker library)
- mit searxng und crawl4ai websearch (searxng, crawl4ai docker)
- endnutzer soll am ende auch selber autor, titel, datum selbst anpassen (frontend verknüpfung zu backend und db mit patch/update)
- mit unstructured schnellere extraktion sollte möglich sein (unstructured library)
- extracted images text anpassen (llm generation in marker einfügen das schaubilder beschreibt, 
  pfade korrekt setzten dass db diese findet, pfade des bildes bis in genration mitgeben, dass LLM auch das Bild in den Kontext bekommt)
- später auch websites und statistiken und sowas möglich sein

### frontend:

- generieren von schaubildern, diagrammen, tabellen, bildern

- Optionen im Frontend: Mit zitierstil (APA etc.) Profileinstellungen etc, nicht funktionstüchtig einfach nur damit Grundgerüst existiert

