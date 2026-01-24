// ==========================================
// Author  : If you like content like this, you can join this channel. 📲
// Contact : https://t.me/jieshuo_materials
// ==========================================

export async function onRequest(context) {
  const start = Date.now();
  const { request } = context;
  const urlParams = new URL(request.url);
  const headersResponse = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === "OPTIONS") return new Response(null, { headers: headersResponse });

  // Normalisasi Parameter
  const params = {};
  for (const [key, value] of urlParams.searchParams.entries()) {
    params[key.toLowerCase()] = value;
  }

  const q = params.q || params.text;
  const model = params.model || 'glm-4.6';
  const useSearch = params.search === 'true';
  const useReasoning = params.reasoning === 'true';

  if (!q) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'q' atau 'text' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  // --- HELPER INTERNAL: CRYPTO & SIGNATURE ---
  const hmacSha256 = async (key, data) => {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const createSignature = async (sortedPayload, userPrompt) => {
    const currentTime = Date.now();
    const b64Prompt = btoa(unescape(encodeURIComponent(userPrompt)));
    const dataString = `${sortedPayload}|${b64Prompt}|${currentTime}`;
    const timeWindow = String(Math.floor(currentTime / (5 * 60 * 1000)));
    const baseSignature = await hmacSha256('key-@@@@)))()((9))-xxxx&&&%%%%%', timeWindow);
    const signature = await hmacSha256(baseSignature, dataString);
    return { signature, timestamp: currentTime };
  };

  try {
    // 1. Authenticate
    const authRes = await fetch('https://chat.z.ai/api/v1/auths/');
    const authData = await authRes.json();
    const apiKey = authData.token;
    const userId = authData.id;

    // 2. Build Endpoint & Signature
    const requestId = crypto.randomUUID();
    const basicParams = { timestamp: String(Date.now()), requestId, user_id: userId };
    const sortedPayload = Object.keys(basicParams).sort().map(k => `${k},${basicParams[k]}`).join(',');
    const { signature, timestamp: sigTimestamp } = await createSignature(sortedPayload, q.trim());

    const queryParams = new URLSearchParams({
      ...basicParams,
      version: '0.0.1', platform: 'web', token: apiKey, 
      timezone: 'Asia/Makassar', is_mobile: 'true'
    });

    const endpoint = `https://chat.z.ai/api/v2/chat/completions?${queryParams.toString()}&signature_timestamp=${sigTimestamp}`;

    // 3. Chat Request (Streaming)
    const chatRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Signature': signature,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        stream: true,
        model: ({ 'glm-4.6': 'GLM-4-6-API-V1', 'glm-4.5': '0727-360B-API' }[model] || 'GLM-4-6-API-V1'),
        messages: [{ role: 'user', content: q }],
        signature_prompt: q,
        features: { web_search: useSearch, auto_web_search: useSearch, enable_thinking: useReasoning },
        chat_id: crypto.randomUUID(),
        id: crypto.randomUUID(),
        current_user_message_id: crypto.randomUUID()
      })
    });

    // 4. Proses Buffer & Streaming Logic (Presisi sesuai skrip asli)
    let fullContent = '';
    let reasoningContent = '';
    let mainBuffer = [];
    let reader = chatRes.body.getReader();
    let decoder = new TextDecoder();
    let lineBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const jsonData = JSON.parse(line.slice(6));
          if (jsonData.type !== 'chat:completion') continue;
          
          const eventData = jsonData.data;
          const phase = eventData.phase;

          if (typeof eventData.edit_index === 'number') {
            const index = eventData.edit_index;
            const contentChunk = (eventData.edit_content || '').split('');
            mainBuffer.splice(index, contentChunk.length, ...contentChunk);
          } else if (eventData.delta_content) {
            const contentChunk = eventData.delta_content.split('');
            mainBuffer.splice(mainBuffer.length, 0, ...contentChunk);
            
            if (phase === 'thinking') {
              reasoningContent += eventData.delta_content.replace(/<[^>]*>/g, '');
            }
          }
        } catch (e) {}
      }
    }

    fullContent = mainBuffer.join('').replace(/<details[\s\S]*?<\/details>/g, '').trim();
    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: {
        reasoning: reasoningContent.trim(),
        content: fullContent
      },
      timestamp: new Date().toISOString(),
      responseTime
    }, null, 2), { status: 200, headers: headersResponse });

  } catch (e) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - start}ms`
    }), { status: 500, headers: headersResponse });
  }
}