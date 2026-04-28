import { BrowserContext } from 'playwright';
import fs from 'fs';

export async function loadCookiesFromNetscape(
  context: BrowserContext,
  cookiesPath: string
): Promise<void> {
  if (!fs.existsSync(cookiesPath)) {
    throw new Error(`Cookie file not found: ${cookiesPath}`);
  }

  const content = fs.readFileSync(cookiesPath, 'utf-8');
  const lines = content.split('\n');
  const cookies: any[] = [];

  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length >= 7) {
      const [domain, flag, path, secure, expires, name, value] = parts;
      cookies.push({
        name,
        value,
        domain: domain.startsWith('.') ? domain : domain,
        path: path || '/',
        secure: secure === 'TRUE',
        httpOnly: flag === 'TRUE',
        expires: parseInt(expires) === 0 ? -1 : parseInt(expires)
      });
    }
  }

  await context.addCookies(cookies);
  console.log(`✅ Loaded ${cookies.length} cookies from ${cookiesPath}`);
}
