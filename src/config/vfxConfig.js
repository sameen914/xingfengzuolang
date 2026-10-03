// 0.9.2-dev10：统一 VFX key / 路径登记；已正式接入月牙、脚底 Beat、应援蓝心与「电力四射」。
// 其它尚未进入 gameplay 的 VFX 仍保持 preload=false。

export const VFX_KEYS = Object.freeze({
  LEGACY_CRESCENT_ATTACK: 'crescentArt',
  LEGACY_CRESCENT_HIT: 'crescentHitArt',

  CRESCENT_ATTACK_01: 'attack_crescent_01',
  CRESCENT_ATTACK_02: 'attack_crescent_02',
  CRESCENT_ATTACK_03: 'attack_crescent_03',
  CRESCENT_ATTACK_04: 'attack_crescent_04',
  CRESCENT_HIT_01: 'hit_crescent_01',
  CRESCENT_HIT_02: 'hit_crescent_02',
  CRESCENT_HIT_03: 'hit_crescent_03',
  CRESCENT_HIT_04: 'hit_crescent_04',

  BEAT_STRONG: 'beat_strong',
  BEAT_WEAK: 'beat_weak',
  SUPPORT_HEART: 'support_heart',

  LIGHTNING_01: 'lightning_01',
  LIGHTNING_02: 'lightning_02',
  LIGHTNING_03: 'lightning_03',
  LIGHTNING_GROUND_HIT: 'lightning_ground_hit',
  SPARK_01: 'spark_01',
  SPARK_02: 'spark_02',

  STAGE_SPIN_01: 'stage_spin_01',
  STAGE_SPIN_02: 'stage_spin_02',
  STAGE_SPIN_03: 'stage_spin_03'
});

// 「聚光更亮」每获得一次，月牙视觉升一级；Lv4 后只继续涨伤害，视觉封顶。
// attackDisplaySize 是实际游戏显示尺寸；hitStart/EndScale 以 256x256 正式素材为基准。
export const CRESCENT_VFX_LEVELS = Object.freeze([
  Object.freeze({
    level: 1,
    attackKey: VFX_KEYS.CRESCENT_ATTACK_01,
    hitKey: VFX_KEYS.CRESCENT_HIT_01,
    attackDisplaySize: 42,
    hitStartScale: 0.17,
    hitEndScale: 0.30,
    hitDurationMs: 120
  }),
  Object.freeze({
    level: 2,
    attackKey: VFX_KEYS.CRESCENT_ATTACK_02,
    hitKey: VFX_KEYS.CRESCENT_HIT_02,
    attackDisplaySize: 48,
    hitStartScale: 0.19,
    hitEndScale: 0.34,
    hitDurationMs: 128
  }),
  Object.freeze({
    level: 3,
    attackKey: VFX_KEYS.CRESCENT_ATTACK_03,
    hitKey: VFX_KEYS.CRESCENT_HIT_03,
    attackDisplaySize: 54,
    hitStartScale: 0.21,
    hitEndScale: 0.40,
    hitDurationMs: 136
  }),
  Object.freeze({
    level: 4,
    attackKey: VFX_KEYS.CRESCENT_ATTACK_04,
    hitKey: VFX_KEYS.CRESCENT_HIT_04,
    attackDisplaySize: 60,
    hitStartScale: 0.23,
    hitEndScale: 0.46,
    hitDurationMs: 145
  })
]);

export function getCrescentVfxLevel(level = 1) {
  const normalized = Math.max(1, Math.min(4, Math.round(Number(level) || 1)));
  return CRESCENT_VFX_LEVELS[normalized - 1];
}

// 0.9.2-dev08.1.2：主角相关 VFX 统一以主角 sprite 的视觉锚点为基准。
// player_idle.png 原图 128x128；当前正式母版非透明可见底部约在 source y=120。
// feet 锚点会随 player.displayHeight 自动缩放，因此未来调整主角显示尺寸时无需重调绝对 yOffset。
export const PLAYER_VFX_REFERENCE = Object.freeze({
  sourceWidth: 128,
  sourceHeight: 128,
  anchors: Object.freeze({
    center: Object.freeze({ sourceX: 64, sourceY: 64 }),
    feet: Object.freeze({ sourceX: 64, sourceY: 120 })
  })
});

// 0.9.2-dev09：正式应援蓝心为 128x128 PNG。
// pickupScale 约等于旧 30x31 占位蓝心的游戏体量；mutualSupportScale 保持「双向奔赴」旧版小心形的视觉尺寸。
// 这里只调整正式素材的显示比例，不改变回血、应援值、解毒、生成间隔或生命周期。
export const SUPPORT_HEART_VFX = Object.freeze({
  pickupScale: 0.25,
  mutualSupportScale: 0.13,
  collectEndScaleFactor: 0.12
});

