import * as Phaser from 'phaser';
import Potato from '../enemies/Potato.js';
import Duck from '../enemies/Duck.js';
import Ball from '../enemies/Ball.js';
import Roach from '../enemies/Roach.js';
import TwinPig from '../enemies/TwinPig.js';
import PlagueCat from '../enemies/PlagueCat.js';
import DuckQueen from '../enemies/DuckQueen.js';
import PotatoCommander from '../enemies/PotatoCommander.js';
import { GAME, SPAWN, RELEASE } from '../config/gameConfig.js';

export default class SpawnSystem {
  constructor(scene, enemyGroup) {
    this.scene = scene;
    this.enemyGroup = enemyGroup;
    this.nextSpawnAt = 0;
    this.nextBallAt = 0;
    this.pendingBallVolleyShots = 0;
    this.nextBallVolleyShotAt = null;
    this.nextTwinPigAt = null;
    this.nextPlagueCatAt = null;
    this.duckQueenSpawned = false;
    this.potatoCommanderSpawned = false;
    this.nextVisibleRefillAt = 0;

    // 「土豆压场」额外非土豆刷新信用：只补鸭 / 紫蟑螂，不加速土豆自身。
    this.potatoPressureCredit = 0;
    this.lastPotatoPressureDebugAt = -Infinity;

    // 0.9.2-dev02：前期显式节奏节点提前。
    this.earlyRoachPairSpawned = false;
    this.earlyWaveSpawned = false;
    this.earlyPotatoIntroSpawned = false;
  }

  update(time, elapsedSeconds) {
    const potatoCommanderPublished = RELEASE.POTATO_COMMANDER_PUBLISHED === true;

    if (
      elapsedSeconds >= SPAWN.DUCK_QUEEN_SPAWN_SECONDS
      && !this.duckQueenSpawned
      && (
        !potatoCommanderPublished
        || elapsedSeconds < SPAWN.POTATO_COMMANDER_SPAWN_SECONDS
      )
    ) {
      this.spawnDuckQueen();
    }

    // Internal Test v1.0 ends at 丹麦鸭. 土豆指挥官保留完整代码和 DEBUG 入口，
    // 但正式流程不自动生成，后续测试版只需要打开 release flag 即可恢复。
    if (
      potatoCommanderPublished
      && elapsedSeconds >= SPAWN.POTATO_COMMANDER_SPAWN_SECONDS
      && !this.potatoCommanderSpawned
      && !this.scene.bossActive
    ) {
      this.spawnPotatoCommander();
    }

    // 「圣裁」清屏后留出短暂呼吸窗口；Boss 自身仍然存在，但普通怪 / 精英 / 足球暂缓补入。
    if (time < (this.scene.spawnSuppressedUntil ?? -Infinity)) return;

    // Boss 在场时暂停新的精英刷新，普通怪继续刷。
    if (!this.scene.bossActive) {
      if (
        elapsedSeconds >= SPAWN.TWIN_PIG_START_SECONDS
      ) {
        this.updateTwinPigSpawns(time);
      }

      if (
        elapsedSeconds >= SPAWN.PLAGUE_CAT_START_SECONDS
      ) {
        this.updatePlagueCatSpawns(time);
      }
    }

    this.updateEarlyPacing(elapsedSeconds);

    // 足球组合技在普通怪保底补位之前处理：这样已到点的 combo shot
    // 不会被同一帧的普通怪 refill 抢掉最后一个全局名额。每颗球仍会
    // 自己检查 MAX_BALLS / MAX_ALIVE；达到上限时该颗直接跳过，不补发。
    // 保持原来的 6.5–9.5 秒「一轮」频率，但随着时间推进，
    // 每轮会变成 1 / 2 / 3 颗连发。后续球每隔 1 秒生成一次，
    // spawnBall() 与 Ball 构造函数都会在各自生成瞬间重新读取主角位置，
    // 因此每一颗都会重新瞄准，而不是沿用第一颗的旧方向。
    this.updateBallVolley(time, elapsedSeconds);

    if (this.enemyGroup.countActive(true) >= SPAWN.MAX_ALIVE) return;

    // 镜头内普通小怪保底：不足时从当前画面边缘快速补齐。
    this.updateVisibleCommonRefill(time, elapsedSeconds);

    if (time < this.nextSpawnAt) return;

    const progress = Phaser.Math.Clamp(elapsedSeconds / GAME.PROTOTYPE_DURATION_SECONDS, 0, 1);
    const baseInterval = Phaser.Math.Linear(
      SPAWN.BASE_INTERVAL_MS,
      SPAWN.MIN_INTERVAL_MS,
      progress
    );

    // 「土豆指挥官」登场后进入土豆主场：
    // 普通刷新更快，且土豆比例明显高于鸭子。
    const profile = this.getVisibleSpawnProfile(elapsedSeconds);
    const visibleCommon = this.countVisibleCommonEnemies();

    let interval = this.scene.potatoCommander?.active
      ? baseInterval * 0.84
      : baseInterval;
    interval *= Number(this.scene.difficultyProfile?.spawnIntervalMultiplier) || 1;

    // 达到当前阶段的软上限后，暂缓继续刷怪；
    // 不删除现有怪物，只把下一次刷新往后推。
    if (visibleCommon >= profile.softMax) {
      this.nextSpawnAt = time + interval * 1.55;
      return;
    }

    // 每个主刷新节拍只生成 1 只，避免突然成批增加。
    this.spawnByType(this.chooseType(elapsedSeconds));

    // 「土豆压场」只额外增加鸭子 / 紫蟑螂，不增加土豆自身。
    // Final Boss 期间关闭，由土豆指挥官自己的生态规则接管。
    this.updatePotatoPressureSpawn(
      time,
      elapsedSeconds,
      profile
    );

    this.nextSpawnAt = time + interval;
  }

