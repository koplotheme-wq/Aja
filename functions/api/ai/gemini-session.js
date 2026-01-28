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

  // 1. Normalisasi Parameter & Context Handling
  const paramsQuery = {};
  for (const [key, value] of urlParams.searchParams.entries()) {
    paramsQuery[key.toLowerCase()] = value;
  }

  const q = paramsQuery.q || paramsQuery.text;
  const instruction = paramsQuery.inst || "Kamu adalah asisten yang membantu.";
  const sessionId = paramsQuery.sid || paramsQuery.sessionid || ""; // Mengambil session untuk kelanjutan chat

  if (!q) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'q' atau 'text' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  try {
    // 2. Logic Scraper (Target: Snowping Gemini)
    // Membangun URL dengan parameter yang dinamis
    const targetUrl = new URL('https://api.snowping.my.id/api/aichat/gemini');
    targetUrl.searchParams.set('q', q);
    targetUrl.searchParams.set('inst', instruction);
    
    // Jika ada sessionId, masukkan ke parameter agar percakapan berlanjut
    if (sessionId) {
      targetUrl.searchParams.set('sessionId', sessionId);
    }

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    // 3. Parsing Logic (Clean & Context-Aware)
    // Kita ambil 'text' sebagai content dan 'sessionId' untuk dikembalikan ke user
    const finalContent = data.result?.text || "Maaf, AI tidak memberikan respon.";
    const nextSessionId = data.result?.sessionId || "";

    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: {
        content: finalContent,
        sessionId: nextSessionId, // Kirim ini balik ke user agar bisa dipasang di parameter 'sid'
        instruction: instruction
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
