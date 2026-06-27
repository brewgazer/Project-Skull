// QA: boot each level 3-9, drive input briefly, assert no runtime errors and
// that the core scene state is sane. Captures a screenshot per level.
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5175/';
const SCENES = ['Level3Scene', 'Level4Scene', 'Level5Scene', 'Level6Scene', 'Level7Scene', 'Level8Scene', 'Level9Scene'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

let allOk = true;
for (const key of SCENES) {
  const before = errors.length;
  await page.evaluate((k) => {
    const mgr = window.__SKULL__.scene;
    ['MainMenuScene', 'LevelSelectScene', 'SettingsScene', 'HUDScene', 'PauseScene', 'LevelCompleteScene']
      .forEach((s) => mgr.isActive(s) && mgr.stop(s));
    window.__SKULL__.scene.getScenes(true).forEach((sc) => {
      if (sc.scene.key.startsWith('Level')) mgr.stop(sc.scene.key);
    });
    mgr.start(k);
  }, key);

  await page.waitForTimeout(900);
  // Drive a little input: move right, jump, attack.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.down('KeyD');
    await page.keyboard.down('KeyJ');
    await page.waitForTimeout(120);
    if (i % 3 === 0) await page.keyboard.press('KeyW');
    await page.keyboard.up('KeyJ');
  }
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(1500);

  const snap = await page.evaluate((k) => {
    const sc = window.__SKULL__.scene.getScene(k);
    if (!sc || !sc.scene.isActive()) return { active: false };
    return {
      active: true,
      hasPlayer: !!sc.player,
      playerDead: sc.player?.dead,
      hearts: sc.player?.hearts,
      enemiesRemaining: sc.enemiesRemaining,
      enemiesActive: sc.enemies?.getChildren().filter((e) => e.active && !e.dead).length,
      worldW: sc.worldWidth,
      worldH: sc.worldHeight,
      px: Math.round(sc.player?.x),
      py: Math.round(sc.player?.y),
    };
  }, key);

  const newErrors = errors.slice(before);
  const ok = snap.active && snap.hasPlayer && newErrors.length === 0;
  if (!ok) allOk = false;
  console.log(`${key}: ${ok ? 'OK ' : 'FAIL'} | active=${snap.active} player@(${snap.px},${snap.py}) hearts=${snap.hearts} enemies=${snap.enemiesActive}/${snap.enemiesRemaining} world=${snap.worldW}x${snap.worldH}`);
  if (newErrors.length) console.log('   errors:', newErrors.slice(0, 4));

  await page.screenshot({ path: `qa/shots/${key}.png` });
}

console.log('\nRESULT:', allOk ? 'ALL LEVELS BOOTED CLEANLY' : 'SOME LEVELS FAILED');
console.log('total errors:', errors.length);
await browser.close();
process.exit(allOk ? 0 : 1);