  updateEarlyPacing(elapsedSeconds) {
    const profile =
      this.getVisibleSpawnProfile(elapsedSeconds);

    // 约 30 秒保证第一次看到成对紫蟑螂。
    if (
      !this.earlyRoachPairSpawned
      && elapsedSeconds >= SPAWN.EARLY_ROACH_PAIR_SECONDS
    ) {
      this.earlyRoachPairSpawned = true;

      if (
        this.countVisibleCommonEnemies()
        < profile.softMax
      ) {
        this.spawnCommonAtViewEdge('roach');
      }
    }

    // 约 45 秒第一次小波：鸭 + 一对蟑螂。
    if (
      !this.earlyWaveSpawned
      && elapsedSeconds >= SPAWN.EARLY_WAVE_SECONDS
    ) {
      this.earlyWaveSpawned = true;

      const wanted = ['duck', 'duck', 'duck', 'roach'];

      wanted.forEach((type) => {
        if (
          this.enemyGroup.countActive(true)
            >= SPAWN.MAX_ALIVE
          || this.countVisibleCommonEnemies()
            >= profile.softMax
        ) return;

        this.spawnCommonAtViewEdge(type);
      });
    }

    // 第一只土豆作为前期的第一次「坦克题」。
    if (
      !this.earlyPotatoIntroSpawned
      && elapsedSeconds >= SPAWN.EARLY_POTATO_INTRO_SECONDS
    ) {
      this.earlyPotatoIntroSpawned = true;

      if (
        this.countVisibleCommonEnemies()
        < profile.softMax
      ) {
        this.spawnCommonAtViewEdge('potato');
      }
    }
  }

  canSpawnSecondRoach() {
    if (
      this.countType('roach') >= SPAWN.MAX_ROACHES
      || this.enemyGroup.countActive(true) >= SPAWN.MAX_ALIVE
      || this.countVisibleCommonEnemies() >= SPAWN.VISIBLE_HARD_CAP
    ) return false;

    const elapsed = this.scene.getGameplayElapsedSeconds?.() ?? 0;
    const profile = this.getVisibleSpawnProfile(elapsed);

    return this.countVisibleCommonEnemies() < profile.softMax;
  }

