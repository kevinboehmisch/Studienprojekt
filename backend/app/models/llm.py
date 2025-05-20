from pydantic import BaseModel
from typing import Dict, Any, Optional

class LLMRequest(BaseModel):
    user_input: str
    document_config: Optional[Dict[str, Any]] = None 

class LLMResponse(BaseModel):
    response: str