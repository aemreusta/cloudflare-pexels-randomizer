// Yardımcı: JSON response
function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

// Yardımcı: CORS
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Orijinal resim URL'sini seçer
function pickOriginalImageUrl(media) {
  const src = media?.src || {};
  // Öncelik: original (crop yok, en büyük)
  return src.original || src.large2x || src.large || src.landscape || null;
}

// Koleksiyon listesini getir (KV cache + Pexels API)
async function fetchCollectionMedia(env, collectionId, perPage, ttlSeconds) {
  const cacheKey = `collection:${collectionId}:per_page=${perPage}`;
  const kv = env.PEXELS_KV;

  // 1) KV cache
  if (kv) {
    const cached = await kv.get(cacheKey, { type: "json" });
    if (cached && Array.isArray(cached) && cached.length) {
      console.log("Cache hit! Pexels API kullanilmadi.");
      return cached;
    }
  }

  // 2) Cache miss → Pexels API
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

  // 3) KV’ye yaz
  if (kv) {
    await kv.put(cacheKey, JSON.stringify(media), {
      expirationTtl: ttlSeconds,
    });
  }

  return media;
}

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders();

    // OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Sadece GET/HEAD
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Method not allowed" }, 405, corsHeaders);
    }

    // Config kontrol
    const apiKey = env.PEXELS_API_KEY;
    if (!apiKey)
      return json({ error: "PEXELS_API_KEY is missing" }, 500, corsHeaders);

    const collectionId = env.PEXELS_COLLECTION_ID || env.DEFAULT_COLLECTION_ID;
    if (!collectionId)
      return json({ error: "Collection ID is missing" }, 500, corsHeaders);

    // Ayarlar
    const perPage = Number(env.PER_PAGE || 80);
    const listTtlSeconds = Number(env.LIST_TTL_SECONDS || 900); // 15 dk

    try {
      // 1) Listeyi getir (KV veya API)
      const mediaList = await fetchCollectionMedia(
        env,
        collectionId,
        perPage,
        listTtlSeconds,
      );

      if (!mediaList.length) {
        return json(
          { error: "Collection is empty or invalid" },
          404,
          corsHeaders,
        );
      }

      // 2) Sadece Photo havuzu (video vb. çıkmasın)
      const photos = mediaList.filter((m) => m?.type === "Photo" && m?.src);
      const pool = photos.length ? photos : mediaList;

      // 3) Rastgele seç
      const randomMedia = pool[Math.floor(Math.random() * pool.length)];
      const imageUrl = pickOriginalImageUrl(randomMedia);

      if (!imageUrl) {
        return json({ error: "No usable image URL found" }, 502, corsHeaders);
      }

      // 4) Proxy Fetch (Redirect YERİNE resmi indirip sunuyoruz)
      // GitHub cache kırmak için bu şart.
      const imageResp = await fetch(imageUrl);

      if (!imageResp.ok) {
        throw new Error(
          `Failed to fetch image from Pexels: ${imageResp.status}`,
        );
      }

      const newHeaders = new Headers(imageResp.headers);
      // GitHub ve tarayıcılara "Saklama!" emri
      newHeaders.set(
        "Cache-Control",
        "no-cache, no-store, must-revalidate, max-age=0",
      );
      newHeaders.set("Pragma", "no-cache");
      newHeaders.set("Expires", "0");
      // CORS ekle
      Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));

      return new Response(imageResp.body, {
        status: imageResp.status,
        statusText: imageResp.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      console.error(err);
      return json(
        { error: "Internal Server Error", details: err?.message },
        500,
        corsHeaders,
      );
    }
  },
};
