"""
Shim entrypoint for JSON tool dispatcher (moved under python-servers/).
This wrapper imports the canonical module from repo root to avoid duplication.

Preferred usage:
  python python-servers/json_tool_dispatcher.py

Environment variables:
  LM_BASE_URL  - OpenAI-compatible base URL (e.g. http://10.255.130.136:1234/v1)
  LM_API_KEY   - API key if required (LM Studio ignores it)
  LM_MODEL     - Model id/label
  JSON_STORE   - Path to your JSON data file
"""
import os, sys

# Ensure project root is importable
ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

print("[json-tool-dispatcher] Using module from repo root (json_tool_dispatcher.py)")

# Import everything from the root module
from json_tool_dispatcher import *  # noqa: F401,F403

if __name__ == '__main__':
    # If root module exposes a main/chat entry, call it.
    # Fallback: print quick instructions.
    maybe_main = globals().get('chat_with_tools', None)
    if maybe_main is None:
        print("Dispatcher loaded. Expose a 'main' or call chat_with_tools(messages) from REPL.")
    else:
        print("Dispatcher ready. Import and call chat_with_tools(messages) as needed.")

