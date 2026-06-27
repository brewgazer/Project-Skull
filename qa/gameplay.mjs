import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('qa/shots', { recursive: true });

const errors = [];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForSelector('canvas');
await page.waitForTimeout(1300);
await page.click('canvas');
await page.keyboard.press('Enter');
await page.waitForTimeout(2300);

const snap = () =>
  page.evaluate(() => {
    const lv = window.__SKULL__.scene.getScene('Level1Scene');
    return {
      score: lv.scoreSystem.score,
      kills: lv.scoreSystem.kills,
      remaining: lv.enemiesRemaining,
      combo: lv.combo.count,
      px: Math.round(lv.player.x),
      hearts: lv.player.hearts,
      fps: Math.round(lv.game.loop.actualFps),
    };
  });

console.log('start:', await snap());

// Advance right while grinding the chainsaw for several seconds.
await page.keyboard.down('KeyD');
await page.keyboard.down('KeyJ');
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(1000);
  const s = await snap();
  console.log(`t+${i + 1}s:`, s);
}
await page.keyboard.up('KeyJ');
await page.keyboard.up('KeyD');
await page.screenshot({ path: 'qa/shots/07-combat-run.png' });

const final = await snap();
console.log('\nLevel1 result:', final);
console.log('kills>0:', final.kills > 0, '| score>0:', final.score > 0);

// Boot Level 2 directly to confirm it initialises without errors.
await page.evaluate(() => {
  window.__SKULL__.scene.stop('HUDScene');
  window.__SKULL__.scene.stop('Level1Scene');
  window.__SKULL__.scene.start('Level2Scene');
});
await page.waitForTimeout(3000);
const l2 = await page.evaluate(() => {
  const lv = window.__SKULL__.scene.getScene('Level2Scene');
  return { active: lv.sys.settings.status, wave: lv.wave, weapon: lv.player.weaponId, doorHp: lv.doorHealth };
});
console.log('Level2 boot:', l2);
await page.screenshot({ path: 'qa/shots/08-level2.png' });

await browser.close();
console.log('\nERRORS:', errors.length ? errors : 'none');
process.exit(errors.length ? 1 : 0);