  createRoachPair(x, y) {
    if (this.countType('roach') >= SPAWN.MAX_ROACHES) {
      return null;
    }

    const first = new Roach(this.scene, x, y);
    this.enemyGroup.add(first);

    if (!this.canSpawnSecondRoach()) return first;

    const angle = Phaser.Math.FloatBetween(
      0,
      Math.PI * 2
    );
    const spacing = Phaser.Math.Between(18, 36);
    const x2 = Phaser.Math.Clamp(
      x + Math.cos(angle) * spacing,
      25,
      GAME.WORLD_WIDTH - 25
    );
    const y2 = Phaser.Math.Clamp(
      y + Math.sin(angle) * spacing,
      25,
      GAME.WORLD_HEIGHT - 25
    );

    const second = new Roach(this.scene, x2, y2);
    // 刚刷出的两只稍微同步一点，形成「一起来的」视觉。
    second.zigzagSeed = first.zigzagSeed
      + Phaser.Math.FloatBetween(-0.24, 0.24);
    this.enemyGroup.add(second);

    return first;
  }

  getAlivePotatoCount() {
    let count = 0;

    this.enemyGroup.children.iterate((enemy) => {
      if (
        enemy?.active
        && !enemy.isDead
        && enemy.enemyType === 'potato'
      ) {
        count += 1;
      }
    });

    return count;
  }

  getPotatoPressure() {
    if (this.scene.potatoCommander?.active) return 0;

    const alive = this.getAlivePotatoCount();
    return Math.min(
      alive * SPAWN.POTATO_PRESSURE_PER_ALIVE,
      SPAWN.POTATO_PRESSURE_CAP
    );
  }

  choosePressureType(elapsedSeconds) {
    // 足球由独立低频系统控制；压场只积累鸭 / 紫蟑螂。
    if (elapsedSeconds < SPAWN.ROACH_START_SECONDS) return 'duck';

    if (this.countType('roach') >= SPAWN.MAX_ROACHES) {
      return 'duck';
    }

    return Math.random() < 0.62 ? 'roach' : 'duck';
  }

  updatePotatoPressureSpawn(time, elapsedSeconds, profile) {
    const pressure = this.getPotatoPressure();

    if (pressure <= 0) {
      this.potatoPressureCredit = 0;
      return;
    }

    // 每次正常刷新节拍累积 6%~24% 的额外非土豆刷新信用。
    this.potatoPressureCredit += pressure;

    const visible = this.countVisibleCommonEnemies();

    if (
      this.potatoPressureCredit >= 1
      && visible < profile.softMax
      && this.enemyGroup.countActive(true) < SPAWN.MAX_ALIVE
    ) {
      this.spawnByType(
        this.choosePressureType(elapsedSeconds)
      );
      this.potatoPressureCredit -= 1;
    }

    if (
      time - this.lastPotatoPressureDebugAt
      >= SPAWN.POTATO_PRESSURE_DEBUG_INTERVAL_MS
    ) {
      this.lastPotatoPressureDebugAt = time;
      console.debug(
        '[potato-pressure]',
        `alive=${this.getAlivePotatoCount()}`,
        `bonus=${Math.round(pressure * 100)}%`,
        `visible=${visible}/${profile.softMax}`,
        `credit=${this.potatoPressureCredit.toFixed(2)}`
      );
    }
  }

  getVisibleTargetCount(elapsedSeconds) {
    const points = SPAWN.VISIBLE_TARGET_POINTS ?? [[0, 15], [300, 50]];
    if (elapsedSeconds <= points[0][0]) return points[0][1];

    for (let i = 1; i < points.length; i += 1) {
      const [timeB, countB] = points[i];
      const [timeA, countA] = points[i - 1];
      if (elapsedSeconds <= timeB) {
        const t = Phaser.Math.Clamp(
          (elapsedSeconds - timeA) / Math.max(1, timeB - timeA),
          0,
          1
        );
        return Phaser.Math.Linear(countA, countB, t);
      }
    }

    return points[points.length - 1][1];
  }

