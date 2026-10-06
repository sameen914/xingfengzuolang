import * as Phaser from 'phaser';
import EnemyBase from './EnemyBase.js?v=2.0.0';
import { ENEMIES } from '../config/gameConfig.js?v=2.0.0';

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
