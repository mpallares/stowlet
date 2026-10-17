/*
 * Records the landing-page demo with a scripted, eased cursor instead of a hand.
 *
 *   pnpm --filter @stowlet/extension demo:record
 *
 * Launches Chrome for Testing with the production build loaded, opens ChatGPT in a
 * dedicated profile (extension/.demo-profile, git-ignored), and drives the panel:
 * open → create a folder → drag a chat into it → search → open the result. A synthetic
 * cursor with a click pulse is drawn in the page so the recording shows smooth, deliberate
 * motion. Encoding adds a camera layer: the frame pushes in on the panel while you work,
 * pans to follow the drag and the search, pulls back out for the result, and each step
 * carries a short caption. The first run stops and asks you to log in to ChatGPT in the
 * window it opens.
 *
 * Output (via ffmpeg): web/public/demo.mp4 and demo-poster.webp.
 *
 * Environment overrides (all optional):
 *   DEMO_URL       page to record on            default https://chatgpt.com/
 *   DEMO_BUILD     .output folder name           default chrome-mv3 (use chrome-mv3-e2e for the mock page)
 *   DEMO_FOLDER    folder name to create         default Engineering
 *   DEMO_CHAT      text that identifies the chat default CAP theorem
 *   DEMO_QUERY     search term                   default partition
 *   DEMO_OUT       output directory              default ../web/public
 *   DEMO_HEADLESS  1 to run without a window (mock page only)
 *   DEMO_STILL     name of a JPEG to write instead of recording, e.g. claude.jpg: captures the
 *                  page with the panel open once it is ready (use with DEMO_URL=https://claude.ai/).
 *   DEMO_CDP       attach to a running Chrome instead of launching one, e.g. http://127.0.0.1:9222.
 *                  Use this when Google refuses to sign in to a launched browser: start Chrome
 *                  yourself with --remote-debugging-port=9222 and a separate --user-data-dir,
 *                  log in and load the unpacked extension there, then run the recorder.
 */
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const build = process.env.DEMO_BUILD ?? 'chrome-mv3';
const extensionPath = join(here, '..', '.output', build);
const profileDir = join(here, '..', '.demo-profile');
const rawDir = join(here, '..', '.demo');
const outDir = process.env.DEMO_OUT ?? join(here, '..', '..', 'web', 'public');
const url = process.env.DEMO_URL ?? 'https://chatgpt.com/';
const folderName = process.env.DEMO_FOLDER ?? 'Engineering';
const chatText = process.env.DEMO_CHAT ?? 'CAP theorem';
const query = process.env.DEMO_QUERY ?? 'partition';
const headless = process.env.DEMO_HEADLESS === '1';
/** Attach to a Chrome you launched yourself (see README): http://127.0.0.1:9222 */
const cdpUrl = process.env.DEMO_CDP ?? '';
const stillName = process.env.DEMO_STILL ?? '';

const VIEWPORT = { width: 1440, height: 900 };
/** Actual CSS viewport used for the recording; attach mode measures it after resizing the window. */
let viewport = { ...VIEWPORT };
const SCALE = 2;
const OUTPUT_WIDTH = 1200;
const LOCALE = 'en-US,en';
const FPS = 30;
/** How far the camera pushes in on the panel. */
const ZOOM = 1.55;
const CAPTION_FONT = '/System/Library/Fonts/HelveticaNeue.ttc';
/** Length of the captured clip in seconds; set when capture stops, used for the fade-out. */
let totalSeconds = 0;
/** Wall-clock time of the first captured frame; step markers are stored relative to it. */
let firstFrameWall = 0;
/** Wall-clock timestamps of the demo's steps, written by runDemo. */
const marks = {};
const mark = (name) => {
  marks[name] = Date.now() / 1000;
};
/** Geometry the camera layer needs, in CSS pixels, written by runDemo. */
const camera = { panel: null, dragCenterY: 0 };

