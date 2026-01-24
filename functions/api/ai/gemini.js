// ==========================================
// Author  : If you like content like this, you can join this channel. 📲
// Contact : https://t.me/jieshuo_materials
// ==========================================

export async function onRequest(context) {
  const start = Date.now();
  const { request } = context;
  const url = new URL(request.url);
  const headersResponse = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === "OPTIONS") return new Response(null, { headers: headersResponse });

  // Normalisasi Parameter (Anti Salah Ketik)
  const params = {};
  for (const [key, value] of url.searchParams.entries()) {
    params[key.toLowerCase()] = value;
  }

  // Input: mendukung 'input', 'q', atau 'text'
  const input = params.input || params.q || params.text;
  const model = params.model || 'gemini-2.0-flash';
  const systemInstruction = params.system || params.instruction;
  
  // Opsional: Mendukung gambar via URL atau Base64 (jika ada)
  const imageUrl = params.image; 

  if (!input) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'input' atau 'q' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  const targetUrl = 'https://us-central1-infinite-chain-295909.cloudfunctions.net/gemini-proxy-staging-v1';

  try {
    const parts = [{ text: input }];

    // Logika Multimodal (Jika ada parameter image)
    if (imageUrl) {
      // Jika image adalah URL, kita bisa menyisipkannya. 
      // Untuk kesederhanaan wrapper, kita asumsikan input multimodal ditangani via base64 jika diberikan secara kompleks.
      // Di sini kita fokus pada teks & system instruction sesuai skrip aslimu.
    }

    const contents = [];

    // Menambahkan System Instruction jika ada
    if (systemInstruction) {
      contents.push({
        role: 'system',
        parts: [{ text: systemInstruction }]
      });
    }

    // Menambahkan User Input
    contents.push({ role: 'user', parts });

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
      },
      body: JSON.stringify({
        model: model,
        contents: contents
      })
    });

    if (!response.ok) {
      throw new Error(`Proxy Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parsing jawaban dari struktur Gemini (candidates[0].content.parts[0].text)
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal mendapatkan respon dari Gemini.";

    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: result,
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