  getVisibleSpawnProfile(elapsedSeconds) {
    const target = Math.round(this.getVisibleTargetCount(elapsedSeconds));
    const rampEndSeconds = SPAWN.VISIBLE_TARGET_POINTS?.at(-1)?.[0] ?? 300;
    const ramp = Phaser.Math.Clamp(elapsedSeconds / Math.max(1, rampEndSeconds), 0, 1);

    const min = Math.max(
      1,
      target - SPAWN.VISIBLE_REFILL_MARGIN
    );
    const softMax = Math.min(
      SPAWN.VISIBLE_HARD_CAP,
      target + SPAWN.VISIBLE_SOFT_MARGIN
    );
    const refillIntervalMs = Math.round(Phaser.Math.Linear(
      SPAWN.VISIBLE_REFILL_INTERVAL_START_MS,
      SPAWN.VISIBLE_REFILL_INTERVAL_END_MS,
      ramp
    ));

    let refillBatch = 1;
    if (elapsedSeconds >= SPAWN.VISIBLE_REFILL_BATCH_LATE_SECONDS) {
      refillBatch = 3;
    } else if (elapsedSeconds >= SPAWN.VISIBLE_REFILL_BATCH_MID_SECONDS) {
      refillBatch = 2;
    }

    return {
      target,
      min,
      softMax,
      refillIntervalMs,
      refillBatch
    };
  }

  countVisibleCommonEnemies() {
    const view = this.scene.cameras.main.worldView;
    let count = 0;

    this.enemyGroup.children.iterate((enemy) => {
      if (
        !enemy?.active
        || enemy.isDead
        || !['duck', 'roach', 'potato', 'ball'].includes(enemy.enemyType)
      ) return;

      if (view.contains(enemy.x, enemy.y)) {
        count += 1;
      }
    });

    return count;
  }

  updateVisibleCommonRefill(time, elapsedSeconds) {
    const profile = this.getVisibleSpawnProfile(elapsedSeconds);

    if (time < this.nextVisibleRefillAt) return;

    this.nextVisibleRefillAt = time + profile.refillIntervalMs;

    const visible = this.countVisibleCommonEnemies();
    if (visible >= profile.min) return;

    const missing = profile.min - visible;
    const batch = Math.min(profile.refillBatch, missing);

    for (let i = 0; i < batch; i += 1) {
      if (this.enemyGroup.countActive(true) >= SPAWN.MAX_ALIVE) break;

      const type = this.chooseType(elapsedSeconds);

      // 足球仍由独立低频刷新控制，保底只补普通追踪怪。
      this.spawnCommonAtViewEdge(type === 'ball' ? 'duck' : type);
    }
  }

  spawnSingleRoachAtViewEdge(options = {}) {
    const forceForQueenCandy = options.forceForQueenCandy === true;
    // 女王鸭撒糖需要按每颗糖补足紫蟑螂。只在这个显式技能调用里允许越过普通紫蟑螂上限，
    // 但仍尊重全场 MAX_ALIVE 安全上限，避免无限增长。
    if (!forceForQueenCandy && this.countType('roach') >= SPAWN.MAX_ROACHES) return null;
    if (this.enemyGroup.countActive(true) >= SPAWN.MAX_ALIVE) return null;

    const view = this.scene.cameras.main.worldView;
    const margin = 30;
    const side = Phaser.Math.Between(0, 3);
    let x;
    let y;

    if (side === 0) {
      x = view.left + margin;
      y = Phaser.Math.Between(Math.round(view.top + margin), Math.round(view.bottom - margin));
    } else if (side === 1) {
      x = view.right - margin;
      y = Phaser.Math.Between(Math.round(view.top + margin), Math.round(view.bottom - margin));
    } else if (side === 2) {
      x = Phaser.Math.Between(Math.round(view.left + margin), Math.round(view.right - margin));
      y = view.top + margin;
    } else {
      x = Phaser.Math.Between(Math.round(view.left + margin), Math.round(view.right - margin));
      y = view.bottom - margin;
    }

    x = Phaser.Math.Clamp(x, 30, GAME.WORLD_WIDTH - 30);
    y = Phaser.Math.Clamp(y, 30, GAME.WORLD_HEIGHT - 30);

    const roach = new Roach(this.scene, x, y);
    this.enemyGroup.add(roach);
    return roach;
  }

