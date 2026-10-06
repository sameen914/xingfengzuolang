import * as Phaser from 'phaser';
import EnemyBase from './EnemyBase.js?v=2.0.0';
import { ENEMIES } from '../config/gameConfig.js?v=2.0.0';

const BEG_DISTANCE = 260;
const BEG_FRAME_MS = 360;
const SPRAY_VISUAL_MS = 760;
const SPRAY_INITIAL_DELAY_MS = 7000;
const SPRAY_COOLDOWN_MIN_MS = 15000;
const SPRAY_COOLDOWN_MAX_MS = 19000;
const DIRTY_SPLASH_INITIAL_DELAY_MS = 2600;
const DIRTY_SPLASH_COOLDOWN_MIN_MS = 5600;
const DIRTY_SPLASH_COOLDOWN_MAX_MS = 7600;
const SUPPORT_NEAR_DISTANCE = 155;
const SUPPORT_FAR_DISTANCE = 255;
const DIRTY_SPLASH_RANGE = 205;
const ELITE_VISUAL_SCALE = 1.18;
const ELITE_COLLISION_SCALE = 1.10;

const VISUALS = {
  normal: { key: 'twinPigsNormalArt', width: 128, height: 80, originY: 1 },
  poop: { key: 'twinPigsPoopArt', width: 172, height: 100, originY: 0.94 },
  dirty: { key: 'twinPigsNormalArt', width: 128, height: 80, originY: 1 },
  beg01: { key: 'twinPigsBeg01Art', width: 128, height: 96, originY: 1 },
  beg02: { key: 'twinPigsBeg02Art', width: 128, height: 96, originY: 1 }
};

export default class TwinPig extends EnemyBase {
  constructor(scene, x, y) {
    const base = ENEMIES.twinPig;
    super(scene, x, y, 'twinPigsNormalArt', base, 'twinPig');
    this.isElite = true;
    this.setTarget(scene.player);
    this.setDepth(8);
    this.setOrigin(0.5, 1);
    this.disableHitScale = true;

    this.nextSprayAt = scene.time.now + SPRAY_INITIAL_DELAY_MS;
    this.nextDirtySplashAt = scene.time.now + DIRTY_SPLASH_INITIAL_DELAY_MS;
    this.sprayVisualUntil = -Infinity;
    this.actionVisualState = 'normal';
    this.nextBegFrameAt = scene.time.now + BEG_FRAME_MS;
    this.begFrame = 0;
    this.visualState = null;
    this.begBoss = null;

    this.applyVisualState('normal');
  }

  updateAI(time = 0) {
    if (!this.active || this.isDead) return;
    this.updateStatusCore(time);

    if (this.isStunned(time)) {
      this.setVelocity(0, 0);
      return;
    }

    const boss = this.getBegBoss();
    this.begBoss = boss;

    if (time >= this.nextSprayAt) {
      this.nextSprayAt = time + Phaser.Math.Between(
        SPRAY_COOLDOWN_MIN_MS,
        SPRAY_COOLDOWN_MAX_MS
      );
      this.sprayPoopBuff();
    }

    if (boss) {
      this.setVelocity(0, 0);
      this.setFlipX(boss.x < this.x);

      if (time < this.sprayVisualUntil) {
        this.applyVisualState(this.actionVisualState);
        return;
      }

      if (time >= this.nextBegFrameAt) {
        this.nextBegFrameAt = time + BEG_FRAME_MS;
        this.begFrame = 1 - this.begFrame;
      }
      this.applyVisualState(this.begFrame === 0 ? 'beg01' : 'beg02');
      return;
    }

    const player = this.scene.player;
    if (!player?.active) {
      this.setVelocity(0, 0);
      return;
    }

    this.setFlipX(player.x < this.x);
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (
      time >= this.nextDirtySplashAt
      && time >= this.sprayVisualUntil
      && distance <= DIRTY_SPLASH_RANGE
      && distance >= 62
    ) {
      this.nextDirtySplashAt = time + Phaser.Math.Between(
        DIRTY_SPLASH_COOLDOWN_MIN_MS,
        DIRTY_SPLASH_COOLDOWN_MAX_MS
      );
      this.sprayVisualUntil = time + 720;
      this.actionVisualState = 'dirty';
      this.setVelocity(0, 0);
      this.applyVisualState('dirty');
      this.scene.triggerTwinPigDirtySplash?.(this);
      return;
    }

    this.begFrame = 0;
    this.nextBegFrameAt = time + BEG_FRAME_MS;

    if (time < this.sprayVisualUntil) {
      this.setVelocity(0, 0);
      this.applyVisualState(this.actionVisualState);
      return;
    }

    this.actionVisualState = 'normal';
    this.applyVisualState('normal');

    const direction = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y);
    if (direction.lengthSq() <= 1) {
      this.setVelocity(0, 0);
      return;
    }
    direction.normalize();

