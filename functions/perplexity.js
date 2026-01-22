// ==========================================
// Author  : If you like content like this, you can join this channel. 📲
// Contact : https://t.me/jieshuo_materials
// ==========================================

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

  const q = url.searchParams.get('q') || url.searchParams.get('text') || url.searchParams.get('query');
  const model = "perplexity";

  if (!q) {
    return new Response(JSON.stringify({ status: false, author, message: "Query q diperlukan" }), { status: 400, headers: headersResponse });
  }

  const targetUrl = 'https://labs.shannzx.xyz/api/v1/perplexity';

  try {
    const finalUrl = `${targetUrl}?query=${encodeURIComponent(q)}`;
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const data = await response.json();
    // Mengambil nested data sesuai format JSON yang kamu lampirkan (data.data)
    const nestedData = data.data || data;
    
    let bestMatch = "";
    const ignoreKeys = ['status', 'author', 'creator', 'message_id'];
    
    for (let key in nestedData) {
      let val = nestedData[key];
      if (typeof val === 'string' && !ignoreKeys.includes(key.toLowerCase())) {
        if (val.trim() !== q.trim() && val.length > bestMatch.length) {
          bestMatch = val;
        }
      }
    }

    const runtime = `${((Date.now() - start) / 1000).toFixed(2)}s`;
    
    return new Response(JSON.stringify({
      status: true,
      author,
      runtime,
      model,
      reply: bestMatch || nestedData.answer || nestedData.message || "Gagal parsing"
    }, null, 2), { status: 200, headers: headersResponse });

  } catch (e) {
    return new Response(JSON.stringify({ status: false, author, error: e.message }), { status: 500, headers: headersResponse });
  }
}