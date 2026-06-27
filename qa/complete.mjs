// QA: prove the trickier levels can actually be completed (exit gating + boss).
import { chromium } from 'playwright';
const URL = 'http://localhost:5175/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

async function runLevel(key) {
  await page.evaluate((k) => {
    const mgr = window.__SKULL__.scene;
    mgr.getScenes(true).forEach((sc) => { if (sc.scene.key !== 'BootScene') mgr.stop(sc.scene.key); });
    mgr.start(k);
  }, key);
  await page.waitForTimeout(700);

  for (let t = 0; t < 80; t++) {
    const done = await page.evaluate((k) => {
      const mgr = window.__SKULL__.scene;
      const sc = mgr.getScene(k);
      if (!sc || !sc.scene.isActive()) {
        return mgr.isActive('LevelCompleteScene') ? 'complete' : 'gone';
      }
      if (sc.levelOver) return 'over';
      // Kill all active enemies; chip the boss.
      sc.enemies.getChildren().forEach((e) => {
        if (!e.active || e.dead) return;
        if (e.isBoss) e.takeHit(10, 0, 1);
        else e.execute(1);
      });
      // Advance the player toward the goal.
      const p = sc.player;
      p.hearts = p.maxHearts; // stay alive for the test
      p.invuln = 200;
      if (sc.exit && sc.exit.active) {
        p.setPosition(sc.exit.x, sc.exit.y - 2);
        p.setVelocity(0, 0);
      } else {
        // March right (and up for vertical levels) to trip gates/boss.
        p.setPosition(Math.min(p.x + 60, sc.worldWidth - 10), p.y);
      }
      return 'running';
    }, key);

    if (done === 'complete') return { key, result: 'COMPLETE' };
    if (done === 'over') {
      await page.waitForTimeout(1200);
      const c = await page.evaluate(() => window.__SKULL__.scene.isActive('LevelCompleteScene'));
      return { key, result: c ? 'COMPLETE' : 'OVER(no results scene)' };
    }
    if (done === 'gone') return { key, result: 'SCENE GONE' };
    await page.waitForTimeout(300);
  }
  return { key, result: 'TIMEOUT' };
}

for (const key of ['Level3Scene', 'Level8Scene', 'Level9Scene']) {
  const before = errors.length;
  const r = await runLevel(key);
  console.log(`${r.key}: ${r.result}  (errors:${errors.length - before})`);
}
console.log('total errors:', errors.length, errors.slice(0, 4));
await browser.close();
