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

  const params = {};
  for (const [key, value] of urlParams.searchParams.entries()) {
    params[key.toLowerCase()] = value;
  }

  const q = params.q || params.text;
  const model = params.model || 'glm-4.6';

  if (!q) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'q' atau 'text' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  // --- HELPER: HMAC-SHA256 (Cloudflare Native) ---
  const hmacSha256 = async (key, data) => {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  try {
    // 1. Ambil Token Autentikasi
    const authRes = await fetch('https://chat.z.ai/api/v1/auths/');
    const authData = await authRes.json();
    const apiKey = authData.token;
    const userId = authData.id;

    // 2. Buat Signature (Sesuai Logika Inti Kamu)
    const currentTime = Date.now();
    const requestId = crypto.randomUUID();
    const b64Prompt = btoa(unescape(encodeURIComponent(q.trim())));
    
    const basicParams = { timestamp: String(currentTime), requestId, user_id: userId };
    const sortedPayload = Object.keys(basicParams).sort().map(k => `${k},${basicParams[k]}`).join(',');
    
    const timeWindow = String(Math.floor(currentTime / (5 * 60 * 1000)));
    const baseSig = await hmacSha256('key-@@@@)))()((9))-xxxx&&&%%%%%', timeWindow);
    const signature = await hmacSha256(baseSig, `${sortedPayload}|${b64Prompt}|${currentTime}`);

    const queryParams = new URLSearchParams({
      ...basicParams,
      version: '0.0.1', platform: 'web', token: apiKey, 
      timezone: 'Asia/Makassar', is_mobile: 'true',
      signature_timestamp: String(currentTime)
    });

    const endpoint = `https://chat.z.ai/api/v2/chat/completions?${queryParams.toString()}`;

    // 3. Request ke Z.ai
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Signature': signature,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Referer': 'https://chat.z.ai/',
        'Origin': 'https://chat.z.ai'
      },
      body: JSON.stringify({
        stream: true,
        model: ({ 'glm-4.5': '0727-360B-API' }[model] || 'GLM-4-6-API-V1'),
        messages: [{ role: 'user', content: q }],
        signature_prompt: q,
        features: { preview_mode: true }
      })
    });

    // --- MENTAHAN: Ambil Teks Langsung ---
    const rawData = await response.text();
    
    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: {
        raw_output: rawData // Semua data stream ada di sini
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
