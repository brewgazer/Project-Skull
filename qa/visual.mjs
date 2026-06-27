import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('qa/shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERR', String(e)));
await page.goto('http://localhost:5175/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const start = async (k) => {
  await page.evaluate((key) => {
    const mgr = window.__SKULL__.scene;
    mgr.getScenes(true).forEach((sc) => { if (sc.scene.key !== 'BootScene') mgr.stop(sc.scene.key); });
    mgr.start(key);
  }, k);
  await page.waitForTimeout(900);
};

const shot = async (name) => {
  const el = await page.$('canvas');
  await el.screenshot({ path: `qa/shots/${name}.png` });
};

// --- Conveyor push direction (L3) ------------------------------------------
await start('Level3Scene');
const conv = await page.evaluate(async () => {
  const sc = window.__SKULL__.scene.getScene('Level3Scene');
  const test = (x) => new Promise((res) => {
    sc.player.setPosition(x, sc.GROUND_Y ? sc.GROUND_Y - 20 : 140);
    sc.player.setVelocity(0, 0);
    const x0 = sc.player.x;
    let frames = 0;
    const ev = sc.time.addEvent({ delay: 16, repeat: 30, callback: () => {
      frames++;
      if (frames >= 30) res({ dx: Math.round(sc.player.x - x0) });
    } });
  });
  const right = await test(240);   // belt dir=1 -> expect dx > 0
  const left = await test(1950);   // belt dir=-1 -> expect dx < 0
  return { right, left };
});
console.log('CONVEYOR push:', JSON.stringify(conv), '(right dx>0, left dx<0)');

// Screenshot the opening conveyor (camera near start).
await page.evaluate(() => {
  const sc = window.__SKULL__.scene.getScene('Level3Scene');
  sc.player.setPosition(250, 150);
});
await page.waitForTimeout(500);
await shot('l3-conveyor-right');

await page.evaluate(() => {
  const sc = window.__SKULL__.scene.getScene('Level3Scene');
  sc.player.setPosition(1960, 150);
});
await page.waitForTimeout(600);
await shot('l3-conveyor-left');

// --- L5 rooftop reachability -----------------------------------------------
await start('Level5Scene');
await page.evaluate(() => {
  const sc = window.__SKULL__.scene.getScene('Level5Scene');
  // Place player on the top climbing ledge near the roof.
  sc.player.setPosition(80, 134);
});
await page.waitForTimeout(600);
await shot('l5-top');

// --- Weapons in hand --------------------------------------------------------
for (const k of ['Level3Scene', 'Level5Scene', 'Level6Scene']) {
  await start(k);
  await page.evaluate(() => {
    const sc = window.__SKULL__.scene.getScenes(true).find((s) => s.player);
    sc.player.facing = 1;
  });
  await page.waitForTimeout(300);
  await shot(`weapon-${k}`);
}

console.log('done');
await browser.close();
