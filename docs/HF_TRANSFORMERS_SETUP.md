# Hugging Face Transformers Backend (Gemma 3 4B-IT)

This enables image+text extraction using a Hugging Face multimodal model (default: Qwen2-VL). No GGUF required.

## 1) Install dependencies (Python 3.11+)

Recommended base:

```
pip install -r agent_requirements.txt
```

or install selectively:

```
pip install torch torchvision transformers accelerate pillow sentencepiece safetensors timm
```

GPU acceleration (CUDA wheels example):

```
pip install --upgrade --extra-index-url https://download.pytorch.org/whl/cu124 torch torchvision
```

Optionally use 4-bit quantization (saves VRAM):

```
pip install bitsandbytes
```

## 2) Configure env

Set in `.env` or environment variables:

```
LLM_BACKEND=hf
AGENT_POLICY=rule_based

# Multimodal (text+image) default
HF_MODEL_ID=Qwen/Qwen2-VL-7B-Instruct

# Text-only alternative (Gemma 2)
# HF_MODEL_ID=google/gemma-2-9b-it

HF_DTYPE=float16   # or bfloat16 on RTX 40xx, else float32 on CPU
HF_LOAD_IN_4BIT=0  # set 1 to quantize (needs bitsandbytes)
MAX_PAGES_DEF=3
```

VRAM tips:
- float16 on 8 GB GPUs may be tight; try `HF_LOAD_IN_4BIT=1` if OOM.
- bfloat16 is preferred on many RTX 40xx (set `HF_DTYPE=bfloat16`).

## 3) Run the agent server

```
python -m uvicorn agent_server:app --host 0.0.0.0 --port 7001
```

The UI calls `POST /agent/analyze-file`. With HF backend enabled, the server uses a rule-based pipeline:
- PDF: probe text -> if text -> text-only (uses same HF model; VLMs handle text fine); else -> rasterize pages -> image+text
- Images: image+text

Outputs are normalized/validated JSON per the existing schema.

## 4) Minimal HF example (standalone)

```
from transformers import AutoModelForCausalLM, AutoProcessor
import torch
from PIL import Image

model_id = "Qwen/Qwen2-VL-7B-Instruct"
model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.float16, device_map="auto")
processor = AutoProcessor.from_pretrained(model_id)

image = Image.open("example.jpg")
inputs = processor(text="What is in this image?", images=image, return_tensors="pt").to(model.device)
outputs = model.generate(**inputs, max_new_tokens=256)
print(processor.decode(outputs[0], skip_special_tokens=True))
```

## 5) Switch between backends

- OpenAI-compatible (existing): `LLM_BACKEND=openai_compat`, `AGENT_POLICY=llm_tools`
- Transformers (HF): `LLM_BACKEND=hf`, `AGENT_POLICY=rule_based`

Notes:
- Gemma 2 is text-only; for vision use a VLM like Qwen2‑VL.

No UI changes are required; the UI keeps calling `/agent/analyze-file`.