// ---------------------------------------------------------------------------
// Cursor helpers

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Draws a cursor in the page that follows real mouse events; Playwright videos have none. */
async function installCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('stowlet-demo-cursor')) return;
    const el = document.createElement('div');
    el.id = 'stowlet-demo-cursor';
    const style = document.createElement('style');
    style.textContent = `@keyframes stowlet-demo-pulse {
      from { transform: translate(-50%, -50%) scale(0.35); opacity: 0.85; }
      to { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
    }`;
    document.documentElement.appendChild(style);
    el.innerHTML = `<svg width="24" height="28" viewBox="0 0 26 30" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 2 L3 23 L8.5 18.5 L12 27 L16 25.3 L12.6 17 L19.5 17 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/>
    </svg>`;
    Object.assign(el.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transformOrigin: '3px 2px',
      transition: 'transform 90ms ease',
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.45))',
      willChange: 'transform',
    });
    document.documentElement.appendChild(el);
    let x = -100;
    let y = -100;
    let pressed = false;
    const paint = () => {
      el.style.transform = `translate(${x}px, ${y}px) scale(${pressed ? 0.85 : 1})`;
    };
    const track = (e) => {
      x = e.clientX;
      y = e.clientY;
      paint();
    };
    for (const type of ['mousemove', 'dragover', 'drag']) {
      document.addEventListener(type, track, true);
    }
    document.addEventListener(
      'mousedown',
      () => {
        pressed = true;
        paint();
        const ring = document.createElement('div');
        Object.assign(ring.style, {
          position: 'fixed',
          left: `${x}px`,
          top: `${y}px`,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '3px solid #f97316',
          boxShadow: '0 0 0 2px rgba(249,115,22,.25)',
          zIndex: '2147483646',
          pointerEvents: 'none',
          animation: 'stowlet-demo-pulse 480ms ease-out forwards',
        });
        document.documentElement.appendChild(ring);
        setTimeout(() => ring.remove(), 520);
      },
      true,
    );
    document.addEventListener(
      'mouseup',
      () => {
        pressed = false;
        paint();
      },
      true,
    );
    paint();
  });
}

const state = { x: 40, y: 40 };

/** Moves the mouse from its last position to (x, y) along an eased path. */
async function glide(page, x, y, ms = 800) {
  const steps = Math.max(8, Math.round(ms / 16));
  const { x: x0, y: y0 } = state;
  for (let i = 1; i <= steps; i += 1) {
    const t = easeInOutCubic(i / steps);
    await page.mouse.move(x0 + (x - x0) * t, y0 + (y - y0) * t);
    await sleep(ms / steps);
  }
  state.x = x;
  state.y = y;
}