// 0.9.2-dev10：「电力四射」只更换表现层，不改变伤害、半径、麻痹、击退、冷却或两段式结算。
// Lv1/Lv2 使用各自长电弧；Lv3 继续使用 Lv2 长电弧，并叠加 lightning_03 高能中心爆发。
// electricLevel 超过 3 时视觉封顶 Lv3，数值仍按现有升级逻辑继续成长。
export const LIGHTNING_VFX_LEVELS = Object.freeze([
  Object.freeze({
    level: 1,
    boltKey: VFX_KEYS.LIGHTNING_01,
    centerKey: null,
    burstBolts: 5,
    shockBolts: 6,
    burstBoltRange: Object.freeze([4, 5]),
    shockBoltRange: Object.freeze([5, 6]),
    boltHeight: 42,
    burstDurationMs: 210,
    shockDurationMs: 245,
    groundHits: 2,
    sparkKey: VFX_KEYS.SPARK_01,
    sparkCount: 2,
    branchChance: 0.20,
    maxBranchesPerBolt: 1,
    centerArcCount: 2,
    nodeSparkChance: 0.28
  }),
  Object.freeze({
    level: 2,
    boltKey: VFX_KEYS.LIGHTNING_02,
    centerKey: null,
    burstBolts: 6,
    shockBolts: 7,
    burstBoltRange: Object.freeze([5, 6]),
    shockBoltRange: Object.freeze([6, 7]),
    boltHeight: 52,
    burstDurationMs: 220,
    shockDurationMs: 255,
    groundHits: 3,
    sparkKey: VFX_KEYS.SPARK_02,
    sparkCount: 3,
    branchChance: 0.30,
    maxBranchesPerBolt: 2,
    centerArcCount: 3,
    nodeSparkChance: 0.48
  }),
  Object.freeze({
    level: 3,
    boltKey: VFX_KEYS.LIGHTNING_02,
    centerKey: VFX_KEYS.LIGHTNING_03,
    burstBolts: 7,
    shockBolts: 7,
    burstBoltRange: Object.freeze([6, 7]),
    shockBoltRange: Object.freeze([7, 7]),
    boltHeight: 58,
    burstDurationMs: 230,
    shockDurationMs: 265,
    groundHits: 4,
    sparkKey: VFX_KEYS.SPARK_02,
    sparkCount: 4,
    branchChance: 0.38,
    maxBranchesPerBolt: 2,
    centerArcCount: 4,
    nodeSparkChance: 0.64
  })
]);

export function getLightningVfxLevel(level = 1) {
  const normalized = Math.max(1, Math.min(3, Math.round(Number(level) || 1)));
  return LIGHTNING_VFX_LEVELS[normalized - 1];
}


// 0.9.2-dev11：「舞台回旋」三阶段正式 VFX。
// 三张素材保持同一 512x512 画布与同一 pivot；程序只负责旋转、残影、轻微呼吸缩放和前后层次。
// radiusScale 相对当前 stageSpinRadius 计算显示尺寸，因此未来调整技能半径时视觉可同步适配。
export const STAGE_SPIN_VFX = Object.freeze({
  anchor: 'center',
  frontCropRatio: 0.50,
  stages: Object.freeze([
    Object.freeze({
      key: VFX_KEYS.STAGE_SPIN_01,
      durationMs: 90,
      radiusScale: 1.45,
      startAngle: -35,
      endAngle: 175,
      alpha: 0.72,
      pulseScale: 0.02,
      trailOffsets: Object.freeze([])
    }),
    Object.freeze({
      key: VFX_KEYS.STAGE_SPIN_02,
      durationMs: 160,
      radiusScale: 1.65,
      startAngle: 160,
      endAngle: 510,
      alpha: 0.84,
      pulseScale: 0.035,
      trailOffsets: Object.freeze([14])
    }),
    Object.freeze({
      key: VFX_KEYS.STAGE_SPIN_03,
      durationMs: 180,
      radiusScale: 1.90,
      startAngle: 485,
      endAngle: 1020,
      alpha: 0.96,
      pulseScale: 0.06,
      trailOffsets: Object.freeze([12, 26])
    })
  ])
});

