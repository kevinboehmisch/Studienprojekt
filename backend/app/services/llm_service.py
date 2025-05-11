import ollama
from app.models.llm import LLMRequest, LLMResponse

def query_llm(request: LLMRequest) -> str:
    response = ollama.chat(
        model="llama3.2",
        messages=[{
            "role": "user", 
            "content": request.user_input,}]
    )
    return response["message"]["content"]
