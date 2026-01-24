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

  // 1. Normalisasi Parameter
  const params = {};
  for (const [key, value] of urlParams.searchParams.entries()) {
    params[key.toLowerCase()] = value;
  }

  const q = params.q || params.text;
  const systemPrompt = params.system || params.prompt;
  const manualToken = params.token || params.access_token; // Cek token bawaan

  if (!q) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'q' atau 'text' diperlukan. Gunakan &token=... jika ingin pakai token sendiri." 
    }), { status: 400, headers: headersResponse });
  }

  // --- HELPER INTERNAL ---
  const cleanMetaJSON = (text) => text.replace(/^for\s*\(\s*;\s*;\s*\)\s*;\s*/, "").trim();
  const genDOB = () => `19${Math.floor(Math.random() * 30 + 70)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
  const genUUID = () => crypto.randomUUID();
  const genRandomId = () => Math.floor(Math.random() * 9e18).toString();

  try {
    let accessToken = manualToken;

    // 2. JIKA TOKEN TIDAK ADA, AMBIL OTOMATIS (DENGAN COOKIE)
    if (!accessToken) {
      const tokenFormData = new FormData();
      const authFields = {
        'av': '0', '__user': '0', '__a': '1', '__req': 't', 'dpr': '1', '__ccg': 'GOOD',
        '__rev': '1032408219', 'lsd': 'AdJzP_b_qoc', 'jazoest': '21052', '__spin_r': '1032408219',
        '__spin_b': 'trunk', '__spin_t': '1769230257', 'doc_id': '25102616396026783'
      };
      Object.entries(authFields).forEach(([k, v]) => tokenFormData.append(k, v));
      tokenFormData.append('variables', JSON.stringify({
        "dob": genDOB(),
        "__relay_internal__pv__AbraQPDocUploadNuxTriggerNamerelayprovider": "meta_dot_ai_abra_web_doc_upload_nux_tour",
        "__relay_internal__pv__AbraSurfaceNuxIDrelayprovider": "12177"
      }));

      const tokenRes = await fetch('https://www.meta.ai/api/graphql/', {
        method: 'POST',
        body: tokenFormData,
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0)',
          'Referer': 'https://www.meta.ai/',
          'Cookie': 'datr=sU90afPSYelxqmSaKqer58Hc; wd=1366x643' // Kunci agar tidak TOS Denied
        }
      });

      const rawTokenText = await tokenRes.text();
      const tokenData = JSON.parse(cleanMetaJSON(rawTokenText));
      accessToken = tokenData.data?.xab_abra_accept_terms_of_service?.new_temp_user_auth?.access_token;
      
      if (!accessToken) throw new Error("Gagal auto-generate token. Harap masukkan &token= manual.");
    }

    // 3. TAHAP KIRIM PESAN
    const extConvId = genUUID();
    const threadId = genUUID();

    const sendMessage = async (msg, isNew) => {
      const chatFormData = new FormData();
      const chatFields = {
        'av': '0', '__user': '0', '__a': '1', '__req': 'v', 'dpr': '1', 'lsd': 'AdJzP_b_qoc',
        'access_token': accessToken, 'fb_api_req_friendly_name': 'useKadabraSendMessageMutation',
        'doc_id': '24895882500088854'
      };
      Object.entries(chatFields).forEach(([k, v]) => chatFormData.append(k, v));
      
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
        __relay_internal__pv__AbraSearchInlineReferencesEnabledrelayprovider: true,
        __relay_internal__pv__KadabraNewCitationsEnabledrelayprovider: true
      }));

      return fetch('https://graph.meta.ai/graphql?locale=user', {
        method: 'POST',
        body: chatFormData,
        headers: { 'Origin': 'https://www.meta.ai', 'Referer': 'https://www.meta.ai/' }
      });
    };

    let finalRes;
    if (systemPrompt) {
      await sendMessage(systemPrompt, true);
      await new Promise(r => setTimeout(r, 800));
      finalRes = await sendMessage(q, false);
    } else {
      finalRes = await sendMessage(q, true);
    }

    const rawChatText = await finalRes.text();
    const lines = rawChatText.split('\n').map(l => cleanMetaJSON(l)).filter(l => l);

    let lastNode = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(lines[i]);
        const node = parsed?.data?.node?.bot_response_message;
        if (node?.content?.text || parsed?.extensions?.is_final) {
          lastNode = node;
          break;
        }
      } catch (e) {}
    }

    if (!lastNode) throw new Error("Respon Meta AI kosong. Token mungkin kadaluarsa.");

    const responseTime = `${Date.now() - start}ms`;
    return new Response(JSON.stringify({
      success: true,
      result: {
        text: lastNode.content?.text?.composed_text?.content?.[0]?.text || lastNode.snippet,
        sources: lastNode.citations?.map(c => c.url) || []
      },
      token_used: accessToken.substring(0, 10) + "...", // Info token yang dipakai
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
