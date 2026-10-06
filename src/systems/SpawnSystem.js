import * as Phaser from 'phaser';
import Potato from '../enemies/Potato.js?v=2.0.0';
import Duck from '../enemies/Duck.js?v=2.0.0';
import Ball from '../enemies/Ball.js?v=2.0.0';
import Roach from '../enemies/Roach.js?v=2.0.0';
import TwinPig from '../enemies/TwinPig.js?v=2.0.0';
import PlagueCat from '../enemies/PlagueCat.js?v=2.0.0';
import DuckQueen from '../enemies/DuckQueen.js?v=2.0.0';
import PotatoCommander from '../enemies/PotatoCommander.js?v=2.0.0';
import { GAME, SPAWN, RELEASE } from '../config/gameConfig.js?v=2.0.0';

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

    this.potatoPressureCredit = 0;

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

    if (
      potatoCommanderPublished
      && elapsedSeconds >= SPAWN.POTATO_COMMANDER_SPAWN_SECONDS
      && !this.potatoCommanderSpawned
      && !this.scene.bossActive
    ) {
      this.spawnPotatoCommander();
    }

    if (time < (this.scene.spawnSuppressedUntil ?? -Infinity)) return;

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

    this.updateBallVolley(time, elapsedSeconds);

    if (this.enemyGroup.countActive(true) >= SPAWN.MAX_ALIVE) return;

    this.updateVisibleCommonRefill(time, elapsedSeconds);

    if (time < this.nextSpawnAt) return;

    const progress = Phaser.Math.Clamp(elapsedSeconds / GAME.PROTOTYPE_DURATION_SECONDS, 0, 1);
    const baseInterval = Phaser.Math.Linear(
      SPAWN.BASE_INTERVAL_MS,
      SPAWN.MIN_INTERVAL_MS,
      progress
    );

    const profile = this.getVisibleSpawnProfile(elapsedSeconds);
    const visibleCommon = this.countVisibleCommonEnemies();

    let interval = this.scene.potatoCommander?.active
      ? baseInterval * 0.84
      : baseInterval;
    interval *= Number(this.scene.difficultyProfile?.spawnIntervalMultiplier) || 1;

    if (visibleCommon >= profile.softMax) {
      this.nextSpawnAt = time + interval * 1.55;
      return;
    }

    this.spawnByType(this.chooseType(elapsedSeconds));

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

      this.spawnCommonAtViewEdge(type === 'ball' ? 'duck' : type);
    }
  }

  spawnSingleRoachAtViewEdge(options = {}) {
    const forceForQueenCandy = options.forceForQueenCandy === true;
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
    const eliteIntervalScale = Number(this.scene.difficultyProfile?.eliteSpawnIntervalMultiplier) || 1;
    this.nextTwinPigAt = time + Math.round(Phaser.Math.Between(52000, 68000) * eliteIntervalScale);
  }

  updatePlagueCatSpawns(time) {
    if (this.nextPlagueCatAt === null) this.nextPlagueCatAt = time;
    if (time < this.nextPlagueCatAt) return;
    if (this.countType('plagueCat') >= SPAWN.MAX_PLAGUE_CATS) return;

    this.spawnElite('plagueCat');
    const eliteIntervalScale = Number(this.scene.difficultyProfile?.eliteSpawnIntervalMultiplier) || 1;
    this.nextPlagueCatAt = time + Math.round(Phaser.Math.Between(58000, 76000) * eliteIntervalScale);
  }

  chooseType(elapsedSeconds) {
    const roll = Math.random();

    if (this.scene.potatoCommander?.active) {
      if (roll < 0.54) return 'potato';
      if (roll < 0.82) return 'roach';
      return 'duck';
    }

    if (elapsedSeconds < SPAWN.ROACH_START_SECONDS) {
      return 'duck';
    }

    if (elapsedSeconds < SPAWN.POTATO_START_SECONDS) {
      return roll < 0.58 ? 'roach' : 'duck';
    }

    if (elapsedSeconds < SPAWN.MID_COMMON_MIX_START_SECONDS) {
      if (roll < 0.50) return 'roach';
      if (roll < 0.76) return 'potato';
      return 'duck';
    }

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

  spawnElite(type) {
    let { x, y } = this.getSpawnPoint();

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
    if (this.countType('ball') >= SPAWN.MAX_BALLS) return false;
    if (this.enemyGroup.countActive(true) >= SPAWN.MAX_ALIVE) return false;
    if (this.countVisibleCommonEnemies() >= SPAWN.VISIBLE_HARD_CAP) return false;

    this.spawnBall();
    return true;
  }

  startBallVolley(time, elapsedSeconds) {
    const volleySize = this.getBallVolleySize(elapsedSeconds);

    this.trySpawnBallVolleyShot();
    this.pendingBallVolleyShots = Math.max(0, volleySize - 1);
    this.nextBallVolleyShotAt = this.pendingBallVolleyShots > 0
      ? time + SPAWN.BALL_VOLLEY_SHOT_INTERVAL_MS
      : null;

    this.nextBallAt = time + Phaser.Math.Between(6500, 9500);
  }

  updateBallVolley(time, elapsedSeconds) {
    if (elapsedSeconds < SPAWN.BALL_START_SECONDS) return;

    if (this.pendingBallVolleyShots > 0) {
      if (time < this.nextBallVolleyShotAt) return;

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

  spawnDuckQueen() {
    if (this.scene.duckQueen?.active) return this.scene.duckQueen;
    if (this.duckQueenSpawned) return null;

    const point = this.getSpawnPoint();

    const queen = new DuckQueen(this.scene, point.x, point.y);
    this.enemyGroup.add(queen);
    this.duckQueenSpawned = true;

    this.scene.onDuckQueenSpawned(queen);
    return queen;
  }

  spawnPotatoCommander() {
    if (this.scene.potatoCommander?.active) return this.scene.potatoCommander;
    if (this.potatoCommanderSpawned) return null;
    if (this.scene.bossActive) return null;

    const point = this.getSpawnPoint();

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
