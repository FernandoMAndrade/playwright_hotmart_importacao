# Hotmart M3U8 Extractor

Extract all `.m3u8` stream URLs from your Hotmart course for offline download.

## Estrutura do projeto

```text
hotmart-downloader/
├── src/
│   ├── index.ts
│   ├── cookieLoader.ts
│   ├── courseScanner.ts
│   └── types.ts
├── data/
│   ├── videos.json
│   ├── urls.txt
│   ├── download.bat
│   └── download.sh
├── cookies.txt
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
npm install
npx playwright install chromium
```

## Prepare cookies

1. Install **Get cookies.txt LOCALLY**.
2. Log into Hotmart.
3. Export cookies and save as `cookies.txt` in project root.

## Run

```bash
npm start
```

### Optional: login with credentials

If cookies are expired, you can pass credentials as environment variables so Playwright fills the SSO login form:

```bash
HOTMART_EMAIL="your-email" HOTMART_PASSWORD="your-password" npm start
```

## Login and navigation flow

The automation now follows this sequence before scanning lessons:

1. Opens SSO login URL (`passwordless=false`) at `sso.hotmart.com`.
2. Fills `#username`, `#password` and submits `#submit-button` when credentials are provided.
3. Ensures Club landing page opens: `https://hotmart.com/pt-br/club/formacao-do-zero-a-importador`.
4. Opens the first module URL:
   `https://hotmart.com/pt-BR/club/formacao-do-zero-a-importador/products/2220574/content/2OME3KxxO6`.
5. Opens full content listing and starts extraction.

## Output

- `data/videos.json`: full metadata including M3U8 URLs.
- `data/urls.txt`: plain M3U8 URLs (one per line).
- `data/download.bat` / `data/download.sh`: download scripts.

## Download videos

```bash
cd data
./download.sh   # Linux/Mac
# or
download.bat    # Windows
```

## How it works

- Loads cookies for authentication.
- Opens the Hotmart SSO login URL first (helps refresh session when cookies are stale).
- Navigates landing page + first module + full content area.
- Expands all modules.
- Scans for video lessons.
- For each video, intercepts the `.m3u8` request.
- Saves captured URLs progressively.
- Generates download scripts with `yt-dlp`.

## Requirements

- Node.js 18+
- Active Hotmart session (valid cookies)
