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

  // Normalisasi Parameter
  const params = {};
  for (const [key, value] of urlParams.searchParams.entries()) {
    params[key.toLowerCase()] = value;
  }

  const q = params.q || params.text;
  const systemPrompt = params.system || params.prompt;

  if (!q) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'q' atau 'text' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  // --- HELPER FUNCTIONS ---
  const genDOB = () => {
    const year = Math.floor(Math.random() * (2005 - 1970 + 1)) + 1970;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const genUUID = () => crypto.randomUUID();
  const genRandomId = () => Math.floor(Math.random() * 9e18).toString();

  try {
    // 1. GET GUEST TOKEN
    const tokenFormData = new FormData();
    const commonFields = {
      'av': '0', '__user': '0', '__a': '1', '__req': 't', 'dpr': '1', '__ccg': 'GOOD',
      '__rev': '1032408219', 'lsd': 'AdJzP_b_qoc', 'jazoest': '21052', '__spin_r': '1032408219',
      '__spin_b': 'trunk', '__spin_t': '1769230257'
    };
    Object.entries(commonFields).forEach(([k, v]) => tokenFormData.append(k, v));
    tokenFormData.append('variables', JSON.stringify({
      "dob": genDOB(),
      "__relay_internal__pv__AbraQPDocUploadNuxTriggerNamerelayprovider": "meta_dot_ai_abra_web_doc_upload_nux_tour",
      "__relay_internal__pv__AbraSurfaceNuxIDrelayprovider": "12177"
    }));
    tokenFormData.append('doc_id', '25102616396026783');

    const tokenRes = await fetch('https://www.meta.ai/api/graphql/', {
      method: 'POST',
      body: tokenFormData,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.meta.ai/' }
    });
    const tokenData = await tokenRes.json();
    const auth = tokenData.data?.xab_abra_accept_terms_of_service?.new_temp_user_auth;
    if (!auth) throw new Error("Gagal mendapatkan akses token Meta AI");

    // 2. SEND MESSAGE LOGIC
    const extConvId = genUUID();
    const threadId = genUUID();
    const accessToken = auth.access_token;

    const sendMessage = async (msg, isNew) => {
      const chatFormData = new FormData();
      Object.entries(commonFields).forEach(([k, v]) => chatFormData.append(k, v));
      chatFormData.append('access_token', accessToken);
      chatFormData.append('fb_api_req_friendly_name', 'useKadabraSendMessageMutation');
      chatFormData.append('doc_id', '24895882500088854');
      
      const offId = genRandomId();
      chatFormData.append('variables', JSON.stringify({
        message: { sensitive_string_value: msg },
        externalConversationId: extConvId,
        offlineThreadingId: offId,
        threadSessionId: threadId,
        isNewConversation: isNew,
        selectedModel: "BASIC_OPTION",
        messagePersistentInput: {
          bot_message_offline_threading_id: (BigInt(offId) + 1n).toString(),
          external_conversation_id: extConvId,
          is_new_conversation: isNew,
          offline_threading_id: offId,
          prompt_session_id: threadId
        },
        alakazam_enabled: true,
        __relay_internal__pv__alakazam_enabledrelayprovider: true,
        __relay_internal__pv__AbraSearchInlineReferencesEnabledrelayprovider: true,
        __relay_internal__pv__KadabraNewCitationsEnabledrelayprovider: true
      }));

      return fetch('https://graph.meta.ai/graphql?locale=user', {
        method: 'POST',
        body: chatFormData
      });
    };

    // Eksekusi (Jika ada system prompt, kirim dulu baru user message)
    let finalRes;
    if (systemPrompt) {
      await sendMessage(systemPrompt, true);
      // Tunggu sebentar agar tidak tabrakan di backend Meta
      await new Promise(r => setTimeout(r, 800));
      finalRes = await sendMessage(q, false);
    } else {
      finalRes = await sendMessage(q, true);
    }

    // 3. PARSING STREAM
    const rawText = await finalRes.text();
    const lines = rawText.split('\n').filter(l => l.trim());
    let lastData = null;

    // Cari node bot_response_message terakhir yang valid
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(lines[i]);
        const node = parsed?.data?.node?.bot_response_message;
        if (node?.content?.text || parsed?.extensions?.is_final) {
          lastData = node;
          break;
        }
      } catch (e) {}
    }

    if (!lastData) throw new Error("Gagal mengekstrak respon dari Meta AI");

    const result = {
      text: lastData.content?.text?.composed_text?.content?.[0]?.text || lastData.snippet,
      sources: lastData.citations?.map(c => c.url) || [],
      reels: lastData.content?.card?.reels_v2?.map(r => ({
        title: r.title,
        url: r.url,
        video: r.videoDeliveryResponseResult?.progressive_urls?.find(v => v.metadata?.quality === "HD")?.progressive_url
      })) || null
    };

    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: result,
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
