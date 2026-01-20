# Cloudflare Pexels Randomizer

A serverless Cloudflare Worker that serves random images from a specific Pexels Collection.

<div align="center">
  <img
    src="https://cloudflare-pexels-randomizer.a-emreusta061.workers.dev"
    width="900"
    height="300"
    style="border-radius: 20px; box-shadow: 0px 5px 15px rgba(0,0,0,0.5); object-fit: cover; display: block;"
    alt="Pexels Collections"
  />
</div>

## 🚀 Features

- **Random Selection**: Picks a random image from a Pexels collection.
- **Quality Control**: Automatically selects high-quality landscape images suitable for banners or backgrounds.
- **CORS Support**: Includes `Access-Control-Allow-Origin` headers for cross-origin usage.
- **Smart Caching**: Uses Cloudflare KV to cache Pexels API responses and images, reducing API calls and improving response times.
- **Configurable Cache TTL**: Customizable cache durations for both API responses and images.

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) CLI
- A [Cloudflare](https://dash.cloudflare.com/) account
- A [Pexels API](https://www.pexels.com/api/) key
- A Cloudflare KV namespace (see [Configuration](#-configuration) section)

## 📦 Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/emre/cloudflare-pexels-randomizer.git
    cd cloudflare-pexels-randomizer
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

## 🔑 Configuration

You need a Pexels API Key, a Collection ID, and a Cloudflare KV namespace to use this worker.

### Required Setup

1. **Pexels API Key**: Get your API key from [Pexels API](https://www.pexels.com/api/)
2. **Pexels Collection ID**: Create or find a collection on Pexels and get its ID
3. **Cloudflare KV Namespace**: Create a KV namespace in your Cloudflare Dashboard (required for caching)

### Cloudflare KV Setup

This worker uses Cloudflare KV to cache Pexels API responses and improve performance. You must create a KV namespace before deploying:

1. Go to your Cloudflare Dashboard
2. Navigate to **Workers & Pages** → **KV**
3. Create a new namespace (e.g., `PEXELS_CACHE`)
4. Copy the namespace ID
5. Update `wrangler.toml` with your KV namespace ID:

```toml
[[kv_namespaces]]
binding = "PEXELS_KV"
id = "your_kv_namespace_id_here"
```

**⚠️ Important**: The KV namespace is required for the worker to function properly. Without it, caching will not work and the worker may fail.

### Local Development

Create a `.dev.vars` file in the root directory (this file is git-ignored):

```env
PEXELS_API_KEY=your_pexels_api_key_here
PEXELS_COLLECTION_ID=your_collection_id
DEFAULT_COLLECTION_ID=3j1q9fg
```

### Wrangler Configuration (`wrangler.toml`)

The project is configured via `wrangler.toml`. Default variables can be set in the `[vars]` section:

- `DEFAULT_COLLECTION_ID`: Default Pexels collection ID to use
- `PER_PAGE`: Number of images to fetch per page (default: 80)
- `LIST_TTL_SECONDS`: Cache TTL for Pexels API list responses (default: 900 seconds / 15 minutes)
- `IMAGE_CACHE_SECONDS`: Cache TTL for proxied images (default: 3600 seconds / 1 hour)

## 💻 Usage

### Run Locally

Start the local development server:

```bash
npm run dev
```

The worker will be available at `http://localhost:8787`.

### Deploy to Cloudflare

Deploy the worker to your Cloudflare account:

```bash
npm run deploy
```

## 🛡 Code Quality

This project uses `pre-commit` hooks to ensure code quality.

- **Lint:** `npm run lint`
- **Format:** `npm run format`

To install pre-commit hooks:

```bash
pre-commit install
```

## 📄 License

This project is licensed under the [MIT License](License).

Copyright (c) 2026 Ahmet Emre Usta
