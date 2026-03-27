(() => {
  const existing = document.getElementById('td-console-root');
  if (existing) existing.remove();

  const root = document.createElement('div');
  root.id = 'td-console-root';
  Object.assign(root.style, {
    position: 'fixed', inset: '0', zIndex: '2147483647', background: '#0f1b2d', pointerEvents: 'auto',
  });
  document.body.appendChild(root);

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', cursor: 'crosshair',
  });
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const hint = document.createElement('div');
  hint.textContent = 'Merged Console TD — SHOP/UPGRADES/PRO/AGENTS | ESC quit';
  Object.assign(hint.style, {
    position: 'fixed', top: '10px', left: '10px', color: '#fff', font: '600 12px system-ui,sans-serif',
    background: '#0009', borderRadius: '8px', padding: '6px 10px', pointerEvents: 'none',
  });
  root.appendChild(hint);

  const SIDE_PANEL = 330;
  const TICK_MS = 1000 / 60;
  const MAX_WAVES = 45;

  let width = 0, height = 0;
  let gameOver = false, runWon = false;
  let waveInProgress = false, spawnTimer = 0, waveQueue = [];
  let shopScroll = 0, wheelAccum = 0;
  let autoNextWave = false, gameSpeed = 1;
  let currentScreen = 'home';
  let sceneryByMap = [];

  const difficultyDefs = {
    easy: { name: 'Easy', startCash: 900, lives: 150, bloonHp: 0.9, bloonSpeed: 0.92, cashMult: 1.12, coinMult: 1.0 },
    medium: { name: 'Medium', startCash: 700, lives: 100, bloonHp: 1.0, bloonSpeed: 1.0, cashMult: 1.0, coinMult: 1.35 },
    hard: { name: 'Hard', startCash: 540, lives: 70, bloonHp: 1.25, bloonSpeed: 1.12, cashMult: 0.9, coinMult: 1.8 },
    impoppable: { name: 'Impoppable', startCash: 450, lives: 1, bloonHp: 1.45, bloonSpeed: 1.2, cashMult: 0.82, coinMult: 2.2 },
  };

  const progression = {
    xp: 0, level: 1, points: 0, attackSpeedLevel: 0, startingCashLevel: 0,
  };

  const profile = {
    coins: Number(localStorage.getItem('td_coins') || '0'),
    monkeyMoney: Number(localStorage.getItem('td_mm') || '0'),
    unlockedSpecialTowers: {
      super: false, laser: false, plasma: false, sun: false,
    },
  };

  const loadedUnlocks = localStorage.getItem('td_unlocks');
  if (loadedUnlocks) {
    try { Object.assign(profile.unlockedSpecialTowers, JSON.parse(loadedUnlocks)); } catch {}
  }

  const state = {
    money: 700, lives: 100, wave: 1,
    hover: { x: 0, y: 0 },
    selectedTowerType: 'dart',
    selectedTower: null,
    selectedMap: 0,
    difficulty: 'medium',
  };

  const agents = { spikes: 3, glueTrap: 2, farmer: 1 };
  let agentMode = null;
  const placedAgents = []; // deprecated (agents removed from UI/controls)

  const towerDefs = {
    dart: { name: 'Dart', icon: '➤', color: '#8d6e63', cost: 170, range: 145, fireRate: 29, damage: 1, pierce: 1, projectileSpeed: 11, unlockLvl: 1,
      pathNames: { p1: ['Pierce+', 'Range+', 'Lead Pop', 'Rapid Darts', 'PRO Plasma', 'PRO+ Hyper', 'PRO MAX'],
                   p2: ['Camo Sight', 'Lead Pop', 'Crit Darts', 'Faster Hands', 'PRO Scout', 'PRO+ Intel', 'PRO MAX'] } },
    ninja: { name: 'Ninja', icon: '✦', color: '#5e35b1', cost: 360, range: 185, fireRate: 17, damage: 1, pierce: 2, projectileSpeed: 13, unlockLvl: 2,
      pathNames: { p1: ['Sharper Stars', 'Range+', 'Lead Pop', 'Flash Bomb', 'PRO Grandmaster', 'PRO+ Storm', 'PRO MAX'],
                   p2: ['Camo Master', 'Shuriken+', 'Sticky Hit', 'Attack Speed', 'PRO Saboteur', 'PRO+ Shadow', 'PRO MAX'] } },
    bomb: { name: 'Bomb', icon: '✹', color: '#37474f', cost: 620, range: 170, fireRate: 55, damage: 1, pierce: 1, projectileSpeed: 8, splash: 85, unlockLvl: 3,
      pathNames: { p1: ['Bigger Blast', 'Heavy Shell', 'Cluster', 'MOAB Pop', 'PRO Siege', 'PRO+ Barrage', 'PRO MAX'],
                   p2: ['Faster Reload', 'Blast+', 'Stun', 'Rapid Bombs', 'PRO Demo', 'PRO+ Shock', 'PRO MAX'] } },
    ice: { name: 'Ice', icon: '❄', color: '#81d4fa', cost: 430, range: 120, fireRate: 45, damage: 1, pierce: 999, projectileSpeed: 0, freezeDuration: 80, unlockLvl: 4,
      pathNames: { p1: ['Long Freeze', 'Cold Snap', 'Deep Freeze', 'Arctic Aura', 'PRO Zero', 'PRO+ Blizzard', 'PRO MAX'],
                   p2: ['Camo Freeze', 'Lead Crack', 'Brittle', 'Pulse Speed', 'PRO Permafrost', 'PRO+ Glacial', 'PRO MAX'] } },
    sniper: { name: 'Sniper', icon: '◉', color: '#263238', cost: 550, range: 5000, fireRate: 68, damage: 3, pierce: 1, projectileSpeed: 20, unlockLvl: 5,
      pathNames: { p1: ['Damage+', 'Damage+', 'Lead/Ceramic+', 'Faster Aim', 'PRO Elite', 'PRO+ Deadeye', 'PRO MAX'],
                   p2: ['Vision+', 'Shrapnel', 'Reveal', 'Reload+', 'PRO Support', 'PRO+ Radar', 'PRO MAX'] } },
    boomerang: { name: 'Boomer', icon: '◌', color: '#ff9800', cost: 410, range: 170, fireRate: 24, damage: 1, pierce: 4, projectileSpeed: 10, unlockLvl: 2,
      pathNames: { p1: ['Pierce+', 'Range+', 'Lead Slice', 'Damage+', 'PRO Storm', 'PRO+ Cyclone', 'PRO MAX'],
                   p2: ['Faster Throw', 'Ricochet', 'Double Throw', 'Faster+', 'PRO Returning+', 'PRO+ Orbit', 'PRO MAX'] } },
    tack: { name: 'Tack', icon: '✸', color: '#f06292', cost: 320, range: 95, fireRate: 12, damage: 1, pierce: 1, projectileSpeed: 9, burst: 6, unlockLvl: 2,
      pathNames: { p1: ['More Tacks', 'Range+', 'Hot Tacks', 'Burst+', 'PRO Inferno', 'PRO+ Spin', 'PRO MAX'],
                   p2: ['Faster Shot', 'Faster+', 'Ring+', 'Speed+', 'PRO Hyper', 'PRO+ Blades', 'PRO MAX'] } },
    glue: { name: 'Glue', icon: '●', color: '#8bc34a', cost: 300, range: 145, fireRate: 28, damage: 0, pierce: 1, projectileSpeed: 10, glueSlow: 0.55, glueTicks: 120, unlockLvl: 3,
      pathNames: { p1: ['Longer Glue', 'Stronger Slow', 'Glue Splatter', 'AOE Glue', 'PRO Solver', 'PRO+ Corrosion', 'PRO MAX'],
                   p2: ['Faster Shots', 'Glue Soak', 'Slow+', 'Global Glue', 'PRO Storm', 'PRO+ Melt', 'PRO MAX'] } },
    village: { name: 'Village', icon: '⌂', color: '#f2d39c', cost: 760, range: 165, fireRate: 99999, damage: 0, pierce: 0, projectileSpeed: 0, unlockLvl: 6,
      pathNames: { p1: ['Bigger Radius', 'Jungle Drums', 'Radar Scanner', 'Primary Training', 'PRO Homeland', 'PRO+ Command', 'PRO MAX'],
                   p2: ['Discount', 'Big Discount', 'Monkey Intel', 'MIB', 'PRO CTA', 'PRO+ Support', 'PRO MAX'] } },
    super: { name: 'Super', icon: '⬢', color: '#ffd54f', cost: 2800, range: 240, fireRate: 6, damage: 2, pierce: 3, projectileSpeed: 17, unlockCoins: 900 },
    laser: { name: 'Laser', icon: '═', color: '#80deea', cost: 3400, range: 260, fireRate: 9, damage: 4, pierce: 5, projectileSpeed: 19, unlockCoins: 1600 },
    plasma: { name: 'Plasma', icon: '✺', color: '#ba68c8', cost: 4300, range: 275, fireRate: 8, damage: 5, pierce: 6, projectileSpeed: 20, unlockCoins: 2600 },
    sun: { name: 'Sun God', icon: '☀', color: '#ffca28', cost: 6200, range: 305, fireRate: 7, damage: 8, pierce: 8, projectileSpeed: 22, unlockCoins: 4200 },
    farm: { name: 'Farm', icon: '▦', color: '#66bb6a', cost: 1050, range: 0, fireRate: 99999, damage: 0, pierce: 0, projectileSpeed: 0, unlockLvl: 4,
      pathNames: { p1: ['More Bananas', 'Even More', 'Bountiful', 'Marketplace', 'Banana Central'], p2: ['Faster Harvest', 'Valuable Bananas', 'Banking', 'Big Bank', 'Wall Street'], p3: ['Fertilizer', 'Long Crates', 'Auto-Collect', 'Monkeynomics', 'God Farm'] } },
    support: { name: 'Support', icon: '✚', color: '#90a4ae', cost: 980, range: 170, fireRate: 99999, damage: 0, pierce: 0, projectileSpeed: 0, unlockLvl: 5,
      pathNames: { p1: ['Range Aura', 'Bigger Aura', 'Sharpen', 'Elite Range', 'Commander'], p2: ['Speed Aura', 'Faster Aura', 'Overclock', 'Ultra Boost', 'Time Warp'], p3: ['Detection', 'Lead Assist', 'Armor Crack', 'Boss Debuff', 'God Support'] } },
  };

  // NEW: ensure every tower has a 3rd path with 5 tiers for BTD-style 3-path UI/logic.
  Object.keys(towerDefs).forEach((k) => {
    const d = towerDefs[k];
    if (!d.pathNames) d.pathNames = {};
    if (!d.pathNames.p1) d.pathNames.p1 = ['T1', 'T2', 'T3', 'T4', 'T5'];
    if (!d.pathNames.p2) d.pathNames.p2 = ['T1', 'T2', 'T3', 'T4', 'T5'];
    if (!d.pathNames.p3) d.pathNames.p3 = ['T1', 'T2', 'T3', 'T4', 'T5'];
  });

  const bloonCatalog = {
    red: { hp: 1, speed: 1.7, color: '#e53935', reward: 8, damage: 1, immunities: [] },
    blue: { hp: 2, speed: 2.1, color: '#1e88e5', reward: 10, damage: 1, immunities: [] },
    green: { hp: 3, speed: 2.4, color: '#43a047', reward: 12, damage: 1, immunities: [] },
    yellow: { hp: 5, speed: 3.0, color: '#fdd835', reward: 14, damage: 1, immunities: [] },
    pink: { hp: 6, speed: 3.5, color: '#ec407a', reward: 15, damage: 1, immunities: [] },
    zebra: { hp: 9, speed: 3.0, color: '#ffffff', reward: 18, damage: 2, immunities: ['ice', 'explosive'], stripe: '#111' },
    black: { hp: 7, speed: 2.8, color: '#424242', reward: 16, damage: 2, immunities: ['explosive'] },
    white: { hp: 7, speed: 2.7, color: '#f5f5f5', reward: 16, damage: 2, immunities: ['ice'] },
    purple: { hp: 10, speed: 3.2, color: '#8e24aa', reward: 20, damage: 2, immunities: ['ice'] },
    rainbow: { hp: 20, speed: 3.4, color: '#ff9800', reward: 28, damage: 3, immunities: [] },
    lead: { hp: 12, speed: 1.35, color: '#8e9aa6', reward: 22, damage: 4, immunities: ['sharp'] },
    ceramic: { hp: 34, speed: 2.2, color: '#b08968', reward: 52, damage: 9, immunities: [] },
    fortified: { hp: 70, speed: 2.0, color: '#795548', reward: 85, damage: 14, immunities: [] },
    moab: { hp: 230, speed: 1.2, color: '#00b4d8', reward: 200, damage: 35, immunities: [], radius: 30 },
    bfb: { hp: 600, speed: 0.9, color: '#d90429', reward: 420, damage: 60, immunities: [], radius: 38 },
  };

  const towers = [];
  const bloons = [];
  const projectiles = [];

  const mapDefs = [
    { name: 'Valley Bend', color: '#4caf50', lanes: [[[0,0.55],[0.14,0.55],[0.14,0.18],[0.39,0.18],[0.39,0.82],[0.64,0.82],[0.64,0.3],[0.9,0.3],[0.9,0.85],[1,0.85]]] },
    { name: 'Twin Pass', color: '#5d9c59', lanes: [[[0,0.25],[0.2,0.25],[0.2,0.58],[0.52,0.58],[0.52,0.2],[1,0.2]], [[0,0.75],[0.24,0.75],[0.24,0.42],[0.6,0.42],[0.6,0.85],[1,0.85]]] },
    { name: 'Crossroads', color: '#6ea85f', lanes: [[[0,0.5],[0.22,0.5],[0.22,0.2],[0.5,0.2],[0.5,0.8],[0.78,0.8],[0.78,0.5],[1,0.5]], [[0,0.15],[0.32,0.15],[0.32,0.5],[0.68,0.5],[0.68,0.15],[1,0.15]], [[0,0.85],[0.32,0.85],[0.32,0.5],[0.68,0.5],[0.68,0.85],[1,0.85]]] },
  ];

  const xpToNextLevel = (level) => 100 + level * 70;

  function saveProfile() {
    localStorage.setItem('td_coins', String(profile.coins));
    localStorage.setItem('td_mm', String(profile.monkeyMoney));
    localStorage.setItem('td_unlocks', JSON.stringify(profile.unlockedSpecialTowers));
  }

  function applyMetaBonuses() {
    const diff = difficultyDefs[state.difficulty];
    state.money = diff.startCash + progression.startingCashLevel * 100;
  }

  function gainXp(amount) {
    progression.xp += amount;
    while (progression.xp >= xpToNextLevel(progression.level)) {
      progression.xp -= xpToNextLevel(progression.level);
      progression.level += 1;
      progression.points += 1;
    }
  }

  function getCurrentMap() { return mapDefs[state.selectedMap]; }

  function toPath(absPath) {
    return absPath.map(([rx, ry]) => ({ x: rx * (width - SIDE_PANEL), y: ry * height }));
  }

  function getMapPaths() { return getCurrentMap().lanes.map(toPath); }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    width = canvas.width; height = canvas.height;
    sceneryByMap = mapDefs.map((_, idx) => buildScenery(idx));
  }

  function buildScenery(mapIndex) {
    const presets = [
      [{ type:'tree',x:0.08,y:0.14 },{ type:'tree',x:0.28,y:0.9 },{ type:'rock',x:0.73,y:0.62 },{ type:'pond',x:0.78,y:0.14 },{ type:'bush',x:0.46,y:0.5 },{ type:'rock',x:0.14,y:0.34 }],
      [{ type:'tree',x:0.1,y:0.52 },{ type:'tree',x:0.34,y:0.12 },{ type:'pond',x:0.42,y:0.85 },{ type:'bush',x:0.58,y:0.12 },{ type:'rock',x:0.72,y:0.52 },{ type:'bush',x:0.84,y:0.72 }],
      [{ type:'tree',x:0.12,y:0.12 },{ type:'tree',x:0.12,y:0.88 },{ type:'pond',x:0.5,y:0.5 },{ type:'rock',x:0.86,y:0.12 },{ type:'rock',x:0.86,y:0.88 },{ type:'bush',x:0.5,y:0.08 }],
    ];
    return (presets[mapIndex] || []).map((s) => ({ ...s, px: s.x * (width - SIDE_PANEL), py: s.y * height }));
  }

  function createBloon(type, lane) {
    const base = bloonCatalog[type];
    const path = getMapPaths()[lane];
    const diff = difficultyDefs[state.difficulty];
    return {
      ...structuredClone(base),
      type, lane, x: path[0].x, y: path[0].y, pathIdx: 0,
      slowTicks: 0, glueTicksActive: 0, gluedFactor: 1, camoRevealed: false,
      radius: base.radius ?? 13,
      hp: Math.max(1, Math.ceil(base.hp * diff.bloonHp)),
      maxHp: Math.max(1, Math.ceil(base.hp * diff.bloonHp)),
      baseSpeed: base.speed * diff.bloonSpeed,
    };
  }

  function isTowerUnlocked(towerKey) {
    const def = towerDefs[towerKey];
    if (!def) return false;
    if (def.unlockCoins) return !!profile.unlockedSpecialTowers[towerKey];
    return progression.level >= (def.unlockLvl ?? 1);
  }

  function buildWave(wave) {
    const queue = [];
    const laneCount = getMapPaths().length;
    const add = (type, count, delay = 18) => { for (let i = 0; i < count; i++) queue.push({ type, delay, lane: i % laneCount }); };
    add('red', 14 + wave * 3);
    if (wave >= 2) add('blue', 10 + wave * 2);
    if (wave >= 4) add('green', Math.floor(wave * 2.1));
    if (wave >= 6) add('yellow', Math.floor(wave * 1.9), 13);
    if (wave >= 7) add('pink', Math.floor(wave * 1.5), 12);
    if (wave >= 8) add('black', Math.floor(wave * 1.6));
    if (wave >= 10) add('white', Math.floor(wave * 1.6));
    if (wave >= 11) add('zebra', Math.floor(wave * 1.2));
    if (wave >= 13) add('purple', Math.floor(wave * 1.1), 14);
    if (wave >= 12) add('lead', 8 + Math.floor(wave * 0.7), 22);
    if (wave >= 15) add('rainbow', 3 + Math.floor(wave * 0.7), 20);
    if (wave >= 16) add('ceramic', 4 + Math.floor(wave / 2), 26);
    if (wave >= 22) add('fortified', 1 + Math.floor(wave / 5), 32);
    if (wave % 10 === 0) queue.push({ type:'moab', delay:80, lane: wave % laneCount });
    if (wave % 20 === 0) queue.push({ type:'bfb', delay:120, lane: (wave + 1) % laneCount });
    return queue;
  }

  function distanceToSegment(px, py, x1, y1, x2, y2) {
    const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, dot / lenSq));
    return Math.hypot(px - (x1 + t * C), py - (y1 + t * D));
  }

  function isPointOnAnyPath(x, y) {
    const paths = getMapPaths();
    for (const path of paths) for (let i = 0; i < path.length - 1; i++) if (distanceToSegment(x, y, path[i].x, path[i].y, path[i + 1].x, path[i + 1].y) <= 42) return true;
    return false;
  }

  function bloonProgress(b) {
    const path = getMapPaths()[b.lane];
    let progress = 0;
    for (let i = 0; i < b.pathIdx; i++) progress += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
    if (path[b.pathIdx + 1]) progress += Math.hypot(b.x - path[b.pathIdx].x, b.y - path[b.pathIdx].y);
    return progress;
  }

  function getTowerUpgradeCost(tower, pathIndex) {
    const tier = tower.upgrades[pathIndex];
    if (pathIndex === 0) return 260 + tier * 240;
    if (pathIndex === 1) return 340 + tier * 300;
    return 300 + tier * 270;
  }

  function canUpgradePath(t, pathIndex) {
    // UPDATED: 3-path, tier-5 cap. Only 2 paths can be active. Tier-5 locks others.
    if (t.upgrades[pathIndex] >= 5) return false;
    if (t.upgrades.some((lvl) => lvl >= 5 && lvl !== t.upgrades[pathIndex])) return false;
    const activeOtherPaths = t.upgrades.filter((lvl, i) => i !== pathIndex && lvl > 0).length;
    if (t.upgrades[pathIndex] === 0 && activeOtherPaths >= 2) return false;
    return true;
  }

  function nextUpgradeText(t, pathIndex) {
    const tier = t.upgrades[pathIndex];
    if (tier >= 5) return 'MAX';
    if (!canUpgradePath(t, pathIndex)) return 'Crosspath Locked';
    const key = pathIndex === 0 ? 'p1' : pathIndex === 1 ? 'p2' : 'p3';
    const list = towerDefs[t.type].pathNames?.[key] || [];
    return `${list[tier] || `Tier ${tier + 1}`} ($${getTowerUpgradeCost(t, pathIndex)})`;
  }

  function applyTowerUpgrade(t, pathIndex) {
    if (!canUpgradePath(t, pathIndex)) return;
    const before = t.upgrades[pathIndex];
    if (before >= 5) return;
    const tier = before + 1;

    // UPDATED: tower-specific 3-path upgrade effects.
    switch (t.type) {
      case 'dart':
        if (pathIndex === 0) { t.pierce += 1; t.range += 10; }
        if (pathIndex === 1) { t.fireRate = Math.max(5, t.fireRate - 3); if (tier >= 3) t.multiShot = Math.max(t.multiShot || 1, 2); }
        if (pathIndex === 2) { t.canHitCamo = true; if (tier >= 2) t.canHitLead = true; if (tier >= 4) t.critChance = 0.2; }
        break;
      case 'ninja':
        if (pathIndex === 0) { t.pierce += 2; }
        if (pathIndex === 1) { t.fireRate = Math.max(4, t.fireRate - 3); if (tier >= 3) t.stunTicks = 10; }
        if (pathIndex === 2) { t.canHitCamo = true; if (tier >= 3) t.armorBreak = 1; }
        break;
      case 'bomb':
        if (pathIndex === 0) { t.splash = (t.splash || 85) + 18; t.damage += 1; }
        if (pathIndex === 1) { t.fireRate = Math.max(8, t.fireRate - 3); if (tier >= 3) t.stunTicks = 20; }
        if (pathIndex === 2) { t.canHitCamo = tier >= 2; t.armorBreak = (t.armorBreak || 0) + 1; }
        break;
      case 'ice':
        if (pathIndex === 0) { t.freezeDuration += 20; t.range += 8; }
        if (pathIndex === 1) { t.fireRate = Math.max(8, t.fireRate - 4); t.damage += 1; }
        if (pathIndex === 2) { t.canHitCamo = tier >= 2; t.canHitLead = tier >= 3; t.armorBreak = tier >= 4 ? 1 : 0; }
        break;
      case 'sniper':
        if (pathIndex === 0) { t.damage += 2; t.pierce += 1; }
        if (pathIndex === 1) { t.fireRate = Math.max(8, t.fireRate - 6); }
        if (pathIndex === 2) { t.canHitCamo = true; t.canHitLead = true; if (tier >= 3) t.stunTicks = 12; }
        break;
      case 'boomerang':
        if (pathIndex === 0) { t.pierce += 2; t.range += 10; }
        if (pathIndex === 1) { t.fireRate = Math.max(5, t.fireRate - 3); if (tier >= 3) t.multiShot = 2; }
        if (pathIndex === 2) { t.canHitLead = tier >= 2; if (tier >= 4) t.stunTicks = 8; }
        break;
      case 'tack':
        if (pathIndex === 0) { t.burst = (t.burst || 6) + 2; }
        if (pathIndex === 1) { t.fireRate = Math.max(4, t.fireRate - 2); }
        if (pathIndex === 2) { t.burnTicks = (t.burnTicks || 0) + 20; t.burnDamage = (t.burnDamage || 0) + 1; }
        break;
      case 'glue':
        if (pathIndex === 0) { t.glueTicks += 30; t.glueSlow = Math.max(0.2, t.glueSlow - 0.06); }
        if (pathIndex === 1) { t.fireRate = Math.max(8, t.fireRate - 3); }
        if (pathIndex === 2) { t.armorBreak = (t.armorBreak || 0) + 1; t.canHitCamo = tier >= 3; }
        break;
      case 'village':
        if (pathIndex === 0) t.range += 18;
        if (pathIndex === 1) t.discount = Math.min(0.3, (t.discount || 0) + 0.06);
        if (pathIndex === 2) { t.supportDetect = tier >= 1; t.supportLead = tier >= 2; t.supportDamage = tier >= 4 ? 2 : 1; }
        break;
      case 'support':
        if (pathIndex === 0) t.range += 20;
        if (pathIndex === 1) t.supportSpeed = Math.min(0.4, (t.supportSpeed || 0) + 0.08);
        if (pathIndex === 2) { t.supportDetect = true; t.supportLead = tier >= 2; t.supportArmorBreak = Math.min(3, (t.supportArmorBreak || 0) + 1); }
        break;
      case 'farm':
        if (pathIndex === 0) t.farmIncome = (t.farmIncome || 45) + 25;
        if (pathIndex === 1) t.farmRate = Math.max(40, (t.farmRate || 240) - 25);
        if (pathIndex === 2) t.autoCollect = true;
        break;
      case 'super':
      case 'laser':
      case 'plasma':
      case 'sun':
        if (pathIndex === 0) { t.damage += 2; t.pierce += 1; }
        if (pathIndex === 1) { t.fireRate = Math.max(3, t.fireRate - 2); }
        if (pathIndex === 2) { t.canHitCamo = true; t.canHitLead = true; t.armorBreak = (t.armorBreak || 0) + 1; }
        break;
      default:
        if (pathIndex === 0) t.range += 10;
        if (pathIndex === 1) t.fireRate = Math.max(6, t.fireRate - 2);
        if (pathIndex === 2) t.damage += 1;
        break;
    }

    t.upgrades[pathIndex] += 1;

    if (!t.pro && (t.upgrades[0] >= 5 || t.upgrades[1] >= 5 || t.upgrades[2] >= 5)) {
      t.pro = true;
      if (t.type !== 'village') {
        t.damage += 2;
        t.pierce += 2;
        t.fireRate = Math.max(5, t.fireRate - 2);
      }
      t.range += 22;
    }

    recalcVillageBuffs();
  }

  function applyProMastery(t) {
    const cost = 2200;
    if (!t || t.proMastery || !t.pro) return;
    if (state.money < cost) return;
    state.money -= cost;
    t.proMastery = true;
    if (t.type !== 'village') {
      t.damage += 3;
      t.pierce += 3;
      t.fireRate = Math.max(4, t.fireRate - 3);
    }
    t.range += 30;
    if (t.type === 'village') t.discount = Math.min(0.4, (t.discount || 0) + 0.1);
    recalcVillageBuffs();
  }

  function buyMetaUpgrade(which) {
    if (progression.points <= 0) return;
    if (which === 'speed' && progression.attackSpeedLevel < 8) { progression.attackSpeedLevel += 1; progression.points -= 1; }
    if (which === 'cash' && progression.startingCashLevel < 8) { progression.startingCashLevel += 1; progression.points -= 1; applyMetaBonuses(); }
  }

  function recalcVillageBuffs() {
    for (const t of towers) {
      t.villageBuff = { range: 0, speed: 0, camo: false, lead: false, discount: 0, damage: 0, pierce: 0, armorBreak: 0 };
    }
    const villages = towers.filter(t => t.type === 'village');
    for (const v of villages) {
      const r = v.range;
      for (const t of towers) {
        if (t === v) continue;
        if (Math.hypot(t.x - v.x, t.y - v.y) > r) continue;
        const a = v.upgrades[0], b = v.upgrades[1];
        t.villageBuff.range = Math.max(t.villageBuff.range, a >= 1 ? 20 : 0);
        t.villageBuff.speed = Math.max(t.villageBuff.speed, a >= 2 ? 0.24 : 0);
        if (a >= 3 || b >= 3) t.villageBuff.camo = true;
        if (b >= 4) t.villageBuff.lead = true;
        t.villageBuff.discount = Math.max(t.villageBuff.discount, b >= 1 ? 0.08 : 0, b >= 2 ? 0.16 : 0);
        t.villageBuff.damage = Math.max(t.villageBuff.damage, v.supportDamage || 0);
      }
    }
    // NEW: support tower aura buffs.
    const supports = towers.filter((t) => t.type === 'support');
    for (const s of supports) {
      for (const t of towers) {
        if (t === s) continue;
        if (Math.hypot(t.x - s.x, t.y - s.y) > s.range) continue;
        t.villageBuff.range = Math.max(t.villageBuff.range, (s.upgrades[0] || 0) * 12);
        t.villageBuff.speed = Math.max(t.villageBuff.speed, s.supportSpeed || 0);
        if (s.supportDetect) t.villageBuff.camo = true;
        if (s.supportLead) t.villageBuff.lead = true;
        t.villageBuff.armorBreak = Math.max(t.villageBuff.armorBreak, s.supportArmorBreak || 0);
        t.villageBuff.damage = Math.max(t.villageBuff.damage, s.supportDamage || 0);
      }
    }
  }

  function pickTarget(tower) {
    const range = tower.range + (tower.villageBuff?.range || 0);
    const inRange = bloons.filter((b) => Math.hypot(b.x - tower.x, b.y - tower.y) <= range);
    if (!inRange.length) return null;
    if (tower.targetMode === 'last') return inRange.reduce((a, b) => (bloonProgress(a) < bloonProgress(b) ? a : b));
    if (tower.targetMode === 'strong') return inRange.reduce((a, b) => (a.hp > b.hp ? a : b));
    if (tower.targetMode === 'close') return inRange.reduce((a, b) => (Math.hypot(a.x - tower.x, a.y - tower.y) < Math.hypot(b.x - tower.x, b.y - tower.y) ? a : b));
    return inRange.reduce((a, b) => (bloonProgress(a) > bloonProgress(b) ? a : b));
  }

  function hitBloon(b, p) {
    // UPDATED: special effects (camo/lead checks, burn, stun, armor break)
    if (b.camo && !p.canHitCamo) return;
    if (b.type === 'lead' && !p.canHitLead && p.type !== 'bomb') return;
    const immunity = p.type === 'bomb' ? 'explosive' : p.type === 'ice' ? 'ice' : 'sharp';
    if (b.immunities.includes(immunity)) return;

    if (p.type === 'glue') {
      b.glueTicksActive = Math.max(b.glueTicksActive, p.glueTicks ?? 100);
      b.gluedFactor = Math.min(b.gluedFactor, p.glueSlow ?? 0.55);
    }

    if (p.stunTicks) b.stunTicks = Math.max(b.stunTicks || 0, p.stunTicks);
    if (p.burnTicks) {
      b.burnTicks = Math.max(b.burnTicks || 0, p.burnTicks);
      b.burnDamage = Math.max(b.burnDamage || 0, p.burnDamage || 1);
    }
    const armorBreak = p.armorBreak || 0;
    if (armorBreak > 0) b.armorBroken = Math.max(b.armorBroken || 0, armorBreak * 60);
    const armorMitigation = b.armorBroken > 0 ? 0 : ((b.type === 'fortified' || b.type === 'lead') ? 1 : 0);
    b.hp -= Math.max(0, p.damage - armorMitigation);
    if (p.type === 'ice') b.slowTicks = Math.max(b.slowTicks, p.freezeDuration || 80);

    if (b.hp <= 0) {
      const rewardMult = difficultyDefs[state.difficulty].cashMult;
      state.money += Math.floor(b.reward * rewardMult);
      gainXp(4 + Math.floor(b.maxHp / 4));
    }
  }

  function startWave() {
    if (waveInProgress || gameOver || runWon) return;
    waveQueue = buildWave(state.wave);
    spawnTimer = 0;
    waveInProgress = true;
    state.selectedTower = null;
  }

  function resetRun() {
    towers.length = 0; bloons.length = 0; projectiles.length = 0; placedAgents.length = 0;
    waveQueue = []; waveInProgress = false; spawnTimer = 0;
    wheelAccum = 0; gameOver = false; runWon = false;
    state.wave = 1; state.lives = difficultyDefs[state.difficulty].lives;
    agents.spikes = 3; agents.glueTrap = 2; agents.farmer = 1; agentMode = null;
    applyMetaBonuses();
  }

  function placeAgent() { return false; } // agents removed

  function dropCashCrate() {}

  // NEW: shared layout model so draw + click hitboxes always match.
  function getTowerCardLayout(panelX) {
    const cardY = height - 388;
    return {
      cardY,
      p1: { x1: panelX + 20, x2: panelX + 104, y1: cardY + 94, y2: cardY + 122 },
      p2: { x1: panelX + 110, x2: panelX + 194, y1: cardY + 94, y2: cardY + 122 },
      p3: { x1: panelX + 200, x2: panelX + 294, y1: cardY + 94, y2: cardY + 122 },
      target: { x1: panelX + 20, x2: panelX + 294, y1: cardY + 126, y2: cardY + 144 },
      mastery: { x1: panelX + 20, x2: panelX + 294, y1: cardY + 148, y2: cardY + 166 },
      sell: { x1: panelX + 20, x2: panelX + 294, y1: cardY + 170, y2: cardY + 188 },
    };
  }

  function updateAgents() {}

  function drawHome() {
    ctx.fillStyle = '#102a43';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#fff';
    ctx.font = '700 52px sans-serif';
    ctx.fillText('CONSOLE TOWER DEFENSE (MERGED)', width / 2 - 385, 110);
    ctx.font = '500 18px sans-serif';
    ctx.fillText('Pick map + difficulty, unlock premium towers, then START GAME', width / 2 - 250, 145);
    ctx.font = '700 20px sans-serif';
    ctx.fillText(`Bank: ${profile.coins} Coins | Monkey Money: ${profile.monkeyMoney}`, width / 2 - 190, 175);

    const cardW = 220, gap = 26;
    const totalW = mapDefs.length * cardW + (mapDefs.length - 1) * gap;
    const startX = (width - SIDE_PANEL - totalW) / 2;
    const y = 220;

    mapDefs.forEach((m, i) => {
      const x = startX + i * (cardW + gap);
      ctx.fillStyle = state.selectedMap === i ? '#ffd166' : '#324a5f';
      ctx.fillRect(x, y, cardW, 170);
      ctx.fillStyle = '#111';
      ctx.font = '700 20px sans-serif';
      ctx.fillText(m.name, x + 20, y + 34);
      ctx.font = '14px sans-serif';
      ctx.fillText(`${m.lanes.length} path(s)`, x + 20, y + 62);
    });

    const diffY = 415;
    const diffKeys = ['easy', 'medium', 'hard', 'impoppable'];
    diffKeys.forEach((d, idx) => {
      const x = width / 2 - 265 + idx * 132;
      ctx.fillStyle = state.difficulty === d ? '#ffd166' : '#3a506b';
      ctx.fillRect(x, diffY, 122, 36);
      ctx.fillStyle = state.difficulty === d ? '#111' : '#fff';
      ctx.font = '700 16px sans-serif';
      ctx.fillText(difficultyDefs[d].name, x + 18, diffY + 24);
    });
    ctx.fillStyle = '#d7e3fc';
    ctx.font = '12px sans-serif';
    const baseWin = 80 + MAX_WAVES * 6;
    ctx.fillText(`Win Coins: Easy ${Math.floor(baseWin * difficultyDefs.easy.coinMult)} | Medium ${Math.floor(baseWin * difficultyDefs.medium.coinMult)} | Hard ${Math.floor(baseWin * difficultyDefs.hard.coinMult)}`, width / 2 - 250, 463);

    ctx.fillStyle = '#2a9d8f';
    ctx.fillRect(width / 2 - 120, 470, 240, 56);
    ctx.fillStyle = '#fff';
    ctx.font = '700 24px sans-serif';
    ctx.fillText('START GAME', width / 2 - 74, 506);

    const premiumKeys = Object.keys(towerDefs).filter((k) => towerDefs[k].unlockCoins);
    const premiumY = 560, premiumCardW = 150, premiumGap = 12;
    ctx.fillStyle = '#fff'; ctx.font = '700 18px sans-serif';
    ctx.fillText('Premium Tower Unlocks (Home Only)', 22, premiumY - 12);

    premiumKeys.forEach((k, i) => {
      const d = towerDefs[k];
      const x = 20 + i * (premiumCardW + premiumGap);
      const unlocked = profile.unlockedSpecialTowers[k];
      ctx.fillStyle = unlocked ? '#2e7d32' : '#37474f';
      ctx.fillRect(x, premiumY, premiumCardW, 84);
      ctx.fillStyle = unlocked ? '#c8e6c9' : '#fff';
      ctx.font = '700 15px sans-serif';
      ctx.fillText(`${d.icon} ${d.name}`, x + 10, premiumY + 25);
      ctx.font = '12px sans-serif';
      ctx.fillText(unlocked ? 'Unlocked' : `${d.unlockCoins} coins`, x + 10, premiumY + 46);
      ctx.fillText(unlocked ? 'Ready in SHOP' : 'Click to unlock', x + 10, premiumY + 66);
    });
  }

  function update() {
    if (gameOver || runWon) return;

    if (waveInProgress && waveQueue.length > 0 && spawnTimer <= 0) {
      const next = waveQueue.shift();
      bloons.push(createBloon(next.type, next.lane));
      spawnTimer = next.delay;
    }
    spawnTimer -= 1;

    // agents/cash crates removed

    const paths = getMapPaths();

    for (let i = bloons.length - 1; i >= 0; i--) {
      const b = bloons[i];
      const path = paths[b.lane];
      const next = path[b.pathIdx + 1];
      if (!next) continue;

      if (b.hp <= 0) { bloons.splice(i, 1); continue; }

      const dx = next.x - b.x, dy = next.y - b.y;
      const dist = Math.hypot(dx, dy) || 1;
      b.stunTicks = Math.max(0, (b.stunTicks || 0) - 1);
      b.armorBroken = Math.max(0, (b.armorBroken || 0) - 1);
      if ((b.burnTicks || 0) > 0) {
        b.burnTicks -= 1;
        if (b.burnTicks % 20 === 0) b.hp -= b.burnDamage || 1;
      }
      if ((b.stunTicks || 0) > 0) continue;
      const speedMul = b.slowTicks > 0 ? 0.45 : 1;
      const glueMul = b.glueTicksActive > 0 ? b.gluedFactor : 1;
      const curSpeed = b.baseSpeed * speedMul * glueMul;

      b.x += (dx / dist) * curSpeed;
      b.y += (dy / dist) * curSpeed;
      b.slowTicks = Math.max(0, b.slowTicks - 1);
      b.glueTicksActive = Math.max(0, b.glueTicksActive - 1);
      if (b.glueTicksActive === 0) b.gluedFactor = 1;
      if (dist < 6) b.pathIdx += 1;

      if (b.pathIdx >= path.length - 1) {
        state.lives -= b.damage;
        bloons.splice(i, 1);
      }
    }

    updateAgents();

    towers.forEach((t) => {
      if (t.type === 'village' || t.type === 'support') return;
      if (t.type === 'farm') {
        t.farmTick = (t.farmTick || 0) + 1;
        const rate = t.farmRate || 240;
        if (t.farmTick >= rate) {
          t.farmTick = 0;
          state.money += t.farmIncome || 45;
        }
        return;
      }
      const metaRateMultiplier = 1 - progression.attackSpeedLevel * 0.06;
      const villageSpeed = 1 - (t.villageBuff?.speed || 0);
      const effectiveRate = Math.max(4, Math.floor(t.fireRate * metaRateMultiplier * villageSpeed));

      if (t.type === 'ice') {
        if (t.cooldown-- <= 0) {
          const rr = t.range + (t.villageBuff?.range || 0);
          bloons.forEach((b) => {
            if (Math.hypot(b.x - t.x, b.y - t.y) <= rr && !b.immunities.includes('ice')) {
              b.slowTicks = Math.max(b.slowTicks, t.freezeDuration);
              if (t.damage > 0) b.hp -= t.damage;
            }
          });
          t.cooldown = effectiveRate;
        }
        return;
      }

      if (t.cooldown-- > 0) return;
      const target = pickTarget(t);
      if (!target) return;

      const a = Math.atan2(target.y - t.y, target.x - t.x);
      const addProjectile = (angle) => {
        const maxTravel = t.type === 'tack' ? Math.max(90, t.range * 0.95) : Math.max(220, t.range * 1.4);
        projectiles.push({
          x: t.x, y: t.y,
          vx: Math.cos(angle) * t.projectileSpeed, vy: Math.sin(angle) * t.projectileSpeed,
          type: t.type, pierce: t.pierce + (t.villageBuff?.pierce || 0), damage: t.damage + (t.villageBuff?.damage || 0),
          splash: t.splash, glueSlow: t.glueSlow, glueTicks: t.glueTicks,
          freezeDuration: t.freezeDuration,
          stunTicks: t.stunTicks || 0, burnTicks: t.burnTicks || 0, burnDamage: t.burnDamage || 0,
          canHitCamo: !!(t.canHitCamo || t.villageBuff?.camo), canHitLead: !!(t.canHitLead || t.villageBuff?.lead),
          armorBreak: (t.armorBreak || 0) + (t.villageBuff?.armorBreak || 0),
          travel: 0, maxTravel, hit: new Set(),
        });
      };

      if (t.type === 'tack') {
        const burst = t.burst ?? 6;
        for (let i = 0; i < burst; i++) addProjectile((Math.PI * 2 * i) / burst);
      } else {
        const shots = Math.max(1, t.multiShot || 1);
        for (let s = 0; s < shots; s++) {
          const spread = shots > 1 ? (s - (shots - 1) / 2) * 0.12 : 0;
          addProjectile(a + spread);
        }
      }
      t.cooldown = effectiveRate;
    });

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      const step = Math.hypot(p.vx, p.vy);
      p.travel += step;
      p.x += p.vx; p.y += p.vy;

      if (p.travel > p.maxTravel || p.x < 0 || p.x > width - SIDE_PANEL || p.y < 0 || p.y > height) {
        projectiles.splice(i, 1); continue;
      }

      for (let j = bloons.length - 1; j >= 0; j--) {
        const b = bloons[j];
        if (p.hit.has(j) || Math.hypot(b.x - p.x, b.y - p.y) > b.radius + 5) continue;
        p.hit.add(j);

        if (p.type === 'bomb') {
          bloons.forEach((bb) => { if (Math.hypot(bb.x - p.x, bb.y - p.y) <= p.splash) hitBloon(bb, p); });
          p.pierce = 0;
        } else {
          hitBloon(b, p);
          p.pierce -= 1;
        }

        if (p.pierce <= 0) { projectiles.splice(i, 1); break; }
      }
    }

    for (let i = bloons.length - 1; i >= 0; i--) if (bloons[i].hp <= 0) bloons.splice(i, 1);

    if (waveInProgress && waveQueue.length === 0 && bloons.length === 0) {
      waveInProgress = false;
      state.wave += 1;
      state.money += 110 + state.wave * 11;
      gainXp(18 + state.wave * 2);

      const mmGain = Math.floor((8 + state.wave * 0.8) * difficultyDefs[state.difficulty].coinMult);
      profile.monkeyMoney += mmGain;
      profile.coins += Math.floor(mmGain * 0.45);
      saveProfile();

      if (state.wave > MAX_WAVES) {
        runWon = true;
        const diff = difficultyDefs[state.difficulty];
        const earnedCoins = Math.floor((80 + MAX_WAVES * 6 + Math.max(0, state.lives)) * diff.coinMult);
        profile.coins += earnedCoins;
        profile.monkeyMoney += Math.floor(earnedCoins * 0.6);
        saveProfile();
      }

      if (autoNextWave && !gameOver) startWave();
    }

    if (state.lives <= 0) {
      state.lives = 0;
      gameOver = true;
    }
  }

  function drawMap() {
    const map = getCurrentMap();
    ctx.fillStyle = map.color;
    ctx.fillRect(0, 0, width, height);

    const scenery = sceneryByMap[state.selectedMap] || [];
    scenery.forEach((s) => {
      if (s.type === 'tree') {
        ctx.fillStyle = '#5d4037'; ctx.fillRect(s.px - 5, s.py - 6, 10, 18);
        ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(s.px, s.py - 10, 16, 0, Math.PI * 2); ctx.fill();
      } else if (s.type === 'rock') {
        ctx.fillStyle = '#757575'; ctx.beginPath(); ctx.ellipse(s.px, s.py, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
      } else if (s.type === 'pond') {
        ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(s.px, s.py, 26, 16, 0.2, 0, Math.PI * 2); ctx.fill();
      } else if (s.type === 'bush') {
        ctx.fillStyle = '#388e3c'; ctx.beginPath(); ctx.arc(s.px - 8, s.py, 10, 0, Math.PI * 2); ctx.arc(s.px + 2, s.py - 5, 11, 0, Math.PI * 2); ctx.arc(s.px + 12, s.py, 9, 0, Math.PI * 2); ctx.fill();
      }
    });

    const paths = getMapPaths();
    paths.forEach((path) => {
      ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 66; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y); path.forEach((p) => ctx.lineTo(p.x, p.y)); ctx.stroke();
      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 5; ctx.stroke();
    });
  }

  function drawEntities() {
    bloons.forEach((b) => {
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
      if (b.stripe) { ctx.strokeStyle = b.stripe; ctx.lineWidth = 3; ctx.stroke(); }
      const hp = Math.max(0, b.hp / b.maxHp);
      ctx.fillStyle = '#0008'; ctx.fillRect(b.x - 16, b.y - b.radius - 10, 32, 5);
      ctx.fillStyle = '#ef5350'; ctx.fillRect(b.x - 16, b.y - b.radius - 10, 32 * hp, 5);
    });

    towers.forEach((t) => {
      ctx.fillStyle = state.selectedTower === t ? '#fffde7' : t.color;
      ctx.beginPath(); ctx.arc(t.x, t.y, 24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = '700 16px sans-serif'; ctx.fillText(t.icon ?? '?', t.x - 6, t.y + 5);

      if (t.pro) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x, t.y, 28, 0, Math.PI * 2); ctx.stroke(); }
      if (t.proMastery) { ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x, t.y, 32, 0, Math.PI * 2); ctx.stroke(); }

      if (state.selectedTower === t) {
        ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.range + (t.villageBuff?.range || 0), 0, Math.PI * 2); ctx.stroke();
      }
    });

    projectiles.forEach((p) => {
      ctx.fillStyle = p.type === 'bomb' ? '#111' : p.type === 'ninja' ? '#7e57c2' : p.type === 'glue' ? '#8bc34a' : p.type === 'boomerang' ? '#ff9800' : '#ffeb3b';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.type === 'bomb' ? 7 : 5, 0, Math.PI * 2); ctx.fill();
    });

    if (state.hover.x < width - SIDE_PANEL) {
      const def = towerDefs[state.selectedTowerType];
      const unlocked = isTowerUnlocked(state.selectedTowerType);
      const towerTooClose = towers.some((t) => Math.hypot(t.x - state.hover.x, t.y - state.hover.y) < 44);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = !unlocked || isPointOnAnyPath(state.hover.x, state.hover.y) || towerTooClose ? '#ef5350' : def.color;
      ctx.beginPath(); ctx.arc(state.hover.x, state.hover.y, 24, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawUi() {
    const panelX = width - SIDE_PANEL;
    const map = getCurrentMap();

    const panelGrad = ctx.createLinearGradient(panelX, 0, panelX, height);
    panelGrad.addColorStop(0, '#1a2a44');
    panelGrad.addColorStop(1, '#111d33');
    ctx.fillStyle = panelGrad;
    ctx.fillRect(panelX, 0, SIDE_PANEL, height);
    ctx.strokeStyle = '#65d6ff55';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX + 2, 2, SIDE_PANEL - 4, height - 4);

    ctx.fillStyle = '#e8f7ff'; ctx.font = '700 22px sans-serif'; ctx.fillText('SHOP', panelX + 16, 30);
    ctx.font = '12px sans-serif'; ctx.fillText(`Map: ${map.name} | ${difficultyDefs[state.difficulty].name}`, panelX + 16, 48);

    ctx.fillStyle = '#2a9d8f'; ctx.fillRect(panelX + 16, 56, SIDE_PANEL - 32, 34);
    ctx.fillStyle = '#fff'; ctx.font = '600 13px sans-serif'; ctx.fillText('Home Screen', panelX + 112, 78);

    ctx.fillStyle = autoNextWave ? '#43a047' : '#6c757d';
    ctx.fillRect(panelX + 16, 96, SIDE_PANEL - 32, 30);
    ctx.fillStyle = '#fff'; ctx.fillText(`Auto Next: ${autoNextWave ? 'ON' : 'OFF'}`, panelX + 108, 116);

    ctx.fillStyle = '#fff'; ctx.font = '600 12px sans-serif'; ctx.fillText(`Speed: ${gameSpeed}x`, panelX + 16, 142);
    [2, 5, 10].forEach((s, idx) => {
      const bx = panelX + 16 + idx * 96, by = 148;
      ctx.fillStyle = gameSpeed === s ? '#ffd166' : '#3a506b'; ctx.fillRect(bx, by, 88, 22);
      ctx.fillStyle = gameSpeed === s ? '#111' : '#fff'; ctx.fillText(`${s}x`, bx + 38, by + 15);
    });

    const keys = Object.keys(towerDefs);
    const towerListTop = 184, towerRow = 62, visibleRows = 4;
    const maxScroll = Math.max(0, keys.length - visibleRows);
    shopScroll = Math.max(0, Math.min(shopScroll, maxScroll));
    const visibleKeys = keys.slice(shopScroll, shopScroll + visibleRows);

    visibleKeys.forEach((k, idx) => {
      const d = towerDefs[k], y = towerListTop + idx * towerRow;
      const unlocked = isTowerUnlocked(k);
      ctx.fillStyle = state.selectedTowerType === k ? '#3b82f6' : '#263a59';
      ctx.fillRect(panelX + 12, y, SIDE_PANEL - 24, 52);
      ctx.fillStyle = unlocked ? d.color : '#555'; ctx.fillRect(panelX + 20, y + 8, 34, 34);
      ctx.fillStyle = '#111'; ctx.font = '700 16px sans-serif'; ctx.fillText(d.icon ?? '?', panelX + 32, y + 30);
      ctx.fillStyle = '#fff'; ctx.font = '600 13px sans-serif';
      const lockLabel = d.unlockCoins ? `(Unlock ${d.unlockCoins}c)` : `(Lvl ${d.unlockLvl})`;
      ctx.fillText(`${d.name} ${unlocked ? '' : lockLabel}`, panelX + 64, y + 23);
      ctx.font = '12px sans-serif';
      ctx.fillText(unlocked ? `$${d.cost}` : (d.unlockCoins ? 'Unlock on Home screen' : 'Locked'), panelX + 64, y + 40);
    });

    if (maxScroll > 0) {
      ctx.fillStyle = '#ffffff99'; ctx.font = '11px sans-serif';
      ctx.fillText(`Scroll towers (${shopScroll + 1}-${Math.min(keys.length, shopScroll + visibleRows)}/${keys.length})`, panelX + 16, towerListTop + visibleRows * towerRow + 10);
    }

    const waveY = height - 210;
    ctx.fillStyle = waveInProgress ? '#6c757d' : '#fca311'; ctx.fillRect(panelX + 18, waveY, SIDE_PANEL - 36, 42);
    ctx.fillStyle = '#111'; ctx.font = '700 16px sans-serif'; ctx.fillText(waveInProgress ? 'WAVE ACTIVE' : 'START WAVE', panelX + 106, waveY + 27);

    // meta
    ctx.fillStyle = '#0d1b2a'; ctx.fillRect(panelX + 12, height - 160, SIDE_PANEL - 24, 96);
    ctx.fillStyle = '#fff'; ctx.font = '700 13px sans-serif'; ctx.fillText(`Meta Points: ${progression.points}`, panelX + 20, height - 140);

    ctx.fillStyle = '#2a9d8f'; ctx.fillRect(panelX + 20, height - 130, 130, 30);
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.fillText(`+Start Cash (${progression.startingCashLevel})`, panelX + 24, height - 110);

    ctx.fillStyle = '#e76f51'; ctx.fillRect(panelX + 164, height - 130, 130, 30);
    ctx.fillStyle = '#fff'; ctx.fillText(`+Atk Speed (${progression.attackSpeedLevel})`, panelX + 168, height - 110);

    if (state.selectedTower) {
      const t = state.selectedTower;
      const layout = getTowerCardLayout(panelX);
      const { cardY } = layout;
      ctx.fillStyle = '#0d1b2a'; ctx.fillRect(panelX + 12, cardY, SIDE_PANEL - 24, 182);
      ctx.fillStyle = '#fff'; ctx.font = '700 13px sans-serif';
      ctx.fillText(`${towerDefs[t.type].name} | ${t.targetMode} ${t.proMastery ? '| PRO MASTERY' : t.pro ? '| PRO' : ''}`, panelX + 20, cardY + 20);
      ctx.font = '12px sans-serif';
      ctx.fillText(`Next P1: ${nextUpgradeText(t, 0)}`, panelX + 20, cardY + 40);
      ctx.fillText(`Next P2: ${nextUpgradeText(t, 1)}`, panelX + 20, cardY + 56);
      ctx.fillText(`Next P3: ${nextUpgradeText(t, 2)}`, panelX + 20, cardY + 72);

      ctx.fillStyle = '#2a9d8f'; ctx.fillRect(layout.p1.x1, layout.p1.y1, layout.p1.x2 - layout.p1.x1, layout.p1.y2 - layout.p1.y1);
      ctx.fillStyle = '#fff'; ctx.fillText('Up P1', panelX + 44, cardY + 100);

      ctx.fillStyle = '#e76f51'; ctx.fillRect(layout.p2.x1, layout.p2.y1, layout.p2.x2 - layout.p2.x1, layout.p2.y2 - layout.p2.y1);
      ctx.fillStyle = '#fff'; ctx.fillText('Up P2', panelX + 134, cardY + 100);

      ctx.fillStyle = '#5e60ce'; ctx.fillRect(layout.p3.x1, layout.p3.y1, layout.p3.x2 - layout.p3.x1, layout.p3.y2 - layout.p3.y1);
      ctx.fillStyle = '#fff'; ctx.fillText('Up P3', panelX + 230, cardY + 100);

      ctx.fillStyle = '#6d597a'; ctx.fillRect(layout.target.x1, layout.target.y1, layout.target.x2 - layout.target.x1, layout.target.y2 - layout.target.y1);
      ctx.fillStyle = '#fff'; ctx.fillText('Toggle Targeting', panelX + 115, cardY + 128);

      ctx.fillStyle = t.pro && !t.proMastery ? '#f4a261' : '#6c757d';
      ctx.fillRect(layout.mastery.x1, layout.mastery.y1, layout.mastery.x2 - layout.mastery.x1, layout.mastery.y2 - layout.mastery.y1);
      ctx.fillStyle = '#fff';
      ctx.fillText('Pro Mastery ($2200)', panelX + 112, cardY + 160);

      const sellValue = Math.floor((towerDefs[t.type]?.cost || 0) * 0.7);
      ctx.fillStyle = '#b23a48';
      ctx.fillRect(layout.sell.x1, layout.sell.y1, layout.sell.x2 - layout.sell.x1, layout.sell.y2 - layout.sell.y1);
      ctx.fillStyle = '#fff';
      ctx.fillText(`Sell Tower (+$${sellValue})`, panelX + 108, cardY + 182);
    }

    ctx.fillStyle = '#fff'; ctx.font = '700 20px sans-serif';
    ctx.fillText(`$${Math.floor(state.money)}`, 20, 58);
    ctx.fillText(`❤ ${state.lives}`, 20, 84);
    ctx.fillText(`Wave ${state.wave}`, 20, 110);
    ctx.fillText(`MM ${Math.floor(profile.monkeyMoney)}`, 20, 136);

    const need = xpToNextLevel(progression.level);
    const pct = Math.max(0, Math.min(1, progression.xp / need));
    ctx.fillStyle = '#0008'; ctx.fillRect(20, 146, 220, 12);
    ctx.fillStyle = '#4cc9f0'; ctx.fillRect(20, 146, 220 * pct, 12);
    ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif';
    ctx.fillText(`Lv ${progression.level} (${progression.xp}/${need} XP)`, 24, 156);

    if (gameOver) {
      ctx.fillStyle = '#000a'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ff595e'; ctx.font = '700 52px sans-serif'; ctx.fillText('GAME OVER', width / 2 - 170, height / 2 - 10);
      ctx.font = '700 20px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('Press R to restart run', width / 2 - 95, height / 2 + 30);
    }
    if (runWon) {
      ctx.fillStyle = '#000a'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#8bc34a'; ctx.font = '700 48px sans-serif'; ctx.fillText('VICTORY!', width / 2 - 120, height / 2 - 18);
      ctx.fillStyle = '#fff'; ctx.font = '700 19px sans-serif';
      ctx.fillText(`You beat wave ${MAX_WAVES} on ${difficultyDefs[state.difficulty].name}.`, width / 2 - 170, height / 2 + 18);
      ctx.fillText(`Coins: ${profile.coins} | Monkey Money: ${Math.floor(profile.monkeyMoney)}`, width / 2 - 150, height / 2 + 44);
      ctx.fillText('Go Home to start another run.', width / 2 - 115, height / 2 + 70);
    }
  }

  function draw() {
    if (currentScreen === 'home') { drawHome(); return; }
    drawMap(); drawEntities(); drawUi();
  }

  function onClick(e) {
    const x = e.clientX, y = e.clientY;

    if (currentScreen === 'home') {
      const cardW = 220, gap = 26;
      const totalW = mapDefs.length * cardW + (mapDefs.length - 1) * gap;
      const startX = (width - SIDE_PANEL - totalW) / 2;
      const cardY = 220;
      for (let i = 0; i < mapDefs.length; i++) {
        const cx = startX + i * (cardW + gap);
        if (x >= cx && x <= cx + cardW && y >= cardY && y <= cardY + 170) { state.selectedMap = i; return; }
      }
      for (const [idx, d] of ['easy', 'medium', 'hard', 'impoppable'].entries()) {
        const bx = width / 2 - 265 + idx * 132;
        if (x >= bx && x <= bx + 122 && y >= 415 && y <= 451) { state.difficulty = d; return; }
      }
      if (x >= width / 2 - 120 && x <= width / 2 + 120 && y >= 470 && y <= 526) {
        resetRun(); currentScreen = 'game'; return;
      }

      const premiumKeys = Object.keys(towerDefs).filter((k) => towerDefs[k].unlockCoins);
      const premiumY = 560, premiumCardW = 150, premiumGap = 12;
      for (let i = 0; i < premiumKeys.length; i++) {
        const key = premiumKeys[i];
        const d = towerDefs[key];
        const px = 20 + i * (premiumCardW + premiumGap);
        if (x >= px && x <= px + premiumCardW && y >= premiumY && y <= premiumY + 84) {
          if (!profile.unlockedSpecialTowers[key] && profile.coins >= d.unlockCoins) {
            profile.coins -= d.unlockCoins;
            profile.unlockedSpecialTowers[key] = true;
            saveProfile();
          }
          return;
        }
      }
      return;
    }

    const panelX = width - SIDE_PANEL;
    if (gameOver || runWon) {
      const clickedHome = x >= panelX + 16 && x <= width - 16 && y >= 56 && y <= 90;
      if (clickedHome) currentScreen = 'home';
      return;
    }

    if (x >= panelX) {
      if (x >= panelX + 16 && x <= width - 16 && y >= 56 && y <= 90) { currentScreen = 'home'; return; }
      if (x >= panelX + 16 && x <= width - 16 && y >= 96 && y <= 126) { autoNextWave = !autoNextWave; return; }

      for (const [idx, s] of [2, 5, 10].entries()) {
        const bx = panelX + 16 + idx * 96, by = 148;
        if (x >= bx && x <= bx + 88 && y >= by && y <= by + 22) { gameSpeed = s; return; }
      }

      const t = state.selectedTower;
      if (t) {
        const layout = getTowerCardLayout(panelX);
        if (x >= layout.p1.x1 && x <= layout.p1.x2 && y >= layout.p1.y1 && y <= layout.p1.y2) {
          const cost = getTowerUpgradeCost(t, 0);
          if (canUpgradePath(t, 0) && state.money >= cost) { state.money -= cost; applyTowerUpgrade(t, 0); }
          return;
        }
        if (x >= layout.p2.x1 && x <= layout.p2.x2 && y >= layout.p2.y1 && y <= layout.p2.y2) {
          const cost = getTowerUpgradeCost(t, 1);
          if (canUpgradePath(t, 1) && state.money >= cost) { state.money -= cost; applyTowerUpgrade(t, 1); }
          return;
        }
        if (x >= layout.p3.x1 && x <= layout.p3.x2 && y >= layout.p3.y1 && y <= layout.p3.y2) {
          const cost = getTowerUpgradeCost(t, 2);
          if (canUpgradePath(t, 2) && state.money >= cost) { state.money -= cost; applyTowerUpgrade(t, 2); }
          return;
        }
        if (x >= layout.target.x1 && x <= layout.target.x2 && y >= layout.target.y1 && y <= layout.target.y2) {
          const modes = ['first', 'last', 'strong', 'close'];
          t.targetMode = modes[(modes.indexOf(t.targetMode) + 1) % modes.length];
          return;
        }
        if (x >= layout.mastery.x1 && x <= layout.mastery.x2 && y >= layout.mastery.y1 && y <= layout.mastery.y2) {
          applyProMastery(t);
          return;
        }
        if (x >= layout.sell.x1 && x <= layout.sell.x2 && y >= layout.sell.y1 && y <= layout.sell.y2) {
          const idx = towers.indexOf(t);
          if (idx >= 0) {
            state.money += Math.floor((towerDefs[t.type]?.cost || 0) * 0.7);
            towers.splice(idx, 1);
            state.selectedTower = null;
            recalcVillageBuffs();
          }
          return;
        }
      }

      const keys = Object.keys(towerDefs);
      const towerListTop = 184, towerRow = 62, visibleRows = 4;
      const visibleKeys = keys.slice(shopScroll, shopScroll + visibleRows);
      for (let i = 0; i < visibleKeys.length; i++) {
        const yy = towerListTop + i * towerRow;
        if (x >= panelX + 12 && x <= width - 12 && y >= yy && y <= yy + 52) {
          const key = visibleKeys[i];
          if (isTowerUnlocked(key)) state.selectedTowerType = key;
          state.selectedTower = null;
          return;
        }
      }

      const waveY = height - 210;
      if (x >= panelX + 18 && x <= width - 18 && y >= waveY && y <= waveY + 42) { startWave(); return; }

      if (x >= panelX + 20 && x <= panelX + 150 && y >= height - 130 && y <= height - 100) { buyMetaUpgrade('cash'); return; }
      if (x >= panelX + 164 && x <= panelX + 294 && y >= height - 130 && y <= height - 100) { buyMetaUpgrade('speed'); return; }
      return;
    }

    const clicked = towers.find((t) => Math.hypot(t.x - x, t.y - y) < 24);
    if (clicked) { state.selectedTower = clicked; return; }

    if (placeAgent(x, y)) return;

    const def = towerDefs[state.selectedTowerType];
    if (!isTowerUnlocked(state.selectedTowerType)) return;
    const towerTooClose = towers.some((t) => Math.hypot(t.x - x, t.y - y) < 44);
    if (state.money < def.cost || isPointOnAnyPath(x, y) || towerTooClose) return;

    const discount = towers
      .filter(t => t.type === 'village')
      .some(v => Math.hypot(v.x - x, v.y - y) <= v.range) ? 0.1 : 0;

    const finalCost = Math.max(1, Math.floor(def.cost * (1 - discount)));
    if (state.money < finalCost) return;

    towers.push({
      ...structuredClone(def),
      type: state.selectedTowerType, x, y, cooldown: 0, upgrades: [0, 0, 0], targetMode: 'first',
      discount: 0, pro: false, proMastery: false,
      villageBuff: { range: 0, speed: 0, camo: false, lead: false, discount: 0, damage: 0, pierce: 0, armorBreak: 0 },
      farmTick: 0, farmRate: 240, farmIncome: 45,
      canHitCamo: false, canHitLead: false, armorBreak: 0, stunTicks: 0, burnTicks: 0, burnDamage: 0, multiShot: 1,
    });
    state.money -= finalCost;
    recalcVillageBuffs();
  }

  function onMove(e) { state.hover.x = e.clientX; state.hover.y = e.clientY; }

  function onPointerDown(e) {
    if (!document.body.contains(root)) return;
    if (e.button !== undefined && e.button !== 0) return;
    onClick(e);
    e.preventDefault();
  }

  function onWheel(e) {
    const panelX = width - SIDE_PANEL;
    if (e.clientX < panelX) return;

    const keys = Object.keys(towerDefs);
    const visibleRows = 4;
    const maxScroll = Math.max(0, keys.length - visibleRows);
    if (maxScroll === 0) return;

    e.preventDefault();
    wheelAccum += e.deltaY;
    const stepThreshold = 180;
    if (Math.abs(wheelAccum) < stepThreshold) return;
    const steps = Math.trunc(wheelAccum / stepThreshold);
    wheelAccum -= steps * stepThreshold;
    shopScroll = Math.max(0, Math.min(shopScroll + steps, maxScroll));
  }

  function destroy() {
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', resize);
    root.removeEventListener('mousemove', onMove);
    root.removeEventListener('wheel', onWheel);
    window.removeEventListener('pointerdown', onPointerDown, true);
    root.remove();
  }

  function onKeydown(e) {
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') destroy();
    if (k === 'r' && gameOver) resetRun();
    if (k === 'f' && currentScreen === 'game') {
      const order = ['easy', 'medium', 'hard', 'impoppable'];
      const idx = (order.indexOf(state.difficulty) + 1) % order.length;
      state.difficulty = order[idx];
      resetRun();
    }
    if (k === 'p' && state.selectedTower) applyProMastery(state.selectedTower);
  }

  let last = performance.now();
  let acc = 0;
  function loop(now) {
    if (!document.body.contains(root)) return;
    acc += now - last;
    last = now;

    while (acc >= TICK_MS) {
      if (currentScreen === 'game') {
        for (let i = 0; i < gameSpeed; i++) update();
      }
      acc -= TICK_MS;
    }

    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  document.addEventListener('keydown', onKeydown);
  root.addEventListener('mousemove', onMove);
  root.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('pointerdown', onPointerDown, true);

  resize();
  applyMetaBonuses();
  requestAnimationFrame(loop);
})();
