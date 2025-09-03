# agent_server.py
# FastAPI agent koji orkestrira PDF/slike preko tool-calling petlje na lokalni llama-cpp server
from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import base64, io, json, os
import requests
import pypdfium2 as pdfium                          # Windows-friendly PDF rendering
from pdfminer.high_level import extract_text        # pdfminer.six
from jsonschema import validate as js_validate, Draft202012Validator
from jsonschema.exceptions import ValidationError
from datetime import datetime

# ---------- KONFIG ----------
TEXT_LLM_URL   = os.getenv("TEXT_LLM_URL",   "http://127.0.0.1:8000")  # llama_cpp.server --model text.gguf
VISION_LLM_URL = os.getenv("VISION_LLM_URL", "http://127.0.0.1:8001")  # llama_cpp.server --model vlm.gguf --mmproj ...
MODEL_LABEL    = os.getenv("MODEL_LABEL", "local-gguf")
MAX_PAGES_DEF  = int(os.getenv("MAX_PAGES_DEF", "3"))

# ---------- POMOĆNE ----------
def data_url(img_bytes: bytes, mime="image/jpeg") -> str:
    return f"data:{mime};base64," + base64.b64encode(img_bytes).decode()

def get_page_count(file_bytes: bytes) -> int:
    """Get total page count from PDF using pypdfium2"""
    try:
        pdf = pdfium.PdfDocument(file_bytes)
        count = len(pdf)
        pdf.close()
        return count
    except Exception:
        return 1  # Fallback for corrupted/invalid PDFs

def rasterize_pdf_pages_pypdfium2(file_bytes: bytes, max_pages=3, width=1024) -> list[str]:
    """Convert PDF pages to JPEG data URLs using pypdfium2"""
    try:
        pdf = pdfium.PdfDocument(file_bytes)
        n = min(len(pdf), max_pages)
        images = []
        
        for i in range(n):
            page = pdf[i]
            pw, ph = page.get_size()
            scale = width / pw if pw > 0 else 1.0
            
            # Render page to bitmap
            bitmap = page.render(scale=scale)  # RGB format
            pil_image = bitmap.to_pil()
            
            # Convert to JPEG
            buf = io.BytesIO()
            pil_image.save(buf, format="JPEG", quality=80)
            images.append(data_url(buf.getvalue()))
            
        pdf.close()
        return images
    except Exception as e:
        print(f"PDF rasterization failed: {e}")
        return []

