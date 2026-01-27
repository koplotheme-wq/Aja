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

  try {
    // 2. Logic Scraper (Jeroan DeepAI)
    // Menggunakan FormData bawaan Cloudflare
    const formData = new FormData();
    formData.append('chat_style', 'chat');
    formData.append('chatHistory', JSON.stringify([{ role: 'user', content: q }]));
    formData.append('model', paramsQuery.model || 'standard');
    formData.append('hacker_is_stinky', 'very_stinky');

    const commonHeaders = {
      'sec-ch-ua-platform': '"Android"',
      'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
      'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
      'sec-ch-ua-mobile': '?1',
      'accept': '*/*',
      'origin': 'https://deepai.org',
      'referer': 'https://deepai.org/chat',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'api-key': 'tryit-5440202550-463c6ffb4d59da24b270b166ca5adb1d',
      'cookie': '_ga=GA1.1.335483114.1764404391; csrftoken=Lxm3WwABOJ7mp48JiEAix7F5wCrUn2tu; sessionid=xf9szz91o5ksnd61b1wgdkhjnya74sfx; user_sees_ads=false'
    };

    const response = await fetch('https://api.deepai.org/hacking_is_a_serious_crime', {
      method: 'POST',
      headers: commonHeaders,
      body: formData
    });

    // 3. Parsing Logic (Clean Parsing)
    // DeepAI biasanya mengembalikan teks langsung atau JSON sederhana
    const resultData = await response.text();
    
    // Cek jika response adalah JSON string yang valid
    let finalContent = resultData;
    try {
        const jsonCheck = JSON.parse(resultData);
        if (jsonCheck.output) finalContent = jsonCheck.output;
    } catch (e) {
        // Jika bukan JSON, biarkan sebagai text (DeepAI sering kirim raw text)
    }

    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: {
        content: finalContent.trim() || "Gagal mendapatkan respons dari DeepAI.",
        model: paramsQuery.model || 'standard'
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
