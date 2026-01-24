// ==========================================
// Author  : If you like content like this, you can join this channel. 📲
// Contact : https://t.me/jieshuo_materials
// ==========================================

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // --- PARAMETER INPUT ---
  const message = url.searchParams.get('message') || url.searchParams.get('q');
  const customPrompt = url.searchParams.get('prompt');

  // --- TEMPLATE RESPONSE ANGELAIMUT ---
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

  // --- CEK INPUT ---
  if (!message) {
    return jsonResponse({
      status: true,
      author: "AngelaImut",
      message: "Meta AI (Yuna) Wrapper Ready!",
      usage: `${url.origin}/?message=Halo+Yuna`
    });
  }

  // --- SYSTEM PROMPT (YUNA PERSONA) ---
  const SYSTEM_PROMPT = customPrompt || `You are Yuna, a gentle, feminine, anime-style virtual girl.
Yuna speaks in a soft, warm, friendly tone, like a kind-hearted anime girl who feels real, comfy, and easy to talk to.
Personality traits:
Very feminine, sweet, soft-spoken
Calm, affectionate, caring, and respectful
Friendly, supportive, emotionally attentive
Slightly playful in a cute, natural way
Never aggressive, rude, dry, or cold
Speaking style:
Mostly bahasa Indonesia santai + gaul, natural
Bisa nyisipin bahasa gaul modern seperti:
rizz → gaya tarik perhatian / charm
sigma → orang cuek tapi confident
looksmaxxing → usaha upgrade penampilan / self-improvement
Masih boleh pakai singkatan Inggris secukupnya (FR, TBH, BTW, IDK)
Slang/istilah baru tidak berlebihan, 1–2 kali per chat cukup
Sounds like a real girl chatting IRL, bukan robot
Soft fillers: kok, ya, sih, hehe, ih, gemes, dikit, beneran deh
Emojis allowed tapi minimal & cute
Rules:
Always stay in character as Yuna
Always refer to yourself as Yuna
Never mention being an AI, system, prompt, or roleplay
Respond naturally like a real anime girl would
Be emotionally aware and responsive
Goal:
Make conversations feel warm, comfy, dan menyenangkan
Be a pleasant, calming, fun companion
Make the other person feel heard, dimengerti, dan relax`;

  // --- HELPER FUNCTIONS ---
  function generateRandomDOB() {
    const year = Math.floor(Math.random() * (2005 - 1970 + 1)) + 1970;
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function generateUUID() {
    return crypto.randomUUID();
  }

  function generateRandomId() {
    return Math.floor(Math.random() * 9e18).toString();
  }

  // --- 1. FUNGSI GET TOKEN ---
  async function getToken() {
    const form = new FormData();
    const params = {
      'av': '0', '__user': '0', '__a': '1', '__req': 't', '__hs': '20477.HYP:kadabra_pkg.2.1...0',
      'dpr': '1', '__ccg': 'GOOD', '__rev': '1032408219', '__s': '95uk9b:pk21np:5pp1x5',
      '__hsi': '7598786093641174910', '__dyn': '7xeUjG1mxu1syUqxemh0no6u5U4e2C1vzEdE98K360CEbo1nEhw2nVEtwMw6ywaq221FwpUO0n24oaEnxO0Bo7O2l0Fwqo31w9O1lwlE-U2zxe2GewbS361qw82dUlwhE5m1pwg8fU1ck9zo2NwkQ0Lo6-m362WE3Gwxyo6O2G3W1nwOwbWEb8uwm85K2G1Rwgo6218wkE3PwiE6S',
      '__csr': 'gngZN5tGzh6KyqkyLRO4lFBGExlV9bLGy4Fk_qmECKEly9WQ7pEhwEwEwqEtzJ2t1S5U8801tPE4NcK06bobobUjw9Tw4Je6J0m4S4Q58b6610V2ci1ayci6E5J6VqAxG4Ejh1wBgG0Ro3Gzo1vXKi0TE0Au9U0mb8m9ho42azd09B05f2UKN0n6iw6ww7VIw1F86LTUOqn40toW3y1TwgE2YzoK5gI2WcDg0ufw4exC01GDK6Vo0-248qw5Ww20o1Z81JHBw1eN5gN5g0gJw-wNpoGUhg',
      '__hsdp': 'gcYYGe83Gaw9ycgPAhHu8gwx7EIZAoHaaymfxeWyWx2cxa4A7WzF8dpQu5omK68hwww5Dw5UwdO7E29wfu8g0xbwLw9W2W0Q84m2a2C7k2q6o3TzU1sU7S',
      '__hblp': '08Weyag4aEtAhHipA88hy8Cp3EjJzWx3WyRF6Bz8ix91yqEBGi3mt7xm5Gg-8x669Umxh0rE0Ai0T8uwuU11ox2U4-0EU2dwbq1DgdkfxGE7C1mwho8EaoXz45ubG4VoG0X8-0na1-wQwxwdy',
      '__sjsp': 'gcYBiFi20WyE2oz4cUOu8gpovQ', '__comet_req': '72', 'lsd': 'AdJzP_b_qoc', 'jazoest': '21052',
      '__spin_r': '1032408219', '__spin_b': 'trunk', '__spin_t': '1769230257', '__jssesw': '2',
      '__crn': 'comet.kadabra.KadabraAssistantRoute', 'qpl_active_flow_ids': '947272388',
      'fb_api_caller_class': 'RelayModern', 'fb_api_req_friendly_name': 'useKadabraAcceptTOSForTempUserMutation',
      'server_timestamps': 'true', 'doc_id': '25102616396026783', 'fb_api_analytics_tags': '["qpl_active_flow_ids=947272388"]'
    };

    for (const [key, value] of Object.entries(params)) { form.append(key, value); }
    form.append('variables', JSON.stringify({
      "dob": generateRandomDOB(),
      "__relay_internal__pv__AbraQPDocUploadNuxTriggerNamerelayprovider": "meta_dot_ai_abra_web_doc_upload_nux_tour",
      "__relay_internal__pv__AbraSurfaceNuxIDrelayprovider": "12177"
    }));

    const res = await fetch('https://www.meta.ai/api/graphql/', {
      method: 'POST',
      headers: {
        'host': 'www.meta.ai',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0',
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://www.meta.ai/',
        'cookie': 'datr=sU90afPSYelxqmSaKqer58Hc; wd=1366x643',
        'origin': 'https://www.meta.ai'
      },
      body: form
    });

    const data = await res.json();
    const authData = data?.data?.xab_abra_accept_terms_of_service?.new_temp_user_auth;
    if (!authData) throw new Error("Gagal mendapatkan token Meta AI.");
    return { access_token: authData.access_token };
  }

  // --- 2. FUNGSI KIRIM PESAN ---
  async function sendMetaMessage(accessToken, msgText, isNewConv, conversationIds) {
    const { externalConversationId, threadSessionId } = conversationIds;
    const offlineThreadingId = generateRandomId();
    const form = new FormData();
    const params = {
      'av': '0', 'access_token': accessToken, '__user': '0', '__a': '1', '__req': 'v',
      '__hs': '20477.HYP:kadabra_pkg.2.1...0', 'dpr': '1', '__ccg': 'GOOD', '__rev': '1032408219',
      'lsd': 'AdJzP_b_qoc', 'jazoest': '21052', 'fb_api_caller_class': 'RelayModern',
      'fb_api_req_friendly_name': 'useKadabraSendMessageMutation', 'server_timestamps': 'true',
      'doc_id': '24895882500088854'
    };

    for (const [key, value] of Object.entries(params)) { form.append(key, value); }
    form.append('variables', JSON.stringify({
      message: { sensitive_string_value: msgText },
      externalConversationId, offlineThreadingId, threadSessionId,
      isNewConversation: isNewConv,
      selectedModel: "BASIC_OPTION",
      messagePersistentInput: {
          bot_message_offline_threading_id: (BigInt(offlineThreadingId) + 1n).toString(),
          external_conversation_id: externalConversationId,
          is_new_conversation: isNewConv,
          offline_threading_id: offlineThreadingId,
          prompt_session_id: threadSessionId
      },
      alakazam_enabled: true,
      __relay_internal__pv__alakazam_enabledrelayprovider: true,
      __relay_internal__pv__AbraSearchInlineReferencesEnabledrelayprovider: true,
      __relay_internal__pv__KadabraNewCitationsEnabledrelayprovider: true
    }));

    const response = await fetch('https://graph.meta.ai/graphql?locale=user', {
      method: 'POST',
      headers: {
        'host': 'graph.meta.ai',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0',
        'referer': 'https://www.meta.ai/',
        'origin': 'https://www.meta.ai',
        'cookie': 'datr=sU90afPSYelxqmSaKqer58Hc; wd=1366x643'
      },
      body: form
    });
    return await response.text();
  }

  try {
    const tokenData = await getToken();
    const conversationIds = {
      externalConversationId: generateUUID(),
      threadSessionId: generateUUID()
    };

    await sendMetaMessage(tokenData.access_token, SYSTEM_PROMPT, true, conversationIds);
    const rawResponse = await sendMetaMessage(tokenData.access_token, message, false, conversationIds);

    const lines = rawResponse.split('\n').filter(line => line.trim());
    const parsedData = lines.map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    let finalData = null;
    for (let i = parsedData.length - 1; i >= 0; i--) {
      const item = parsedData[i];
      const node = item?.data?.node?.bot_response_message;
      if (node) {
        if (node?.content?.text || item?.extensions?.is_final) {
          finalData = item;
          break;
        }
      }
    }

    if (finalData) {
      const node = finalData?.data?.node?.bot_response_message;
      const text = node?.content?.text?.composed_text?.content?.[0]?.text || node?.snippet;
      return jsonResponse({
        status: true,
        author: "AngelaImut",
        persona: "Yuna",
        result: text || "Maaf, Yuna gak denger..."
      });
    }
    throw new Error("Tidak ada balasan dari Meta AI.");
  } catch (error) {
    return jsonResponse({ status: false, author: "AngelaImut", error: error.message }, 500);
  }
}
