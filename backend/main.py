from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hier kannst du später eine spezifische Domain setzen
    allow_credentials=True,
    allow_methods=["*"],  # Erlaubt GET, POST, OPTIONS, etc.
    allow_headers=["*"],  # Erlaubt alle Header
)

@app.get("/")
def root():
    return {"message": "Hausarbeit Agent API is running"}

# API-Router registrieren
app.include_router(routes.router)