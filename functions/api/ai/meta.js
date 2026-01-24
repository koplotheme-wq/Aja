// ==========================================
// Author  : If you like content like this, you can join this channel. 📲
// Contact : https://t.me/jieshuo_materials
// ==========================================

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const message = url.searchParams.get('message') || url.searchParams.get('q');
  const customPrompt = url.searchParams.get('prompt');
  
  // Ambil ID dari URL buat memori
  const existingSessionId = url.searchParams.get('sessionId');
  const existingThreadId = url.searchParams.get('threadId');

  const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data, null, 2), {
      status: status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'User-Agent': 'AngelaImut-Worker'
      }
    });
  };

  if (!message) return jsonResponse({ status: true, author: "AngelaImut", message: "Yuna Memory Mode Active!" });

  const SYSTEM_PROMPT = customPrompt || `You are Yuna, a gentle, feminine, anime-style virtual girl...`;

  // --- HELPER ASLI (GAK DIRUBA) ---
  const generateRandomDOB = () => `19${Math.floor(Math.random() * 30 + 70)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
  const generateUUID = () => crypto.randomUUID();
  const generateRandomId = () => Math.floor(Math.random() * 9e18).toString();

  // --- FUNGSI INTI (GAK DIRUBA) ---
  async function getToken() {
    const form = new FormData();
    const params = {
      'av': '0', '__user': '0', '__a': '1', '__req': 't', 'dpr': '1', '__rev': '1032408219',
      'lsd': 'AdJzP_b_qoc', 'jazoest': '21052', 'doc_id': '25102616396026783'
    };
    for (const [key, value] of Object.entries(params)) { form.append(key, value); }
    form.append('variables', JSON.stringify({ "dob": generateRandomDOB() }));
    const res = await fetch('https://www.meta.ai/api/graphql/', {
      method: 'POST',
      headers: { 'cookie': 'datr=sU90afPSYelxqmSaKqer58Hc; wd=1366x643', 'user-agent': 'Mozilla/5.0' },
      body: form
    });
    const data = await res.json();
    return { access_token: data?.data?.xab_abra_accept_terms_of_service?.new_temp_user_auth?.access_token };
  }

  async function sendMetaMessage(accessToken, msgText, isNewConv, conversationIds) {
    const { externalConversationId, threadSessionId } = conversationIds;
    const offlineThreadingId = generateRandomId();
    const form = new FormData();
    const params = {
      'av': '0', 'access_token': accessToken, '__user': '0', '__a': '1', '__req': 'v',
      'lsd': 'AdJzP_b_qoc', 'fb_api_req_friendly_name': 'useKadabraSendMessageMutation', 'doc_id': '24895882500088854'
    };
    for (const [key, value] of Object.entries(params)) { form.append(key, value); }
    form.append('variables', JSON.stringify({
      message: { sensitive_string_value: msgText },
      externalConversationId, offlineThreadingId, threadSessionId,
      isNewConversation: isNewConv,
      messagePersistentInput: {
          bot_message_offline_threading_id: (BigInt(offlineThreadingId) + 1n).toString(),
          external_conversation_id: externalConversationId,
          is_new_conversation: isNewConv,
          offline_threading_id: offlineThreadingId,
          prompt_session_id: threadSessionId
      },
      alakazam_enabled: true,
      __relay_internal__pv__alakazam_enabledrelayprovider: true
    }));
    const response = await fetch('https://graph.meta.ai/graphql?locale=user', {
      method: 'POST',
      headers: { 'referer': 'https://www.meta.ai/', 'cookie': 'datr=sU90afPSYelxqmSaKqer58Hc' },
      body: form
    });
    return await response.text();
  }

  try {
    const tokenData = await getToken();
    const conversationIds = {
      externalConversationId: existingSessionId || generateUUID(),
      threadSessionId: existingThreadId || generateUUID()
    };

    // TIPS: Kalau akun Guest, terkadang kita harus kirim SYSTEM_PROMPT lagi kalau Session ID-nya udah expired di server Meta
    if (!existingSessionId) {
      await sendMetaMessage(tokenData.access_token, SYSTEM_PROMPT, true, conversationIds);
      // Kasih jeda dikit biar server Meta gak kaget
      await new Promise(r => setTimeout(r, 500));
    }
    
    const rawResponse = await sendMetaMessage(tokenData.access_token, message, false, conversationIds);
    const lines = rawResponse.split('\n').filter(line => line.trim());
    const parsedData = lines.map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);

    let finalResult = null;
    for (let i = parsedData.length - 1; i >= 0; i--) {
      const item = parsedData[i];
      const node = item?.data?.node?.bot_response_message;
      if (node?.content?.text || item?.extensions?.is_final) {
        finalResult = node?.content?.text?.composed_text?.content?.[0]?.text || node?.snippet;
        break;
      }
    }

    if (!finalResult) throw new Error("Meta AI menolak request session ini.");

    return jsonResponse({
      status: true,
      author: "AngelaImut",
      result: finalResult,
      session: {
        sessionId: conversationIds.externalConversationId,
        threadId: conversationIds.threadSessionId
      }
    });

  } catch (error) {
    return jsonResponse({ status: false, author: "AngelaImut", error: error.message }, 500);
  }
}
