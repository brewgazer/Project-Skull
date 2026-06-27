// QA for the bug-fix pass: restart, death-restart, weapon visuals, ranged fire.
import { chromium } from 'playwright';
const URL = 'http://localhost:5175/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const startLevel = async (key) => {
  await page.evaluate((k) => {
    const mgr = window.__SKULL__.scene;
    mgr.getScenes(true).forEach((sc) => { if (sc.scene.key !== 'BootScene') mgr.stop(sc.scene.key); });
    mgr.start(k);
  }, key);
  await page.waitForTimeout(900);
};

// --- 1. Pause -> Restart ----------------------------------------------------
await startLevel('Level1Scene');
await page.evaluate(() => {
  const sc = window.__SKULL__.scene.getScene('Level1Scene');
  sc.fx.hitStop(2000); // simulate an in-progress hit-stop (global anim pause)
  sc._togglePause();
});
await page.waitForTimeout(400);
await page.evaluate(() => {
  const pause = window.__SKULL__.scene.getScene('PauseScene');
  pause._restart();
});
await page.waitForTimeout(1500);
const r1 = await page.evaluate(() => {
  const mgr = window.__SKULL__.scene;
  const sc = mgr.getScene('Level1Scene');
  return {
    levelActive: mgr.isActive('Level1Scene'),
    paused: mgr.isPaused('Level1Scene'),
    hudActive: mgr.isActive('HUDScene'),
    pauseActive: mgr.isActive('PauseScene'),
    globalTimeScale: window.__SKULL__.anims.globalTimeScale,
    px: Math.round(sc?.player?.x),
    animProgressing: sc?.player?.anims?.isPlaying,
  };
});
console.log('RESTART:', JSON.stringify(r1));

// --- 2. Death restarts the level from the beginning -------------------------
await startLevel('Level1Scene');
await page.evaluate(() => {
  const sc = window.__SKULL__.scene.getScene('Level1Scene');
  sc.player.setPosition(900, sc.player.y); // move "further in"
  sc.player.takeDamage(99, 1); // die
});
await page.waitForTimeout(2600);
const r2 = await page.evaluate(() => {
  const mgr = window.__SKULL__.scene;
  const sc = mgr.getScene('Level1Scene');
  return {
    levelActive: mgr.isActive('Level1Scene'),
    px: Math.round(sc?.player?.x),
    hearts: sc?.player?.hearts,
    dead: sc?.player?.dead,
    globalTimeScale: window.__SKULL__.anims.globalTimeScale,
  };
});
console.log('DEATH-RESTART:', JSON.stringify(r2), '(expect px~60, hearts=3, dead=false)');

// --- 3. Weapon visuals are distinct per level -------------------------------
const weaponByLevel = {};
for (const [key, expect] of [['Level3Scene', 'crowbar'], ['Level5Scene', 'fireaxe'], ['Level6Scene', 'nailgun'], ['Level8Scene', 'shotgun']]) {
  await startLevel(key);
  const w = await page.evaluate((k) => {
    const sc = window.__SKULL__.scene.getScene(k);
    return { weapon: sc.player.weaponId, spriteTex: sc.player.weaponSprite.texture.key };
  }, key);
  weaponByLevel[key] = w;
  console.log(`WEAPON ${key}: id=${w.weapon} sprite=${w.spriteTex} (expect ${expect})`);
}

// --- 4. Ranged fire damages an enemy (shotgun in L8) ------------------------
await startLevel('Level8Scene');
const r4 = await page.evaluate(async () => {
  const sc = window.__SKULL__.scene.getScene('Level8Scene');
  // Place an enemy right in front of the player and fire.
  const e = sc.spawnEnemy('grunt', sc.player.x + 40, sc.player.y);
  e.aggro = false;
  const before = e.hp;
  sc.player.facing = 1;
  sc.player.attackCd = 0;
  sc.player._fireRanged();
  return { hpBefore: before, hpAfter: e.hp, kind: sc.player.weapon.kind };
});
console.log('RANGED:', JSON.stringify(r4), '(expect hpAfter < hpBefore)');

console.log('\nerrors:', errors.length, errors.slice(0, 4));
await browser.close();