  spawnCommonAtViewEdge(type) {
    const view = this.scene.cameras.main.worldView;
    const margin = 34;
    const side = Phaser.Math.Between(0, 3);

    let x;
    let y;

    if (side === 0) {
      x = view.left + margin;
      y = Phaser.Math.Between(
        Math.round(view.top + margin),
        Math.round(view.bottom - margin)
      );
    } else if (side === 1) {
      x = view.right - margin;
      y = Phaser.Math.Between(
        Math.round(view.top + margin),
        Math.round(view.bottom - margin)
      );
    } else if (side === 2) {
      x = Phaser.Math.Between(
        Math.round(view.left + margin),
        Math.round(view.right - margin)
      );
      y = view.top + margin;
    } else {
      x = Phaser.Math.Between(
        Math.round(view.left + margin),
        Math.round(view.right - margin)
      );
      y = view.bottom - margin;
    }

    x = Phaser.Math.Clamp(x, 30, GAME.WORLD_WIDTH - 30);
    y = Phaser.Math.Clamp(y, 30, GAME.WORLD_HEIGHT - 30);

    let enemy;

    if (type === 'duck') {
      enemy = new Duck(this.scene, x, y);
    } else if (type === 'roach') {
      if (this.countType('roach') >= SPAWN.MAX_ROACHES) {
        enemy = new Potato(this.scene, x, y);
      } else {
        return this.createRoachPair(x, y);
      }
    } else {
      enemy = new Potato(this.scene, x, y);
    }

    this.enemyGroup.add(enemy);
    return enemy;
  }

  updateTwinPigSpawns(time) {
    if (this.nextTwinPigAt === null) this.nextTwinPigAt = time;
    if (time < this.nextTwinPigAt) return;
    if (this.countType('twinPig') >= SPAWN.MAX_TWIN_PIGS) return;

    this.spawnElite('twinPig');
    this.nextTwinPigAt = time + Phaser.Math.Between(52000, 68000);
  }

  updatePlagueCatSpawns(time) {
    if (this.nextPlagueCatAt === null) this.nextPlagueCatAt = time;
    if (time < this.nextPlagueCatAt) return;
    if (this.countType('plagueCat') >= SPAWN.MAX_PLAGUE_CATS) return;

    this.spawnElite('plagueCat');
    this.nextPlagueCatAt = time + Phaser.Math.Between(58000, 76000);
  }

  chooseType(elapsedSeconds) {
    const roll = Math.random();

    if (this.scene.potatoCommander?.active) {
      // Final Boss 战：土豆 > 紫蟑螂 > 鸭子，足球仍走独立低频刷新。
      if (roll < 0.54) return 'potato';
      if (roll < 0.82) return 'roach';
      return 'duck';
    }

    // 出场顺序：鸭子 → 紫蟑螂 → 土豆 → 足球（足球走独立刷新）。
    if (elapsedSeconds < SPAWN.ROACH_START_SECONDS) {
      return 'duck';
    }

    if (elapsedSeconds < SPAWN.POTATO_START_SECONDS) {
      // 蟑螂一登场就占较高比例，配合繁殖逐渐成为数量最多的类型。
      return roll < 0.58 ? 'roach' : 'duck';
    }

    if (elapsedSeconds < SPAWN.MID_COMMON_MIX_START_SECONDS) {
      if (roll < 0.50) return 'roach';
      if (roll < 0.76) return 'potato';
      return 'duck';
    }

    // 中后期：蟑螂基础刷新权重最高；土豆与鸭子接近；足球始终最少。
    if (roll < 0.48) return 'roach';
    if (roll < 0.75) return 'potato';
    return 'duck';
  }

  spawnByType(type) {
    if (type === 'roach' && this.countType('roach') >= SPAWN.MAX_ROACHES) {
      type = Math.random() < 0.52 ? 'potato' : 'duck';
    }
    const { x, y } = this.getSpawnPoint();
    let enemy;

    switch (type) {
      case 'duck':
        enemy = new Duck(this.scene, x, y);
        break;

      case 'roach':
        return this.createRoachPair(x, y);

      case 'potato':
      default:
        enemy = new Potato(this.scene, x, y);
        break;
    }

    this.enemyGroup.add(enemy);
    return enemy;
  }

