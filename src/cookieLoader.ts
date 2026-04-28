import { BrowserContext } from 'playwright';
import fs from 'fs';

function parseNetscapeCookieLine(line: string) {
  const isHttpOnly = line.startsWith('#HttpOnly_');
  const normalizedLine = isHttpOnly ? line.replace('#HttpOnly_', '') : line;
  const parts = normalizedLine.split('\t');

  if (parts.length < 7) return null;

  const [domain, , path, secure, expires, name, ...valueParts] = parts;
  const value = valueParts.join('\t');

  return {
    name,
    value,
    domain,
    path: path || '/',
    secure: secure === 'TRUE',
    httpOnly: isHttpOnly,
    expires: Number.parseInt(expires, 10) === 0 ? -1 : Number.parseInt(expires, 10)
  };
}

export async function loadCookiesFromNetscape(
  context: BrowserContext,
  cookiesPath: string
): Promise<void> {
  if (!fs.existsSync(cookiesPath)) {
    throw new Error(`Cookie file not found: ${cookiesPath}`);
  }

  const content = fs.readFileSync(cookiesPath, 'utf-8');
  const lines = content.split(/\r?\n/);

  const cookies = lines
    .filter((line) => line.trim() && (!line.startsWith('#') || line.startsWith('#HttpOnly_')))
    .map((line) => parseNetscapeCookieLine(line.trim()))
    .filter((cookie): cookie is NonNullable<ReturnType<typeof parseNetscapeCookieLine>> =>
      Boolean(cookie)
    );

  if (cookies.length === 0) {
    throw new Error(
      `No valid cookies were parsed from ${cookiesPath}. Confirm it is in Netscape format.`
    );
  }

  await context.addCookies(cookies);
  console.log(`✅ Loaded ${cookies.length} cookies from ${cookiesPath}`);
}
