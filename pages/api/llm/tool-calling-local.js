export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, tools = [], base_url, model } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // Simulated tool functions (same as tool-calling-test.js)
    const availableTools = {
      get_weather: async (location) => ({
        location,
        temperature: Math.round(Math.random() * 30 + 5),
        condition: ["sunny","cloudy","rainy","windy"][Math.floor(Math.random()*4)],
        humidity: Math.round(Math.random()*100),
        timestamp: new Date().toISOString()
      }),
      calculate: async (expression) => {
        try { const sanitized = expression.replace(/[^0-9+\-*/\(\)\.\s]/g, ''); return { expression, result: eval(sanitized), valid: true }; }
        catch (error) { return { expression, result: null, valid: false, error: error.message }; }
      },
      create_aluminum_quote: async (customer, items, total) => ({
        quote_id: `ALU-${Date.now()}`,
        customer,
        items: items||[],
        total_amount: total||0,
        currency: 'HRK',
        created_at: new Date().toISOString(),
        valid_until: new Date(Date.now()+30*24*60*60*1000).toISOString(),
        status: 'draft'
      }),
      search_projects: async (query, limit=5) => {
        const mock = [
          { id: 'P001', name: 'Škola Zadar', status: 'active', client: 'Grad Zadar' },
          { id: 'P002', name: 'Trgovački centar Split', status: 'completed', client: 'Mall Group' },
          { id: 'P003', name: 'Stambena zgrada Zagreb', status: 'planning', client: 'Nekretnine d.o.o.' },
          { id: 'P004', name: 'Industrijska hala Varaždin', status: 'active', client: 'Production Ltd' },
          { id: 'P005', name: 'Hotel Dubrovnik', status: 'completed', client: 'Tourism Corp' }
        ];
        const filtered = mock.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.client.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
        return { query, results: filtered, total_found: filtered.length };
      }
    };

    const base = (base_url || 'http://10.255.130.136:1234').replace(/\/+$/,'');
    const mdl = model || 'local';
    const messages = [ { role: 'user', content: prompt } ];
    let iterations = 0;
    let toolCallsExecuted = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      iterations++;
      const body = { model: mdl, messages, tools, tool_choice: 'auto', stream: false, temperature: 0.3 };
      const r = await fetch(`${base}/v1/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.text(); throw new Error(`Local LLM HTTP ${r.status}: ${e}`); }
      const j = await r.json();
      const msg = j.choices?.[0]?.message || {};
      const toolCalls = msg.tool_calls || [];
      if (!toolCalls.length) {
        messages.push({ role: 'assistant', content: msg.content || '' });
        return res.status(200).json({ id: j.id, model: j.model, status: 'completed', iterations, tool_calls_executed: toolCallsExecuted, usage: j.usage, final_response: msg.content || '', full_conversation: messages });
      }
      for (const tc of toolCalls) {
        const fn = tc.function?.name;
        let args = {}; try { args = JSON.parse(tc.function?.arguments || '{}'); } catch {}
        let out;
        if (availableTools[fn]) { try { out = await availableTools[fn](...Object.values(args)); } catch (err) { out = { error: err.message }; } }
        else { out = { error: `Unknown function: ${fn}` }; }
        toolCallsExecuted++;
        messages.push({ role: 'tool', tool_call_id: tc.id, name: fn, content: JSON.stringify(out) });
      }
    }
    return res.status(200).json({ id: 'local-unknown', model: mdl, status: 'incomplete', iterations: maxIterations, tool_calls_executed: 0, usage: null, final_response: '', full_conversation: messages });
  } catch (error) {
    console.error('Local tool calling API error:', error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}