def openai_compat_chat(base_url: str, messages: List[Dict[str, Any]], tools: Optional[List[Dict[str, Any]]] = None,
                       response_format: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload = {"model": MODEL_LABEL, "messages": messages, "stream": False}
    if tools: payload["tools"] = tools
    if response_format: payload["response_format"] = response_format
    if params: payload.update(params)
    r = requests.post(base_url.rstrip("/") + "/v1/chat/completions", json=payload, timeout=120)
    if not r.ok:
        raise RuntimeError(f"LLM HTTP {r.status_code}: {r.text[:200]}")
    return r.json()

def hr_number_to_float(s: str) -> Optional[float]:
    if s is None: return None
    # prihvati 1.234,56 ili 1234,56 ili 1,234.56 itd.
    t = s.strip().replace(" ", "")
    # ako ima zarez i točku, pretpostavi da je ZAREZ decimalni
    if "," in t and "." in t:
        # ukloni tisućice (točke)
        t = t.replace(".", "").replace(",", ".")
    elif "," in t and "." not in t:
        t = t.replace(",", ".")
    try:
        return float(t)
    except:
        return None

def parse_hr_date(s: str) -> Optional[str]:
    if not s: return None
    s = s.strip()
    for fmt in ("%d.%m.%Y.", "%d.%m.%Y", "%d.%m.%y.", "%d.%m.%y", "%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except:
            continue
    return None

# ---------- JSON SCHEMA za rezultat ----------
RESULT_SCHEMA = {
  "type": "object",
  "required": ["documentType","items","totals"],
  "properties": {
    "documentType": {"type":"string","enum":["invoice","quote","delivery_note"]},
    "documentNumber": {"type":["string","null"]},
    "date": {"type":["string","null"]},
    "dueDate": {"type":["string","null"]},
    "currency": {"type":["string","null"]},
    "supplier": {
      "type":"object",
      "properties": {
        "name":{"type":["string","null"]},
        "address":{"type":["string","null"]},
        "oib":{"type":["string","null"]},
        "iban":{"type":["string","null"]}
      }
    },
    "buyer": {
      "type":"object",
      "properties": {
        "name":{"type":["string","null"]},
        "address":{"type":["string","null"]},
        "oib":{"type":["string","null"]},
        "iban":{"type":["string","null"]}
      }
    },
    "items": {
      "type":"array",
      "items":{
        "type":"object",
        "required":["description","quantity","unit","unitPrice","totalPrice"],
        "properties":{
          "position":{"type":["integer","null"]},
          "code":{"type":["string","null"]},
          "description":{"type":"string"},
          "quantity":{"type":["number","string"]},
          "unit":{"type":"string"},
          "unitPrice":{"type":["number","string"]},
          "discountPercent":{"type":["number","string","null"]},
          "totalPrice":{"type":["number","string"]}
        }
      }
    },
    "totals": {
      "type":"object",
      "required":["totalAmount"],
      "properties":{
        "subtotal":{"type":["number","string","null"]},
        "vatAmount":{"type":["number","string","null"]},
        "totalAmount":{"type":["number","string"]}
      }
    }
  }
}

# ---------- TOOL SCHEMAS (za LLM) ----------
TOOLS = [
  {
    "type":"function",
    "function":{
      "name":"probe_pdf",
      "description":"Inspect PDF to get page count and check if it contains extractable text.",
      "parameters":{
        "type":"object",
        "properties":{},
        "additionalProperties": False
      }
    }
  },
  {
    "type":"function",
    "function":{
      "name":"extract_pdf_text",
      "description":"Extract text from all pages of the PDF.",
      "parameters":{
        "type":"object",
        "properties":{},
        "additionalProperties": False
      }
    }
  },
  {
    "type":"function",
    "function":{
      "name":"rasterize_pdf_pages",
      "description":"Render first N PDF pages to JPEG data URLs.",
      "parameters":{
        "type":"object",
        "properties":{
          "max_pages":{"type":"integer","minimum":1,"maximum":10,"default":3},
          "dpi":{"type":"integer","minimum":72,"maximum":300,"default":144},
          "width":{"type":"integer","minimum":512,"maximum":2048,"default":1024}
        },
        "additionalProperties": False
      }
    }
  },
  {
    "type":"function",
    "function":{
      "name":"vision_analyze_images",
      "description":"Call VLM on provided images and return structured JSON for invoice/quote.",
      "parameters":{
        "type":"object",
        "properties":{
          "images":{"type":"array","items":{"type":"string"}}
        },
        "required":["images"],
        "additionalProperties": False
      }
    }
  },
  {
    "type":"function",
    "function":{
      "name":"text_analyze",
      "description":"Call TEXT LLM on plain text and return structured JSON for invoice/quote.",
      "parameters":{
        "type":"object",
        "properties":{
          "text":{"type":"string"}
        },
        "required":["text"],
        "additionalProperties": False
      }
    }
  },
  {
    "type":"function",
    "function":{
      "name":"normalize_and_validate",
      "description":"Normalize HR numbers/dates and validate final JSON against schema.",
      "parameters":{
        "type":"object",
        "properties":{
          "raw_json":{"type":"string"}
        },
        "required":["raw_json"],
        "additionalProperties": False
      }
    }
  }
]

# ---------- AGENT STATE ----------
class AgentState(BaseModel):
    file_bytes: bytes
    is_pdf: bool
    page_count: Optional[int] = None
    has_text: Optional[bool] = None
    text: Optional[str] = None
    images_dataurls: Optional[List[str]] = None
    result_json: Optional[Dict[str, Any]] = None

# ---------- TOOL IMPLEMENTACIJE ----------
def tool_probe_pdf(state: AgentState) -> Dict[str, Any]:
    try:
        # Extract text using pdfminer
        txt = extract_text(io.BytesIO(state.file_bytes)) or ""
        has_text = bool(txt.strip())
        
        # Get accurate page count using pypdfium2
        page_count = get_page_count(state.file_bytes)
        
        # Store text in state for later use
        state.text = txt if has_text else None
        
        return {
            "page_count": page_count, 
            "has_text": has_text, 
            "bytes_len": len(state.file_bytes)
        }
    except Exception as e:
        print(f"PDF probe failed: {e}")
        return {"page_count": None, "has_text": False, "bytes_len": len(state.file_bytes)}

def tool_extract_pdf_text(state: AgentState) -> Dict[str, Any]:
    txt = extract_text(io.BytesIO(state.file_bytes)) or ""
    state.text = txt
    return {"chars": len(txt)}

def tool_rasterize_pdf_pages(state: AgentState, max_pages=MAX_PAGES_DEF, dpi=144, width=1024) -> Dict[str, Any]:
    # Use pypdfium2 for cross-platform PDF rendering (no Poppler needed)
    urls = rasterize_pdf_pages_pypdfium2(state.file_bytes, max_pages=max_pages, width=width)
    state.images_dataurls = urls
    return {"images": urls, "count": len(urls)}

SYSTEM_PROMPT = """You are an extraction agent. Your goal is to return ONLY a strict JSON object for Croatian invoices/quotes with fields:
documentType, documentNumber, date, dueDate, currency,
supplier{name,address,oib,iban}, buyer{name,address,oib,iban},
items[{position,code,description,quantity,unit,unitPrice,discountPercent,totalPrice}],
totals{subtotal,vatAmount,totalAmount}.
Use tools when needed. If you have images, analyze them. If you have text, analyze it.
Always end by calling normalize_and_validate with the full JSON string.
"""

ANALYZE_TEXT_PROMPT = """Extract the JSON described in the spec from the following text (Croatian formats); return ONLY JSON:
"""

ANALYZE_VISION_PROMPT = """Extract the JSON described in the spec from these images; return ONLY JSON:
"""

def tool_text_analyze(state: AgentState, text: str) -> Dict[str, Any]:
    messages = [
        {"role":"system","content":SYSTEM_PROMPT},
        {"role":"user","content": ANALYZE_TEXT_PROMPT + text[:100000]} # safety cut
    ]
    j = openai_compat_chat(TEXT_LLM_URL, messages, response_format={"type":"json_object"}, params={"temperature":0.2})
    content = j.get("choices",[{}])[0].get("message",{}).get("content","")
    return {"raw_json": content}

def tool_vision_analyze_images(state: AgentState, images: List[str]) -> Dict[str, Any]:
    content = [{"type":"text","text": ANALYZE_VISION_PROMPT}]
    content += [{"type":"image_url","image_url":{"url":u}} for u in images]
    messages = [{"role":"system","content":SYSTEM_PROMPT}, {"role":"user","content": content}]
    j = openai_compat_chat(VISION_LLM_URL, messages, response_format={"type":"json_object"}, params={"temperature":0.2})
    content = j.get("choices",[{}])[0].get("message",{}).get("content","")
    return {"raw_json": content}

def normalize_result(d: Dict[str, Any]) -> Dict[str, Any]:
    # brojevi i datumi
    if "date" in d: d["date"] = parse_hr_date(d.get("date"))
    if "dueDate" in d: d["dueDate"] = parse_hr_date(d.get("dueDate"))
    for item in d.get("items", []):
        for k in ("quantity","unitPrice","discountPercent","totalPrice"):
            v = item.get(k)
            if isinstance(v,str):
                item[k] = hr_number_to_float(v)
    if "totals" in d:
        for k in ("subtotal","vatAmount","totalAmount"):
            v = d["totals"].get(k)
            if isinstance(v,str):
                d["totals"][k] = hr_number_to_float(v)
    return d

def tool_normalize_and_validate(state: AgentState, raw_json: str) -> Dict[str, Any]:
    try:
        candidate = json.loads(raw_json)
    except:
        # naive repair: uzmi prvi {…}
        start = raw_json.find("{")
        end   = raw_json.rfind("}")
        if start>=0 and end>start:
            candidate = json.loads(raw_json[start:end+1])
        else:
            raise
    candidate = normalize_result(candidate)
    try:
        Draft202012Validator(RESULT_SCHEMA).validate(candidate)
        state.result_json = candidate
        return {"ok": True}
    except ValidationError as e:
        # Minimal repair hook: ukloni null-ove koji krše required itd.
        return {"ok": False, "error": str(e)[:200], "partial": candidate}

# ---------- TOOL REGISTAR ----------
def call_tool(name: str, args: Dict[str, Any], state: AgentState) -> Dict[str, Any]:
    if name=="probe_pdf":                  return tool_probe_pdf(state)
    if name=="extract_pdf_text":           return tool_extract_pdf_text(state)
    if name=="rasterize_pdf_pages":        return tool_rasterize_pdf_pages(state, **{k:int(v) for k,v in args.items() if k in ("max_pages","dpi","width")})
    if name=="vision_analyze_images":      return tool_vision_analyze_images(state, args.get("images", []))
    if name=="text_analyze":               return tool_text_analyze(state, args.get("text",""))
    if name=="normalize_and_validate":     return tool_normalize_and_validate(state, args.get("raw_json",""))
    return {"error": f"unknown tool {name}"}

# ---------- AGENT PETLJA ----------
def run_agent_with_tools(state: AgentState) -> Dict[str, Any]:
    # inicijalna poruka: daj modelu kontekst + dat ću ti PDF ili sliku kroz alate
    messages = [
        {"role":"system","content": SYSTEM_PROMPT},
        {"role":"user","content": "You will be given a PDF or image via tools. Decide the best path: probe_pdf -> (extract_pdf_text->text_analyze) OR (rasterize_pdf_pages->vision_analyze_images). Finish with normalize_and_validate."}
    ]
    # šaljemo "tools" i čekamo tool_calls
    j = openai_compat_chat(TEXT_LLM_URL, messages, tools=TOOLS, params={"temperature":0})
    choice = j.get("choices",[{}])[0]
    msg = choice.get("message",{})
    # petlja dok ima tool_calls
    tool_msgs = []
    while True:
        tool_calls = msg.get("tool_calls") or []
        if not tool_calls:
            break
        for tc in tool_calls:
            nm = tc["function"]["name"]
            args = {}
            try:
                args = json.loads(tc["function"].get("arguments","{}"))
            except:
                pass
            # specijalni slučajevi: realni ulazi su u state
            if nm=="probe_pdf":
                res = call_tool(nm, args, state)
            elif nm=="extract_pdf_text":
                res = call_tool(nm, args, state)
            elif nm=="rasterize_pdf_pages":
                res = call_tool(nm, args, state)
            elif nm=="vision_analyze_images":
                if not state.images_dataurls: raise RuntimeError("images not prepared")
                res = call_tool(nm, {"images": state.images_dataurls}, state)
            elif nm=="text_analyze":
                if state.text is None: raise RuntimeError("text not prepared")
                res = call_tool(nm, {"text": state.text}, state)
            elif nm=="normalize_and_validate":
                res = call_tool(nm, args, state)
            else:
                res = {"error":"unknown tool"}
            tool_msgs.append({"role":"tool","name":nm,"content": json.dumps(res)})
        messages = messages + [msg] + tool_msgs
        j = openai_compat_chat(TEXT_LLM_URL, messages, tools=TOOLS, params={"temperature":0})
        msg = j.get("choices",[{}])[0].get("message",{})
        tool_msgs = []

    return state.result_json or {"error":"no result"}

# ---------- API ----------
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/agent/analyze-file")
async def analyze_file(
    file: UploadFile,
    max_pages: int = Form(MAX_PAGES_DEF),
):
    fb = await file.read()
    is_pdf = file.content_type=="application/pdf" or file.filename.lower().endswith(".pdf")
    state = AgentState(file_bytes=fb, is_pdf=is_pdf)

    # hint: ako je slika, odmah pripremi images_dataurls; agent će pozvati vision tool
    if not is_pdf:
        state.images_dataurls = [data_url(fb)]

    try:
        result = run_agent_with_tools(state)
        return result
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)[:300]})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7001)