// Yardımcı Fonksiyon: JSON cevabı döner
function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

// Yardımcı Fonksiyon: CORS (Başka sitelerde kullanım izni)
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// En iyi resim boyutunu seçer: 1200px genişlik, crop YOK
// GitHub banner'ları için en iyi yöntem budur.
function pickImageUrl(media) {
  if (!media?.id) return null;
  return `https://images.pexels.com/photos/${media.id}/pexels-photo-${media.id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
}

// Koleksiyonu çeken ve KV'ye kaydeden ana fonksiyon
async function fetchCollectionMedia(env, collectionId, perPage, ttlSeconds) {
  const cacheKey = `collection:${collectionId}:per_page=${perPage}`;
  const kv = env.PEXELS_KV;

  // 1. Önce KV Cache'e bak (Hızlı Yanıt)
  if (kv) {
    const cached = await kv.get(cacheKey, { type: "json" });
    if (cached && Array.isArray(cached)) {
      console.log("Cache hit! Pexels API kullanilmadi.");
      return cached;
    }
  }

  // 2. Cache boşsa Pexels API'ye git (Maliyetli Yanıt)
  console.log("Cache miss. Pexels API'ye gidiliyor...");
  const apiKey = env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY is not defined");

  const url = `https://api.pexels.com/v1/collections/${collectionId}?per_page=${perPage}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: apiKey,
      "User-Agent": "PexelsRandomizerWorker/1.0",
    },
  });

  if (!resp.ok) {
    throw new Error(`Pexels fetch failed: status=${resp.status}`);
  }

  const data = await resp.json();
  const media = data?.media;

  if (!Array.isArray(media) || media.length === 0) {
    return [];
  }

  // 3. Veriyi KV Cache'e yaz (Gelecek sefer için)
  if (kv) {
    await kv.put(cacheKey, JSON.stringify(media), { expirationTtl: ttlSeconds });
  }

  return media;
}

export default {
  async fetch(request, env, _ctx) {
    const corsHeaders = getCorsHeaders();

    // Browser ön kontrolü (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Method not allowed" }, 405, corsHeaders);
    }

    // API Key ve ID Kontrolü
    const apiKey = env.PEXELS_API_KEY;
    if (!apiKey) return json({ error: "PEXELS_API_KEY is missing" }, 500, corsHeaders);

    const collectionId = env.PEXELS_COLLECTION_ID || env.DEFAULT_COLLECTION_ID;
    if (!collectionId) return json({ error: "Collection ID is missing" }, 500, corsHeaders);

    // Ayarları al
    const perPage = Number(env.PER_PAGE || 80);
    const listTtlSeconds = Number(env.LIST_TTL_SECONDS || 900); // 15 dk
    const imageCacheSeconds = Number(env.IMAGE_CACHE_SECONDS || 3600); // 1 saat

    try {
      // 1. Listeyi getir (Cache veya API'den)
      const mediaList = await fetchCollectionMedia(env, collectionId, perPage, listTtlSeconds);

      if (!mediaList.length) {
        return json({ error: "Collection is empty or invalid" }, 404, corsHeaders);
      }

      // 2. Rastgele bir resim seç
      const randomMedia = mediaList[Math.floor(Math.random() * mediaList.length)];
      const imageUrl = pickImageUrl(randomMedia);

      if (!imageUrl) return json({ error: "No usable image URL found" }, 502, corsHeaders);

      // 3. Resmi Cloudflare üzerinden Proxy et (Gizlilik ve Hız için)
      const imgResp = await fetch(imageUrl, {
        cf: {
          cacheEverything: true,
          cacheTtl: imageCacheSeconds,
        },
      });

      if (!imgResp.ok) {
        return json({ error: "Failed to fetch image", status: imgResp.status }, 502, corsHeaders);
      }

      // 4. Response Headerlarını ayarla
      const headers = new Headers(corsHeaders);
      const ct = imgResp.headers.get("Content-Type") || "image/jpeg";
      headers.set("Content-Type", ct);

      // GitHub ve Tarayıcılar için Cache ayarı
      headers.set("Cache-Control", `public, max-age=0, s-maxage=${imageCacheSeconds}`);
      // GitHub'ın download sanmaması için
      headers.set("Content-Disposition", "inline");

      return new Response(imgResp.body, {
        status: 200,
        headers,
      });

    } catch (err) {
      console.error(err);
      return json({ error: "Internal Server Error", details: err?.message }, 500, corsHeaders);
    }
  },
};
