// Landing-page responsive smoke check.
//
// Sweeps the landing page across real-world viewports (MacBook 13/14/15/16,
// common laptops, tablet, phone), scrolls the full page to trigger reveal
// animations, then:
//   1. fails if the page has horizontal overflow (scrollWidth > innerWidth),
//   2. fails if any element paints outside the viewport without being clipped
//      inside an overflow-hidden decorative wrapper,
//   3. saves a full-page screenshot per width to scripts/screenshots/ for a
//      quick visual pass over section seams.
//
// Usage:  npm run dev:web   (in another terminal)
//         node scripts/check-landing.mjs [url]
// Env:    CHROME_PATH — override the Chrome/Edge executable location.

import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const URL_UNDER_TEST = process.argv[2] ?? 'http://localhost:5173/';
const WIDTHS = [390, 768, 1024, 1280, 1440, 1512, 1710, 1920];
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screenshots');

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ];
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) {
    console.error('Could not find Chrome/Edge. Set CHROME_PATH to your browser executable.');
    process.exit(2);
  }
  return hit;
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: ['--no-sandbox'],
});

mkdirSync(OUT_DIR, { recursive: true });
let failures = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 850 });
  try {
    await page.goto(URL_UNDER_TEST, { waitUntil: 'networkidle0', timeout: 60000 });
  } catch (err) {
    console.error(`✖ ${width}px — could not load ${URL_UNDER_TEST} (is the dev server running?)`);
    console.error(String(err).split('\n')[0]);
    process.exit(2);
  }
  await new Promise((r) => setTimeout(r, 1500));

  // Sweep-scroll so IntersectionObserver reveals fire before we screenshot.
  const pageHeight = await page.evaluate(() => document.scrollingElement.scrollHeight);
  for (let y = 0; y < pageHeight; y += 500) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await new Promise((r) => setTimeout(r, 60));
  }
  await new Promise((r) => setTimeout(r, 3200));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await new Promise((r) => setTimeout(r, 300));

  const result = await page.evaluate(() => {
    const vw = window.innerWidth;
    const offenders = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.width > 4000) return;
      if (r.right <= vw + 2 && r.left >= -2) return;
      if (el.closest('svg')) return;
      // Clipped inside an overflow-hidden ancestor (decorative art) is fine.
      let a = el.parentElement;
      let clipped = false;
      while (a) {
        const o = getComputedStyle(a).overflow + getComputedStyle(a).overflowX;
        if (o.includes('hidden') || o.includes('clip')) {
          clipped = true;
          break;
        }
        a = a.parentElement;
      }
      if (!clipped) {
        offenders.push(
          `${(el.className || el.tagName).toString().slice(0, 50)} [${Math.round(r.left)}, ${Math.round(r.right)}]`,
        );
      }
    });
    return {
      scrollW: document.scrollingElement.scrollWidth,
      innerW: vw,
      offenders: offenders.slice(0, 10),
    };
  });

  const overflow = result.scrollW > result.innerW;
  // The page root uses overflow-x: clip, so real bleed shows up as offenders
  // even when scrollWidth stays clamped.
  const hardOffenders = result.offenders;
  if (overflow || hardOffenders.length > 0) {
    failures++;
    console.error(`✖ ${width}px — ${overflow ? `horizontal overflow (${result.scrollW} > ${result.innerW})` : 'unclipped elements outside viewport'}`);
    hardOffenders.forEach((o) => console.error(`    ${o}`));
  } else {
    console.log(`✓ ${width}px — no bleed (page ${pageHeight}px tall)`);
  }

  await page.screenshot({ path: path.join(OUT_DIR, `landing-${width}.png`), fullPage: true });
  await page.close();
}

await browser.close();
console.log(`\nScreenshots in ${OUT_DIR} — eyeball the section seams at each width.`);
process.exit(failures > 0 ? 1 : 0);
