import * as Phaser from 'phaser';
import EnemyBase from './EnemyBase.js?v=2.0.0';
import { ENEMIES } from '../config/gameConfig.js?v=2.0.0';

export default class Potato extends EnemyBase {
  constructor(scene, x, y) {
    const base = ENEMIES.potato;

    super(scene, x, y, 'potatoNormalArt', {
      ...base,
      speed: base.speed + Phaser.Math.Between(-6, 7)
    }, 'potato');

    this.setTarget(scene.player);
    this.setDepth(5);

    this.baseArtScale = 66 / 128;
    this.setScale(this.baseArtScale);

    this.body.setSize(94, 88, true);
    this.body.setOffset(17, 30);

    this.lastArtTexture = 'potatoNormalArt';
    this.motionSeed = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.spawnedAt = scene.time.now;
    this.hitsReceived = 0;
    this.nextPoisonApplyAt = 0;

    this.summonArrivalLockedUntil = -Infinity;
    this.blessingLockedUntil = -Infinity;
    this.cleanseFlightActive = false;
    this.commanderFollower = false;
    this.commanderFollowerOwner = null;
    this.commanderFollowerSlot = 0;
    this.commanderFollowerTotal = 1;

    this.guidedUntil = -Infinity;
    this.holyGrowthLevel = 0;

    this.pendingHolySelfDestructCycleId = null;
    this.holySelfDestructActive = false;
    this.holySelfDestructCycleId = null;
    this.holySelfDestructChaseAt = -Infinity;
    this.holySelfDestructExpireAt = -Infinity;
    this.holySelfDestructBlinkSeed = Phaser.Math.Between(0, 1);
    this.holySelfDestructExploded = false;

    this.isToxicPotato = false;
    this.isBlessedToxicPotato = false;
    this.toxicContactSpent = false;
    this.berserk = false;
    this.nextFactionAttackAt = 0;

    this.sproutIcon = null;
  }

  updateAI(time = 0) {
    if (!this.active || this.isDead) return;
    this.updateStatusCore(time);

    const artTexture = this.getGrowthTextureKey();

    if (artTexture !== this.lastArtTexture) {
      this.setTexture(artTexture);
      this.lastArtTexture = artTexture;
    }

    if (this.isStunned(time)) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.holySelfDestructActive) {
      this.updateHolySelfDestruct(time);
      return;
    }

    if (time < this.summonArrivalLockedUntil) {
      this.setVelocity(0, 0);
      return;
    }

