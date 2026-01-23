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
  const params = {};
  for (const [key, value] of url.searchParams.entries()) {
    params[key.toLowerCase()] = value;
  }
  const q = params.q || params.text || params.query;
  if (!q) {
    return new Response(JSON.stringify({
      success: false,
      message: "Query (q/text/query) diperlukan"
    }), { status: 400, headers: headersResponse });
  }
  const targetUrl = 'https://zelapioffciall.koyeb.app/ai/castorice';
  try {
    const finalUrl = `${targetUrl}?text=${encodeURIComponent(q)}`;
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const data = await response.json();
    const nestedData = data.answer || data.result || data;
    let bestMatch = "";
    if (typeof nestedData === 'object') {
      const ignoreKeys = ['status', 'creator', 'success', 'timestamp', 'responsetime'];
      for (let key in nestedData) {
        let val = nestedData[key];
        if (typeof val === 'string' && !ignoreKeys.includes(key.toLowerCase())) {
          if (val.trim() !== q.trim() && val.length > bestMatch.length) {
            bestMatch = val;
          }
        }
      }
    } else {
      bestMatch = nestedData;
    }
    const responseTime = `${Date.now() - start}ms`;
    return new Response(JSON.stringify({
      success: true,
      result: bestMatch || "Gagal mendapatkan jawaban",
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
