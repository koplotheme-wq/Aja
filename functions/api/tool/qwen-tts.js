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

  const text = params.text || params.q;
  const voiceInput = (params.voice || 'dylan').toLowerCase();
  
  const voices = ['dylan', 'sunny', 'jada', 'cherry', 'ethan', 'serena', 'chelsie'];

  // Validasi Input
  if (!text) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'text' atau 'q' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  if (!voices.includes(voiceInput)) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: `Pilihan suara tidak valid. Tersedia: ${voices.join(', ')}` 
    }), { status: 400, headers: headersResponse });
  }

  try {
    const session_hash = Math.random().toString(36).substring(2);
    const voiceFormatted = voiceInput.charAt(0).toUpperCase() + voiceInput.slice(1);

    // 1. Join Queue (Gradio API)
    const joinRes = await fetch('https://qwen-qwen-tts-demo.hf.space/gradio_api/queue/join?', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [text, voiceFormatted],
        event_data: null,
        fn_index: 2,
        trigger_id: 13,
        session_hash: session_hash
      })
    });

    if (!joinRes.ok) throw new Error("Gagal mengantre di server TTS");

    // 2. Listen to Stream Data
    // Kita mengambil data dari endpoint stream Gradio
    const streamRes = await fetch(`https://qwen-qwen-tts-demo.hf.space/gradio_api/queue/data?session_hash=${session_hash}`, {
      method: 'GET',
      headers: { 'Accept': 'text/event-stream' }
    });

    const streamText = await streamRes.text();
    let audioUrl = null;

    // Parsing sederhana dari format Server-Sent Events (SSE) Gradio
    const lines = streamText.split('\n\n');
    for (const line of lines) {
      if (line.startsWith('data:')) {
        try {
          const jsonData = JSON.parse(line.substring(6));
          if (jsonData.msg === 'process_completed' && jsonData.output?.data?.[0]?.url) {
            audioUrl = jsonData.output.data[0].url;
            break;
          }
        } catch (e) {
          continue; // Abaikan line yang bukan JSON valid
        }
      }
    }

    if (!audioUrl) throw new Error("Gagal memproses audio atau antrean terlalu panjang");

    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: audioUrl,
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
