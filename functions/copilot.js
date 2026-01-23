export async function onRequest(context) {
  const start = Date.now();
  const { request, env } = context;
  const url = new URL(request.url);
  const author = env.AUTHOR || "AngelaImut";
  const headersResponse = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === "OPTIONS") return new Response(null, { headers: headersResponse });

  // Mengambil input dari parameter q, text, atau prompt
  const q = url.searchParams.get('q') || url.searchParams.get('text') || url.searchParams.get('prompt') || url.searchParams.get('query');
  const modelName = "copilot-gpt5"; // Label untuk internal

  if (!q) {
    return new Response(JSON.stringify({ success: false, message: "Query q/prompt diperlukan" }), { status: 400, headers: headersResponse });
  }

  // Target URL API Copilot dengan model gpt-5 sesuai permintaanmu
  const targetUrl = 'https://labs.shannzx.xyz/api/v1/copilot';

  try {
    // Menyusun URL dengan parameter prompt dan model gpt-5
    const finalUrl = `${targetUrl}?model=gpt-5&prompt=${encodeURIComponent(q)}`;
    
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const data = await response.json();
    // Mengambil data dari properti 'data' sesuai contoh JSON yang kamu berikan
    const nestedData = data.data || data;
    
    let bestMatch = "";
    const ignoreKeys = ['status', 'author', 'creator', 'message_id', 'success', 'timestamp', 'responsetime', 'source'];
    
    // Logika pencarian jawaban string terpanjang
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
      result: bestMatch || nestedData.text || nestedData.message || "Gagal parsing",
      timestamp: new Date().toISOString(),
      responseTime: responseTime
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
