"""
Hugging Face Transformers backend for Gemma 3 4B-IT (multimodal)

- Loads the model lazily on first use to keep startup fast
- Supports text-only and image+text generations
- Basic VRAM controls via env vars

Env vars:
  LLM_BACKEND         = 'hf' to enable this backend (checked by agent_server)
  HF_MODEL_ID         = default 'google/gemma-3-4b-it'
  HF_DTYPE            = 'bfloat16' | 'float16' | 'float32' (auto if missing)
  HF_LOAD_IN_4BIT     = '1' to use bitsandbytes 4-bit quantization (optional)

Usage from agent_server:
  from hf_backend import generate_text_only, generate_multimodal
"""

from __future__ import annotations
import os
import io
from typing import List, Optional

from PIL import Image

_MODEL = None
_PROCESSOR = None
_DEVICE = None


def _get_dtype():
    import torch
    dtype_env = (os.getenv("HF_DTYPE") or "").lower()
    if dtype_env in ("bfloat16", "bf16"):
        return torch.bfloat16
    if dtype_env in ("float16", "fp16", "half"):
        return torch.float16
    if dtype_env in ("float32", "fp32", "full"):
        return torch.float32
    # Auto: prefer bf16 on newer GPUs, else fp16 on CUDA, else fp32
    if torch.cuda.is_available():
        # Many RTX 40xx support bf16
        return torch.bfloat16 if torch.cuda.get_device_capability(0)[0] >= 8 else torch.float16
    return torch.float32


def _maybe_from_data_url(s: str) -> Image.Image:
    """Convert a data URL or file path to a PIL.Image."""
    if not isinstance(s, str):
        raise TypeError("image must be a data URL string or file path string")
    if s.startswith("data:"):
        import base64
        comma = s.find(",")
        if comma == -1:
            raise ValueError("invalid data URL")
        raw = base64.b64decode(s[comma + 1 :])
        return Image.open(io.BytesIO(raw)).convert("RGB")
    # else treat as path
    return Image.open(s).convert("RGB")


def _ensure_loaded():
    global _MODEL, _PROCESSOR, _DEVICE
    if _MODEL is not None and _PROCESSOR is not None:
        return

    from transformers import AutoModelForCausalLM, AutoProcessor
    import torch

    # Default to a multimodal model that supports images and text
    model_id = os.getenv("HF_MODEL_ID", "Qwen/Qwen2-VL-7B-Instruct")
    dtype = _get_dtype()
    load_in_4bit = (os.getenv("HF_LOAD_IN_4BIT", "0").strip() == "1")

    kwargs = {
        "torch_dtype": dtype,
        "device_map": "auto",
        "low_cpu_mem_usage": True,
    }
    if load_in_4bit:
        # bitsandbytes optional; user must install it
        kwargs["load_in_4bit"] = True

    _MODEL = AutoModelForCausalLM.from_pretrained(model_id, **kwargs)
    _PROCESSOR = AutoProcessor.from_pretrained(model_id)
    # Figure out primary device
    if hasattr(_MODEL, "device"):
        _DEVICE = _MODEL.device
    else:
        _DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def generate_text_only(prompt: str, max_new_tokens: int = 512, temperature: float = 0.2) -> str:
    _ensure_loaded()
    import torch

    inputs = _PROCESSOR(text=prompt, return_tensors="pt").to(_DEVICE)
    with torch.inference_mode():
        out = _MODEL.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True if temperature and temperature > 0 else False,
            temperature=float(temperature or 0.0),
        )
    return _PROCESSOR.decode(out[0], skip_special_tokens=True)


def generate_multimodal(prompt: str, images: List[str] | List[Image.Image], max_new_tokens: int = 512, temperature: float = 0.2) -> str:
    _ensure_loaded()
    import torch

    pil_images: List[Image.Image] = []
    for im in images:
        if isinstance(im, Image.Image):
            pil_images.append(im)
        else:
            pil_images.append(_maybe_from_data_url(str(im)))

    inputs = _PROCESSOR(text=prompt, images=pil_images, return_tensors="pt").to(_DEVICE)
    with torch.inference_mode():
        out = _MODEL.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True if temperature and temperature > 0 else False,
            temperature=float(temperature or 0.0),
        )
    return _PROCESSOR.decode(out[0], skip_special_tokens=True)
