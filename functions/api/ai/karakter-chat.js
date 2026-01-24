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

  const text = params.q || params.text;
  const charId = params.char_id || params.id;
  const action = params.action || 'chat'; // 'chat' atau 'search'

  const CAI_TOKEN = '55c00cd91b3521a73e4ca58087144891681063c6';
  const CAI_HEADERS = {
    'Authorization': `Token ${CAI_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://character.ai'
  };

  try {
    let finalResult;

    // --- LOGIKA SEARCH ---
    if (action === 'search') {
      if (!text) throw new Error("Parameter 'q' diperlukan untuk pencarian.");
      const searchRes = await fetch(`https://plus.character.ai/chat/characters/search/?query=${encodeURIComponent(text)}`, {
        headers: CAI_HEADERS
      });
      const searchData = await searchRes.json();
      finalResult = searchData.characters?.map(c => ({
        id: c.external_id,
        name: c.participant__name,
        title: c.title,
        avatar: `https://characterai.io/i/80/static/avatars/${c.avatar_file_name}`
      })) || [];
    } 

    // --- LOGIKA CHAT ---
    else {
      if (!text || !charId) throw new Error("Parameter 'text' dan 'char_id' diperlukan.");

      // 1. Buat/Dapatkan Chat ID
      const convRes = await fetch('https://plus.character.ai/chat/conversation/create/', {
        method: 'POST',
        headers: CAI_HEADERS,
        body: JSON.stringify({ character_external_id: charId })
      });
      const convData = await convRes.json();
      const chatId = convData.external_id;

      // 2. Kirim Pesan (Streaming API)
      const chatRes = await fetch('https://plus.character.ai/chat/streaming/', {
        method: 'POST',
        headers: CAI_HEADERS,
        body: JSON.stringify({
          character_external_id: charId,
          history_external_id: chatId,
          text: text,
          tgt: charId,
          voice_enabled: false
        })
      });

      // Character AI mengirim data dalam format chunk (NDJSON)
      // Kita ambil chunk terakhir untuk mendapatkan jawaban utuh
      const rawResponse = await chatRes.text();
      const lines = rawResponse.split('\n').filter(l => l.trim() !== '');
      const lastLine = JSON.parse(lines[lines.length - 1]);
      
      finalResult = {
        chatId: chatId,
        answer: lastLine.replies?.[0]?.text || "No response",
        name: lastLine.src_char?.participant?.name || "AI"
      };
    }

    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: finalResult,
      timestamp: new Date().toISOString(),
      responseTime
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
