// ==========================================
// Author  : If you like content like this, you can join this channel. 📲
// Contact : https://t.me/jieshuo_materials
// ==========================================

export async function onRequest(context) {
  const start = Date.now();
  const { request } = context;
  const urlParams = new URL(request.url);
  const headersResponse = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (request.method === "OPTIONS") return new Response(null, { headers: headersResponse });

  // Normalisasi Parameter (Anti Salah Ketik)
  const params = {};
  for (const [key, value] of urlParams.searchParams.entries()) {
    params[key.toLowerCase()] = value;
  }

  const targetUrl = params.url || params.q || params.link;

  if (!targetUrl) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'url' atau 'link' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  // Fungsi internal untuk MimeType
  const getMimeType = (url) => {
    if (!url) return 'unknown';
    const ext = url.split('.').pop().split(/[?#]/)[0].toLowerCase();
    const map = {
      '7z': 'application/x-7z-compressed', 'zip': 'application/zip', 'rar': 'application/x-rar-compressed',
      'apk': 'application/vnd.android.package-archive', 'exe': 'application/x-msdownload', 'pdf': 'application/pdf',
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'mp3': 'audio/mpeg', 'mp4': 'video/mp4'
    };
    return map[ext] || 'application/octet-stream';
  };

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error("Gagal mengambil data dari Mediafire.");
    const html = await response.text();

    // Scraping menggunakan Regex (Lebih cepat di Cloudflare daripada Cheerio)
    const title = html.match(/property="og:title"\s+content="([^"]+)"/)?.[1] || "Unknown Title";
    const image = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] || "";
    const description = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1] || "";
    
    // Mencari Direct Link (Download Button)
    const dlLink = html.match(/aria-label="Download file"\s+href="([^"]+)"/)?.[1] || 
                   html.match(/id="downloadButton"\s+href="([^"]+)"/)?.[1];
    
    // Mencari Size
    const sizeMatch = html.match(/Download\s+\(([^)]+)\)/)?.[1] || "Unknown Size";

    if (!dlLink) throw new Error("Direct link tidak ditemukan. Pastikan URL benar.");

    const result = {
      meta: {
        title: title.trim(),
        image: image,
        description: description.trim()
      },
      download: {
        url: dlLink,
        size: sizeMatch.trim(),
        mimetype: getMimeType(dlLink)
      }
    };

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
