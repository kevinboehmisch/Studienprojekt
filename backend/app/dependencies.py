# app/dependencies.py
from functools import lru_cache
from marker.models import create_model_dict
from marker.config.parser import ConfigParser
from typing import Dict, Any

# Diese Funktion ist ZWINGEND NOTWENDIG für die Performance mit Marker. @lru_cache sorgt dafür, dass create_model_dict() nur einmal ausgeführt wird.
@lru_cache(maxsize=1)
def get_marker_resources() -> Dict[str, Any]:
    """Lädt Marker-Modelle (nur einmal dank Cache)."""
    print("LOG: Initialisiere Marker Modelle & Config (sollte nur einmal passieren)...")
    artifact_dict = create_model_dict()
    # Konfiguration für Marker hier anpassen
    config_data = {"format_lines": True, "parallel_factor": 1}
    config_parser = ConfigParser(config_data)
    return {
        "artifact_dict": artifact_dict,
        "config": config_parser.generate_config_dict()
    }