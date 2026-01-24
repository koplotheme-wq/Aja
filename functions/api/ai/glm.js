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

  // 1. Normalisasi Parameter & Model Mapping
  const params = {};
  for (const [key, value] of urlParams.searchParams.entries()) {
    params[key.toLowerCase()] = value;
  }

  const q = params.q || params.text;
  const modelKey = params.model || 'glm-4.6';
  
  const models = {
    'glm-4.6': 'GLM-4-6-API-V1',
    'glm-4.6v': 'glm-4.6v',
    'glm-4.5': '0727-360B-API',
    'glm-4.5-air': '0727-106B-API',
    'glm-4.5v': 'glm-4.5v',
    'glm-4.1v-thinking': 'GLM-4.1V-Thinking-FlashX',
    'z1-rumination': 'deep-research',
    'z1-32b': 'zero',
    'chatglm': 'glm-4-flash',
    'dr-360b': '0808-360B-DR',
    'glm-4-32b': 'glm-4-air-250414'
  };

  if (!q) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'q' atau 'text' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  // --- HELPER: HMAC-SHA256 (Native Cloudflare) ---
  const hmacSha256 = async (key, data) => {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  try {
    // 2. Autentikasi
    const authRes = await fetch('https://chat.z.ai/api/v1/auths/');
    const authData = await authRes.json();
    const apiKey = authData.token;
    const userId = authData.id;

    // 3. Signature & Handshake
    const currentTime = Date.now();
    const requestId = crypto.randomUUID();
    const b64Prompt = btoa(unescape(encodeURIComponent(q.trim())));
    const basicParams = { timestamp: String(currentTime), requestId, user_id: userId };
    const sortedPayload = Object.keys(basicParams).sort().map(k => `${k},${basicParams[k]}`).join(',');
    const timeWindow = String(Math.floor(currentTime / (5 * 60 * 1000)));
    const baseSig = await hmacSha256('key-@@@@)))()((9))-xxxx&&&%%%%%', timeWindow);
    const signature = await hmacSha256(baseSig, `${sortedPayload}|${b64Prompt}|${currentTime}`);

    const endpoint = `https://chat.z.ai/api/v2/chat/completions?${new URLSearchParams({
      ...basicParams, version: '0.0.1', platform: 'web', token: apiKey, 
      timezone: 'Asia/Makassar', is_mobile: 'true', signature_timestamp: String(currentTime)
    }).toString()}`;

    // 4. Chat Request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Signature': signature,
        'X-FE-Version': 'prod-fe-1.0.150',
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://chat.z.ai/',
        'Origin': 'https://chat.z.ai'
      },
      body: JSON.stringify({
        stream: true,
        model: models[modelKey] || models['glm-4.6'],
        messages: [{ role: 'user', content: q }],
        signature_prompt: q,
        features: { preview_mode: true, enable_thinking: params.reasoning === 'true' }
      })
    });

    // 5. PARSING LOGIC (Tiru Jeroan Skrip Aslimu)
    const rawText = await response.text();
    const lines = rawText.split('\n').filter(line => line.startsWith('data: '));
    
    let mainBuffer = [];
    let reasoningContent = '';

    for (const line of lines) {
      try {
        const jsonData = JSON.parse(line.slice(6));
        if (jsonData.type !== 'chat:completion') continue;
        
        const eventData = jsonData.data;
        if (!eventData) continue;

        if (typeof eventData.edit_index === 'number') {
          const index = eventData.edit_index;
          const contentChunk = (eventData.edit_content || '').split('');
          mainBuffer.splice(index, contentChunk.length, ...contentChunk);
        } else if (eventData.delta_content) {
          const contentChunk = eventData.delta_content.split('');
          mainBuffer.splice(mainBuffer.length, 0, ...contentChunk);
          
          if (eventData.phase === 'thinking') {
            reasoningContent += eventData.delta_content.replace(/<[^>]*>/g, '');
          }
        }
      } catch (e) { /* skip malformed lines */ }
    }

    const finalContent = mainBuffer.join('').replace(/<details[\s\S]*?<\/details>/g, '').trim();
    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: {
        reasoning: reasoningContent.trim(),
        content: finalContent || "Gagal memproses teks dari stream."
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
