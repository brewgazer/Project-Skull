// Weapon definitions. The combat framework is fully data-driven: each weapon is
// described here and the generic melee/ranged systems bring it to life. Adding a
// weapon is a matter of adding an entry (plus a sprite in Assets if melee).

export const WEAPONS = {
  chainsaw: {
    id: 'chainsaw',
    name: 'Chainsaw',
    kind: 'melee',
    continuous: true, // grinds while held rather than discrete swings
    sprite: 'chainsaw',
    icon: 'chainsaw_icon',
    damage: 1.4, // per grind tick
    tickRate: 90, // ms between damage ticks while grinding
    reach: 26,
    arcHeight: 18,
    knockback: 120,
    weight: 0.85, // movement speed multiplier while wielding
    hitstop: 35,
    shake: 0.006,
    gore: 1.6, // blood multiplier
    sound: 'crit',
    canExecute: true,
  },
  bat: {
    id: 'bat',
    name: 'Baseball Bat',
    kind: 'melee',
    continuous: false,
    sprite: 'bat',
    icon: 'bat_icon',
    damage: 2,
    attackTime: 240, // swing duration
    cooldown: 120,
    reach: 30,
    arcHeight: 26,
    knockback: 360,
    weight: 1,
    hitstop: 70,
    shake: 0.012,
    gore: 0.8,
    sound: 'batHit',
    canExecute: true,
    sweetSpot: { start: 80, end: 160, knockbackBonus: 2.2, scoreBonus: 200 },
  },
  crowbar: {
    id: 'crowbar', name: 'Crowbar', kind: 'melee', sprite: 'crowbar', icon: 'crowbar_icon',
    damage: 1.6, attackTime: 200, cooldown: 90, reach: 26, arcHeight: 22,
    knockback: 240, weight: 1.05, hitstop: 55, shake: 0.01, gore: 0.9, sound: 'hit', canExecute: true,
  },
  fireaxe: {
    id: 'fireaxe', name: 'Fire Axe', kind: 'melee', sprite: 'fireaxe', icon: 'fireaxe_icon',
    damage: 3, attackTime: 320, cooldown: 200, reach: 28, arcHeight: 28,
    knockback: 300, weight: 0.8, hitstop: 90, shake: 0.016, gore: 1.4, sound: 'crit', canExecute: true,
  },
  pipe: {
    id: 'pipe', name: 'Lead Pipe', kind: 'melee', sprite: 'pipe', icon: 'pipe_icon',
    damage: 1.8, attackTime: 220, cooldown: 110, reach: 28, arcHeight: 24,
    knockback: 280, weight: 0.95, hitstop: 60, shake: 0.011, gore: 0.7, sound: 'batHit', canExecute: true,
  },
  shotgun: {
    id: 'shotgun', name: 'Shotgun', kind: 'ranged', sprite: 'shotgun', icon: 'shotgun_icon',
    damage: 2.2, cooldown: 560, range: 120, pellets: 6, spread: 18, knockback: 300,
    weight: 0.9, hitstop: 45, shake: 0.016, gore: 1.2, sound: 'explosion',
  },
  nailgun: {
    id: 'nailgun', name: 'Nail Gun', kind: 'ranged', sprite: 'nailgun', icon: 'nailgun_icon',
    damage: 1.0, cooldown: 140, range: 150, pellets: 1, spread: 4, knockback: 90,
    weight: 1, hitstop: 18, shake: 0.005, gore: 0.5, sound: 'hit',
  },
  // --- Levels 10+ arsenal ------------------------------------------------
  revolver: {
    id: 'revolver', name: 'Revolver', kind: 'ranged', sprite: 'revolver', icon: 'revolver_icon',
    damage: 4, cooldown: 620, range: 160, pellets: 1, spread: 2, knockback: 360,
    weight: 1, hitstop: 70, shake: 0.02, gore: 1.2, sound: 'crit',
  },
  arccutter: {
    id: 'arccutter', name: 'Arc Cutter', kind: 'ranged', sprite: 'arccutter', icon: 'arccutter_icon',
    // Short-range electrical arc that chains to nearby foes.
    damage: 1.3, cooldown: 260, range: 78, pellets: 1, spread: 3, knockback: 70,
    weight: 0.95, hitstop: 22, shake: 0.008, gore: 0.6, sound: 'crit',
    chain: 3, chainRange: 52,
  },
  // Lobbed incendiary — arcs through the air and shatters into a burning pool.
  molotov: {
    id: 'molotov', name: 'Molotov', kind: 'throw', sprite: 'molotov', icon: 'molotov_icon',
    damage: 1, cooldown: 820, knockback: 60, weight: 1, sound: 'slash',
    throwSpeed: 210, fireMs: 2600, fireDps: 1.3, fireWidth: 58,
  },
  // Full-auto assault rifle — hold to spray. The combat-shooter mainstay.
  ar: {
    id: 'ar', name: 'Assault Rifle', kind: 'ranged', auto: true, sprite: 'ar', icon: 'ar_icon',
    damage: 1.1, cooldown: 95, range: 180, pellets: 1, spread: 5, knockback: 70,
    weight: 1, hitstop: 9, shake: 0.006, gore: 0.5, sound: 'hit',
  },
  // Short freezing cone — slows foes and freezes them solid for a shatter hit.
  cryo: {
    id: 'cryo', name: 'Cryo Sprayer', kind: 'spray', sprite: 'cryo', icon: 'cryo_icon',
    cooldown: 90, range: 66, arcHeight: 30, weight: 0.95, sound: 'hit',
    slow: 0.4, slowMs: 900, freezePerTick: 1,
  },
};

export const WEAPON_ORDER = [
  'chainsaw', 'bat', 'crowbar', 'pipe', 'fireaxe', 'shotgun', 'nailgun',
  'revolver', 'arccutter', 'molotov', 'cryo', 'ar',
];