async function center(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Target is not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function glideTo(page, locator, ms) {
  const c = await center(locator);
  await glide(page, c.x, c.y, ms);
}

/** Glides to the element, then clicks it the way Playwright does (proven to work on vendor pages). */
async function clickAt(page, locator, ms = 800) {
  await glideTo(page, locator, ms);
  await sleep(120);
  const c = await center(locator);
  state.x = c.x;
  state.y = c.y;
  await locator.click({ delay: 70 });
}

/** Native HTML5 drag: press, move in small steps so dragstart fires, release on the target. */
async function dragTo(page, locator, ms = 1100) {
  await page.mouse.down();
  await sleep(150);
  await glide(page, state.x + 6, state.y + 4, 120);
  await glideTo(page, locator, ms);
  await sleep(250);
  await page.mouse.up();
}

// ---------------------------------------------------------------------------
// Frame capture. Playwright's recordVideo is capped at 1x; Chrome's screencast gives
// device-pixel frames, which we stitch with ffmpeg using each frame's timestamp.

async function startCapture(page) {
  const framesDir = join(rawDir, 'frames');
  mkdirSync(framesDir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', (frame) => {
    if (frames.length === 0) firstFrameWall = Date.now() / 1000;
    const name = `f${String(frames.length).padStart(5, '0')}.jpg`;
    writeFileSync(join(framesDir, name), Buffer.from(frame.data, 'base64'));
    frames.push({ name, t: frame.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => undefined);
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: 4096,
    maxHeight: 4096,
    everyNthFrame: 1,
  });
  return async function stop(tailSeconds) {
    await cdp.send('Page.stopScreencast').catch(() => undefined);
    await cdp.detach().catch(() => undefined);
    if (frames.length === 0) throw new Error('No frames were captured');
    const lines = ['ffconcat version 1.0'];
    for (let i = 0; i < frames.length; i += 1) {
      const next = frames[i + 1];
      const duration = next ? Math.max(0.001, next.t - frames[i].t) : tailSeconds;
      lines.push(`file '${frames[i].name}'`, `duration ${duration.toFixed(4)}`);
    }
    lines.push(`file '${frames[frames.length - 1].name}'`);
    totalSeconds = frames[frames.length - 1].t - frames[0].t + tailSeconds;
    const list = join(framesDir, 'frames.txt');
    writeFileSync(list, `${lines.join('\n')}\n`);
    console.info(`Captured ${frames.length} frames`);
    return list;
  };
}

// ---------------------------------------------------------------------------
// Main

/** Reads the panel's status attribute; null while the page is elsewhere (e.g. a sign-in screen). */
async function readStatus(page) {
  try {
    return await page.getByTestId('status').getAttribute('data-status', { timeout: 1000 });
  } catch {
    return null;
  }
}

/** The status banner only renders inside an open panel; expand it if it is collapsed. */
async function openPanelIfCollapsed(page) {
  try {
    const toggle = page.getByTestId('panel-toggle');
    if ((await toggle.count()) > 0 && (await toggle.isVisible())) {
      const panel = page.getByTestId('panel');
      if ((await panel.count()) === 0 || !(await panel.isVisible())) await toggle.click();
    }
  } catch {
    // Page is mid-navigation; try again on the next poll.
  }
}

async function waitForReady(page, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    await openPanelIfCollapsed(page);
    const value = await readStatus(page);
    if (value === 'ready') return 'ready';
    if (value === 'unauthenticated' || value === 'needs-update') return value;
    await sleep(300);
  }
  return 'timeout';
}

async function ensureLoggedIn(page) {
  const first = await waitForReady(page, 25_000);
  if (first === 'ready') return;
  if (headless) throw new Error(`Panel status is "${first}"; cannot continue without a window.`);
  console.info(
    `\nPanel status is "${first}". Log in to the site in the browser window; the recording starts on its own once the panel is ready.`,
  );
  const deadline = Date.now() + 15 * 60_000;
  while (Date.now() < deadline) {
    const state = await waitForReady(page, 10_000);
    if (state === 'ready') return;
    await sleep(1000);
  }
  throw new Error('Gave up waiting for login after 15 minutes.');
}

async function resetLocalState(newPage) {
  const page = await newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('panel-toggle').or(page.getByTestId('panel')).first().waitFor({
    timeout: 30_000,
  });
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.deleteDatabase('stowlet');
        req.onsuccess = req.onerror = req.onblocked = () => resolve(undefined);
        setTimeout(resolve, 3000);
      }),
  );
  await page.close();
}

