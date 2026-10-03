export const RELEASE = Object.freeze({
  INTERNAL_TEST_BUILD: false,
  POTATO_COMMANDER_PUBLISHED: true,
  DEVELOPER_TOOLS: false,
  BUILD_LABEL: 'V1.1.0'
});

export const GAME = {
  WIDTH: 960,
  HEIGHT: 540,
  WORLD_WIDTH: 2200,
  WORLD_HEIGHT: 1400,
  PROTOTYPE_DURATION_SECONDS: 600
};


// Internal Test v1.1.0：难度统一配置。
// 「简单」作为当前正式平衡基线；容易 / 困难只通过倍率改变容错与压力，
// 不改技能机制、不删除 Boss 阶段，也不改变已经锁定的演出时间轴。
export const DIFFICULTY_PROFILES = Object.freeze({
  easy: Object.freeze({
    key: 'easy',
    label: '容易',
    description: '更高容错，适合第一次体验完整演出',
    playerMaxHpMultiplier: 1.30,
    contactInvulnMultiplier: 1.25,
    incomingDamageMultiplier: 0.80,
    minionHpMultiplier: 0.82,
    bossHpMultiplier: 0.85,
    minionSpeedMultiplier: 0.92,
    bossSpeedMultiplier: 0.94,
    spawnIntervalMultiplier: 1.16,
    xpNeedMultiplier: 0.85,
    bossActionCooldownMultiplier: 1.18,
    bossComboWeightMultiplier: 0.72,
    guardianDamageMultiplier: 1.15
  }),
  normal: Object.freeze({
    key: 'normal',
    label: '简单',
    description: '标准节奏，当前所有 Boss 机制的基准难度',
    playerMaxHpMultiplier: 1,
    contactInvulnMultiplier: 1,
    incomingDamageMultiplier: 1,
    minionHpMultiplier: 1,
    bossHpMultiplier: 1,
    minionSpeedMultiplier: 1,
    bossSpeedMultiplier: 1,
    spawnIntervalMultiplier: 1,
    xpNeedMultiplier: 1,
    bossActionCooldownMultiplier: 1,
    bossComboWeightMultiplier: 1,
    guardianDamageMultiplier: 1
  }),
  hard: Object.freeze({
    key: 'hard',
    label: '困难',
    description: '更少容错、更快压迫与更高组合技权重',
    playerMaxHpMultiplier: 0.90,
    contactInvulnMultiplier: 0.85,
    incomingDamageMultiplier: 1.20,
    minionHpMultiplier: 1.15,
    bossHpMultiplier: 1.20,
    minionSpeedMultiplier: 1.08,
    bossSpeedMultiplier: 1.08,
    spawnIntervalMultiplier: 0.88,
    xpNeedMultiplier: 1.10,
    bossActionCooldownMultiplier: 0.86,
    bossComboWeightMultiplier: 1.28,
    guardianDamageMultiplier: 0.90
  })
});

export function getDifficultyProfile(key = 'normal') {
  return DIFFICULTY_PROFILES[key] ?? DIFFICULTY_PROFILES.normal;
}