  spawnElite(type, options = {}) {
    let { x, y } = this.getSpawnPoint();

    if (options.debugNear) {
      const boss = this.scene.duckQueen?.active
        ? this.scene.duckQueen
        : (this.scene.potatoCommander?.active ? this.scene.potatoCommander : null);
      const anchor = boss ?? this.scene.player;
      if (anchor?.active) {
        const offsetX = boss ? 145 : 170;
        x = Phaser.Math.Clamp(anchor.x + offsetX, 70, GAME.WORLD_WIDTH - 70);
        y = Phaser.Math.Clamp(anchor.y + 20, 70, GAME.WORLD_HEIGHT - 70);
      }
    }

    let enemy;
    if (type === 'twinPig') enemy = new TwinPig(this.scene, x, y);
    else enemy = new PlagueCat(this.scene, x, y);
    this.enemyGroup.add(enemy);
    this.scene.showImportantWorldText?.(
      enemy,
      type === 'twinPig' ? '「🐷🐷 双子猪出现！」' : '「🐈 瘟疫猫出现！」',
      type === 'twinPig' ? '#e7a7a7' : '#9be78e',
      20,
      2600,
      { priority: 85, gapMs: 360, yOffset: 68 }
    );
    return enemy;
  }

  getBallVolleySize(elapsedSeconds) {
    if (elapsedSeconds >= SPAWN.BALL_VOLLEY_TRIPLE_START_SECONDS) return 3;
    if (elapsedSeconds >= SPAWN.BALL_VOLLEY_DOUBLE_START_SECONDS) return 2;
    return 1;
  }

  trySpawnBallVolleyShot() {
    // 这一颗如果碰到同屏上限就直接跳过，不排队补发，避免之后突然倾泻。
    if (this.countType('ball') >= SPAWN.MAX_BALLS) return false;
    if (this.enemyGroup.countActive(true) >= SPAWN.MAX_ALIVE) return false;
    if (this.countVisibleCommonEnemies() >= SPAWN.VISIBLE_HARD_CAP) return false;

    this.spawnBall();
    return true;
  }

  startBallVolley(time, elapsedSeconds) {
    const volleySize = this.getBallVolleySize(elapsedSeconds);

    // 第一颗立即发射；后续每颗由 updateBallVolley() 按 1 秒间隔触发。
    this.trySpawnBallVolleyShot();
    this.pendingBallVolleyShots = Math.max(0, volleySize - 1);
    this.nextBallVolleyShotAt = this.pendingBallVolleyShots > 0
      ? time + SPAWN.BALL_VOLLEY_SHOT_INTERVAL_MS
      : null;

    // 保持原有足球事件频率：这里记录的是下一「轮」开始时间，
    // 而不是把每颗连发球都当成一次新的独立刷新。
    this.nextBallAt = time + Phaser.Math.Between(6500, 9500);
  }

  updateBallVolley(time, elapsedSeconds) {
    if (elapsedSeconds < SPAWN.BALL_START_SECONDS) return;

    if (this.pendingBallVolleyShots > 0) {
      if (time < this.nextBallVolleyShotAt) return;

      // 无论这一颗是否因同屏上限被跳过，都消耗本轮的一个 shot。
      // 若升级选择等流程让 scene time 前进，恢复后也只发一颗，
      // 下一颗重新从当前时刻 +1 秒计时，避免瞬间补发多颗。
      this.trySpawnBallVolleyShot();
      this.pendingBallVolleyShots -= 1;
      this.nextBallVolleyShotAt = this.pendingBallVolleyShots > 0
        ? time + SPAWN.BALL_VOLLEY_SHOT_INTERVAL_MS
        : null;
      return;
    }

    if (time >= this.nextBallAt) {
      this.startBallVolley(time, elapsedSeconds);
    }
  }

