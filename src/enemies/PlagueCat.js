import Phaser from 'phaser';
import EnemyBase from './EnemyBase.js';
import { ENEMIES } from '../config/gameConfig.js';

const QUEEN_NOTICE_DISTANCE = 430;
const QUEEN_HEART_EYES_DISTANCE = 250;
const SUPPORT_NEAR_DISTANCE = 165;
const SUPPORT_FAR_DISTANCE = 275;
const XP_NOTICE_DISTANCE = 235;
const XP_STEAL_DISTANCE = 30;
const XP_SPRINT_SPEED = 105;
const SNEAK_GAS_RANGE = 285;
const ELITE_VISUAL_SCALE = 1.18;
const ELITE_COLLISION_SCALE = 1.10;

// 五张正式状态图统一显示尺寸，避免状态切换或受击时出现“突然变大”。
const VISUALS = {
  normal: { key: 'plagueCatNormalArt', width: 118, height: 118 },
  spray: { key: 'plagueCatSprayArt', width: 118, height: 118 },
  lovestruck1: { key: 'plagueCatLovestruck01Art', width: 118, height: 118 },
  lovestruck2: { key: 'plagueCatLovestruck02Art', width: 118, height: 118 },
  pounce: { key: 'plagueCatPounceArt', width: 118, height: 118 }
};

export default class PlagueCat extends EnemyBase {
  constructor(scene, x, y) {
    const base = ENEMIES.plagueCat;
    super(scene, x, y, 'plagueCatNormalArt', base, 'plagueCat');
    this.isElite = true;
    this.setTarget(scene.player);
    this.setDepth(8);
    this.setOrigin(0.5, 1);
    // 正式高分辨率 PNG 不使用 EnemyBase 的 squash/scale 受击动画，否则会瞬间巨大化。
    this.disableHitScale = true;

    this.nextInfectAt = scene.time.now + 1900;
    this.nextSneakGasAt = scene.time.now + 4300;
    this.xpStealLockedUntil = scene.time.now + 2200;
    this.castVisualUntil = -Infinity;
    this.visualState = null;
    this.applyVisualState('normal');
  }

  updateAI(time = 0) {
    if (!this.active || this.isDead) return;
    this.updateStatusCore(time);

    if (this.isStunned(time)) {
      this.setVelocity(0, 0);
      return;
    }

    const player = this.scene.player;
    const queen = this.getVisibleDuckQueen();
    if (queen) this.setFlipX(queen.x < this.x);
    else if (player?.active) this.setFlipX(player.x < this.x);

    if (time < this.castVisualUntil) {
      this.setVelocity(0, 0);
      return;
    }

    // 看见女王鸭时花痴状态拥有最高优先级：持续朝向女王，不抢经验、不放技能。
    const simpState = this.getQueenSimpVisualState();
    if (simpState) {
      this.setVelocity(0, 0);
      this.applyVisualState(simpState);
      return;
    }

    if (time >= this.nextInfectAt) {
      this.nextInfectAt = time + Phaser.Math.Between(5600, 7200);
      this.setVelocity(0, 0);
      this.releasePlague(time);
      return;
    }

    // 平时病恹恹慢走；一旦看到附近经验球，立刻加速小跑过去偷。
    if (time >= this.xpStealLockedUntil) {
      const gem = this.scene.findNearestXpGem?.(this.x, this.y, XP_NOTICE_DISTANCE);
      if (gem?.active) {
        const dx = gem.x - this.x;
        const dy = gem.y - this.y;
        const distance = Math.hypot(dx, dy);
        this.setFlipX(gem.x < this.x);
        this.applyVisualState('pounce');

        if (distance <= XP_STEAL_DISTANCE) {
          this.setVelocity(0, 0);
          if (this.scene.stealXpGem?.(this, gem)) {
            this.xpStealLockedUntil = time + Phaser.Math.Between(3300, 4600);
            this.castVisualUntil = time + 420;
          }
          return;
        }

        if (distance > 1) {
          this.setVelocity((dx / distance) * XP_SPRINT_SPEED, (dy / distance) * XP_SPRINT_SPEED);
        }
        return;
      }
    }

    if (!player?.active) {
      this.setVelocity(0, 0);
      this.applyVisualState('normal');
      return;
    }

    const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // 主动技能「散播谣言」：伤害很低，主要把感染源送到主角附近。
    if (
      time >= this.nextSneakGasAt
      && distanceToPlayer <= SNEAK_GAS_RANGE
      && distanceToPlayer >= 78
    ) {
      this.nextSneakGasAt = time + Phaser.Math.Between(8200, 10800);
      this.castVisualUntil = time + 760;
      this.setVelocity(0, 0);
      this.applyVisualState('spray');
      this.scene.triggerPlagueCatSneakGas?.(this);
      return;
    }

    this.applyVisualState('normal');

    // 瘟疫猫同样保持后排距离；基础速度只略高于双子猪。
    const direction = new Phaser.Math.Vector2(player.x - this.x, player.y - this.y);
    if (direction.lengthSq() <= 1) {
      this.setVelocity(0, 0);
      return;
    }
    direction.normalize();

    if (distanceToPlayer > SUPPORT_FAR_DISTANCE) {
      direction.scale(this.moveSpeed);
      this.setVelocity(direction.x, direction.y);
    } else if (distanceToPlayer < SUPPORT_NEAR_DISTANCE) {
      direction.scale(-this.moveSpeed * 0.72);
      this.setVelocity(direction.x, direction.y);
    } else {
      this.setVelocity(0, 0);
    }
  }

