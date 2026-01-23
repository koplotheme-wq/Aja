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

  // Trik Anti Salah Ketik: Normalisasi semua parameter ke huruf kecil
  const params = {};
  for (const [key, value] of url.searchParams.entries()) {
    params[key.toLowerCase()] = value;
  }

  // Mengambil input dari parameter text, q, atau query (apapun case-nya)
  const q = params.text || params.q || params.query;

  if (!q) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'text' atau 'q' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  const targetUrl = 'https://chatbot-ji1z.onrender.com/chatbot-ji1z';

  // Menyiapkan Payload sesuai logika PHP asli
  const payload = {
    messages: [
      {
        role: 'assistant',
        content: "How can I assist you today!."
      },
      {
        role: 'user',
        content: q
      }
    ]
  };

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': 'https://seoschmiede.at',
        'Referer': 'https://seoschmiede.at/en/aitools/chatgpt-tool/'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Target API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parsing jawaban dari struktur OpenAI (choices[0].message.content)
    const aiResponse = data.choices?.[0]?.message?.content || "";
    
    // Logika bestMatch tetap dijalankan sebagai fallback parsing
    let bestMatch = aiResponse;
    if (!bestMatch) {
      const nestedData = data.data || data;
      const ignoreKeys = ['status', 'success', 'timestamp', 'responsetime', 'join'];
      for (let key in nestedData) {
        let val = nestedData[key];
        if (typeof val === 'string' && !ignoreKeys.includes(key.toLowerCase())) {
          if (val.trim() !== q.trim() && val.length > bestMatch.length) {
            bestMatch = val;
          }
        }
      }
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