export const PLAYER = {
  MAX_HP: 100,
  LEVEL_MAX_HP_GAIN: 2,
  SPEED: 230,
  ATTACK_DAMAGE: 12,
  FIRE_INTERVAL_MS: 500,
  BULLET_SPEED: 580,
  BULLET_LIFETIME_MS: 1300,

  // V1.1.0 成长规则：普通攻击月牙在 Lv.20 / Lv.40 增加到 2 / 3 枚。
  MULTI_CRESCENT_TWO_DAMAGE_MULTIPLIER: 0.75,
  MULTI_CRESCENT_THREE_DAMAGE_MULTIPLIER: 0.60,
  MULTI_CRESCENT_TWO_SPREAD_DEG: 8,
  MULTI_CRESCENT_THREE_SPREAD_DEG: 12,
  MULTI_CRESCENT_SPAWN_OFFSET: 7,

  // 击败丹麦鸭后获得永久被动防御技能「月之守卫」。
  // 采用“伪 3D 环绕”而不是单纯 2D 半椭圆：
  // cos(theta) 控制左右位置，sin(theta) 表示前/后深度。
  // 前侧：更低、更大、绘制在人物前；后侧：更高、更小、绘制在人物后。
  // 仅在真正经过人物身体正后方时完全隐藏，左右后侧仍允许短暂露出，形成“钻到背后再出来”的环绕感。
  // v2.1：月守改为更小、更快、更贴身的灵活轨道。
  MOON_GUARD_RADIUS_X: 60,
  MOON_GUARD_FRONT_RADIUS_Y: 21,
  MOON_GUARD_BACK_RADIUS_Y: 9,
  MOON_GUARD_ANCHOR_Y_OFFSET: 9,
  // v2.3：在保留非匀速曲线的基础上整体再提速；钻入 / 窜出时的额外加速逻辑保持不变。
  MOON_GUARD_SPEED_RAD_PER_MS: 0.00455,
  MOON_GUARD_TRANSITION_SPEED_BOOST: 0.95,
  MOON_GUARD_HIDDEN_SPEED_BOOST: 0.28,
  MOON_GUARD_TRANSITION_SPEED_WIDTH_RAD: 0.26,
  MOON_GUARD_DAMAGE_MULTIPLIER: 0.40,
  MOON_GUARD_HIT_COOLDOWN_MS: 420,
  MOON_GUARD_HIT_RADIUS: 15,
  MOON_GUARD_KNOCKBACK: 118,
  MOON_GUARD_PNG_SIZE: 24,
  MOON_GUARD_PNG_ALPHA: 0.97,
  MOON_GUARD_BACK_ALPHA_FACTOR: 0.68,
  MOON_GUARD_BACK_SCALE: 0.84,
  MOON_GUARD_FRONT_SCALE: 1.04,
  MOON_GUARD_BODY_OCCLUSION_HALF_WIDTH: 27,
  MOON_GUARD_FRONT_DEPTH_OFFSET: 0.34,
  MOON_GUARD_BACK_DEPTH_OFFSET: -0.20,

  // 红色不再作为月牙描边，而是覆盖在 PNG 周围的短寿命粒子。
  MOON_GUARD_PARTICLE_INTERVAL_MS: 28,
  MOON_GUARD_PARTICLE_COLOR: 0xff344d,
  MOON_GUARD_PARTICLE_HOT_COLOR: 0xff7682,
  MOON_GUARD_PARTICLE_MIN_RADIUS: 0.85,
  MOON_GUARD_PARTICLE_MAX_RADIUS: 1.55,
  MOON_GUARD_PARTICLE_MIN_LIFESPAN_MS: 120,
  MOON_GUARD_PARTICLE_MAX_LIFESPAN_MS: 185,
  CONTACT_INVULN_MS: 280,
  DASH_SPEED: 720,
  DASH_DURATION_MS: 175,
  // 0.9.1：允许连续踩每个 500ms 强拍；不做 0 冷却，避免常驻无敌。
  DASH_COOLDOWN_MS: 450,
  PERFECT_WINDOW_MS: 125,
  PERFECT_SHOCKWAVE_DAMAGE: 18,
  PERFECT_SHOCKWAVE_RADIUS: 120,
  DANCE_PULSE_DAMAGE: 10,
  DANCE_PULSE_RADIUS: 105,
  DANCE_PULSE_INTERVAL_MS: 1700,
  SOUND_WAVE_DAMAGE: 18,
  SOUND_WAVE_RADIUS: 180,
  SOUND_WAVE_INTERVAL_MS: 4400,
  SOUND_WAVE_KNOCKBACK: 260,

  // 高级 AOE：电力四射。通过升级解锁，低频但高冲击。
  ELECTRIC_BURST_DAMAGE: 34,
  ELECTRIC_BURST_RADIUS: 230,
  ELECTRIC_STUN_MS: 520,
  ELECTRIC_SHOCK_DAMAGE: 16,
  ELECTRIC_SHOCK_RADIUS: 315,
  ELECTRIC_SHOCK_DELAY_MS: 150,
  ELECTRIC_SHOCK_KNOCKBACK: 430,
  ELECTRIC_INTERVAL_MS: 11500,

  // Combo milestone「舞台回旋」的基础数值。
  STAGE_SPIN_DAMAGE: 22,
  STAGE_SPIN_RADIUS: 205,
  STAGE_SPIN_KNOCKBACK: 440,

  // 「升Key」：通过愤怒值蓄力。
  KEY_UP_MAX: 100,
  KEY_UP_DAMAGE: 52,
  KEY_UP_RADIUS: 350,
  KEY_UP_KNOCKBACK: 520,

  // 蓝心投喂 / 「双向奔赴」。
  SUPPORT_MAX: 100,
  SUPPORT_PER_HEART: 25,
  SUPPORT_HEAL_NORMAL: 4,
  SUPPORT_HEAL_LOW_HP: 8,
  SUPPORT_ACTIVE_HEAL: 18,
  SUPPORT_ACTIVE_DURATION_MS: 5000,
  SUPPORT_ACTIVE_EXTRA_REDUCTION: 0.28,
  // 蓝心现在停留在地图某处，不再追逐主角。
  SUPPORT_HEART_LIFETIME_MS: 14000,
  SUPPORT_HEART_FIRST_MS: 18000,
  SUPPORT_HEART_MIN_INTERVAL_MS: 19000,
  SUPPORT_HEART_MAX_INTERVAL_MS: 29000,
  SUPPORT_HEART_MIN_DISTANCE: 190,
  SUPPORT_HEART_MAX_DISTANCE: 300,

  // 0.9.0 统一 120 BPM 节拍系统：
  // 强拍每 500ms，辅助拍位于中间 250ms；音乐状态切换不重置时钟。
  BEAT_STRONG_WINDOW_MS: 95,
  BEAT_AUX_WINDOW_MS: 58,

  // 0.9.2-dev11.3：「踩拍」成功后只强化下一发自动月牙。
  // 判定窗口仍沿用上面的 95 / 58ms，不改变节拍难度。
  BEAT_CHARGE_DAMAGE_MULTIPLIER: 1.20,
  BEAT_CHARGE_SIZE_MULTIPLIER: 1.12,
  BEAT_CHARGE_EXTRA_KNOCKBACK: 7,
  BEAT_CHARGE_BOSS_EXTRA_KNOCKBACK: 1
};


