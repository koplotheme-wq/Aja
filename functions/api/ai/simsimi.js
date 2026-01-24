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

  const text = params.q || params.text || params.message;
  const lang = params.lang || 'id';

  if (!text) {
    return new Response(JSON.stringify({ success: false, message: "Query q/text diperlukan" }), { status: 400, headers: headersResponse });
  }

  const BASE_URL = 'https://kube-appserver.simsimi.com:30443';
  const commonHeaders = {
    'accept': 'application/json, text/plain, */*',
    'av': '9.1.2',
    'os': 'a',
    'user-agent': 'okhttp/4.10.0',
    'content-type': 'application/json',
    'x-signature': '7aada6ad4e0a69a6049f26819d21464aa16f0f06fe9376de474af73c88e60afb'
  };

  try {
    const chatRes = await fetch(`${BASE_URL}/simtalk/get_talk_set`, {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({
        uid: 509027922,
        av: '9.1.2',
        os: 'a',
        lc: lang,
        cc: 'TH',
        tz: 'Asia/Bangkok',
        message: text,
        free_level: 4,
        logUID: '509027922',
        reg_now_days: 0
      })
      // Timeout dihapus total sesuai permintaan. Kita tunggu sampai server menyerah.
    });

    const responseTime = `${Date.now() - start}ms`;
    const contentType = chatRes.headers.get("content-type") || "";

    // JIKA RESPON ADALAH JSON
    if (contentType.includes("application/json")) {
      const data = await chatRes.json();
      return new Response(JSON.stringify({
        success: true,
        result: data.sentence || data,
        timestamp: new Date().toISOString(),
        responseTime
      }, null, 2), { status: 200, headers: headersResponse });
    } 
    
    // JIKA RESPON ADALAH HTML ATAU TEKS (ERROR SERVER)
    else {
      const rawText = await chatRes.text();
      return new Response(JSON.stringify({
        success: false,
        result: "Server mengirimkan HTML/Teks mentah (bukan JSON)",
        raw_debug: rawText, // Kita tampilkan semua isi HTML-nya di sini
        http_status: chatRes.status,
        timestamp: new Date().toISOString(),
        responseTime
      }, null, 2), { status: chatRes.status, headers: headersResponse });
    }

  } catch (e) {
    const responseTime = `${Date.now() - start}ms`;
    return new Response(JSON.stringify({ 
      success: false, 
      error: e.message,
      timestamp: new Date().toISOString(),
      responseTime
    }), { status: 500, headers: headersResponse });
  }
}
