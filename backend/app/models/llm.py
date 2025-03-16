from pydantic import BaseModel

class LLMRequest(BaseModel):
    user_input: str  # Erwartet einen Text-Input vom Nutzer

class LLMResponse(BaseModel):
    response: str  # Antwort des LLMs als String