  spawnBall() {
    const player = this.scene.player;
    const side = Phaser.Math.Between(0, 3);
    const margin = 35;
    let x; let y;

    // 保留从四个方向随机入场，但避免出生点与主角完全水平/垂直对齐，
    // 这样每颗球都会以清晰不同的斜角朝主角砸入。
    const signedOffset = (minAbs, maxAbs) => {
      const magnitude = Phaser.Math.Between(minAbs, maxAbs);
      return Math.random() < 0.5 ? -magnitude : magnitude;
    };

    if (side === 0) {
      x = Phaser.Math.Clamp(
        player.x - 520,
        margin,
        GAME.WORLD_WIDTH - margin
      );
      y = Phaser.Math.Clamp(
        player.y + signedOffset(80, 280),
        margin,
        GAME.WORLD_HEIGHT - margin
      );
    } else if (side === 1) {
      x = Phaser.Math.Clamp(
        player.x + 520,
        margin,
        GAME.WORLD_WIDTH - margin
      );
      y = Phaser.Math.Clamp(
        player.y + signedOffset(80, 280),
        margin,
        GAME.WORLD_HEIGHT - margin
      );
    } else if (side === 2) {
      x = Phaser.Math.Clamp(
        player.x + signedOffset(100, 420),
        margin,
        GAME.WORLD_WIDTH - margin
      );
      y = Phaser.Math.Clamp(
        player.y - 360,
        margin,
        GAME.WORLD_HEIGHT - margin
      );
    } else {
      x = Phaser.Math.Clamp(
        player.x + signedOffset(100, 420),
        margin,
        GAME.WORLD_WIDTH - margin
      );
      y = Phaser.Math.Clamp(
        player.y + 360,
        margin,
        GAME.WORLD_HEIGHT - margin
      );
    }

    const ball = new Ball(this.scene, x, y);
    this.enemyGroup.add(ball);
  }

  tryReproduceRoach(parent) {
    if (!parent?.active || parent.isDead) return false;
    if (this.countType('roach') >= SPAWN.MAX_ROACHES) return false;
    if (this.enemyGroup.countActive(true) >= SPAWN.MAX_ALIVE) return false;
    if (this.countVisibleCommonEnemies() >= SPAWN.VISIBLE_HARD_CAP) return false;

    // 繁殖前提：附近确实存在另一只活蟑螂。
    let partner = null;
    let partnerDistance = Infinity;

    this.enemyGroup.children.iterate((enemy) => {
      if (
        !enemy?.active
        || enemy.isDead
        || enemy === parent
        || enemy.enemyType !== 'roach'
      ) return;

      const d = Phaser.Math.Distance.Between(
        parent.x,
        parent.y,
        enemy.x,
        enemy.y
      );

      if (d <= 82 && d < partnerDistance) {
        partner = enemy;
        partnerDistance = d;
      }
    });

    if (!partner) return false;

    // 两只凑在一起只是「有概率」繁殖，不是必定。
    const sugarBoost =
      parent.hasEffectiveStatus?.('sugar_high')
      || partner.hasEffectiveStatus?.('sugar_high');

    const chance = sugarBoost ? 0.68 : 0.46;
    if (Math.random() > chance) return false;

    const midX = (parent.x + partner.x) / 2;
    const midY = (parent.y + partner.y) / 2;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(22, 38);

    const x = Phaser.Math.Clamp(
      midX + Math.cos(angle) * distance,
      25,
      GAME.WORLD_WIDTH - 25
    );
    const y = Phaser.Math.Clamp(
      midY + Math.sin(angle) * distance,
      25,
      GAME.WORLD_HEIGHT - 25
    );

    const child = new Roach(this.scene, x, y);
    child.setScale(0.74);

    this.enemyGroup.add(child);

    // 防止同一对蟑螂紧接着被两边 timer 连续触发两胎。
    partner.nextReproduceAt = Math.max(
      partner.nextReproduceAt,
      this.scene.time.now + Phaser.Math.Between(4200, 6200)
    );

    this.scene.showWorldText(
      x,
      y - 24,
      '「繁殖」',
      '#d89bff',
      14,
      700
    );

    this.scene.tweens.add({
      targets: child,
      scaleX: child.baseArtScale,
      scaleY: child.baseArtScale,
      duration: 380,
      ease: 'Back.Out'
    });

    return true;
  }

