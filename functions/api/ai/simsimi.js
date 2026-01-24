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

  // Trik Anti Salah Ketik: Normalisasi parameter
  const params = {};
  for (const [key, value] of url.searchParams.entries()) {
    params[key.toLowerCase()] = value;
  }

  const text = params.q || params.text || params.message;
  const lang = params.lang || 'id';

  if (!text) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'text' atau 'q' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  const BASE_URL = 'https://kube-appserver.simsimi.com:30443';
  const commonHeaders = {
    'accept': 'application/json, text/plain, */*',
    'accept-encoding': 'gzip',
    'av': '9.1.2',
    'content-type': 'application/json',
    'os': 'a',
    'user-agent': 'okhttp/4.10.0'
  };

  try {
    // 1. Validasi Bahasa (Sesuai logika skrip asli)
    const lcRes = await fetch(`${BASE_URL}/setting/lc-list`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({ cc: 'TH' })
    });
    const lcData = await lcRes.json();
    const isLangValid = lcData.some(l => l.lc === lang);

    if (!isLangValid) {
      throw new Error(`Bahasa '${lang}' tidak didukung.`);
    }

    // 2. Kirim Pesan Chat
    const chatRes = await fetch(`${BASE_URL}/simtalk/get_talk_set`, {
      method: 'POST',
      headers: {
        ...commonHeaders,
        'x-signature': '7aada6ad4e0a69a6049f26819d21464aa16f0f06fe9376de474af73c88e60afb'
      },
      body: JSON.stringify({
        uid: 509027922,
        av: '9.1.2',
        os: 'a',
        lc: lang,
        cc: 'TH',
        tz: 'Asia/Bangkok',
        cv: '',
        message: text,
        free_level: 4,
        logUID: '509027922',
        reg_now_days: 0
      })
    });

    const data = await chatRes.json();

    // Sesuai Aturan: Mencari string jawaban terpanjang sebagai result
    const nestedData = data.sentence || data;
    let bestMatch = "";
    
    if (typeof nestedData === 'string') {
      bestMatch = nestedData;
    } else {
      const ignoreKeys = ['status', 'success', 'timestamp', 'responsetime', 'uid', 'loguid'];
      for (let key in nestedData) {
        let val = nestedData[key];
        if (typeof val === 'string' && !ignoreKeys.includes(key.toLowerCase())) {
          if (val.trim() !== text.trim() && val.length > bestMatch.length) {
            bestMatch = val;
          }
        }
      }
    }

    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: bestMatch || data.sentence || "Simi tidak tahu harus jawab apa...",
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