// 0.9.2-dev11.4：高 Combo 不再靠主动按键释放「舞台回旋」，而是在 5 / 10 / 20 Combo 自动触发一档舞台奖励。
// 数值按原舞台回旋基础值做比例缩放；Stage 3 才恢复完整范围/伤害/击退并清除敌方投射物。
export const COMBO_STAGE_SPIN_REWARDS = Object.freeze([
  Object.freeze({
    combo: 5,
    stageIndex: 0,
    damageScale: 0.36,
    radiusScale: 0.61,
    knockbackScale: 0.34,
    clearProjectiles: false,
    label: '「舞台回旋·Ⅰ」'
  }),
  Object.freeze({
    combo: 10,
    stageIndex: 1,
    damageScale: 0.64,
    radiusScale: 0.80,
    knockbackScale: 0.59,
    clearProjectiles: false,
    label: '「舞台回旋·Ⅱ」'
  }),
  Object.freeze({
    combo: 20,
    stageIndex: 2,
    damageScale: 1,
    radiusScale: 1,
    knockbackScale: 1,
    clearProjectiles: true,
    label: '「舞台回旋·Ⅲ」'
  })
]);

export const ENEMIES = {
  potato: {
    // 0.8.14：土豆正式锁定为「厚血 / 高防 / 抗击退 / 压场」坦克。
    // 鸭子 hp=20 / speed=108，因此普通土豆约为 2.2× HP、72% 移速。
    hp: 44,
    speed: 78,
    damage: 7,
    contactDamageRange: [2, 4],
    defense: 0.28,
    knockbackScale: 0.30,
    xp: 1,
    contactCooldown: 700
  },
  duck: {
    // 鸭子：最早出现，整体均衡；基础移动速度提高。
    hp: 20,
    speed: 108,
    damage: 6,
    contactDamageRange: [2, 3],
    defense: 0,
    xp: 1,
    contactCooldown: 560
  },
  ball: {
    hp: 22,
    speed: 245,
    damage: 10,
    contactDamageRange: [2, 5],
    xp: 2,
    contactCooldown: 700,
    lifetimeMinMs: 18000,
    lifetimeMaxMs: 24000
  },
  roach: {
    // 紫蟑螂：脆、攻击低于鸭子，但速度快且会快速繁殖。
    hp: 10,
    speed: 132,
    damage: 4,
    contactDamageRange: [1, 2],
    defense: 0,
    xp: 1,
    contactCooldown: 450,
    reproductionMinMs: 6000,
    reproductionMaxMs: 8500
  },
  twinPig: {
    hp: 155,
    speed: 38,
    damage: 9,
    // 精英怪经验固定为标准普通怪（1 XP）的 5 倍。
    xp: 5,
    contactCooldown: 760
  },
  plagueCat: {
    hp: 120,
    speed: 50,
    damage: 8,
    // 精英怪经验固定为标准普通怪（1 XP）的 5 倍。
    xp: 5,
    contactCooldown: 680
  },
  duckQueen: {
    // 红色本体血 + 黄色前置血条。
    // 黄色占总有效血量 40%，红色占 60%。
    hp: 660,
    armorHp: 440,
    speed: 102,
    damage: 0,
    defense: 0.18,
    // Boss 经验固定为标准普通怪（1 XP）的 20 倍。
    xp: 20,
    contactCooldown: 900,

    gentleThreshold: 0.60,
    frenzyThreshold: 0.20,

    gentleSpeedMultiplier: 0.95,
    obsessedSpeedMultiplier: 1.28,
    frenzySpeedMultiplier: 1.48,

    attachDistance: 110,
    preferredDistance: 62,

    // 「贴贴」是范围被动。
    gentleStickTriggerRange: 155,
    obsessedStickTriggerRange: 195,
    frenzyStickTriggerRange: 235,
    gentleStickCooldownMs: 7000,
    obsessedStickCooldownMs: 4300,
    frenzyStickCooldownMs: 2700,
    gentleStickDashSpeed: 430,
    obsessedStickDashSpeed: 515,
    frenzyStickDashSpeed: 590,
    stickDashDurationMs: 560,

    // 贴住后的吸血 / 挣脱。
    grappleBreakInputs: 12,
    grappleDrainDamage: 2,
    grappleDrainHeal: 2,
    grappleDrainIntervalMs: 430,
    grappleQueenOffset: 56,
    grappleQueenVerticalOffset: 26,
    grappleBreakKnockback: 390,
    grappleReattachCooldownMs: 3500,
    grapplePostReleaseRoamMs: 1600,

    // 二阶段「真心相待」解锁、三阶段继承：「陪我吃鱼」。
    // 一条追踪必中死鱼 → 粉色鱼网 → 空格挣脱；未挣脱则持续拉进贴贴范围。
    fishSkillDistance: 155,
    fishSkillCooldownMs: 8200,
    fishHomingSpeed: 360,
    fishNetBreakInputs: 3,
    fishNetPullSpeed: 220,

    // 二阶段解锁、三阶段继承：「蛊惑」。
    // 法术型状态技能：不再投掷实体心。黑心施法后直接在主角身上留下 10 秒蛊惑印记。
    // 命中瞬间只有短暂走神，避免 10 秒整段硬控；10 秒持续状态用于视觉与 soft combo 窗口。
    charmGuaranteedHit: true,
    charmSkillCooldownMs: 6800,
    charmCastMs: 620,
    charmStatusDurationMs: 10000,
    charmInitialDazeMs: 650,

    // 主技能 AI 调度：单技能占多数，combo 概率随复杂度下降。
    // 70 / 12 / 13 / 5 是类别权重；若某个 combo 当前条件不成立，会自动重新归一化。
    majorActionInitialCooldownMs: 1600,
    singleActionWeight: 70,
    comboCharmFishWeight: 12,
    comboFishStickWeight: 13,
    comboCharmFishStickWeight: 5,
    comboStepGapMinMs: 850,
    comboStepGapMaxMs: 1250,
    singleActionCooldownMinMs: 2300,
    singleActionCooldownMaxMs: 3100,
    comboActionCooldownBaseMs: 2200,
    comboActionCooldownPerStepMs: 650,
    comboActionCooldownJitterMs: 450,

    // dev14.19.0：「打黑框 ×3 → 大发卖」正式演出版。
    // 黑框阶段仍允许玩家操作；每命中一个黑框额外减速 20%。
    // 三层黑框叠满后先砸出「大发卖」标题；标题消失、黑框退场后进入纯演出：
    // 粉色地裂/尖刺由外向内缩圈 → 主角 7 帧演出 → 挂刺 1 秒 → 晶体大爆炸/白光。
    ultimatePhaseEntryDelayMs: 5200,
    ultimateCooldownMinMs: 18000,
    ultimateCooldownMaxMs: 24000,
    ultimateRollChance: 0.18,
    ultimateRetryDelayMs: 2400,
    ultimateBlackframeHitCount: 3,
    ultimateBlackframeHitIntervalMs: 540,
    ultimateBlackframeImpactMs: 170,
    ultimateBlackframeAfterThirdMs: 360,
    ultimateBlackframeSlowPerHit: 0.20,
    ultimateTitleMs: 800,
    ultimateGroundDisplaySize: 520,
    ultimateImpaleGroundDisplaySize: 550,
    ultimateGroundOffsetY: 48,
    ultimateGroundFadeMs: 210,
    // 大发卖演绎期间的小怪避难区：按红水晶地面近似椭圆计算。
    ultimateEvacRadiusX: 282,
    ultimateEvacRadiusY: 184,
    ultimateEvacSafePadding: 72,
    ultimateEvacSpeedMultiplier: 1.18,
    ultimateEvacRoachSpeedMultiplier: 1.62,
    ultimateEvacHoldSpeedMultiplier: 0.18,
    ultimateEvacWanderRadius: 24,
    ultimateEvacAngleJitterRad: 0.88,
    ultimateEvacFanStepRad: 0.18,
    ultimateEvacTargetJitterPx: 52,
    ultimateEvacSeparationRadius: 54,
    ultimateEvacSeparationWeight: 0.72,
    ultimateRoachChainExplosionMs: 380,
    ultimateRoachExplosionArmMs: 105,
    ultimateRoachEmptyBeatMs: 140,
    ultimateCloseupDisplayH: 650,
    ultimateCloseupPushInPx: 72,
    ultimateCloseupScreenX: 150,
    ultimateCloseupBottomY: 540,
    ultimateCloseupFeatherWidth: 520,
    ultimateCutsceneDisplaySize: 132,
    ultimateHangingDisplayScale: 0.90,
    ultimateFrameReliefMs: 420,
    ultimateFrameNoticeMs: 460,
    ultimateFramePanic1Ms: 500,
    ultimateFramePanic2Ms: 540,
    ultimateFrameTrappedMs: 620,
    ultimateFrameImpaledMs: 220,
    ultimateFrameHangingMs: 1000,
    ultimateExplosionGrowMs: 220,
    ultimateExplosionBloomMs: 330,
    ultimateFlashInMs: 80,
    ultimateFlashHoldMs: 60,
    ultimateFlashOutMs: 320,
    ultimatePostRecoveryMs: 4500,
    ultimateDamageCurrentHpRatio: 0.55
  },
  potatoCommander: {
    // Internal Test v1.0.7：第一阶段只占总血量 10%，后三阶段各占 30%。
    // 总耐久仍保持 2800：280 + 840 + 840 + 840。
    skyBlueHp: 280,
    greenHp: 840,
    yellowHp: 840,
    hp: 840,
    speed: 80,
    damage: 12,
    defense: 0.25,
    // Boss 经验固定为标准普通怪（1 XP）的 20 倍。
    xp: 20,
    contactCooldown: 760,

    // Step 3.3：普通攻击「十字」继续由 Phaser Graphics 生成。
    // 四阶段逐步提高组频率与连击数；组内点射间隔较短，形成明显连击。
    crossAttackDamage: 5,
    crossAttackSpeed: 310,
    crossAttackCooldownMsByPhase: [1400, 1250, 1100, 950],
    crossAttackBurstCountByPhase: [1, 2, 3, 4],
    crossAttackBurstGapMs: 180,
    crossAttackLifetimeMs: 3000,
    crossAttackExplosionDurationMs: 260,

    // 阶段不再使用总血量百分比阈值；由当前血层直接决定。

    // Step 4A-C：「抱团」改为正式召唤演出。
    // 指挥官整个召唤期间保持阶段对应的抱团 PNG；脚底出现扁平召唤光晕，
    // 新土豆在周围从地下上升，原地跳一下，再开始向主角靠近。
    groupIntervalMs: 6800,
    groupTargets: 7,
    groupBuffMs: 4700,
    groupCircleIntroMs: 180,
    groupSpawnStaggerMs: 90,
    groupRiseMs: 380,
    groupHopMs: 260,
    groupCastArtMs: 1650,
    groupSpawnRadiusX: 118,
    groupSpawnRadiusY: 58,
    // 0.9.2-dev14.8.2：S4 把土豆分成“信徒环 + 前线土豆”。
    // 场上土豆 <= 15 就优先抱团补充；一次补团后尽量把总数拉回 18 左右。
    commanderGroupTriggerPopulation: 15,
    commanderTargetPotatoPopulation: 18,
    commanderPopulationCheckMs: 350,
    commanderEmergencyGroupCooldownMs: 3600,
    commanderFollowerMin: 4,
    commanderFollowerDesired: 5,
    commanderFollowerMax: 6,
    commanderFollowerRadiusX: 168,
    commanderFollowerRadiusY: 104,
    commanderFollowerYOffset: 18,
    commanderFollowerOrbitSpeed: 0.00011,
    commanderFollowerMoveSpeedMultiplier: 0.72,
    commanderGraceComboWindowMs: 5600,

    skySmashIntervalMs: 6200,
    skySmashWarningMs: 760,
    skySmashRadius: 102,
    skySmashDamage: 8,
    // 0.9.2-dev14.5.2：下凡命中后使用“砸晕 → 恢复”两帧动画。
    // 数组依次对应 S2 / S3 / S4；总受控时间分别为 0.55 / 0.70 / 0.85 秒。
    // 「下凡」命中后总砸晕停留时间统一为 2 秒：1.5s 砸晕帧 + 0.5s 恢复帧。
    skySmashStunFrameMsByPhase: [1500, 1500, 1500],
    skySmashRecoveryFrameMsByPhase: [500, 500, 500],
    // 0.9.2-dev14.5.4：命中后主角沿下凡来向的反方向短滑移，避免与 Boss 重叠看不见。
    // 这是最低滑移量；实际命中时还会根据 Boss 当前显示轮廓计算“完全错身”所需距离。
    skySmashSlideDistanceByPhase: [56, 64, 72],
    skySmashSlideDurationMsByPhase: [120, 140, 160],
    skySmashClearanceMargin: 16,
    // 被砸出来时给主角一个短促的受击闪烁，强化“真的被砸中”的反馈。
    skySmashHitFlashMsByPhase: [120, 140, 160],
    // Boss 落地后继续保持下凡 PNG，让落地重量感明显一些。
    skySmashLandingHoldMsByPhase: [650, 750, 900],



    // Internal Test v1.0.7：「点赞」。第三阶段专属技能。
    // 连续从主角附近地面窜出点赞手势；命中会造成一次伤害并把主角顶飞，落地后短暂停顿。
    likeIntervalMs: 6600,
    likeCastArtMs: 1320,
    likeThumbCount: 3,
    likeThumbGapMs: 185,
    likeThumbWarningMs: 105,
    likeThumbRiseMs: 170,
    likeThumbHoldMs: 90,
    likeThumbFadeMs: 170,
    likePredictMs: 110,
    likeHitRadius: 44,
    likeDamage: 7,
    likeLaunchHeight: 78,
    likeLaunchRiseMs: 165,
    likeLaunchFallMs: 205,
    likeLandingStunMs: 280,

    holyIntervalMs: 8200,
    holyCastMs: 1900,
    holyRadius: 420,
    holyTargets: 7,
    holyPulseTimesMs: [360, 820, 1280],
    holyBeamFadeMs: 260,
    holyReleaseMs: 1600,

    // Internal Test v1.0.30：「团魂」保留原有三段变绿节奏。完全变绿以后才进入
    // 自爆状态：危险闪烁 → 高速追踪 → 靠近主角立即程序化爆炸 → 土豆消失。
    holySelfDestructArmMs: 340,
    holySelfDestructBlinkMs: 92,
    holySelfDestructSpeed: 272,
    holySelfDestructTriggerRadius: 52,
    holySelfDestructBlastRadius: 108,
    holySelfDestructDamage: 10,
    holySelfDestructMaxChaseMs: 5200,
    holySelfDestructShakeMs: 145,
    holySelfDestructShakeIntensity: 0.0135,

    // 和丹麦鸭一致：普通主技能统一由外层计划器选择 single / combo。
    // 技能本身永远不硬调用下一招；combo 每一步结束后重新检查现场条件。
    comboStepGapMinMs: 760,
    comboStepGapMaxMs: 1080,
    comboActionCooldownBaseMs: 2200,
    comboActionCooldownPerStepMs: 620,
    comboActionCooldownJitterMs: 520,
    singleActionCooldownMinMs: 4100,
    singleActionCooldownMaxMs: 5600,
    singleActionWeight: 68,
    comboGroupSmashWeight: 14,
    comboGroupHolyWeight: 14,
    comboGroupCleanseWeight: 12,
    comboCleanseHolyWeight: 13,
    comboLikeHolyWeight: 12,
    comboSmashHolyWeight: 11,
    comboHolyCrossWeight: 10,
    comboGroupAbsorbWeight: 12,
    comboAbsorbSmashWeight: 10,
    comboGroupCleanseHolyWeight: 5,
    comboCrossVolleyGapMs: 135,

    // 0.9.2-dev14.7：「净场」把 Boss 身边已经经营出来的土豆扫到暗月周围。
    // S3 / S4 可用；优先投送赐福后的特殊土豆，再按距离补普通土豆。
    cleanseRadius: 520,
    cleanseTargets: 6,
    cleanseMinTargets: 3,
    cleanseCastMs: 1320,
    cleanseSweepMs: 280,
    cleanseLaunchDelayMs: 125,
    cleanseLaunchStaggerMs: 62,
    cleanseFlightMsMin: 430,
    cleanseFlightMsMax: 590,
    cleanseLandingRadiusMin: 58,
    cleanseLandingRadiusMax: 108,
    cleanseIntervalMs: 6400,
    cleanseComboWindowMs: 7600,
    cleanseComboNextActionMinMs: 2500,
    cleanseComboNextActionMaxMs: 3200,

    // 0.9.2-dev14.8：「圣恩有价」正式机制。
    // S4 从身边真实存在的信奉土豆中优先抽取赐福等级更高者，
    // 2.4 秒内四次脉冲逐步榨取；玩家可在完成前击杀目标阻断完整收益。
    absorbIntervalMs: 7600,
    absorbCount: 6,
    absorbRadius: 520,
    absorbDurationMs: 2400,
    absorbPulseTimesMs: [420, 900, 1380, 1860],
    absorbFinishMs: 2260,
    absorbFaithValueByGrowth: [1, 1.5, 2, 3],
    absorbHealRatioPerFaith: 0.015,
    absorbHealCapRatioPerCast: 0.14,
    absorbShieldRatioPerFaith: 0.01,
    absorbShieldCapRatio: 0.10,
    absorbJudgmentChargeCap: 18,
    // 圣恩有价：能量法阵固定压到指挥官脚下；红金脉冲与持续粒子流强化“榨取”感。
    absorbAuraYOffset: 48,
    absorbStreamIntervalMs: 54,
    absorbStreamMotesPerTick: 5,
    absorbPulseBurstMotes: 10,

    // 0.9.2-dev14.9：「圣裁」正式终极技。
    // 每发动一次「圣恩有价」点亮一个十字；第三个十字点亮后，在该次榨取结束后立刻进入圣裁。
    judgmentGraceCastsRequired: 3,
    judgmentIntroMs: 760,
    // 十字雨三段：主角周围零散落下 → 明显加速压迫 → 疯狂封路暴雨。
    judgmentRainCounts: [8, 18, 42],
    judgmentRainIntervalsMs: [280, 115, 62],
    judgmentRainFallMs: [440, 325, 245],
    judgmentRainTelegraphMs: [280, 220, 255],
    judgmentPlayerAimChance: [0.01, 0.03, 0.06],
    judgmentPlayerSurroundChance: [0.58, 0.50, 0.36],
    judgmentPlayerPredictChance: [0.18, 0.40, 0.52],
    judgmentSurroundRadiusMin: [54, 42, 28],
    judgmentSurroundRadiusMax: [112, 88, 60],
    judgmentRainFinalDelayMs: 430,
    // 最后一段十字雨进入顶点前，角色会出现短暂慌乱 / 受压制演绎。
    judgmentPanicLeadMs: 1120,
    judgmentAfterimageMs: 680,
    judgmentDamageCurrentHpRatio: 0.60,
    judgmentHeadHitDamageMin: 2,
    judgmentHeadHitDamageMax: 8,
    judgmentPostHoldMs: 1040,
    // 圣裁清屏后给画面一个短呼吸，不让普通刷怪立刻填回来。
    judgmentSpawnBreatherMs: 1500,

    // Internal Test v1.0.15：高分辨率动作帧继承下黑水触发前的真实主角显示尺寸；
    // 不再写死 60×60。左侧 cut-in 独立，十字落地震动与最终轰炸沿用 v1.0.14。
    // 先停顿，再恢复原版 8→18→42 全屏十字雨；少量剧情十字只负责配合人物 9 帧，不替代全屏雨。
    blackwaterPreludePauseMs: 520,
    blackwaterCloseupFeatherWidth: 540,
    blackwaterRainStartMs: 1450,
    blackwaterPostHoldMs: 1450,
    // v1.0.14：最终轰炸必须先完整可见，再烧成纯白。
    blackwaterFinalBombardmentVisibleMs: 380,
    blackwaterFinalBombardmentVisibleMsV116: 520,
    blackwaterFinalEndingRevealDelayMs: 540,
    blackwaterFinalEndingHoldMs: 1050,
    blackwaterFinalWhiteInMs: 150,
    blackwaterFinalWhiteHoldMs: 420,
    blackwaterFinalWhiteOutMs: 760,
    blackwaterFinalShakeMs: 1120,
    blackwaterFinalShakeStrength: 0.040,
    blackwaterFinalShakeStrengthV116: 0.055,
    // v1.0.23：标题与演绎分离；疯狂阶段先完成 7→8→9，最终爆炸再直接过曝到白屏。
    blackwaterTitleHoldMsV123: 900,
    blackwaterFinalBombardmentVisibleMsV123: 300,
    blackwaterFinalEndingRevealDelayMsV123: 0,
    blackwaterFinalEndingHoldMsV123: 0,
    blackwaterFinalWhiteInMsV123: 90,
    blackwaterFinalWhiteHoldMsV123: 900,
    blackwaterFinalWhiteOutMsV123: 1100,
    // v1.0.24：最终逐帧时间轴 / 多一轮镜像闪躲 / 3.4s 十字暴雨 / 07→08→09 同方向。
    blackwaterTitleHoldMsV124: 850,
    blackwaterFinalBombardmentVisibleMsV124: 300,
    blackwaterFinalWhiteInMsV124: 100,
    blackwaterFinalWhiteHoldMsV124: 900,
    blackwaterFinalWhiteOutMsV124: 1150,
    // v1.0.25：演绎从“有呼吸 → 逐渐加速 → 受伤后放慢”重新配拍；终爆几乎立刻过曝到白，
    // 白屏至少维持 1s，并在白屏结束时才停止爆炸余震。
    blackwaterFinalBombardmentVisibleMsV125: 80,
    blackwaterFinalWhiteInMsV125: 55,
    blackwaterFinalWhiteHoldMsV125: 1250,
    blackwaterFinalWhiteOutMsV125: 1100,
    blackwaterFinalShakeStrengthV125: 0.052,
    // v1.0.26：人物动作节奏锁定 v1.0.25；只强化最终蓄压/HP反馈/真正可见的爆盲白屏。
    blackwaterFinalBombardmentVisibleMsV126: 260,
    blackwaterFinalWhiteInMsV126: 90,
    blackwaterFinalWhiteHoldMsV126: 1300,
    blackwaterFinalWhiteOutMsV126: 1100,
    blackwaterFinalShakeStrengthV126: 0.050,
    // v1.0.27：白屏总时长约减半；爆炸先留出约 0.7s 让 HP-XX 可读，再进入更短的爆盲恢复。
    blackwaterFinalBombardmentVisibleMsV127: 460,
    blackwaterFinalWhiteInMsV127: 45,
    blackwaterFinalWhiteHoldMsV127: 650,
    blackwaterFinalWhiteOutMsV127: 550,
    blackwaterCraterPersistMs: 30000,
    blackwaterFinalDamageMaxHpRatio: 0.60,

    worshipShieldPerDuck: 0.04,
    worshipShieldCap: 0.34
  }
};

