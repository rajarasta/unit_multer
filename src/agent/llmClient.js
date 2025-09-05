// Minimal Local LLM client for chat-completions API
// Auto-detects model from /v1/models, falls back to 'local'

export async function detectModel(baseUrl) {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  try {
    const r = await fetch(`${base}/v1/models`);
    if (!r.ok) return 'local';
    const j = await r.json();
    const id = j?.data?.[0]?.id || (Array.isArray(j?.models) ? j.models[0]?.id : null);
    return id || 'local';
  } catch {
    return 'local';
  }
}

export async function chatCompletions(baseUrl, messages, modelHint) {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  const model = modelHint || (await detectModel(base));
  const r = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  const content = j?.choices?.[0]?.message?.content ?? '';
  return String(content);
}

