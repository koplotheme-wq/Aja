// ==========================================
// Author  : If you like content like this, you can join this channel. 📲
// Contact : https://t.me/jieshuo_materials
// ==========================================

export async function onRequest(context) {
  const start = Date.now();
  const { request, env } = context;
  const url = new URL(request.url);
  const headersResponse = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === "OPTIONS") return new Response(null, { headers: headersResponse });

  // Mendukung berbagai parameter input
  const q = url.searchParams.get('q') || url.searchParams.get('text') || url.searchParams.get('prompt') || url.searchParams.get('query');
  const model = "jeeves";

  if (!q) {
    return new Response(JSON.stringify({ success: false, message: "Query q/prompt diperlukan" }), { status: 400, headers: headersResponse });
  }

  // Target URL API Jeeves
  const targetUrl = 'https://labs.shannzx.xyz/api/v1/jeeves';

  try {
    // API Jeeves menggunakan parameter 'prompt'
    const finalUrl = `${targetUrl}?prompt=${encodeURIComponent(q)}`;
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const data = await response.json();
    const nestedData = data.data || data;
    
    let bestMatch = "";
    const ignoreKeys = ['status', 'messageid', 'success', 'timestamp', 'responsetime'];
    
    // Logika pencarian jawaban string terpanjang (bestMatch)
    for (let key in nestedData) {
      let val = nestedData[key];
      if (typeof val === 'string' && !ignoreKeys.includes(key.toLowerCase())) {
        if (val.trim() !== q.trim() && val.length > bestMatch.length) {
          bestMatch = val;
        }
      }
    }

    const responseTime = `${Date.now() - start}ms`;
    
    return new Response(JSON.stringify({
      success: true,
      result: bestMatch || nestedData.answer || nestedData.message || "Gagal parsing",
      timestamp: new Date().toISOString(),
      responseTime: responseTime
    }, null, 2), { status: 200, headers: headersResponse });

  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: headersResponse });
  }
}
