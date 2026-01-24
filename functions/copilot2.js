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

  // Trik Anti Salah Ketik: Normalisasi parameter
  const params = {};
  for (const [key, value] of url.searchParams.entries()) {
    params[key.toLowerCase()] = value;
  }

  const q = params.q || params.text || params.query;
  const modelType = params.model || 'default';

  if (!q) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'q' atau 'text' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  const models = {
    default: 'chat',
    'think-deeper': 'reasoning',
    'gpt-5': 'smart'
  };

  const targetModel = models[modelType] || 'chat';
  const headers = {
    'Origin': 'https://copilot.microsoft.com',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
  };

  try {
    // 1. Create Conversation (HTTP)
    const convRes = await fetch('https://copilot.microsoft.com/c/api/conversations', {
      method: 'POST',
      headers: headers
    });
    
    if (!convRes.ok) throw new Error("Gagal membuat sesi percakapan Copilot");
    const convData = await convRes.json();
    const conversationId = convData.id;

    // 2. Chat via WebSocket
    const wsUrl = `wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-,ncedge,edgepagecontext&setflight=-,ncedge,edgepagecontext&ncedge=1`;
    
    // Kita bungkus WebSocket ke dalam Promise agar Cloudflare menunggu sampai selesai
    const aiResult = await new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      let fullText = '';
      let citations = [];

      // Timeout safety (30 detik agar tidak kena Error 524 Cloudflare)
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error("Copilot terlalu lama merespon (Timeout)"));
      }, 30000);

      socket.onopen = () => {
        socket.send(JSON.stringify({
          event: 'setOptions',
          supportedFeatures: ['partial-generated-images'],
          supportedCards: ['weather', 'local', 'image', 'sports', 'video', 'ads', 'safetyHelpline', 'quiz', 'finance', 'recipe']
        }));

        socket.send(JSON.stringify({
          event: 'send',
          mode: targetModel,
          conversationId: conversationId,
          content: [{ type: 'text', text: q }],
          context: {}
        }));
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          
          if (parsed.event === 'appendText') {
            fullText += parsed.text || '';
          } else if (parsed.event === 'citation') {
            citations.push(`[${parsed.id}] ${parsed.title}: ${parsed.url}`);
          } else if (parsed.event === 'done') {
            clearTimeout(timeout);
            const finalOutput = citations.length > 0 
              ? `${fullText}\n\nSources:\n${citations.join('\n')}`
              : fullText;
            resolve(finalOutput);
            socket.close();
          } else if (parsed.event === 'error') {
            clearTimeout(timeout);
            reject(new Error(parsed.message));
            socket.close();
          }
        } catch (e) {
          // Abaikan error parsing kecil selama streaming
        }
      };

      socket.onerror = (err) => {
        clearTimeout(timeout);
        reject(new Error("WebSocket Connection Error"));
      };
    });

    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: aiResult,
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
