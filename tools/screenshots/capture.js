#!/usr/bin/env node
/**
 * StaffSync - portfolio screenshot capture.
 *
 * Drives your real Chrome over the live site, signs in, and saves one PNG per
 * page at your system viewport (1366x768 by default), captured at 2x so the
 * images stay sharp when they are scaled on a portfolio page.
 *
 * Usage (from this folder):
 *   npm install
 *   npm run shots
 *
 * Options:
 *   --base=https://...     frontend URL to capture          (default: Vercel)
 *   --api=https://...      backend URL, pinged to wake it up
 *   --email=...            login email
 *   --password=...         login password
 *   --width=1366           viewport width  (CSS pixels)
 *   --height=768           viewport height (CSS pixels)
 *   --scale=2              device pixel ratio of the capture
 *   --settle=2500          extra wait per page, for charts/animations (ms)
 *   --warmup=120000        how long to wait for the sleeping API (ms, 0 = skip)
 *   --out=shots            output folder
 *   --full                 capture the whole scrollable page, not just the viewport
 *   --only=dashboard       only capture pages whose name contains this text
 *   --headed               show the browser while it works
 */
'use strict';

const fs = require('fs');
const path = require('path');

let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch (error) {
  console.error('Missing dependency "puppeteer-core".');
  console.error('Run this first, inside tools/screenshots:');
  console.error('  npm install');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const getOption = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

if (hasFlag('help') || hasFlag('h')) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n/, ''));
  process.exit(0);
}

const CONFIG = {
  baseUrl: getOption('base', 'https://meridiandash.vercel.app').replace(/\/+$/, ''),
  apiUrl: getOption('api', 'https://meridian-backend-4svd.onrender.com/api').replace(/\/+$/, ''),
  email: getOption('email', 'contact@rockscompany.com'),
  password: getOption('password', 'securePassword123'),
  width: parseInt(getOption('width', '1366'), 10),
  height: parseInt(getOption('height', '768'), 10),
  scale: parseFloat(getOption('scale', '2')),
  settleMs: parseInt(getOption('settle', '2500'), 10),
  warmupMs: parseInt(getOption('warmup', '120000'), 10),
  outDir: getOption('out', path.join(__dirname, 'shots')),
  fullPage: hasFlag('full'),
  headed: hasFlag('headed'),
  only: getOption('only', ''),
};

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

const PAGES = [
  { name: '01-landing', public: true, route: '/' },
  { name: '02-login', public: true, route: '/login' },
  { name: '03-create-account', public: true, route: '/create-account' },
  { name: '04-forgot-password', public: true, route: '/forgot-password' },
  { name: '05-dashboard', route: '/dashboard', settle: 3500 },
  { name: '06-employees', route: '/dashboard/employees' },
  { name: '07-employee-detail', route: 'employee-detail' },
  { name: '08-departments', route: '/dashboard/departments' },
  { name: '09-department-detail', route: 'department-detail' },
  { name: '10-reports', route: '/dashboard/reports', settle: 5000 },
  { name: '11-settings', route: '/dashboard/settings' },
];

// ---------------------------------------------------------------------------
// Browser discovery
// ---------------------------------------------------------------------------

const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const findBrowser = () => BROWSER_CANDIDATES.find((candidate) => {
  try {
    return fs.existsSync(candidate);
  } catch (error) {
    return false;
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Render's free tier sleeps; ping the API until it answers. */
async function warmUpApi() {
  if (CONFIG.warmupMs <= 0) return true;
  const url = `${CONFIG.apiUrl}/health`;
  process.stdout.write(`Waking the API (${url}) `);
  const deadline = Date.now() + CONFIG.warmupMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        console.log('\nAPI is awake.');
        return true;
      }
    } catch (error) {
      // Keep trying until the deadline.
    }
    process.stdout.write('.');
    await sleep(3000);
  }
  console.log('\nAPI did not answer in time; continuing anyway.');
  return false;
}

/** Navigate, wait for the network and images to go quiet, then pause. */
async function goto(page, url, settleMs) {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await page
    .evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const pending = Array.from(document.images).filter((img) => !img.complete);
      await Promise.all(pending.map((img) => new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      })));
    })
    .catch(() => {});
  await sleep(settleMs || CONFIG.settleMs);
}

