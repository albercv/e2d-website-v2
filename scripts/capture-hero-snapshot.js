#!/usr/bin/env node
// scripts/capture-hero-snapshot.js
//
// Captures the hero's fluid background as static WebP snapshots. The hero
// paints these on first load and only mounts the WebGL simulation after a
// user gesture (components/sections/hero-background.tsx).
//
// Manual tool, NOT part of `npm run build`. Re-run whenever the hero look
// changes (colors, LiquidEther props) and commit the resulting files.
//
// Usage: node scripts/capture-hero-snapshot.js [url] [--only=landscape|portrait]
//   url defaults to http://localhost:3003/es — any deploy works, prod too.
//   --only restricts the run to a single variant (e.g. to reroll just the
//   landscape capture without touching the portrait one already on disk).
//
// Needs playwright-core (devDependency) and a Chromium build in
// ~/.cache/ms-playwright matching its version (`npx playwright-core install
// chromium` if missing). WebGL runs on SwiftShader, so a headless server
// without a GPU is fine.
//
// Each run navigates the target site once per captured variant, so pointing
// this at a live deploy fires one real GA4 page_view per variant.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sharp = require('sharp');

// The URL is the first CLI arg that isn't a flag; --only=... must not be
// mistaken for it when it happens to be passed before the url.
const url = process.argv.slice(2).find((arg) => !arg.startsWith('--')) || 'http://localhost:3003/es';
const onlyArg = process.argv.slice(2).find((arg) => arg.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length) : null;
const outDir = path.join(process.cwd(), 'public', 'hero');
const MAX_BYTES = 60 * 1024;
// The fluid's AutoDriver only starts autoResumeDelay (3 s) after load, so
// ~6 s of trail is needed after that for a representative frame.
const SETTLE_MS = 9000;
const WEBP_QUALITY = 70;

const ALL_VARIANTS = [
  { name: 'landscape', width: 1600, height: 900 },
  { name: 'portrait', width: 810, height: 1440 },
];

if (only && !ALL_VARIANTS.some((v) => v.name === only)) {
  console.error(`✖ --only=${only} is not a known variant (landscape, portrait)`);
  process.exit(1);
}

const VARIANTS = only ? ALL_VARIANTS.filter((v) => v.name === only) : ALL_VARIANTS;

// Hide everything except the fluid: the fixed nav, the hero copy, the
// snapshot itself (when capturing the new hero) and any fixed overlay
// (cookie banner, chat launcher). The background wrapper is shown at full
// opacity because the page composites the snapshot at 75 % over the same
// dark background, which reproduces the live look exactly.
// .z-20 targets the production markup that predates data-hero-content.
const CAPTURE_CSS = `
  nav, [data-hero-content], [data-hero-snapshot], main > section > .z-20 { visibility: hidden !important; }
  main > section [data-hero-background], main > section > div.opacity-75 { opacity: 1 !important; }
`;

async function hideFixedElements(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      if (getComputedStyle(el).position === 'fixed') el.style.visibility = 'hidden';
    }
  });
}

async function assertNotBlank(png, name) {
  const { channels } = await sharp(png).stats();
  if (channels.every((c) => c.stdev < 2)) {
    throw new Error(`${name}: capture is flat — WebGL did not render (check the SwiftShader flags)`);
  }
}

async function captureVariant(browser, variant) {
  const page = await browser.newPage({
    viewport: { width: variant.width, height: variant.height },
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  // First gesture: the new hero mounts the simulation only after one.
  await page.mouse.move(variant.width / 2, variant.height / 2);
  await page.mouse.move(variant.width / 2 + 40, variant.height / 2 + 20);
  // The fluid's auto demo only engages once the pointer leaves the hero
  // (mouseleave); the two moves above are just the first-gesture trigger
  // for the new hero.
  await page.mouse.move(-50, -50);
  await page.locator('main > section canvas').first().waitFor({ state: 'attached', timeout: 20000 });
  await page.waitForTimeout(SETTLE_MS);
  await page.addStyleTag({ content: CAPTURE_CSS });
  await hideFixedElements(page);
  const png = await page.locator('main > section').first().screenshot({ type: 'png' });
  await page.close();

  await assertNotBlank(png, variant.name);
  const webp = await sharp(png).webp({ quality: WEBP_QUALITY }).toBuffer();
  if (webp.length > MAX_BYTES) {
    throw new Error(`${variant.name}: ${(webp.length / 1024).toFixed(1)} KB exceeds the ${MAX_BYTES / 1024} KB budget; lower WEBP_QUALITY`);
  }
  const file = path.join(outDir, `liquid-ether-${variant.name}.webp`);
  fs.writeFileSync(file, webp);
  console.log(`✔ ${path.relative(process.cwd(), file)} ${variant.width}x${variant.height} ${(webp.length / 1024).toFixed(1)} KB`);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  try {
    for (const variant of VARIANTS) await captureVariant(browser, variant);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`✖ capture failed: ${err.message}`);
  process.exit(1);
});
