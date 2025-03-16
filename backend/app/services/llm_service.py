import ollama
from app.models.llm import LLMRequest, LLMResponse

def query_llm(request: LLMRequest) -> str:
    response = ollama.chat(
        model="deepseek-r1:14b",
        messages=[{
            "role": "user", 
            "content": request.user_input,}]
    )
    return response["message"]["content"]
