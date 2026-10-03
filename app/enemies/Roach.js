import * as Phaser from 'phaser';
import EnemyBase from './EnemyBase.js';
import { ENEMIES } from '../config/gameConfig.js';

export default class Roach extends EnemyBase {
  constructor(scene, x, y) {
    const base = ENEMIES.roach;
    super(scene, x, y, 'roachArt', {
      ...base,
      speed: base.speed + Phaser.Math.Between(-12, 16)
    }, 'roach');

    this.setTarget(scene.player);
    this.setDepth(6);
    this.baseArtScale = 46 / 128;
    this.setScale(this.baseArtScale);
    this.body.setSize(74, 92, true);
    this.zigzagSeed = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.nextReproduceAt = scene.time.now + Phaser.Math.Between(
      base.reproductionMinMs,
      base.reproductionMaxMs
    );
    this.queenCandyLure = null;
    this.queenCandyLuredUntil = -Infinity;
    // 发糖联动的可视“嗑糖”尾段：到达糖点后 🍬 继续停留片刻，
    // 避免刚碰到糖就瞬间消失，看不出真正吃到糖。
    this.queenCandyEatingUntil = -Infinity;
  }

  updateAI(time = 0) {
    if (!this.active || this.isDead || !this.target?.active) return;
    this.updateStatusCore(time);

    if (this.isStunned(time)) {
      this.setVelocity(0, 0);
      return;
    }

    let combatTarget = this.target;
    let factionTarget = null;
    const candyLureActive = this.queenCandyLure && time < this.queenCandyLuredUntil;

    if (candyLureActive) {
      combatTarget = this.queenCandyLure;
    } else {
      this.queenCandyLure = null;
      this.queenCandyLuredUntil = -Infinity;
    }

    if (!candyLureActive && this.scene.potatoPityActive) {
      factionTarget = this.scene.findNearestFactionTarget?.(
        this,
        ['potato'],
        370,
        (enemy) => enemy.berserk === true
      );

      if (factionTarget?.active) {
        combatTarget = factionTarget;
      }
    }

    const direction = new Phaser.Math.Vector2(
      combatTarget.x - this.x,
      combatTarget.y - this.y
    );

    if (direction.lengthSq() > 1) {
      direction.normalize();
      const zigzagStrength = this.hasEffectiveStatus('sugar_high')
        ? 0.92
        : 0.65;
      const zigzag =
        Math.sin(time * 0.014 + this.zigzagSeed)
        * zigzagStrength;
      const side =
        new Phaser.Math.Vector2(-direction.y, direction.x)
          .scale(zigzag);

      const lureSpeedMultiplier = candyLureActive ? 2.15 : 1;
      direction
        .add(side)
        .normalize()
        .scale(this.moveSpeed * lureSpeedMultiplier);

      this.setVelocity(direction.x, direction.y);

      // 俯视紫蟑螂：身体始终朝目标，靠微小摆动制造快速爬行感。
      const targetAngle = Phaser.Math.Angle.Between(
        this.x, this.y, combatTarget.x, combatTarget.y
      ) + Math.PI / 2;
      const crawlWiggle = Math.sin(time * 0.026 + this.zigzagSeed) * 0.08;
      this.setRotation(targetAngle + crawlWiggle);
      this.setScale(
        this.baseArtScale * (1 + Math.abs(crawlWiggle) * 0.06),
        this.baseArtScale * (1 - Math.abs(crawlWiggle) * 0.04)
      );
    }

    if (
      candyLureActive
      && Phaser.Math.Distance.Between(this.x, this.y, combatTarget.x, combatTarget.y) <= 26
    ) {
      // 真正到达糖点后进入短暂“嗑糖”尾段。这里只延长视觉反馈，
      // 不额外改写既有女王鸭 Aura 的数值平衡。
      this.queenCandyEatingUntil = Math.max(
        this.queenCandyEatingUntil ?? -Infinity,
        time + (this.scene.statusEffects?.sugarHighDurationMs ?? 1400)
      );
      this.queenCandyLure = null;
      this.queenCandyLuredUntil = -Infinity;
    }

    if (
      factionTarget?.active
      && Phaser.Math.Distance.Between(
        this.x,
        this.y,
        factionTarget.x,
        factionTarget.y
      ) <= 29
    ) {
      this.scene.resolveFactionMelee?.(
        this,
        factionTarget,
        this.contactDamage,
        time
      );
    }

    const sugarHigh = this.hasEffectiveStatus('sugar_high');

    // 关键性能修复：
    // 进入「嗑糖」不会重置当前这一胎的倒计时，避免几十只蟑螂被同步到 2~3 秒后一起繁殖。
    // 只有在它真正完成一次繁殖后，才按当时是否「嗑糖」决定下一胎间隔。
    if (time >= this.nextReproduceAt) {
      const multiplier = sugarHigh
        ? this.scene.statusEffects.sugarHighReproductionIntervalMultiplier
        : 1;

      const minMs = Math.round(ENEMIES.roach.reproductionMinMs * multiplier);
      const maxMs = Math.round(ENEMIES.roach.reproductionMaxMs * multiplier);

      this.nextReproduceAt = time + Phaser.Math.Between(minMs, maxMs);
      this.scene.spawnSystem.tryReproduceRoach(this);
    }
  }
}
