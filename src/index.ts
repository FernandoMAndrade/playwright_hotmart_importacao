import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { loadCookiesFromNetscape } from './cookieLoader';
import { expandAllModules, getAllLessons } from './courseScanner';
import { VideoData } from './types';

const COOKIES_FILE = './cookies.txt';
const COURSE_URL =
  'https://app.hotmart.com/pt-BR/club/formacao-do-zero-a-importador/products/2220574/content';
const DATA_DIR = './data';

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveProgress(videos: VideoData[], urls: string[]) {
  await ensureDir(DATA_DIR);
  fs.writeFileSync(path.join(DATA_DIR, 'videos.json'), JSON.stringify(videos, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'urls.txt'), urls.join('\n'));
  console.log(`💾 Saved ${videos.length} videos to ${DATA_DIR}`);
}

async function generateDownloadScript(urls: string[]) {
  const batContent = `@echo off
echo Starting download of ${urls.length} videos...
echo.

${urls
  .map(
    (url, i) =>
      `echo [${i + 1}/${urls.length}] Downloading...\nyt-dlp --cookies ..\\cookies.txt --add-header "Referer:https://cf-embed.play.hotmart.com/" -f bestvideo+bestaudio --merge-output-format mp4 -o "video_${i + 1}.%%(ext)s" "${url}"\n`
  )
  .join('\n')}

echo.
echo ✅ All downloads complete!
pause
`;

  const shContent = `#!/bin/bash
mkdir -p downloads

${urls
  .map(
    (url, i) =>
      `echo "[$((i+1))/${urls.length}] Downloading..."\nyt-dlp --cookies ./cookies.txt --add-header "Referer:https://cf-embed.play.hotmart.com/" -f bestvideo+bestaudio --merge-output-format mp4 -o "downloads/video_$((i+1)).%(ext)s" "${url}"\n`
  )
  .join('\n')}

echo "✅ All downloads complete!"
`;

  fs.writeFileSync(path.join(DATA_DIR, 'download.bat'), batContent);
  fs.writeFileSync(path.join(DATA_DIR, 'download.sh'), shContent);
  console.log(`📜 Download scripts generated in ${DATA_DIR}`);
}

async function main() {
  console.log('🚀 Hotmart M3U8 Extractor');
  console.log('========================\n');

  if (!fs.existsSync(COOKIES_FILE)) {
    console.error(`❌ Cookie file not found: ${COOKIES_FILE}`);
    console.log(
      '\nPlease export your cookies using "Get cookies.txt LOCALLY" extension and save as cookies.txt'
    );
    return;
  }

  await ensureDir(DATA_DIR);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  await loadCookiesFromNetscape(context, COOKIES_FILE);

  const page = await context.newPage();

  console.log(`🌐 Navigating to: ${COURSE_URL}`);
  await page.goto(COURSE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await expandAllModules(page);

  const lessons = await getAllLessons(page);

  if (lessons.length === 0) {
    console.error(
      '❌ No lessons found. Please check if cookies are valid and you have access to the course.'
    );
    await browser.close();
    return;
  }

  console.log(`\n📊 Processing ${lessons.length} videos...\n`);

  const videosData: VideoData[] = [];
  const m3u8Urls: string[] = [];

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    console.log(`[${i + 1}/${lessons.length}] 📺 ${lesson.module} - ${lesson.title}`);

    let m3u8Url: string | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!m3u8Url && attempts < maxAttempts) {
      attempts++;

      const requestPromise = new Promise<string | null>((resolve) => {
        const handler = (request: any) => {
          const url = request.url();
          if (url.includes('master-pkg') && url.includes('.m3u8')) {
            page.removeListener('request', handler);
            resolve(url);
          }
        };
        page.on('request', handler);

        setTimeout(() => {
          page.removeListener('request', handler);
          resolve(null);
        }, 8000);
      });

      await page.goto(lesson.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const iframe = await page.$('iframe[src*="hotmart"]');
      if (iframe) {
        await page.waitForTimeout(2000);
      }

      m3u8Url = await requestPromise;

      if (!m3u8Url && attempts < maxAttempts) {
        console.log(`   ⏳ Retry ${attempts}/${maxAttempts}...`);
        await page.waitForTimeout(2000);
      }
    }

    if (m3u8Url) {
      console.log(`   ✅ M3U8 captured: ${m3u8Url.substring(0, 80)}...`);
      videosData.push({
        module: lesson.module,
        title: lesson.title,
        hash: lesson.hash,
        m3u8_url: m3u8Url,
        duration: lesson.duration,
        thumbnail: lesson.thumbnail,
        captured_at: new Date().toISOString()
      });
      m3u8Urls.push(m3u8Url);

      await saveProgress(videosData, m3u8Urls);
    } else {
      console.log(`   ❌ Failed to capture M3U8 after ${maxAttempts} attempts`);
    }

    await page.waitForTimeout(1500);
  }

  await browser.close();

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Extraction complete!');
  console.log(`✅ ${videosData.length} M3U8 URLs captured out of ${lessons.length} videos`);
  console.log(`💾 Data saved to: ${DATA_DIR}/videos.json`);
  console.log(`🔗 URLs saved to: ${DATA_DIR}/urls.txt`);

  if (m3u8Urls.length > 0) {
    await generateDownloadScript(m3u8Urls);
    console.log('\n📥 To download all videos, run:');
    console.log(`   cd ${DATA_DIR}`);
    console.log('   download.bat  (Windows) or ./download.sh (Linux/Mac)');
  }
}

main().catch(console.error);