// 两张正式 PNG 共用 256x128 画布。groundGap 是从主角实际可见脚底到光圈中心的地面距离。
// visualWindowMs 只控制视觉提前/衰减范围，不参与 Perfect Dodge / Combo 判定。
export const BEAT_VFX = Object.freeze({
  strong: Object.freeze({
    key: VFX_KEYS.BEAT_STRONG,
    displayWidth: 104,
    displayHeight: 52,
    anchor: 'feet',
    xOffset: -8,
    groundGap: 1,
    depth: 9,
    originX: 0.5,
    originY: 0.5,
    baseAlpha: 0.08,
    pulseAlpha: 0.86,
    baseScale: 0.94,
    pulseScale: 0.10,
    visualWindowMs: 150
  }),
  weak: Object.freeze({
    key: VFX_KEYS.BEAT_WEAK,
    displayWidth: 92,
    displayHeight: 46,
    anchor: 'feet',
    xOffset: -8,
    groundGap: 1,
    depth: 9,
    originX: 0.5,
    originY: 0.5,
    baseAlpha: 0.03,
    pulseAlpha: 0.47,
    baseScale: 0.94,
    pulseScale: 0.07,
    visualWindowMs: 115
  })
});

// preload=true 的素材必须已经存在于 public/ 下。
export const VFX_ASSETS = Object.freeze([
  // Legacy 月牙文件暂留在仓库用于回滚，但不再 preload / gameplay 使用。
  {
    key: VFX_KEYS.LEGACY_CRESCENT_ATTACK,
    path: 'assets/effects/crescent_moon.png',
    preload: false
  },
  {
    key: VFX_KEYS.LEGACY_CRESCENT_HIT,
    path: 'assets/effects/crescent_hit.png',
    preload: false
  },

  { key: VFX_KEYS.CRESCENT_ATTACK_01, path: 'assets/vfx/crescent/attack_crescent_01.png', preload: true },
  { key: VFX_KEYS.CRESCENT_ATTACK_02, path: 'assets/vfx/crescent/attack_crescent_02.png', preload: true },
  { key: VFX_KEYS.CRESCENT_ATTACK_03, path: 'assets/vfx/crescent/attack_crescent_03.png', preload: true },
  { key: VFX_KEYS.CRESCENT_ATTACK_04, path: 'assets/vfx/crescent/attack_crescent_04.png', preload: true },
  { key: VFX_KEYS.CRESCENT_HIT_01, path: 'assets/vfx/crescent/hit_crescent_01.png', preload: true },
  { key: VFX_KEYS.CRESCENT_HIT_02, path: 'assets/vfx/crescent/hit_crescent_02.png', preload: true },
  { key: VFX_KEYS.CRESCENT_HIT_03, path: 'assets/vfx/crescent/hit_crescent_03.png', preload: true },
  { key: VFX_KEYS.CRESCENT_HIT_04, path: 'assets/vfx/crescent/hit_crescent_04.png', preload: true },

  { key: VFX_KEYS.BEAT_STRONG, path: 'assets/vfx/beat/beat_strong.png', preload: true },
  { key: VFX_KEYS.BEAT_WEAK, path: 'assets/vfx/beat/beat_weak.png', preload: true },
  { key: VFX_KEYS.SUPPORT_HEART, path: 'assets/vfx/support/support_heart.png', preload: true },

  { key: VFX_KEYS.LIGHTNING_01, path: 'assets/vfx/lightning/lightning_01.png', preload: true },
  { key: VFX_KEYS.LIGHTNING_02, path: 'assets/vfx/lightning/lightning_02.png', preload: true },
  { key: VFX_KEYS.LIGHTNING_03, path: 'assets/vfx/lightning/lightning_03.png', preload: true },
  { key: VFX_KEYS.LIGHTNING_GROUND_HIT, path: 'assets/vfx/lightning/lightning_ground_hit.png', preload: true },
  { key: VFX_KEYS.SPARK_01, path: 'assets/vfx/common/spark_01.png', preload: true },
  { key: VFX_KEYS.SPARK_02, path: 'assets/vfx/common/spark_02.png', preload: true },

  { key: VFX_KEYS.STAGE_SPIN_01, path: 'assets/vfx/stage_spin/stage_spin_01.png', preload: true },
  { key: VFX_KEYS.STAGE_SPIN_02, path: 'assets/vfx/stage_spin/stage_spin_02.png', preload: true },
  { key: VFX_KEYS.STAGE_SPIN_03, path: 'assets/vfx/stage_spin/stage_spin_03.png', preload: true }
]);

export const VFX_DEFAULTS = Object.freeze({
  depth: 18,
  behindPlayerDepth: 9,
  playerDepth: 10,
  frontPlayerDepth: 11,
  alpha: 1,
  scale: 1,
  blendMode: 'ADD'
});
