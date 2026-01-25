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

  // 1. Normalisasi Parameter
  const paramsQuery = {};
  for (const [key, value] of urlParams.searchParams.entries()) {
    paramsQuery[key.toLowerCase()] = value;
  }

  const q = paramsQuery.q || paramsQuery.text;
  
  if (!q) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'q' atau 'text' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  // --- HELPER: Logic Scraper (Helper Pribadi NoteGPT) ---
  const makeId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const makeCookie = () => {
    const anonId = makeId();
    // Mengganti Buffer.from ke btoa (Web Standard) agar identik
    const sbox = btoa(`${Math.floor(Date.now() / 1000)}|907803882`);
    const gid = `GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`;
    const ga = `GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000 - 2592000)}`;
    return `anonymous_user_id=${anonId}; sbox-guid=${sbox}; _gid=${gid}; _ga=${ga}`;
  };

  try {
    // 2. Inisialisasi Header & Payload (Jeroan Asli)
    const conversationId = paramsQuery.convid || makeId();
    const cookie = makeCookie();

    const payload = {
      message: q,
      language: paramsQuery.lang || 'id',
      model: paramsQuery.model || 'gpt-4.1-mini',
      tone: paramsQuery.tone || 'default',
      length: paramsQuery.length || 'moderate',
      conversation_id: conversationId
    };

    const response = await fetch('https://notegpt.io/api/v2/chat/stream', {
      method: 'POST',
      headers: {
        'authority': 'notegpt.io',
        'accept': '*/*',
        'content-type': 'application/json',
        'origin': 'https://notegpt.io',
        'referer': 'https://notegpt.io/ai-chat',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'cookie': cookie
      },
      body: JSON.stringify(payload)
    });

    // 3. Parsing Logic (Clean Parsing)
    const rawText = await response.text();
    const lines = rawText.split('\n');
    let texts = [];

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.substring(6).trim();
        if (dataStr) {
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) texts.push(parsed.text);
          } catch (e) { /* skip bad chunks */ }
        }
      }
    }

    const finalContent = texts.join('');
    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: {
        content: finalContent || "Gagal mendapatkan respons dari NoteGPT.",
        conversation_id: conversationId,
        model: payload.model
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