async function shoot(page, name) {
  const target = path.join(CONFIG.outDir, `${name}.png`);
  await page.screenshot({ path: target, fullPage: CONFIG.fullPage });
  console.log(`  saved ${path.basename(target)}`);
}

async function firstHref(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 30000 });
  } catch (error) {
    return null;
  }
  return page.$eval(selector, (element) => element.getAttribute('href'));
}

async function resolveDetailRoute(page, kind) {
  if (kind === 'employee-detail') {
    await goto(page, `${CONFIG.baseUrl}/dashboard/employees`, 1500);
    return firstHref(page, 'a[href^="/dashboard/employees/"]');
  }
  if (kind === 'department-detail') {
    await goto(page, `${CONFIG.baseUrl}/dashboard/departments`, 1500);
    return firstHref(page, 'a[href^="/dashboard/departments/"]');
  }
  return null;
}

async function login(page) {
  console.log('\nSigning in...');
  await goto(page, `${CONFIG.baseUrl}/login`, 800);
  await page.waitForSelector('input[name="email"]', { timeout: 30000 });
  await page.click('input[name="email"]');
  await page.type('input[name="email"]', CONFIG.email, { delay: 20 });
  await page.click('input[name="password"]');
  await page.type('input[name="password"]', CONFIG.password, { delay: 20 });
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith('/dashboard'), { timeout: 90000 }),
    page.click('button[type="submit"]'),
  ]);
  await sleep(2500);
  console.log('  signed in.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const browserPath = findBrowser();
  if (!browserPath) {
    console.error('Could not find Chrome or Edge on this machine.');
    console.error('Set CHROME_PATH to your browser executable and try again.');
    process.exit(1);
  }

  fs.mkdirSync(CONFIG.outDir, { recursive: true });

  console.log('StaffSync screenshot capture');
  console.log(`  browser   ${browserPath}`);
  console.log(`  site      ${CONFIG.baseUrl}`);
  console.log(`  viewport  ${CONFIG.width}x${CONFIG.height} @${CONFIG.scale}x`);
  console.log(`  output    ${CONFIG.outDir}`);

  await warmUpApi();

  let exitCode = 0;
  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: !CONFIG.headed,
      defaultViewport: {
        width: CONFIG.width,
        height: CONFIG.height,
        deviceScaleFactor: CONFIG.scale,
      },
      args: ['--hide-scrollbars', '--disable-lcd-text'],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60000);

    const wanted = (name) => !CONFIG.only || name.includes(CONFIG.only);
    const publicPages = PAGES.filter((item) => item.public && wanted(item.name));
    const privatePages = PAGES.filter((item) => !item.public && wanted(item.name));

    // Public pages first, while still signed out.
    for (const item of publicPages) {
      console.log(`\n${item.name}  ${item.route}`);
      await goto(page, CONFIG.baseUrl + item.route, item.settle);
      await shoot(page, item.name);
    }

    if (privatePages.length) {
      try {
        await login(page);
      } catch (error) {
        console.error(`\nCould not sign in: ${error.message}`);
        await shoot(page, '99-login-failed').catch(() => {});
        console.error('Double-check the email/password, then run again.');
        process.exit(1);
      }
    }

    for (const item of privatePages) {
      let route = item.route;
      if (route === 'employee-detail' || route === 'department-detail') {
        route = await resolveDetailRoute(page, route);
        if (!route) {
          console.warn(`\n${item.name}  skipped (no link found on the list page)`);
          continue;
        }
      }
      const url = route.startsWith('http') ? route : CONFIG.baseUrl + route;
      console.log(`\n${item.name}  ${route}`);
      await goto(page, url, item.settle);
      await shoot(page, item.name);
    }
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.error(`\nCapture failed: ${message}`);
    if (/launch|spawn|profile/i.test(message)) {
      console.error('Tip: close any open Chrome windows, or set CHROME_PATH, then try again.');
    }
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }

  if (exitCode === 0) {
    console.log(`\nFinished. Images are in ${CONFIG.outDir}`);
  }
  process.exit(exitCode);
}

main();