    if (distance > SUPPORT_FAR_DISTANCE) {
      direction.scale(this.moveSpeed);
      this.setVelocity(direction.x, direction.y);
    } else if (distance < SUPPORT_NEAR_DISTANCE) {
      direction.scale(-this.moveSpeed * 0.68);
      this.setVelocity(direction.x, direction.y);
    } else {
      this.setVelocity(0, 0);
    }
  }

  getActiveBoss() {
    const queen = this.scene.duckQueen;
    if (queen?.active && !queen.isDead) return queen;

    const commander = this.scene.potatoCommander;
    if (commander?.active && !commander.isDead) return commander;

    return null;
  }

  getBegBoss() {
    const boss = this.getActiveBoss();
    if (!boss) return null;

    const view = this.scene.cameras.main.worldView;
    if (!view.contains(this.x, this.y) || !view.contains(boss.x, boss.y)) return null;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, boss.x, boss.y);
    return distance <= BEG_DISTANCE ? boss : null;
  }

  applyVisualState(state) {
    if (this.visualState === state || !this.active) return;
    const visual = VISUALS[state] ?? VISUALS.normal;
    this.visualState = state;

    this.setTexture(visual.key);
    this.setOrigin(0.5, visual.originY ?? 1);
    this.setDisplaySize(visual.width * ELITE_VISUAL_SCALE, visual.height * ELITE_VISUAL_SCALE);

    if (this.body) {
      const sx = Math.max(0.001, Math.abs(this.scaleX));
      const sy = Math.max(0.001, Math.abs(this.scaleY));
      this.body.setSize(56 / sx, 36 / sy, true);
    }
  }


  emitPoopInfectionParticles() {
    const count = 18;
    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const startRadius = Phaser.Math.FloatBetween(12, 34);
      const endRadius = Phaser.Math.FloatBetween(72, 132);
      const radius = Phaser.Math.FloatBetween(2.2, 4.4);
      const startX = this.x + Math.cos(angle) * startRadius;
      const startY = this.y - this.displayHeight * 0.42 + Math.sin(angle) * startRadius * 0.62;
      const particle = this.scene.add.circle(
        startX,
        startY,
        radius,
        Phaser.Math.RND.pick([0x7b431f, 0x95552a, 0xb06b35]),
        Phaser.Math.FloatBetween(0.68, 0.9)
      ).setDepth(13);

      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * endRadius,
        y: this.y - this.displayHeight * 0.42 + Math.sin(angle) * endRadius * 0.62,
        alpha: 0,
        scaleX: Phaser.Math.FloatBetween(0.35, 0.7),
        scaleY: Phaser.Math.FloatBetween(0.35, 0.7),
        duration: Phaser.Math.Between(420, 620),
        ease: 'Quad.Out',
        onComplete: () => particle.destroy()
      });
    }
  }

  sprayPoopBuff() {
    const now = this.scene.time.now;
    const radius = 225;
    const candidates = [];

    this.sprayVisualUntil = now + SPRAY_VISUAL_MS;
    this.actionVisualState = 'poop';
    if (this.scene.player?.active && !this.getBegBoss()) {
      this.setFlipX(this.scene.player.x < this.x);
    }
    this.applyVisualState('poop');
    this.emitPoopInfectionParticles();

    this.scene.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy === this || !enemy.canReceiveSupportStatus?.()) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (d <= radius) candidates.push(enemy);
    });

    Phaser.Utils.Array.Shuffle(candidates).slice(0, 8).forEach((enemy) => {
      enemy.applyStatus('poop_buff', { durationMs: 12500, source: this });
    });

    for (let i = 0; i < 2; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(18, 52);
      this.scene.createPoopZone?.(
        this.x + Math.cos(angle) * dist,
        this.y + Math.sin(angle) * dist * 0.42,
        { radius: 84, lifetimeMs: 5400, alpha: 0.74 }
      );
    }

    const ring = this.scene.add.circle(this.x, this.y, 20, 0x8b5a2b, 0.12).setDepth(3);
    this.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 520,
      onComplete: () => ring.destroy()
    });
    this.scene.showSkillImportantWorldText?.(
      this,
      '「💩 喷粪！」',
      '#c8945c',
      18,
      { priority: 90, yOffset: 72, replaceLowerPriority: true }
    );
  }
}
