// ==========================================
// Author  : If you like content like this, you can join this channel. 📲
// Contact : https://t.me/jieshuo_materials
// ==========================================

export async function onRequest(context) {
  const start = Date.now();
  const { request, env } = context;
  const urlParams = new URL(request.url).searchParams;
  const author = env.AUTHOR || "AngelaImut";
  
  const headersResponse = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === "OPTIONS") return new Response(null, { headers: headersResponse });

  // Parameter input q atau url
  const targetUrl = urlParams.get('q') || urlParams.get('url') || urlParams.get('text');

  if (!targetUrl) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Query 'url' atau 'q' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  const BASE_URL = 'https://downr.org';
  const INFO_API = `${BASE_URL}/.netlify/functions/video-info`;
  const DOWNLOAD_API = `${BASE_URL}/.netlify/functions/youtube-download`;
  const ANALYTICS_API = `${BASE_URL}/.netlify/functions/analytics`;

  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': BASE_URL,
    'Referer': `${BASE_URL}/`,
    'Content-Type': 'application/json',
    'Accept': '*/*'
  };

  try {
    // 1. Init Session (Analytics)
    await fetch(ANALYTICS_API, { method: 'GET', headers: commonHeaders }).catch(() => {});

    // 2. Fetch Video Info dengan Logika Retry (maks 3x)
    let videoData = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const infoRes = await fetch(INFO_API, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify({ url: targetUrl })
      });

      if (infoRes.status === 403) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      videoData = await infoRes.json();
      break;
    }

    if (!videoData) throw new Error("Gagal mengambil informasi video setelah beberapa percobaan.");

    // 3. Build Tasks (Logika filter media)
    const mediaList = videoData.medias || [];
    const tasks = [];
    
    const video240p = mediaList.find(m => m.quality === '240p' && m.type === 'video');
    const audioSource = mediaList.find(m => m.type === 'audio');

    if (video240p) {
      tasks.push({
        name: 'Video MP4 (240p)',
        payload: { url: targetUrl, downloadMode: 'auto', videoQuality: '240p' }
      });
    }
    if (audioSource) {
      tasks.push({
        name: 'Audio MP3 (128kbps)',
        payload: { url: targetUrl, downloadMode: 'audio', videoQuality: '128' }
      });
    }

    // 4. Request Download Links
    const results = await Promise.all(tasks.map(async (task) => {
      const dlRes = await fetch(DOWNLOAD_API, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(task.payload)
      });
      const dlData = await dlRes.json();
      return {
        type: task.name,
        download_url: dlData.url || dlData.link || null,
        filename: dlData.filename || videoData.title || "download"
      };
    }));

    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: {
        title: videoData.title,
        thumbnail: videoData.thumbnail,
        duration: videoData.duration,
        downloads: results
      },
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