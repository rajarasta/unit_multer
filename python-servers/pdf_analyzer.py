#!/usr/bin/env python3
"""
FastAPI PDF Analyzer Server for Aluminum Store UI
Converts PDFs to images and analyzes them with vision LLM models
Supports both text extraction and vision-based analysis
"""

import os
import io
import base64
import json
from typing import List, Optional
from pathlib import Path

import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pdf2image import convert_from_bytes
from PIL import Image
import requests

# Initialize FastAPI app
app = FastAPI(
    title="PDF Analyzer Server",
    description="PDF to Image conversion and LLM analysis server",
    version="1.0.0"
)

# Configure CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def image_to_data_url(image: Image.Image, format="JPEG", quality=80) -> str:
    """Convert PIL Image to base64 data URL"""
    buffer = io.BytesIO()
    
    # Convert to RGB if necessary (for JPEG compatibility)
    if format.upper() == "JPEG" and image.mode in ("RGBA", "P"):
        image = image.convert("RGB")
    
    image.save(buffer, format=format, quality=quality)
    img_bytes = buffer.getvalue()
    b64_string = base64.b64encode(img_bytes).decode()
    
    return f"data:image/{format.lower()};base64,{b64_string}"

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Simple PDF text extraction (fallback method)"""
    try:
        import PyPDF2
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        return f"Text extraction failed: {str(e)}"

@app.post("/analyze-file")
async def analyze_file(
    file: UploadFile = File(...),
    llm_base_url: str = Form(...),  # e.g., http://127.0.0.1:8001 (vision server)
    model: str = Form("llava-v1.5-7b"),
    analysis_prompt: str = Form("Analiziraj račun/ponudu sa slika i vrati strukturirani JSON sa svim važnim informacijama."),
    max_pages: int = Form(3),
    image_quality: int = Form(80),
    dpi: int = Form(144),
    mode: str = Form("auto"),  # "auto", "text", "vision"
):
    """
    Analyze uploaded file (PDF or image) using LLM
    
    Args:
        file: PDF or image file
        llm_base_url: Base URL of LLM server (e.g., http://127.0.0.1:8001)
        model: Model name to use
        analysis_prompt: Custom analysis prompt
        max_pages: Maximum pages to process for PDFs
        image_quality: JPEG quality for image conversion
        dpi: DPI for PDF rasterization
        mode: Processing mode - "auto", "text", or "vision"
    """
    
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        file_bytes = await file.read()
        file_type = file.content_type or ""
        
        # Determine processing approach
        if mode == "auto":
            if file_type == "application/pdf":
                # Try text extraction first
                extracted_text = extract_text_from_pdf(file_bytes)
                if len(extracted_text.strip()) > 200 and "extraction failed" not in extracted_text:
                    # Text extraction successful
                    processing_mode = "text"
                else:
                    # Fall back to vision
                    processing_mode = "vision"
            elif file_type.startswith("image/"):
                processing_mode = "vision"
            else:
                processing_mode = "text"  # Try as text file
        else:
            processing_mode = mode
        
        # Process based on determined mode
        if processing_mode == "text":
            if file_type == "application/pdf":
                content_text = extract_text_from_pdf(file_bytes)
            else:
                content_text = file_bytes.decode('utf-8', errors='ignore')
            
            # Send text to LLM
            messages = [{
                "role": "user",
                "content": f"{analysis_prompt}\n\nDocument content:\n{content_text}"
            }]
            
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
                "temperature": 0.1,
                "max_tokens": 2048
            }
            
        elif processing_mode == "vision":
            # Convert to images
            images = []
            
            if file_type == "application/pdf":
                # Convert PDF pages to images
                try:
                    pages = convert_from_bytes(
                        file_bytes, 
                        first_page=1, 
                        last_page=max_pages,
                        dpi=dpi,
                        thread_count=2
                    )
                    
                    for page in pages:
                        data_url = image_to_data_url(page, quality=image_quality)
                        images.append({
                            "type": "image_url",
                            "image_url": {"url": data_url}
                        })
                        
                except Exception as e:
                    raise HTTPException(
                        status_code=500, 
                        detail=f"PDF conversion failed: {str(e)}. Ensure Poppler is installed."
                    )
            
            elif file_type.startswith("image/"):
                # Process single image
                try:
                    image = Image.open(io.BytesIO(file_bytes))
                    data_url = image_to_data_url(image, quality=image_quality)
                    images.append({
                        "type": "image_url",
                        "image_url": {"url": data_url}
                    })
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")
            
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type for vision mode: {file_type}")
            
            # Prepare multimodal content
            content = [{"type": "text", "text": analysis_prompt}] + images
            
            messages = [{
                "role": "user",
                "content": content
            }]
            
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
                "temperature": 0.1,
                "max_tokens": 2048
            }
        
        else:
            raise HTTPException(status_code=400, detail=f"Invalid processing mode: {processing_mode}")
        
        # Send request to LLM server
        llm_url = llm_base_url.rstrip('/') + '/v1/chat/completions'
        
        response = requests.post(
            llm_url,
            json=payload,
            timeout=120,
            headers={"Content-Type": "application/json"}
        )
        
        if not response.ok:
            error_detail = f"LLM server error {response.status_code}: {response.text}"
            raise HTTPException(status_code=502, detail=error_detail)
        
        llm_data = response.json()
        analysis_result = llm_data.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        # Try to extract JSON from response
        parsed_json = None
        try:
            # Look for JSON pattern in response
            import re
            json_match = re.search(r'\{[\s\S]*\}', analysis_result)
            if json_match:
                json_str = json_match.group(0)
                parsed_json = json.loads(json_str)
        except (json.JSONDecodeError, AttributeError):
            # JSON parsing failed, return raw text
            pass
        
        return {
            "success": True,
            "mode": processing_mode,
            "content": analysis_result,
            "parsed_data": parsed_json,
            "usage": llm_data.get("usage"),
            "metadata": {
                "filename": file.filename,
                "file_type": file_type,
                "file_size": len(file_bytes),
                "pages_processed": len(images) if processing_mode == "vision" else 1,
                "processing_time": None,  # Could add timing
                "model": model,
                "llm_server": llm_base_url
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "pdf-analyzer",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "PDF Analyzer Server",
        "version": "1.0.0",
        "description": "PDF to Image conversion and LLM analysis",
        "endpoints": {
            "/analyze-file": "POST - Analyze PDF or image file",
            "/health": "GET - Health check",
            "/docs": "GET - API documentation"
        }
    }

if __name__ == "__main__":
    # Server configuration
    HOST = "0.0.0.0"
    PORT = 7000
    
    print(f"""
🚀 PDF Analyzer Server Starting...

📊 Configuration:
   Host: {HOST}
   Port: {PORT}
   URL: http://{HOST}:{PORT}

📋 Requirements:
   - poppler-utils (for PDF conversion)
   - Python packages: fastapi, uvicorn, pdf2image, pillow, requests, PyPDF2

🔧 Usage:
   POST /analyze-file
   - file: PDF or image file
   - llm_base_url: http://127.0.0.1:8001 (vision LLM server)
   - model: llava-v1.5-7b (or your vision model)
   
💡 Tips:
   - Use mode='auto' for automatic text/vision selection
   - Set max_pages=3 for large PDFs
   - Adjust dpi=144 for quality vs speed balance
   
🌐 Frontend integration ready!
    """)
    
    uvicorn.run(
        app, 
        host=HOST, 
        port=PORT, 
        log_level="info",
        access_log=True
    )