  getVisibleDuckQueen() {
    const queen = this.scene.duckQueen;
    if (!queen?.active || queen.isDead) return null;
    const view = this.scene.cameras.main.worldView;
    if (!view.contains(this.x, this.y) || !view.contains(queen.x, queen.y)) return null;
    return queen;
  }

  getQueenSimpVisualState() {
    const queen = this.getVisibleDuckQueen();
    if (!queen) return null;
    const d = Phaser.Math.Distance.Between(this.x, this.y, queen.x, queen.y);
    if (d > QUEEN_NOTICE_DISTANCE) return null;
    return d <= QUEEN_HEART_EYES_DISTANCE ? 'lovestruck2' : 'lovestruck1';
  }

  applyVisualState(state) {
    if (this.visualState === state || !this.active) return;
    const visual = VISUALS[state] ?? VISUALS.normal;
    this.visualState = state;
    if (this.scene.textures.exists(visual.key)) {
      this.setTexture(visual.key);
      this.setOrigin(0.5, 1);
      this.setDisplaySize(visual.width * ELITE_VISUAL_SCALE, visual.height * ELITE_VISUAL_SCALE);
      if (this.body) {
        const sx = Math.max(0.001, Math.abs(this.scaleX));
        const sy = Math.max(0.001, Math.abs(this.scaleY));
        this.body.setSize((54 * ELITE_COLLISION_SCALE) / sx, (40 * ELITE_COLLISION_SCALE) / sy, true);
      }
    }
  }

  releasePlague(time = this.scene.time.now) {
    const radius = 215;
    const candidates = [];

    this.castVisualUntil = time + 760;
    this.applyVisualState('spray');

    this.scene.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy === this || !enemy.canReceiveSupportStatus?.()) return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (d <= radius) candidates.push(enemy);
    });

    Phaser.Utils.Array.Shuffle(candidates).slice(0, 7).forEach((enemy) => {
      enemy.applyStatus('plague', { durationMs: 14500, source: this });
    });

    if (this.scene.textures.exists('plagueGroundGasArt')) {
      const pulse = this.scene.add.image(this.x, this.y + 4, 'plagueGroundGasArt')
        .setDepth(2)
        .setAlpha(0.84)
        .setDisplaySize(80, 52);
      this.scene.tweens.add({
        targets: pulse,
        alpha: 0,
        displayWidth: 210,
        displayHeight: 140,
        duration: 620,
        ease: 'Quad.Out',
        onComplete: () => pulse.destroy()
      });
    } else {
      const ring = this.scene.add.circle(this.x, this.y, 18, 0x5abf62, 0.15).setDepth(3);
      this.scene.tweens.add({
        targets: ring,
        radius,
        alpha: 0,
        duration: 600,
        onComplete: () => ring.destroy()
      });
    }

    this.scene.showSkillImportantWorldText?.(
      this,
      '「☣️ 瘟疫扩散！」',
      '#82db7a',
      18,
      { priority: 90, yOffset: 64, replaceLowerPriority: true }
    );
  }
}
