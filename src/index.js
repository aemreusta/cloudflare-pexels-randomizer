export default {
  async fetch(request, env, _ctx) {
    // 1. CORS Headers (Bunu herhangi bir web sitesinde kullanabilmek için)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    };

    // Preflight request kontrolü
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. Environment Kontrolü
    const API_KEY = env.PEXELS_API_KEY;
    const COLLECTION_ID = env.PEXELS_COLLECTION_ID || env.DEFAULT_COLLECTION_ID;

    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "API Key is missing configuration." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // 3. Pexels API İsteği
    // 'per_page=80' maksimum limit, böylece çeşitlilik artar.
    const pexelsUrl = `https://api.pexels.com/v1/collections/${COLLECTION_ID}?per_page=80`;

    try {
      const response = await fetch(pexelsUrl, {
        headers: {
          "Authorization": API_KEY,
          "User-Agent": "PexelsRandomizerWorker/1.0"
        }
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch from Pexels", status: response.status }), {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const data = await response.json();

      if (!data.media || data.media.length === 0) {
        return new Response(JSON.stringify({ error: "Collection is empty or invalid." }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 4. Rastgele Seçim ve Yönlendirme
      const randomMedia = data.media[Math.floor(Math.random() * data.media.length)];

      // Resim kalitesini seçelim (landscape genelde banner için iyidir)
      const imageUrl = randomMedia.src.landscape || randomMedia.src.large2x || randomMedia.src.original;

      // 302 Found ile yönlendiriyoruz.
      // Cache-Control: no-cache diyerek GitHub'ın her seferinde yeni istek atmasını sağlıyoruz.
      return new Response(null, {
        status: 302,
        headers: {
          "Location": imageUrl,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          ...corsHeaders
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};