async function runDemo(page) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await installCursor(page);
  await page.mouse.move(state.x, state.y);
  const stopCapture = await startCapture(page);

  // Wait for the content script to mount, then open the panel if it is collapsed.
  const panel = page.getByTestId('panel');
  await panel.or(page.getByTestId('panel-toggle')).first().waitFor({ timeout: 30_000 });
  if (!(await panel.isVisible())) {
    await clickAt(page, page.getByTestId('panel-toggle'), 700);
  }
  await panel.waitFor({ timeout: 15_000 });
  camera.panel = await panel.boundingBox();
  mark('open');
  await sleep(1200);

  // Create a folder.
  mark('folder');
  await clickAt(page, page.getByTestId('new-folder-button'), 900);
  const nameInput = page.getByTestId('new-folder-input');
  await nameInput.waitFor({ timeout: 3_000 });
  await nameInput.focus();
  await sleep(450);
  await page.keyboard.type(folderName, { delay: 110 });
  await sleep(500);
  await page.keyboard.press('Enter');
  const folder = page.locator(`[data-folder-name="${folderName}"]`);
  await folder.waitFor({ timeout: 5_000 });
  await sleep(900);

  // Drag a chat into it.
  const row = page
    .getByTestId('conversation-list')
    .locator('li[data-conversation-key]', { hasText: chatText })
    .first();
  const rowBox = await row.boundingBox();
  const folderBox = await folder.boundingBox();
  if (rowBox && folderBox) camera.dragCenterY = (rowBox.y + folderBox.y + folderBox.height) / 2;
  mark('drag');
  await glideTo(page, row, 900);
  await sleep(300);
  await dragTo(page, folder.getByTestId('folder-select'), 1100);
  await sleep(1100);

  // Search message content.
  mark('search');
  await clickAt(page, page.getByTestId('search-input'), 900);
  await page.getByTestId('search-input').focus();
  await sleep(350);
  await page.keyboard.type(query, { delay: 120 });
  const result = page
    .getByTestId('search-results')
    .locator('li[data-conversation-key]')
    .first()
    .getByTestId('conversation-link');
  await result.waitFor({ timeout: 10_000 });
  await sleep(1300);

  // Open the result and let the chat show.
  await clickAt(page, result, 800);
  mark('result');
  await sleep(3000);
  mark('end');
  return stopCapture(0.5);
}

/** Captures one retina screenshot of the page with the panel open, vendor sidebar cropped out. */
async function captureStill(newPage) {
  const page = await newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const panel = page.getByTestId('panel');
  await panel.or(page.getByTestId('panel-toggle')).first().waitFor({ timeout: 30_000 });
  if (!(await panel.isVisible())) await page.getByTestId('panel-toggle').click();
  await waitForReady(page, 60_000);
  await sleep(1500);
  const cropX = await sidebarWidth(page);
  const size = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  mkdirSync(outDir, { recursive: true });
  const target = join(outDir, stillName);
  await page.screenshot({
    path: target,
    type: 'jpeg',
    quality: 88,
    clip: { x: cropX, y: 0, width: size.width - cropX, height: size.height },
  });
  await page.close();
  console.info(`Wrote ${target}`);
}

async function sidebarWidth(page) {
  return page.evaluate(() => {
    let width = 0;
    for (const nav of document.querySelectorAll('nav')) {
      const b = nav.getBoundingClientRect();
      if (b.x === 0 && b.height > 200 && b.width < innerWidth / 2) width = Math.max(width, b.width);
    }
    return Math.round(width);
  });
}

// ---------------------------------------------------------------------------
// Camera layer. zoompan evaluates its expressions per frame; `in` is the frame index
// after the fps filter, so `in/FPS` is the clip time. Each value is a piecewise
// smoothstep tween between keyframes derived from the step marks.

const num = (v) => Number(v).toFixed(3);
const rel = (name) => Math.max(0, (marks[name] ?? firstFrameWall) - firstFrameWall);

/** ffmpeg expression tweening `keys` ([{ t, v }], sorted by t) at time expression T. */
function tween(keys, T) {
  let expr = num(keys[keys.length - 1].v);
  for (let i = keys.length - 2; i >= 0; i -= 1) {
    const a = keys[i];
    const b = keys[i + 1];
    let seg = num(a.v);
    if (b.t - a.t > 0.01 && b.v !== a.v) {
      const p = `clip((${T}-${num(a.t)})/${num(b.t - a.t)},0,1)`;
      seg = `(${num(a.v)}+${num(b.v - a.v)}*(${p})*(${p})*(3-2*(${p})))`;
    }
    expr = `if(lt(${T},${num(b.t)}),${seg},${expr})`;
  }
  return expr;
}

