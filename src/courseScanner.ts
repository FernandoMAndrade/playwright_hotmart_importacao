import { Page } from 'playwright';

export interface LessonInfo {
  module: string;
  title: string;
  hash: string;
  url: string;
  duration: string;
  thumbnail: string;
}

export async function expandAllModules(page: Page): Promise<void> {
  const expandButtons = await page.$$('button[aria-expanded="false"]');

  for (const button of expandButtons) {
    const isModule = await button.evaluate((el) => {
      const ariaControls = el.getAttribute('aria-controls');
      const hasModuleIndicator = el.querySelector('span[title]') !== null;
      return ariaControls?.startsWith('sectionId_') || hasModuleIndicator;
    });

    if (isModule) {
      await button.click();
      await page.waitForTimeout(300);
    }
  }

  console.log(`✅ Expanded ${expandButtons.length} modules`);
  await page.waitForTimeout(2000);
}

export async function getAllLessons(page: Page): Promise<LessonInfo[]> {
  console.log('📋 Scanning for video lessons...');

  const lessons = await page.$$eval('[data-hash]', (elements) => {
    const results: any[] = [];

    for (const el of elements) {
      const hash = el.getAttribute('data-hash');
      if (!hash) continue;

      const thumbnail = el.querySelector('img[src*="thumbnail"]');
      if (!thumbnail) continue;

      const link = el.querySelector('a[href*="/content/"]');
      const href = link?.getAttribute('href');
      if (!href) continue;

      const titleEl = el.querySelector('span[title]');
      const title = titleEl?.getAttribute('title') || 'Unknown';

      let moduleName = 'Unknown Module';
      let current = el.parentElement;
      while (current && !current.querySelector('button span[title]')) {
        current = current.parentElement;
      }
      if (current) {
        const moduleTitle = current.querySelector('button span[title]');
        if (moduleTitle) {
          moduleName = moduleTitle.getAttribute('title') || moduleName;
        }
      }

      const durationEl = el.querySelector(
        '[data-test="content-item-tag"] ._px-2, [class*="rounded"] .text-1'
      );
      const duration = durationEl?.textContent?.trim() || '';

      const thumbnailUrl = thumbnail.getAttribute('src') || '';

      results.push({
        hash,
        title,
        module: moduleName,
        url: `https://app.hotmart.com${href}`,
        duration,
        thumbnail: thumbnailUrl
      });
    }

    return results;
  });

  console.log(`✅ Found ${lessons.length} video lessons`);
  return lessons;
}