export const SPAWN = {
  BASE_INTERVAL_MS: 790,
  MIN_INTERVAL_MS: 240,
  MAX_ALIVE: 165,

  // 0.9.2-dev14.8.3：镜头内“怪潮”不再用 3 个突然跳档的固定区间，
  // 而是随实际游玩时间连续增长。目标包含鸭子、紫蟑螂、土豆、足球。
  // 0:00≈15 → 1:00≈22 → 2:00≈30 → 3:00≈38 → 4:00≈45 → 5:00≈50。
  // 5 分钟以后稳定在约 50；60 只是硬保护上限，不是日常目标。
  VISIBLE_TARGET_POINTS: [
    [0, 15],
    [60, 22],
    [120, 30],
    [180, 38],
    [240, 45],
    [300, 50]
  ],
  VISIBLE_REFILL_MARGIN: 4,
  VISIBLE_SOFT_MARGIN: 2,
  VISIBLE_HARD_CAP: 60,
  VISIBLE_REFILL_INTERVAL_START_MS: 980,
  VISIBLE_REFILL_INTERVAL_END_MS: 360,
  VISIBLE_REFILL_BATCH_MID_SECONDS: 120,
  VISIBLE_REFILL_BATCH_LATE_SECONDS: 240,
  MAX_BALLS: 5,
  MAX_ROACHES: 70,
  ROACH_START_SECONDS: 30,
  POTATO_START_SECONDS: 60,
  BALL_START_SECONDS: 90,
  // 0.9.2-dev03：足球从单颗逐渐升级为组合连发。
  // 1:30~2:59 保持单颗；3:00 起每轮 2 颗；5:00 起每轮 3 颗。
  // 每颗间隔 1 秒，并在自己的生成瞬间重新瞄准主角。
  BALL_VOLLEY_DOUBLE_START_SECONDS: 180,
  BALL_VOLLEY_TRIPLE_START_SECONDS: 300,
  BALL_VOLLEY_SHOT_INTERVAL_MS: 1000,
  // 足球解锁提前，但速度曲线仍从原来的 2:30 开始，
  // 将「什么时候出现」和「什么时候开始加速」解耦，便于单独调节节奏。
  BALL_SPEED_RAMP_START_SECONDS: 150,
  // 普通怪中期配比切换仍保持原 2:30，不随足球提前解锁而提前。
  MID_COMMON_MIX_START_SECONDS: 150,

  // 0.9.2-dev02：前期新怪 / 精英首次进入时间整体前移。
  EARLY_ROACH_PAIR_SECONDS: 30,
  EARLY_WAVE_SECONDS: 45,
  EARLY_POTATO_INTRO_SECONDS: 60,
  TWIN_PIG_START_SECONDS: 105,
  PLAGUE_CAT_START_SECONDS: 165,
  MAX_TWIN_PIGS: 2,
  MAX_PLAGUE_CATS: 2,
  DUCK_QUEEN_SPAWN_SECONDS: 300,
  POTATO_COMMANDER_SPAWN_SECONDS: 540,
  SPAWN_DISTANCE_MIN: 500,
  SPAWN_DISTANCE_MAX: 720,

  // 「土豆压场」：每只存活土豆让额外非土豆怪物压力 +6%，最多 +24%。
  // 通过额外 duck / roach spawn credit 实现，不加快土豆自身刷新。
  POTATO_PRESSURE_PER_ALIVE: 0.06,
  POTATO_PRESSURE_CAP: 0.24,
  POTATO_PRESSURE_DEBUG_INTERVAL_MS: 5000,

  // 鸭子随机叫声：轻量画面活性，不允许刷屏。
  DUCK_QUACK_MIN_INTERVAL_MS: 2500,
  DUCK_QUACK_MAX_INTERVAL_MS: 5000,
  DUCK_QUACK_MAX_VISIBLE: 4
};

