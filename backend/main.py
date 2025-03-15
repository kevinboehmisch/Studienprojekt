from fastapi import FastAPI
from app.api import routes

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hausarbeit Agent API is running"}

# API-Router registrieren
app.include_router(routes.router)