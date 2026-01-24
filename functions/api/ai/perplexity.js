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
  const paramsQuery = {};
  for (const [key, value] of urlParams.searchParams.entries()) {
    paramsQuery[key.toLowerCase()] = value;
  }

  const q = paramsQuery.q || paramsQuery.text;
  
  if (!q) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Parameter 'q' atau 'text' diperlukan" 
    }), { status: 400, headers: headersResponse });
  }

  // --- HELPER: HMAC-SHA256 (Native Cloudflare) ---
  const hmacSha256 = async (key, data) => {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  try {
    // 2. Logic Scraper (Jeroan Asli)
    const frontend = crypto.randomUUID();
    const sourceMapping = { web: 'web', academic: 'scholar', social: 'social', finance: 'edgar' };
    
    // Mapping source dari query param (default web jika tidak ada)
    const activeSources = paramsQuery.source ? [sourceMapping[paramsQuery.source] || 'web'] : ['web'];

    const endpoint = 'https://cloudflare-cors-anywhere.supershadowcube.workers.dev/?url=https://www.perplexity.ai/rest/sse/perplexity_ask';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'referer': 'https://www.perplexity.ai/search/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        'x-request-id': frontend,
        'x-perplexity-request-reason': 'perplexity-query-state-provider'
      },
      body: JSON.stringify({
        params: {
          attachments: [],
          language: 'en-US',
          timezone: 'Asia/Jakarta',
          search_focus: 'internet',
          sources: activeSources,
          search_recency_filter: null,
          frontend_uuid: frontend,
          mode: 'concise',
          model_preference: 'turbo',
          is_related_query: false,
          is_sponsored: false,
          visitor_id: crypto.randomUUID(),
          frontend_context_uuid: crypto.randomUUID(),
          prompt_source: 'user',
          query_source: 'home',
          is_incognito: false,
          time_from_first_type: 2273.9,
          local_search_enabled: false,
          use_schematized_api: true,
          send_back_text_in_streaming_api: false,
          supported_block_use_cases: [
            'answer_modes', 'media_items', 'knowledge_cards', 'inline_entity_cards', 
            'place_widgets', 'finance_widgets', 'sports_widgets', 'flight_status_widgets', 
            'shopping_widgets', 'jobs_widgets', 'search_result_widgets', 'clarification_responses', 
            'inline_images', 'inline_assets', 'inline_finance_widgets', 'placeholder_cards', 
            'diff_blocks', 'inline_knowledge_cards', 'entity_group_v2', 'refinement_filters', 
            'canvas_mode', 'maps_preview', 'answer_tabs'
          ],
          client_coordinates: null,
          mentions: [],
          dsl_query: q,
          skip_search_enabled: true,
          is_nav_suggestions_disabled: false,
          always_search_override: false,
          override_no_search: false,
          comet_max_assistant_enabled: false,
          should_ask_for_mcp_tool_confirmation: true,
          version: '2.18'
        },
        query_str: q
      })
    });

    // 3. Parsing Logic (Tiru Jeroan Skrip Aslimu)
    const rawText = await response.text();
    const resultLines = rawText.split('\n')
      .filter(line => line && line.startsWith('data:'))
      .map(line => JSON.parse(line.substring(6)));
    
    const finalMsg = resultLines.find(line => line.final_sse_message);
    
    if (!finalMsg) throw new Error("Gagal mendapatkan respons akhir dari stream.");

    const info = JSON.parse(finalMsg.text);
    const finalAnswer = JSON.parse(info.find(line => line.step_type === 'FINAL')?.content?.answer || '{}')?.answer;
    const searchResults = info.find(line => line.step_type === 'SEARCH_RESULTS')?.content?.web_results || [];

    const responseTime = `${Date.now() - start}ms`;

    return new Response(JSON.stringify({
      success: true,
      result: {
        id: finalMsg.uuid,
        query: finalMsg.query_str,
        related_queries: finalMsg.related_queries,
        content: finalAnswer || "No answer found.",
        search_results: searchResults
      },
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
