# app/core/config.py
import os
TEMP_DIR = "/tmp/marker_processing_app" 
os.makedirs(TEMP_DIR, exist_ok=True)

EXTRACTED_IMAGES_DIR = os.path.join(os.getcwd(), "extracted_images")
os.makedirs(EXTRACTED_IMAGES_DIR, exist_ok=True)