/** Pushes in on the panel after it opens, pans between the steps, pulls out for the result. */
function cameraFilter({ w, h, scale, cropX }) {
  const panel = camera.panel ?? {
    x: viewport.width - 360,
    y: 0,
    width: 360,
    height: viewport.height,
  };
  const cx = (panel.x + panel.width / 2 - cropX) * scale;
  const topY = (panel.y + 280) * scale;
  const dragY = (camera.dragCenterY || panel.y + 420) * scale;
  const tOpen = rel('open');
  const tDrag = rel('drag');
  const tSearch = rel('search');
  const tResult = rel('result');
  const T = `(in/${FPS})`;
  const zoom = tween(
    [
      { t: 0, v: 1 },
      { t: tOpen + 0.2, v: 1 },
      { t: tOpen + 1.3, v: ZOOM },
      { t: tResult + 0.25, v: ZOOM },
      { t: tResult + 1.35, v: 1 },
    ],
    T,
  );
  const cy = tween(
    [
      { t: 0, v: topY },
      { t: tDrag, v: topY },
      { t: tDrag + 0.8, v: dragY },
      { t: tSearch, v: dragY },
      { t: tSearch + 0.8, v: topY },
    ],
    T,
  );
  return [
    `zoompan=z='${zoom}'`,
    `x='clip(${num(cx)}-iw/(2*zoom),0,iw-iw/zoom)'`,
    `y='clip((${cy})-ih/(2*zoom),0,ih-ih/zoom)'`,
    `d=1:s=${w}x${h}:fps=${FPS}`,
  ].join(':');
}

/** One fading caption per step, sized for the output width. */
function captionFilters(width) {
  const steps = [
    ['folder', 'drag', 'Create a folder'],
    ['drag', 'search', 'Drag a chat in'],
    ['search', 'result', 'Search inside your messages'],
    ['result', 'end', 'Jump straight to the chat'],
  ];
  const size = Math.round(width / 40);
  const fade = 0.3;
  const parts = [];
  for (const [from, to, text] of steps) {
    const a = rel(from) + 0.25;
    const b = rel(to) - 0.1;
    if (b - a < fade * 2) continue;
    const alpha = `if(lt(t,${num(a + fade)}),(t-${num(a)})/${num(fade)},if(gt(t,${num(b - fade)}),(${num(b)}-t)/${num(fade)},1))`;
    parts.push(
      [
        `drawtext=fontfile=${CAPTION_FONT}`,
        `text='${text}'`,
        `fontsize=${size}:fontcolor=white`,
        `box=1:boxcolor=0x111111@0.74:boxborderw=${Math.round(size * 0.55)}`,
        // Centred on the chat area left of the panel, so the caption never covers the panel.
        `x=(w*0.5-text_w)/2:y=h-text_h-${Math.round(size * 2.2)}`,
        `enable='between(t,${num(a)},${num(b)})'`,
        `alpha='${alpha}'`,
      ].join(':'),
    );
  }
  return parts.length ? `${parts.join(',')},` : '';
}

async function encode(frameList, cropX) {
  mkdirSync(outDir, { recursive: true });
  const firstFrame = join(rawDir, 'frames', 'f00000.jpg');
  const dims = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-of',
      'csv=p=0',
      firstFrame,
    ],
    { encoding: 'utf8' },
  ).stdout.trim();
  const frameWidth = Number(dims.split(',')[0]) || viewport.width * SCALE;
  const scale = frameWidth / viewport.width;
  const w = Math.round((viewport.width - cropX) * scale);
  const h = Math.round(viewport.height * scale);
  const crop = `crop=${w}:${h}:${Math.round(cropX * scale)}:0`;
  const cam = cameraFilter({ w, h, scale, cropX });
  const run = (args) => {
    const res = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
    if (res.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
  };
  const input = ['-f', 'concat', '-safe', '0', '-i', frameList];
  run([
    ...input,
    '-vf',
    `${crop},fps=${FPS},${cam},scale=${OUTPUT_WIDTH}:-2,${captionFilters(OUTPUT_WIDTH)}fade=t=in:st=0:d=0.5,fade=t=out:st=${Math.max(0, totalSeconds - 0.5).toFixed(2)}:d=0.5`,
    '-c:v',
    'libx264',
    '-crf',
    '23',
    '-preset',
    'slow',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    join(outDir, 'demo.mp4'),
  ]);
  // Poster: the full view just before the drag, when the panel is populated and the folder exists.
  run([
    '-ss',
    num(Math.max(1, rel('drag') - 0.3)),
    ...input,
    '-frames:v',
    '1',
    '-vf',
    `${crop},scale=${OUTPUT_WIDTH}:-2`,
    '-c:v',
    'libwebp',
    '-quality',
    '85',
    join(outDir, 'demo-poster.webp'),
  ]);
  const probe = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-of',
      'csv=p=0',
      join(outDir, 'demo.mp4'),
    ],
    { encoding: 'utf8' },
  );
  rmSync(rawDir, { recursive: true, force: true });
  console.info(`\nWrote demo.mp4 (${probe.stdout.trim()}) and demo-poster.webp to ${outDir}`);
}

