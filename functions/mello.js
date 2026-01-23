// ==========================================
// Author  : If you like content like this, you can join this channel. 📲
// Contact : https://t.me/jieshuo_materials
// ==========================================

// Generator Functions (Tetap dipertahankan agar API tidak menolak request)
const generateRandomId = (length = 19) => {
  let result = '';
  result += Math.floor(Math.random() * 9) + 1;
  for (let i = 1; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
};

const generateOpenUdid = () => {
  return 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16));
};

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const generateRticket = () => {
  return String(Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000));
};

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

  // Parameter Routing
  const action = url.searchParams.get('type') || 'search'; // search, detail, atau stream
  const q = url.searchParams.get('q') || url.searchParams.get('id');

  if (!q) {
    return new Response(JSON.stringify({ success: false, message: "Parameter 'q' atau 'id' diperlukan" }), { status: 400, headers: headersResponse });
  }

  const BASE_URL = "https://api.tmtreader.com";
  const commonHeaders = {
    "Host": "api.tmtreader.com",
    "Accept": "application/json; charset=utf-8,application/x-protobuf",
    "User-Agent": "ScRaPe/9.9 (KaliLinux; Nusantara Os; My/Shannz)",
    "X-Xs-From-Web": "false"
  };

  const commonParams = new URLSearchParams({
    "iid": generateRandomId(19),
    "device_id": generateRandomId(19),
    "ac": "wifi",
    "aid": "645713",
    "app_name": "Melolo",
    "device_platform": "android",
    "language": "in",
    "openudid": generateOpenUdid(),
    "current_region": "ID",
    "app_language": "id",
    "_rticket": generateRticket(),
    "cdid": generateUUID()
  });

  try {
    let finalResult = null;

    if (action === 'search') {
      const endpoint = `${BASE_URL}/i18n_novel/search/page/v1/?${commonParams.toString()}&query=${encodeURIComponent(q)}&limit=10&offset=0`;
      const res = await fetch(endpoint, { headers: commonHeaders });
      const json = await res.json();
      const searchData = json?.data?.search_data || [];
      finalResult = [];
      searchData.forEach(section => {
        section.books?.forEach(book => {
          finalResult.push({
            title: book.book_name,
            book_id: book.book_id,
            cover: book.thumb_url,
            author: book.author,
            status: book.show_creation_status
          });
        });
      });
    } 
    
    else if (action === 'detail') {
      const endpoint = `${BASE_URL}/novel/player/video_detail/v1/?${commonParams.toString()}`;
      const payload = {
        "series_id": q,
        "biz_param": { "source": 4, "video_id_type": 1 }
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { ...commonHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      const data = json?.data?.video_data || {};
      finalResult = {
        title: data.series_title,
        intro: data.series_intro,
        cover: data.series_cover,
        episodes: (data.video_list || []).map(v => ({
          id: v.vid,
          episode: v.vid_index,
          title: v.title
        }))
      };
    } 
    
    else if (action === 'stream') {
      const endpoint = `${BASE_URL}/novel/player/video_model/v1/?${commonParams.toString()}`;
      const payload = {
        "video_id": q,
        "biz_param": { "source": 4, "video_id_type": 0, "need_all_video_definition": true }
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { ...commonHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      const raw = json?.data || {};
      const model = raw.video_model ? JSON.parse(raw.video_model) : {};
      
      const downloads = [];
      if (model.video_list) {
        Object.values(model.video_list).forEach(item => {
          let videoUrl = item.main_url;
          if (videoUrl && !videoUrl.startsWith('http')) {
            try { videoUrl = atob(videoUrl); } catch (e) {}
          }
          downloads.push({
            quality: item.definition,
            size: (item.size / (1024 * 1024)).toFixed(2) + " MB",
            url: videoUrl
          });
        });
      }
      finalResult = {
        video_id: q,
        main_url: raw.main_url,
        downloads: downloads.sort((a, b) => parseFloat(b.size) - parseFloat(a.size))
      };
    }

    const responseTime = `${Date.now() - start}ms`;
    return new Response(JSON.stringify({
      success: true,
      author,
      type: action,
      result: finalResult,
      timestamp: new Date().toISOString(),
      responseTime
    }, null, 2), { status: 200, headers: headersResponse });

  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      author,
      error: e.message,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - start}ms`
    }), { status: 500, headers: headersResponse });
  }
}
