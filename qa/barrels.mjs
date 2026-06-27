import { chromium } from 'playwright';
import fs from 'fs';
fs.mkdirSync('qa/shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5175/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
const startL5 = async () => {
  await page.evaluate(() => {
    const mgr = window.__SKULL__.scene;
    mgr.getScenes(true).forEach((sc) => { if (sc.scene.key !== 'BootScene') mgr.stop(sc.scene.key); });
    mgr.start('Level5Scene');
  });
  await page.waitForTimeout(900);
};

// 1) Spawn a barrel and watch it descend the stairwell.
await startL5();
await page.evaluate(() => {
  const sc = window.__SKULL__.scene.getScene('Level5Scene');
  // Move player out of the way at the bottom so it doesn't interfere.
  sc.player.setPosition(250, sc.lobbyY);
  sc._spawnRollingBarrel();
});
const ys = [];
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(400);
  const b = await page.evaluate(() => {
    const sc = window.__SKULL__.scene.getScene('Level5Scene');
    const k = sc.barrels[0];
    return k ? { x: Math.round(k.x), y: Math.round(k.y), dir: k.dir } : null;
  });
  ys.push(b);
}
console.log('DESCENT samples:', JSON.stringify(ys));
const yvals = ys.filter(Boolean).map((s) => s.y);
console.log('descended:', yvals.length > 1 ? (yvals[yvals.length - 1] - yvals[0]) : 'n/a', '(should be large positive or barrel reached lobby & despawned)');
await page.screenshot({ path: 'qa/shots/l5-barrels.png' });

// 2) Smash test: spawn a barrel next to the player and swing.
await startL5();
const smash = await page.evaluate(() => {
  const sc = window.__SKULL__.scene.getScene('Level5Scene');
  sc.player.setPosition(120, sc.lobbyY);
  const b = sc.addDestructible(140, sc.lobbyY, 'barrel');
  b.rolling = true; b.dir = 1; b._wasFloor = true; b._life = 9000; sc.barrels.push(b);
  const before = sc.barrels.length;
  sc.player.facing = 1;
  sc.player.attackCd = 0;
  sc.player._swing(false);
  return { before };
});
await page.waitForTimeout(400);
const smashAfter = await page.evaluate(() => {
  const sc = window.__SKULL__.scene.getScene('Level5Scene');
  return { barrels: sc.barrels.filter((b) => b.active && !b.dead).length };
});
console.log('SMASH: before=', smash.before, 'aliveAfter=', smashAfter.barrels, '(expect 0 alive)');

// 3) Roll-over test: barrel overlaps player -> lose a heart.
await startL5();
const rollover = await page.evaluate(() => {
  const sc = window.__SKULL__.scene.getScene('Level5Scene');
  sc.player.setPosition(120, sc.lobbyY);
  sc.player.invuln = 0;
  const hp0 = sc.player.hearts;
  const b = sc.addDestructible(122, sc.lobbyY, 'barrel');
  b.rolling = true; b.dir = -1; b._wasFloor = true; b._life = 9000; sc.barrels.push(b);
  // Manually invoke the contact handler (overlap also runs in physics step).
  sc._barrelHitsPlayer(b);
  return { hp0, hp1: sc.player.hearts };
});
console.log('ROLL-OVER: hearts', rollover.hp0, '->', rollover.hp1, '(expect -1)');

console.log('\nerrors:', errors.length, errors.slice(0, 4));
await browser.close();