    if (time < this.blessingLockedUntil) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.cleanseFlightActive) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.updateCommanderFollowerMovement(time)) {
      return;
    }

    const guided = time < this.guidedUntil;
    const pity = this.scene.potatoPityActive === true;

    this.berserk = pity;

    let target = this.scene.player;
    let factionTarget = null;

    if (pity && !this.isBlessedToxicPotato) {
      factionTarget = this.scene.findNearestFactionTarget?.(
        this,
        ['roach', 'duck'],
        330
      );

      if (factionTarget?.active) {
        target = factionTarget;
      }
    }

    if (!target?.active) return;

    const direction = new Phaser.Math.Vector2(
      target.x - this.x,
      target.y - this.y
    );

    const growthSpeedMultiplier = this.holyGrowthLevel >= 3
      ? (this.isBlessedToxicPotato ? 1.32 : 1.14)
      : this.holyGrowthLevel >= 2
        ? 1.38
        : this.holyGrowthLevel >= 1
          ? 0.92
          : 1;

    const guideMultiplier = guided ? 1.28 : 1;
    const berserkMultiplier = pity ? 1.18 : 1;
    const speed = (
      this.moveSpeed
      * growthSpeedMultiplier
      * guideMultiplier
      * berserkMultiplier
    );

    if (direction.lengthSq() > 1) {
      direction.normalize().scale(speed);
      this.setVelocity(direction.x, direction.y);

      const growthScale = this.getGrowthArtScale();
      const pulse = Math.sin(time * 0.0085 + this.motionSeed);
      const squash = Math.max(0, pulse) * 0.050;
      const base = this.baseArtScale * growthScale;

      this.setScale(
        base * (1 + squash),
        base * (1 - squash * 0.72)
      );
      this.setAngle(
        Math.sin(time * 0.0045 + this.motionSeed) * 1.9
      );
    } else {
      const growthScale = this.getGrowthArtScale();
      this.setScale(this.baseArtScale * growthScale);
      this.setAngle(0);
    }


    if (
      factionTarget?.active
      && Phaser.Math.Distance.Between(
        this.x,
        this.y,
        factionTarget.x,
        factionTarget.y
      ) <= 32
    ) {
      this.scene.resolveFactionMelee?.(
        this,
        factionTarget,
        this.contactDamage + (pity ? 2 : 0),
        time
      );
    }
  }

  beginHolySelfDestruct(cycleId = null, now = this.scene.time.now) {
    if (!this.active || this.isDead || this.holyGrowthLevel < 3) return false;

    const config = ENEMIES.potatoCommander;
    this.pendingHolySelfDestructCycleId = null;
    this.holySelfDestructActive = true;
    this.holySelfDestructCycleId = cycleId;
    this.holySelfDestructExploded = false;
    this.holySelfDestructChaseAt = now + (config.holySelfDestructArmMs ?? 340);
    this.holySelfDestructExpireAt = this.holySelfDestructChaseAt
      + (config.holySelfDestructMaxChaseMs ?? 5200);

    this.clearCommanderFollower();
    this.summonArrivalLockedUntil = -Infinity;
    this.blessingLockedUntil = -Infinity;
    this.cleanseFlightActive = false;
    this.guidedUntil = -Infinity;
    this.setVelocity(0, 0);
    return true;
  }

  updateHolySelfDestruct(time = this.scene.time.now) {
    if (!this.holySelfDestructActive || this.holySelfDestructExploded) return false;

    const config = ENEMIES.potatoCommander;
    const player = this.scene.player;
    if (!player?.active || player.hp <= 0) {
      this.setVelocity(0, 0);
      return true;
    }

    const blinkMs = Math.max(48, config.holySelfDestructBlinkMs ?? 92);
    const blinkOn = (Math.floor((time + this.holySelfDestructBlinkSeed * blinkMs) / blinkMs) % 2) === 0;
    if (blinkOn) {
      this.setTintFill(0xffffff);
    } else {
      this.clearTint();
    }
    this.setAlpha(1);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);
    const triggerRadius = config.holySelfDestructTriggerRadius ?? 52;

    if (distance <= triggerRadius) {
      this.scene.triggerCommanderPotatoSelfDestruct?.(this);
      return true;
    }

    if (time < this.holySelfDestructChaseAt) {
      this.setVelocity(0, 0);
      return true;
    }

    if (time >= this.holySelfDestructExpireAt) {
      this.scene.triggerCommanderPotatoSelfDestruct?.(this);
      return true;
    }

    const direction = new Phaser.Math.Vector2(dx, dy);
    if (direction.lengthSq() > 1) {
      const chaseDuration = Math.max(1, this.holySelfDestructExpireAt - this.holySelfDestructChaseAt);
      const chaseProgress = Phaser.Math.Clamp((time - this.holySelfDestructChaseAt) / chaseDuration, 0, 1);
      const speed = (config.holySelfDestructSpeed ?? 272) * Phaser.Math.Linear(0.92, 1.18, chaseProgress);
      direction.normalize().scale(speed);
      this.setVelocity(direction.x, direction.y);
      const base = this.baseArtScale * this.getGrowthArtScale();
      const squash = 0.055 + Math.max(0, Math.sin(time * 0.018 + this.motionSeed)) * 0.045;
      this.setScale(base * (1 + squash), base * (1 - squash * 0.62));
      this.setAngle(Phaser.Math.RadToDeg(Math.atan2(direction.y, direction.x)) * 0.035);
    }

    return true;
  }

  clearHolySelfDestructState({ restoreVisual = true } = {}) {
    this.pendingHolySelfDestructCycleId = null;
    this.holySelfDestructActive = false;
    this.holySelfDestructCycleId = null;
    this.holySelfDestructChaseAt = -Infinity;
    this.holySelfDestructExpireAt = -Infinity;
    if (restoreVisual && this.active && !this.isDead) {
      this.clearTint();
      this.setAlpha(1);
      this.setAngle(0);
      this.setScale(this.baseArtScale * this.getGrowthArtScale());
    }
  }

  lockForSummonArrival(untilTime) {
    this.summonArrivalLockedUntil = Math.max(
      this.summonArrivalLockedUntil,
      untilTime
    );
    this.setVelocity(0, 0);
  }

  releaseSummonArrival() {
    this.summonArrivalLockedUntil = -Infinity;
  }

  lockForBlessing(untilTime) {
    this.blessingLockedUntil = Math.max(this.blessingLockedUntil, untilTime);
    this.setVelocity(0, 0);
  }

  releaseBlessing() {
    this.blessingLockedUntil = -Infinity;
  }

  applyGuidance(durationMs, now = this.scene.time.now) {
    this.guidedUntil = Math.max(
      this.guidedUntil,
      now + durationMs
    );
  }

  applyHolyGrowth() {
    if (this.holyGrowthLevel >= 3) return this.holyGrowthLevel;

    this.holyGrowthLevel += 1;

    if (this.holyGrowthLevel === 1) {
      this.increaseMaxHpPreserveRatio(1.14);
      this.defense = 0.30;
      this.knockbackScale = 0.26;
    } else if (this.holyGrowthLevel === 2) {
      this.increaseMaxHpPreserveRatio(1.08);
      this.defense = 0.24;
      this.knockbackScale = 0.45;
      this.baseContactDamage += 1;
    } else {
      this.increaseMaxHpPreserveRatio(1.14);
      this.defense = 0.30;
      this.knockbackScale = 0.30;
      this.baseContactDamage += 2;
      this.isToxicPotato = true;
      this.isBlessedToxicPotato = true;
      this.toxicContactSpent = false;
      this.clearCommanderFollower();
    }

    this.refreshGrowthArt();

    return this.holyGrowthLevel;
  }

  setCommanderFollower(commander, slot = 0, total = 1) {
    if (!commander?.active || commander.isDead || this.isBlessedToxicPotato) {
      this.clearCommanderFollower();
      return false;
    }

    this.commanderFollower = true;
    this.commanderFollowerOwner = commander;
    this.commanderFollowerSlot = Math.max(0, Math.trunc(slot));
    this.commanderFollowerTotal = Math.max(1, Math.trunc(total));
    return true;
  }

  clearCommanderFollower() {
    this.commanderFollower = false;
    this.commanderFollowerOwner = null;
    this.commanderFollowerSlot = 0;
    this.commanderFollowerTotal = 1;
  }

  updateCommanderFollowerMovement(time = this.scene.time.now) {
    if (!this.commanderFollower) return false;

    const commander = this.commanderFollowerOwner;
    if (
      !commander?.active
      || commander.isDead
      || commander.phaseIndex < 3
      || this.isBlessedToxicPotato
    ) {
      this.clearCommanderFollower();
      return false;
    }

    const config = ENEMIES.potatoCommander;
    const total = Math.max(1, this.commanderFollowerTotal);
    const baseAngle = -Math.PI / 2 + Math.PI * 2 * this.commanderFollowerSlot / total;
    const orbit = time * (config.commanderFollowerOrbitSpeed ?? 0.00011);
    const angle = baseAngle + orbit;
    const targetX = commander.x + Math.cos(angle) * (config.commanderFollowerRadiusX ?? 168);
    const targetY = (
      commander.y
      + (config.commanderFollowerYOffset ?? 18)
      + Math.sin(angle) * (config.commanderFollowerRadiusY ?? 104)
    );

    const direction = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y);
    const distance = direction.length();

    if (distance <= 5) {
      this.setVelocity(0, 0);
    } else {
      const followerSpeed = Math.max(
        28,
        this.moveSpeed * (config.commanderFollowerMoveSpeedMultiplier ?? 0.72)
      );
      const speed = Math.min(followerSpeed, Math.max(24, distance * 2.8));
      direction.normalize().scale(speed);
      this.setVelocity(direction.x, direction.y);
    }

    const growthScale = this.getGrowthArtScale();
    const pulse = Math.sin(time * 0.007 + this.motionSeed);
    const squash = Math.max(0, pulse) * 0.032;
    const base = this.baseArtScale * growthScale;
    this.setScale(
      base * (1 + squash),
      base * (1 - squash * 0.60)
    );
    this.setAngle(Math.sin(time * 0.0038 + this.motionSeed) * 1.2);

    return true;
  }

  getGrowthTextureKey() {
    if (this.holyGrowthLevel >= 3) return 'potatoBlessedPoisonArt';
    if (this.holyGrowthLevel >= 2) return 'potatoBlessedSproutArt';
    if (this.holyGrowthLevel >= 1) return 'potatoBlessedBigArt';
    return 'potatoNormalArt';
  }

  refreshGrowthArt() {
    const textureKey = this.getGrowthTextureKey();
    if (!this.scene.textures.exists(textureKey)) return false;
    if (this.texture?.key !== textureKey) this.setTexture(textureKey);
    this.lastArtTexture = textureKey;
    return true;
  }

  increaseMaxHpPreserveRatio(multiplier) {
    const ratio = this.maxHp > 0
      ? Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1)
      : 1;

    this.maxHp = Math.max(
      1,
      Math.round(this.maxHp * multiplier)
    );
    this.hp = Math.max(
      1,
      Math.round(this.maxHp * ratio)
    );
  }

  getGrowthArtScale() {
    if (this.holyGrowthLevel >= 3) return 1.14;
    if (this.holyGrowthLevel >= 2) return 1.14;
    if (this.holyGrowthLevel >= 1) return 1.14;
    return 1;
  }

  receiveDamage(amount) {
    if (this.isDead) return false;

    const effectiveDamage = Math.max(
      1,
      Math.round(amount * (1 - this.defense))
    );

    this.hitsReceived += 1;
    this.hp -= effectiveDamage;

    this.scene.tweens.add({
      targets: this,
      alpha: 0.62,
      duration: 48,
      yoyo: true
    });

    if (this.hp <= 0) {
      this.isDead = true;
      return true;
    }

    return false;
  }

  destroy(fromScene) {
    if (this.sproutIcon?.active) this.sproutIcon.destroy();
    super.destroy(fromScene);
  }
}
