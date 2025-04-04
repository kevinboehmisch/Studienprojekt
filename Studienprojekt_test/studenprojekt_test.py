# Hausarbeit-Agent Demo als Gradio-App mit Ollama & LLaMA 3.2

import gradio as gr
from langchain.chains import RetrievalQA, LLMChain
from langchain_ollama import OllamaLLM
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.prompts import PromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter

import os

# === Ollama LLM Setup ===
llm = OllamaLLM(model="llama3.2")  # Modell muss lokal mit Ollama installiert sein (z. B. llama3:instruct)

# === PDF vorbereiten ===
pdf_path = "beispielquelle.pdf"
loader = PyPDFLoader(pdf_path)
documents = loader.load()
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(documents)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
vectorstore = FAISS.from_documents(chunks, embeddings)
retriever = vectorstore.as_retriever()

# === Prompts ===
gliederung_prompt = PromptTemplate(
    input_variables=["thema"],
    template="""
    Erstelle eine wissenschaftliche Gliederung (inkl. Einleitung, Hauptpunkte mit Unterpunkten und Fazit)
    für eine Hausarbeit zum Thema: {thema}. Gib die Gliederung in klaren Punkten zurück.
    """
)
gliederung_chain = LLMChain(llm=llm, prompt=gliederung_prompt)

reflexions_prompt = PromptTemplate(
    input_variables=["text"],
    template="""
    Lies folgenden wissenschaftlichen Abschnitt und bewerte ihn kritisch auf Verständlichkeit, Tiefe, Stil und Relevanz:
    "{text}"
    Gib konkrete Verbesserungsvorschläge.
    """
)
reflexion_chain = LLMChain(llm=llm, prompt=reflexions_prompt)

rewrite_prompt = PromptTemplate(
    input_variables=["text", "kritik"],
    template="""
    Überarbeite folgenden wissenschaftlichen Text auf Basis der Kritik:
    Kritik:
    {kritik}
    Ursprünglicher Text:
    {text}
    Gib die verbesserte Version zurück.
    """
)
rewrite_chain = LLMChain(llm=llm, prompt=rewrite_prompt)

rag_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=retriever,
    return_source_documents=True
)

# === Gradio-Funktion ===
def hausarbeit_agent(thema, frage):
    gliederung = gliederung_chain.run(thema)
    initial_result = rag_chain(frage)
    rohtext = initial_result["result"]
    kritik = reflexion_chain.run(rohtext)
    verbessert = rewrite_chain.run({"text": rohtext, "kritik": kritik})
    quellen = "\n\n".join([doc.page_content[:300] + "..." for doc in initial_result['source_documents'][:2]])

    return gliederung, rohtext, kritik, verbessert, quellen

# === UI bauen ===
demo = gr.Interface(
    fn=hausarbeit_agent,
    inputs=[
        gr.Textbox(label="Thema der Hausarbeit"),
        gr.Textbox(label="Konkret zu behandelnde Frage")
    ],
    outputs=[
        gr.Textbox(label="Generierte Gliederung"),
        gr.Textbox(label="Erster Entwurf"),
        gr.Textbox(label="Verbesserungsvorschläge"),
        gr.Textbox(label="Überarbeiteter Text"),
        gr.Textbox(label="Verwendete Quellen")
    ],
    title="Hausarbeit-Agent mit RAG & LLaMA 3.2 (Ollama)",
    description="Dieser KI-Agent erstellt eine Gliederung, recherchiert mit Retrieval, schreibt einen Abschnitt, reflektiert ihn und liefert eine überarbeitete Version – inklusive Quellen."
)

if __name__ == "__main__":
    demo.launch()