async function main() {
  if (!cdpUrl && !existsSync(join(extensionPath, 'manifest.json'))) {
    throw new Error(`Extension build missing at ${extensionPath}. Run \`pnpm build\` first.`);
  }
  if (spawnSync('ffmpeg', ['-version']).status !== 0) {
    throw new Error('ffmpeg is required (brew install ffmpeg).');
  }
  rmSync(rawDir, { recursive: true, force: true });

  let browser = null;
  let context;
  if (cdpUrl) {
    browser = await chromium.connectOverCDP(cdpUrl);
    context = browser.contexts()[0];
    if (!context) throw new Error('The Chrome at DEMO_CDP has no open window.');
  } else {
    context = await chromium.launchPersistentContext(profileDir, {
      channel: 'chromium',
      headless,
      // Google refuses to sign in to a browser that advertises automation.
      ignoreDefaultArgs: ['--enable-automation'],
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
      colorScheme: 'dark',
      locale: 'en-US',
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        `--window-size=${VIEWPORT.width},${VIEWPORT.height + 120}`,
        '--hide-scrollbars',
        `--force-device-scale-factor=${SCALE}`,
      ],
    });
  }
  const newPage = async () => {
    const page = await context.newPage();
    if (cdpUrl) {
      // Resize the real window so the page viewport matches VIEWPORT; emulating a different
      // size inside the window scales the page and throws Playwright's click coordinates off.
      const cdp = await context.newCDPSession(page);
      const { windowId } = await cdp.send('Browser.getWindowForTarget');
      const chrome = await page.evaluate(() => ({
        w: outerWidth - innerWidth,
        h: outerHeight - innerHeight,
      }));
      await cdp.send('Browser.setWindowBounds', {
        windowId,
        bounds: {
          windowState: 'normal',
          width: VIEWPORT.width + chrome.w,
          height: VIEWPORT.height + chrome.h,
        },
      });
      await sleep(400);
      viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
      const userAgent = await page.evaluate(() => navigator.userAgent);
      await cdp.send('Emulation.setUserAgentOverride', { userAgent, acceptLanguage: LOCALE });
      await cdp.detach();
      await page.emulateMedia({ colorScheme: 'dark' });
    }
    return page;
  };
  const shutdown = async () => {
    if (browser) await browser.close().catch(() => undefined);
    else await context.close().catch(() => undefined);
  };

  try {
    // Make sure we are logged in before resetting anything.
    const probe = await newPage();
    await probe.goto(url, { waitUntil: 'domcontentloaded' });
    await ensureLoggedIn(probe);
    await probe.close();

    if (stillName) {
      await captureStill(newPage);
      await shutdown();
      return;
    }

    await resetLocalState(newPage);

    const page = await newPage();
    let frameList;
    try {
      frameList = await runDemo(page);
    } catch (err) {
      const shot = join(rawDir, 'failure.png');
      mkdirSync(rawDir, { recursive: true });
      await page.screenshot({ path: shot }).catch(() => undefined);
      await page.close().catch(() => undefined);
      console.error(`Demo step failed; screenshot at ${shot}`);
      throw err;
    }

    // The vendor's own sidebar sits on the left; crop it out of the final video.
    const cropX = await sidebarWidth(page);

    await page.close();
    await shutdown();
    await encode(frameList, cropX);
  } catch (err) {
    await shutdown();
    throw err;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
