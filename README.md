# Cloudflare Pexels Randomizer

A serverless Cloudflare Worker that serves random images from a specific Pexels Collection.

## 🚀 Features

- **Random Selection**: Picks a random image from a Pexels collection.
- **Quality Control**: Automatically selects high-quality landscape images suitable for banners or backgrounds.
- **CORS Support**: Includes `Access-Control-Allow-Origin` headers for cross-origin usage.
- **Cache Control**: Implements `no-cache` headers to ensure fresh content on every request (useful for GitHub profiles).

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) CLI

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

You need a Pexels API Key and a Collection ID to use this worker.

### Local Development

Create a `.dev.vars` file in the root directory (this file is git-ignored):

```env
PEXELS_API_KEY=your_pexels_api_key_here
PEXELS_COLLECTION_ID=your_collection_id
DEFAULT_COLLECTION_ID=983745
```

### Wrangler Configuration (`wrangler.toml`)

The project is configured via `wrangler.toml`. Default variables can be set in the `[vars]` section.

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