  spawnDuckQueen(options = {}) {
    const force = options.force === true;
    const debug = options.debug === true;

    if (this.scene.duckQueen?.active) return this.scene.duckQueen;
    if (this.duckQueenSpawned && !force) return null;

    let point;
    if (debug) {
      // 调试召唤固定生成在玩家附近、当前镜头容易看到的位置。
      const player = this.scene.player;
      point = {
        x: Phaser.Math.Clamp(player.x + 330, 40, GAME.WORLD_WIDTH - 40),
        y: Phaser.Math.Clamp(player.y - 80, 40, GAME.WORLD_HEIGHT - 40)
      };
    } else {
      point = this.getSpawnPoint();
    }

    const queen = new DuckQueen(this.scene, point.x, point.y);
    this.enemyGroup.add(queen);
    this.duckQueenSpawned = true;

    this.scene.onDuckQueenSpawned(queen);
    return queen;
  }

  spawnPotatoCommander(options = {}) {
    const force = options.force === true;
    const debug = options.debug === true;

    if (this.scene.potatoCommander?.active) {
      return this.scene.potatoCommander;
    }

    if (this.potatoCommanderSpawned && !force) return null;
    if (this.scene.bossActive && !force) return null;

    let point;

    if (debug) {
      const player = this.scene.player;
      point = {
        x: Phaser.Math.Clamp(
          player.x + 360,
          50,
          GAME.WORLD_WIDTH - 50
        ),
        y: Phaser.Math.Clamp(
          player.y + 40,
          50,
          GAME.WORLD_HEIGHT - 50
        )
      };
    } else {
      point = this.getSpawnPoint();
    }

    const commander = new PotatoCommander(
      this.scene,
      point.x,
      point.y
    );

    this.enemyGroup.add(commander);
    this.potatoCommanderSpawned = true;
    this.scene.onPotatoCommanderSpawned(commander);

    return commander;
  }

  spawnPotatoAt(x, y) {
    const px = Phaser.Math.Clamp(x, 30, GAME.WORLD_WIDTH - 30);
    const py = Phaser.Math.Clamp(y, 30, GAME.WORLD_HEIGHT - 30);

    const potato = new Potato(this.scene, px, py);
    this.enemyGroup.add(potato);
    return potato;
  }

  spawnPotatoAtViewEdge() {
    const view = this.scene.cameras.main.worldView;
    const margin = 28;
    const side = Phaser.Math.Between(0, 3);

    let x;
    let y;

    if (side === 0) {
      x = view.left + margin;
      y = Phaser.Math.Between(
        Math.round(view.top + margin),
        Math.round(view.bottom - margin)
      );
    } else if (side === 1) {
      x = view.right - margin;
      y = Phaser.Math.Between(
        Math.round(view.top + margin),
        Math.round(view.bottom - margin)
      );
    } else if (side === 2) {
      x = Phaser.Math.Between(
        Math.round(view.left + margin),
        Math.round(view.right - margin)
      );
      y = view.top + margin;
    } else {
      x = Phaser.Math.Between(
        Math.round(view.left + margin),
        Math.round(view.right - margin)
      );
      y = view.bottom - margin;
    }

    x = Phaser.Math.Clamp(x, 30, GAME.WORLD_WIDTH - 30);
    y = Phaser.Math.Clamp(y, 30, GAME.WORLD_HEIGHT - 30);

    return this.spawnPotatoAt(x, y);
  }

  countType(type) {
    let count = 0;
    this.enemyGroup.children.iterate((enemy) => {
      if (enemy?.active && enemy.enemyType === type) count += 1;
    });
    return count;
  }

  getSpawnPoint() {
    const player = this.scene.player;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(SPAWN.SPAWN_DISTANCE_MIN, SPAWN.SPAWN_DISTANCE_MAX);

    return {
      x: Phaser.Math.Clamp(player.x + Math.cos(angle) * distance, 30, GAME.WORLD_WIDTH - 30),
      y: Phaser.Math.Clamp(player.y + Math.sin(angle) * distance, 30, GAME.WORLD_HEIGHT - 30)
    };
  }
}
