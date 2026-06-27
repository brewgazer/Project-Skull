// Character color schemes. Each drives the CharacterArtist to produce a fully
// animated, original sprite. New enemies = a new entry here.

export const SCHEMES = {
  // The protagonist: small figure, oversized hoodie, eerie skull mask.
  player: {
    outline: '#0a0a0c',
    body: '#2c2233',
    bodyShade: '#1c1624',
    hood: '#241b2c',
    limb: '#332838',
    limbShade: '#241b29',
    head: '#ded7c4',
    headShade: '#b1aa97',
    eye: '#ff2b3c',
    accent: '#b3001b',
    boots: '#141319',
    headStyle: 'skull',
  },

  // Level 1 fodder — panicking office worker.
  grunt: {
    outline: '#0a0a0c',
    body: '#d8d4cc',
    bodyShade: '#a9a59c',
    hood: '#3a3d44',
    limb: '#2f323a',
    limbShade: '#23252b',
    head: '#caa07a',
    headShade: '#9c7959',
    eye: '#1a1a1a',
    accent: '#7a2230',
    boots: '#1a1a1f',
    headStyle: 'bald',
  },

  // Fast attacker — lighter, quicker, wears a cap.
  runner: {
    outline: '#0a0a0c',
    body: '#46707a',
    bodyShade: '#2f4d54',
    hood: '#243a40',
    limb: '#2b3a3e',
    limbShade: '#1f2b2e',
    head: '#d2a684',
    headShade: '#a07b5e',
    eye: '#16161a',
    accent: '#f2c200',
    boots: '#16161a',
    headStyle: 'cap',
  },

  // Armored bruiser — slow, tanky, riot helmet.
  brute: {
    outline: '#070708',
    body: '#3a3d44',
    bodyShade: '#26282d',
    hood: '#1d1f23',
    limb: '#2c2e33',
    limbShade: '#1c1d21',
    head: '#5a5e66',
    headShade: '#3c3f45',
    eye: '#7fd0ff',
    accent: '#2b2d31',
    boots: '#101012',
    headStyle: 'helmet',
  },

  // Lab coat scientist (Level 4) — fragile, panicked, goggles.
  scientist: {
    outline: '#0a0a0c',
    body: '#e6e8ea',
    bodyShade: '#b4b7bb',
    hood: '#cfd2d6',
    limb: '#c8cacd',
    limbShade: '#9a9ca0',
    head: '#d8b08c',
    headShade: '#a9855f',
    eye: '#6dd400',
    accent: '#6dd400',
    boots: '#2a2c30',
    headStyle: 'lab',
  },

  // Security guard (Levels 4 & 8) — navy uniform, riot helmet, sturdy.
  guard: {
    outline: '#070709',
    body: '#1f2a3a',
    bodyShade: '#141d29',
    hood: '#0f1722',
    limb: '#1a2330',
    limbShade: '#101822',
    head: '#5a5e66',
    headShade: '#3c3f45',
    eye: '#ffb020',
    accent: '#2b3a52',
    boots: '#0a0c10',
    headStyle: 'helmet',
  },

  // Mutated experiment (Level 4) — toxic, fast, twitching menace.
  mutant: {
    outline: '#06120a',
    body: '#3f7a36',
    bodyShade: '#274d22',
    hood: '#1c3a18',
    limb: '#356b2e',
    limbShade: '#21441d',
    head: '#7fce5a',
    headShade: '#4f8c37',
    eye: '#eaff00',
    accent: '#aaff33',
    boots: '#14240f',
    headStyle: 'bald',
  },

  // Level 10 — escaped inmate: orange jumpsuit, wild-eyed, fast and reckless.
  inmate: {
    outline: '#0a0a0c',
    body: '#e0741a',
    bodyShade: '#a84f0e',
    hood: '#7a3a0a',
    limb: '#c9651a',
    limbShade: '#8a4310',
    head: '#caa07a',
    headShade: '#9c7959',
    eye: '#ffd23c',
    accent: '#1a1a1a',
    boots: '#16140f',
    headStyle: 'bald',
  },

  // Level 10 — riot officer: heavy black armor, visored helmet, immovable.
  riotcop: {
    outline: '#050506',
    body: '#16181d',
    bodyShade: '#0c0d10',
    hood: '#070809',
    limb: '#202329',
    limbShade: '#121419',
    head: '#4a4e56',
    headShade: '#2e3138',
    eye: '#7fd0ff',
    accent: '#3a3f48',
    boots: '#060708',
    headStyle: 'helmet',
  },

  // Level 11 — hazmat security: sealed yellow-green suit, gas-mask goggles.
  hazmat: {
    outline: '#0a0c08',
    body: '#b9c23a',
    bodyShade: '#838a26',
    hood: '#5e651a',
    limb: '#9aa330',
    limbShade: '#6c7320',
    head: '#3a4036',
    headShade: '#262a22',
    eye: '#6dd400',
    accent: '#1a1a1a',
    boots: '#14160f',
    headStyle: 'lab',
  },

  // Level 11 — cleanup robot: boxy steel chassis, single scanning optic.
  cleanbot: {
    outline: '#070a0c',
    body: '#5c6470',
    bodyShade: '#3c424c',
    hood: '#2a2f37',
    limb: '#474d57',
    limbShade: '#2e333b',
    head: '#7a828e',
    headShade: '#4c525c',
    eye: '#ff7a1e',
    accent: '#9aa3af',
    boots: '#202428',
    headStyle: 'helmet',
  },

  // Level 12 — military soldier: olive fatigues, tactical helmet, rifle.
  soldier: {
    outline: '#0a0c08',
    body: '#4a5230',
    bodyShade: '#333a20',
    hood: '#262b16',
    limb: '#3f4729',
    limbShade: '#2a311b',
    head: '#caa07a',
    headShade: '#9c7959',
    eye: '#1a1a1a',
    accent: '#2c3320',
    boots: '#14160f',
    headStyle: 'helmet',
  },

  // Level 12 — commando: blacked-out tactical armor, visor.
  commando: {
    outline: '#060708',
    body: '#23272e',
    bodyShade: '#15181d',
    hood: '#0d0f12',
    limb: '#2b3038',
    limbShade: '#191c21',
    head: '#3a3f47',
    headShade: '#23272d',
    eye: '#ff5a3c',
    accent: '#3a4150',
    boots: '#0a0b0d',
    headStyle: 'helmet',
  },

  // Level 12 mini-boss — Prototype Security Android: chrome chassis, optic.
  android: {
    outline: '#070a0c',
    body: '#7b8794',
    bodyShade: '#525c66',
    hood: '#3a424b',
    limb: '#67727d',
    limbShade: '#454e57',
    head: '#9aa6b2',
    headShade: '#646f7a',
    eye: '#ff3b3b',
    accent: '#c2ccd6',
    boots: '#2a2f35',
    headStyle: 'helmet',
  },

  // FINAL BOSS — "The Chairman": a tall executive in a sharp blood-red suit.
  chairman: {
    outline: '#070708',
    body: '#1a1014',
    bodyShade: '#0e0a0c',
    hood: '#120b0d',
    limb: '#221318',
    limbShade: '#140b0e',
    head: '#d8c0a4',
    headShade: '#a08560',
    eye: '#ff2b3c',
    accent: '#b3001b',
    boots: '#0a0608',
    headStyle: 'suit',
  },

  // Level 1 mini-boss — hulking foreman with a hardhat and glowing menace.
  miniboss: {
    outline: '#070708',
    body: '#5a2a1f',
    bodyShade: '#3a1813',
    hood: '#2a120e',
    limb: '#4a241b',
    limbShade: '#311610',
    head: '#caa07a',
    headShade: '#8f6e4f',
    eye: '#ff8a1e',
    accent: '#f2c200',
    boots: '#15100c',
    headStyle: 'hardhat',
  },
};