export const XP = {
  BASE_TO_LEVEL: 5,
  PER_LEVEL: 4,
  PICKUP_RADIUS: 34
};


export const STATUS_EFFECTS = {
  plagueSpeedMultiplier: 1.20,
  plagueDurationMs: 14500,
  plagueSpreadRadius: 120,
  plagueZoneDurationMs: 6000,
  plagueZoneRadius: 95,
  poopDurationMs: 12500,
  poopProjectileDamage: 5,
  poopProjectileSpeed: 285,
  poopProjectileLifetimeMs: 3600,

  // 鸭后引发的生态状态
  jealousDurationMs: 1400,
  jealousAttackSpeedMultiplier: 1.10,
  jealousSpeedMultiplier: 1.30,
  sugarHighDurationMs: 1400,
  sugarHighDamageMultiplier: 1.25,
  sugarHighSpeedMultiplier: 1.25,
  sugarHighReproductionIntervalMultiplier: 0.55,

  // 鸭后「陪我吃鱼」投射物。
  // 女王鸭「陪我吃鱼」鱼网牵引速度。与土豆指挥官吸血不同：这是实体黏网拖拽。
  fishNetPullSpeed: 220,

  fishSmallDamage: 4,
  fishSmallSpeed: 350,
  fishSmallSlowMultiplier: 0.90,
  fishSmallSlowMs: 700,

  fishBigDamage: 8,
  fishBigSpeed: 235,
  fishBigSlowMultiplier: 0.78,
  fishBigSlowMs: 1150,

  fishStinkyDamage: 5,
  fishStinkySpeed: 275,
  fishStinkySlowMultiplier: 0.84,
  fishStinkySlowMs: 950,
  fishStinkZoneRadius: 72,
  fishStinkZoneDurationMs: 1900,
  fishStinkZoneSlowMultiplier: 0.72,

  fishProjectileLifetimeMs: 3600,

  // 「赐福」完成后的绿色剧毒土豆：真正接触主角后触发 Boss 强毒。
  // 强毒每 0.5 秒 -1 HP，共 15 秒；蓝心不能解除，只能由「双向奔赴」净化。
  blessedToxicPoisonDurationMs: 15000,
  blessedToxicPoisonTickMs: 500,
  blessedToxicPoisonDamage: 1
};
