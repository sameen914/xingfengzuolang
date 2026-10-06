import * as Phaser from 'phaser';
import { PLAYER } from '../config/gameConfig.js?v=2.0.0';

export const PLAYER_VISUAL_ACTION_PRIORITY = Object.freeze({
  idle: 0,
  basicAttack: 10,
  beat: 20,
  dash: 30,
  mutualSupport: 50,
  keyUp: 60,
  hitControl: 80,
  ending: 100
});

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'playerArt');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(10);

    this.setDisplaySize(60, 60);
    this.body.setSize(76, 94, true);

    const difficulty = scene.difficultyProfile ?? {};
    this.difficultyIncomingDamageMultiplier = Number(difficulty.incomingDamageMultiplier) || 1;
    this.contactInvulnMs = Math.max(
      80,
      Math.round(PLAYER.CONTACT_INVULN_MS * (Number(difficulty.contactInvulnMultiplier) || 1))
    );
    this.maxHp = Math.max(
      1,
      Math.round(PLAYER.MAX_HP * (Number(difficulty.playerMaxHpMultiplier) || 1))
    );
    this.hp = this.maxHp;
    this.moveSpeed = PLAYER.SPEED;
    this.attackDamage = PLAYER.ATTACK_DAMAGE;
    this.crescentLevel = 1;
    this.fireRateLevel = 0;
    this.moveSpeedLevel = 0;
    this.noiseShieldLevel = 0;
    this.dashTrainingLevel = 0;
    this.lifestealLevel = 0;
    this.fireInterval = PLAYER.FIRE_INTERVAL_MS;
    this.damageReduction = 0;
    this.nextDamageAt = 0;
    this.stunnedUntil = -Infinity;
    this.xiafanRecoveryEvent = null;
    this.xiafanRestoreEvent = null;
    this.xiafanVisualDisplayWidth = null;
    this.xiafanVisualDisplayHeight = null;
    this.xiafanVisualDepth = null;
    this.xiafanVisualFlipX = null;
    this.xiafanSlideTween = null;
    this.xiafanFlashTween = null;

    this.poisonRemainingMs = 0;
    this.poisonTickAccumulatorMs = 0;
    this.poisonKind = null;

    this.soundWaveUnlocked = false;
    this.soundWaveLevel = 0;
    this.soundWaveDamage = 0;
    this.soundWaveRadius = PLAYER.SOUND_WAVE_RADIUS_BY_LEVEL?.[0] ?? PLAYER.SOUND_WAVE_RADIUS;
    this.soundWaveInterval = PLAYER.SOUND_WAVE_INTERVAL_MS_BY_LEVEL?.[0] ?? PLAYER.SOUND_WAVE_INTERVAL_MS;
    this.soundWaveKnockback = 0;
    this.nextSoundWaveAt = 0;

    this.electricUnlocked = false;
    this.electricLevel = 0;
    this.electricBurstDamage = PLAYER.ELECTRIC_BURST_DAMAGE;
    this.electricBurstRadius = PLAYER.ELECTRIC_BURST_RADIUS;
    this.electricStunMs = PLAYER.ELECTRIC_STUN_MS;
    this.electricShockDamage = PLAYER.ELECTRIC_SHOCK_DAMAGE;
    this.electricShockRadius = PLAYER.ELECTRIC_SHOCK_RADIUS;
    this.electricShockDelay = PLAYER.ELECTRIC_SHOCK_DELAY_MS;
    this.electricShockKnockback = PLAYER.ELECTRIC_SHOCK_KNOCKBACK;
    this.electricInterval = PLAYER.ELECTRIC_INTERVAL_MS;
    this.nextElectricAt = Infinity;

    this.stageSpinDamage = PLAYER.STAGE_SPIN_DAMAGE;
    this.stageSpinRadius = PLAYER.STAGE_SPIN_RADIUS;
    this.stageSpinKnockback = PLAYER.STAGE_SPIN_KNOCKBACK;

    this.injustice = 0;
    this.support = 0;

    this.dashSpeed = PLAYER.DASH_SPEED;
    this.dashDuration = PLAYER.DASH_DURATION_MS;
    this.dashCooldown = PLAYER.DASH_COOLDOWN_MS;
    this.perfectWindow = PLAYER.PERFECT_WINDOW_MS;
    this.nextDashAt = 0;
    this.dashStartedAt = -Infinity;
    this.dashEndsAt = -Infinity;
    this.isDashing = false;
    this.perfectTriggeredThisDash = false;
    this.lastMoveVector = new Phaser.Math.Vector2(-1, 0);
    this.facingDirectionX = -1;
    this.setFlipX(false);

    this.pullTarget = null;
    this.pullUntil = -Infinity;
    this.pullStrength = 0;

    this.slowUntil = -Infinity;
    this.slowMultiplier = 1;
    this.upgradeInvincible = false;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keys = scene.input.keyboard.addKeys('W,A,S,D,SPACE');

    this.visualActionName = 'idle';
    this.visualActionPriority = PLAYER_VISUAL_ACTION_PRIORITY.idle;
    this.visualActionUntil = -Infinity;
    this.visualActionToken = 0;
    this.visualActionRestoreEvent = null;
    this.visualActionTween = null;
    this.visualActionSnapshot = null;
    this.visualActionOwnedTextureKey = null;
    this.visualActionMeta = null;
  }

  getVisualActionPriority(name) {
    return PLAYER_VISUAL_ACTION_PRIORITY[name] ?? PLAYER_VISUAL_ACTION_PRIORITY.idle;
  }

  isVisualActionHardLocked(time = this.scene.time?.now ?? 0) {
    if (!this.active || this.hp <= 0) return true;
    if (this.scene.endingSequenceActive || this.scene.duckQueenVictoryEndingActive) return true;
    if (this.scene.duckQueenUltimateActive) return true;
    if (this.scene.commanderBlackwaterPreviewActive) return true;
    if (this.scene.duckQueenGrappleActive || this.scene.duckQueenFishNetActive) return true;
    if (time < this.stunnedUntil) return true;

    return [
      'playerXiafanStunArt',
      'playerXiafanRecoverArt',
      'playerJudgmentKnockdownArt',
      'playerFishNetCaughtArt',
      'playerFishNetPullArt',
      'playerDuckQueenDrainArt',
      'playerDafamaiReliefArt',
      'playerDafamaiNoticeArt',
      'playerDafamaiPanic1Art',
      'playerDafamaiPanic2Art',
      'playerDafamaiTrappedArt',
      'playerDafamaiImpaledArt',
      'playerDafamaiHangingArt'
    ].includes(this.texture?.key);
  }

  captureVisualActionSnapshot() {
    return {
      textureKey: this.texture?.key ?? 'playerArt',
      displayWidth: Math.abs(Number(this.displayWidth) || 60),
      displayHeight: Math.abs(Number(this.displayHeight) || 60),
      originX: this.originX,
      originY: this.originY,
      angle: Number(this.angle) || 0,
      scaleX: Number(this.scaleX) || 1,
      scaleY: Number(this.scaleY) || 1,
      flipX: Boolean(this.flipX),
      flipY: Boolean(this.flipY)
    };
  }

  restoreVisualActionSnapshot(snapshot = this.visualActionSnapshot, { force = false } = {}) {
    if (!snapshot || !this.active) return false;
    if (!force && this.isVisualActionHardLocked()) return false;

    if (
      this.visualActionOwnedTextureKey
      && this.texture?.key === this.visualActionOwnedTextureKey
      && this.scene.textures.exists(snapshot.textureKey)
    ) {
      this.setTexture(snapshot.textureKey);
      this.setDisplaySize(snapshot.displayWidth, snapshot.displayHeight);
      this.setOrigin(snapshot.originX, snapshot.originY);
      this.setFlipX(snapshot.flipX);
      this.setFlipY(snapshot.flipY);
    }

    this.setScale(snapshot.scaleX, snapshot.scaleY);
    this.setAngle(snapshot.angle);
    return true;
  }

  finishVisualAction(token = this.visualActionToken, { forceRestore = false } = {}) {
    if (token !== this.visualActionToken) return false;

    this.visualActionRestoreEvent?.remove?.(false);
    this.visualActionRestoreEvent = null;
    this.visualActionTween?.stop?.();
    this.visualActionTween = null;

    const snapshot = this.visualActionSnapshot;
    const shouldRestore = forceRestore || !this.isVisualActionHardLocked();
    if (shouldRestore) this.restoreVisualActionSnapshot(snapshot, { force: forceRestore });

    this.visualActionName = 'idle';
    this.visualActionPriority = PLAYER_VISUAL_ACTION_PRIORITY.idle;
    this.visualActionUntil = -Infinity;
    this.visualActionSnapshot = null;
    this.visualActionOwnedTextureKey = null;
    this.visualActionMeta = null;
    return true;
  }

  cancelVisualAction({ restore = true, forceRestore = false } = {}) {
    if (this.visualActionName === 'idle') return false;
    if (restore) {
      return this.finishVisualAction(this.visualActionToken, { forceRestore });
    }

    this.visualActionRestoreEvent?.remove?.(false);
    this.visualActionRestoreEvent = null;
    this.visualActionTween?.stop?.();
    this.visualActionTween = null;
    this.visualActionToken += 1;
    this.visualActionName = 'idle';
    this.visualActionPriority = PLAYER_VISUAL_ACTION_PRIORITY.idle;
    this.visualActionUntil = -Infinity;
    this.visualActionSnapshot = null;
    this.visualActionOwnedTextureKey = null;
    this.visualActionMeta = null;
    return true;
  }

  requestVisualAction(name, options = {}) {
    const now = options.now ?? this.scene.time?.now ?? 0;
    const priority = options.priority ?? this.getVisualActionPriority(name);
    const durationMs = Math.max(1, Number(options.durationMs) || 1);

    if (priority < PLAYER_VISUAL_ACTION_PRIORITY.hitControl && this.isVisualActionHardLocked(now)) {
      return false;
    }

    if (
      this.visualActionName !== 'idle'
      && now < this.visualActionUntil
      && this.visualActionPriority > priority
    ) {
      return false;
    }

    if (this.visualActionName !== 'idle') {
      this.cancelVisualAction({ restore: true, forceRestore: true });
    }

    const token = this.visualActionToken + 1;
    this.visualActionToken = token;
    this.visualActionName = name;
    this.visualActionPriority = priority;
    this.visualActionUntil = now + durationMs;
    this.visualActionSnapshot = this.captureVisualActionSnapshot();
    this.visualActionOwnedTextureKey = null;
    this.visualActionMeta = options.meta ?? null;

    if (options.textureKey && this.scene.textures.exists(options.textureKey)) {
      this.visualActionOwnedTextureKey = options.textureKey;
      this.setTexture(options.textureKey);
      this.setDisplaySize(
        this.visualActionSnapshot.displayWidth,
        this.visualActionSnapshot.displayHeight
      );
    }

    const hasAnglePulse = Number.isFinite(options.angleOffset) && Math.abs(options.angleOffset) > 0.001;
    const hasScalePulse = (
      Number.isFinite(options.scaleXMultiplier)
      || Number.isFinite(options.scaleYMultiplier)
    );

    if (hasAnglePulse || hasScalePulse) {
      const baseAngle = this.visualActionSnapshot.angle;
      const baseScaleX = this.visualActionSnapshot.scaleX;
      const baseScaleY = this.visualActionSnapshot.scaleY;
      const tweenConfig = {
        targets: this,
        duration: Math.max(28, Math.round(durationMs * 0.42)),
        yoyo: true,
        ease: options.ease ?? 'Quad.Out',
        onComplete: () => {
          if (token !== this.visualActionToken) return;
          this.visualActionTween = null;
        }
      };
      if (hasAnglePulse) tweenConfig.angle = baseAngle + options.angleOffset;
      if (Number.isFinite(options.scaleXMultiplier)) {
        tweenConfig.scaleX = baseScaleX * options.scaleXMultiplier;
      }
      if (Number.isFinite(options.scaleYMultiplier)) {
        tweenConfig.scaleY = baseScaleY * options.scaleYMultiplier;
      }
      this.visualActionTween = this.scene.tweens.add(tweenConfig);
    }

    options.onStart?.(this, { name, priority, durationMs, token, now });
    this.scene.events?.emit?.('player-visual-action-start', {
      player: this,
      name,
      priority,
      durationMs,
      token,
      meta: this.visualActionMeta
    });

    this.visualActionRestoreEvent = this.scene.time.delayedCall(durationMs, () => {
      if (token !== this.visualActionToken) return;
      options.onEnd?.(this, { name, priority, durationMs, token });
      this.scene.events?.emit?.('player-visual-action-end', {
        player: this,
        name,
        priority,
        token
      });
      this.finishVisualAction(token);
    });

    return true;
  }

  updateVisualAction(time = this.scene.time?.now ?? 0) {
    if (this.visualActionName === 'idle') return;

    if (
      this.visualActionPriority < PLAYER_VISUAL_ACTION_PRIORITY.hitControl
      && this.isVisualActionHardLocked(time)
    ) {
      this.cancelVisualAction({ restore: false });
      return;
    }

    if (time >= this.visualActionUntil + 20) {
      this.finishVisualAction(this.visualActionToken);
    }
  }

  playBasicAttackVisual(angle, now = this.scene.time?.now ?? 0, { charged = false } = {}) {
    if (this.visualActionName === 'basicAttack' && now < this.visualActionUntil) return false;

    const attackAngle = Number(angle) || 0;
    const facingSign = this.facingDirectionX >= 0 ? 1 : -1;
    const durationMs = charged ? 102 : 84;
    return this.requestVisualAction('basicAttack', {
      now,
      durationMs,
      priority: PLAYER_VISUAL_ACTION_PRIORITY.basicAttack,
      angleOffset: facingSign * (charged ? 3.0 : 2.1),
      scaleXMultiplier: charged ? 1.055 : 1.035,
      scaleYMultiplier: charged ? 0.955 : 0.972,
      ease: 'Cubic.Out',
      meta: { attackAngle, charged, proceduralAttackPulse: true }
    });
  }

  playBeatActionVisual(now = this.scene.time?.now ?? 0, { strong = false } = {}) {
    const moveX = Number(this.lastMoveVector?.x) || 0;
    const leanSign = Math.abs(moveX) >= 0.12 ? Math.sign(moveX) : 0;
    const durationMs = strong ? 220 : 195;

    return this.requestVisualAction('beat', {
      now,
      durationMs,
      priority: PLAYER_VISUAL_ACTION_PRIORITY.beat,
      angleOffset: leanSign * (strong ? 2.8 : 1.8),
      scaleXMultiplier: strong ? 1.12 : 1.085,
      scaleYMultiplier: strong ? 0.79 : 0.84,
      ease: 'Cubic.Out',
      meta: { strong }
    });
  }

  playDashVisual(
    now = this.scene.time?.now ?? 0,
    { direction = this.lastMoveVector, beatSynced = false, strong = false } = {}
  ) {
    const dx = Number(direction?.x) || 0;
    const dy = Number(direction?.y) || 0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const horizontalWeight = Math.abs(nx);
    const verticalWeight = Math.abs(ny);
    const beatBoost = beatSynced ? (strong ? 1.0 : 0.55) : 0;
    const durationMs = Math.max(150, Number(this.dashDuration) || 175);

    return this.requestVisualAction('dash', {
      now,
      durationMs,
      priority: PLAYER_VISUAL_ACTION_PRIORITY.dash,
      angleOffset: nx * (7.2 + beatBoost * 2.2),
      scaleXMultiplier: 1 + horizontalWeight * (0.10 + beatBoost * 0.022) - verticalWeight * 0.035,
      scaleYMultiplier: 1 - horizontalWeight * (0.085 + beatBoost * 0.018) + verticalWeight * 0.085,
      ease: 'Cubic.Out',
      meta: {
        directionX: nx,
        directionY: ny,
        beatSynced,
        strong
      },
      onStart: () => {
        this.scene.spawnDashTrailBurst?.(this, new Phaser.Math.Vector2(nx, ny), {
          beatSynced,
          strong
        });
      }
    });
  }

  playMutualSupportVisual(now = this.scene.time?.now ?? 0) {
    return this.requestVisualAction('mutualSupport', {
      now,
      durationMs: 1200,
      priority: PLAYER_VISUAL_ACTION_PRIORITY.mutualSupport,
      meta: { supportResponse: true, dedicatedHealPose: true },
      onStart: () => {
        this.scene.spawnMutualSupportConvergeVfx?.();
      }
    });
  }

  enterMutualSupportHealPose() {
    if (!this.active || this.hp <= 0) return false;
    if (this.visualActionName !== 'mutualSupport') return false;
    if (!this.visualActionSnapshot) return false;

    const key = 'playerMutualSupportHealArt';
    if (!this.scene.textures.exists(key)) return false;

    this.visualActionOwnedTextureKey = key;
    this.setTexture(key);
    this.setDisplaySize(
      this.visualActionSnapshot.displayWidth,
      this.visualActionSnapshot.displayHeight
    );
    this.setOrigin(
      this.visualActionSnapshot.originX,
      this.visualActionSnapshot.originY
    );
    this.setFlipX(this.visualActionSnapshot.flipX);
    this.setFlipY(this.visualActionSnapshot.flipY);
    this.setAngle(this.visualActionSnapshot.angle);
    return true;
  }

  playKeyUpVisual(now = this.scene.time?.now ?? 0) {
    return this.requestVisualAction('keyUp', {
      now,
      durationMs: 1050,
      priority: PLAYER_VISUAL_ACTION_PRIORITY.keyUp,
      textureKey: 'playerKeyUpBurstArt',
      meta: { overdrive: true, blueFlameBurst: true },
      onStart: () => {
        this.scene.startPlayerAuraOverdrive?.(1120);
        this.scene.spawnKeyUpChargeVfx?.();
      }
    });
  }

  updateFacingFromDirection(direction) {
    if (!direction || this.isVisualActionHardLocked?.(this.scene.time?.now ?? 0)) return false;
    const dx = Number(direction.x) || 0;
    if (Math.abs(dx) < 0.12) return false;

    const nextFacing = dx > 0 ? 1 : -1;
    this.facingDirectionX = nextFacing;
    this.setFlipX(nextFacing > 0);
    return true;
  }

  getInputVector() {
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;

    const mobile = this.scene.mobileMoveVector;
    if (mobile && mobile.lengthSq() > 0.001) {
      dx += mobile.x;
      dy += mobile.y;
    }

    if ((this.scene.duckQueenCharmUntil ?? -Infinity) > (this.scene.time?.now ?? 0)) {
      dx *= -1;
      dy *= -1;
    }

    return new Phaser.Math.Vector2(dx, dy);
  }

  updateMovement(time) {
    if (time < this.stunnedUntil) {
      this.isDashing = false;
      this.setVelocity(0, 0);
      return;
    }

    if (this.scene.duckQueenGrappleActive) {
      this.isDashing = false;
      this.setVelocity(0, 0);
      return;
    }

    if (this.scene.duckQueenFishNetActive) {
      this.isDashing = false;
      const queen = this.scene.duckQueen;
      const pullStartsAt = this.scene.duckQueenFishNetPullStartsAt ?? Infinity;
      if (!queen?.active || time < pullStartsAt) {
        this.setVelocity(0, 0);
        return;
      }

      const direction = this.getInputVector();
      const move = new Phaser.Math.Vector2(0, 0);
      if (direction.lengthSq() > 0) {
        direction.normalize();
        this.lastMoveVector.copy(direction);
        this.updateFacingFromDirection(direction);
        move.copy(direction).scale(this.moveSpeed * 0.22);
      }

      const pull = new Phaser.Math.Vector2(queen.x - this.x, queen.y - this.y);
      if (pull.lengthSq() > 1) {
        const speed = this.scene.statusEffects?.fishNetPullSpeed ?? 220;
        pull.normalize().scale(speed);
        move.add(pull);
      }

      this.setVelocity(move.x, move.y);
      return;
    }

    if (this.isDashing) {
      if (time >= this.dashEndsAt) {
        this.isDashing = false;
      } else {
        return;
      }
    }

    const direction = this.getInputVector();
    let vx = 0;
    let vy = 0;

    if (direction.lengthSq() > 0) {
      direction.normalize();
      this.lastMoveVector.copy(direction);
      this.updateFacingFromDirection(direction);
      const speedMultiplier = time < this.slowUntil ? this.slowMultiplier : 1;
      vx = direction.x * this.moveSpeed * speedMultiplier;
      vy = direction.y * this.moveSpeed * speedMultiplier;
    }

    if (this.pullTarget?.active && time < this.pullUntil) {
      const pull = new Phaser.Math.Vector2(
        this.pullTarget.x - this.x,
        this.pullTarget.y - this.y
      );
      if (pull.lengthSq() > 1) {
        pull.normalize().scale(this.pullStrength);
        vx += pull.x;
        vy += pull.y;
      }
    } else {
      this.pullTarget = null;
      this.pullUntil = -Infinity;
      this.pullStrength = 0;
    }

    this.setVelocity(vx, vy);
  }

  applyPull(target, durationMs, strength, now = this.scene.time.now) {
    this.pullTarget = target;
    this.pullUntil = now + durationMs;
    this.pullStrength = strength;
  }

  applySlow(multiplier, durationMs, now = this.scene.time.now) {
    this.slowMultiplier = Math.min(this.slowMultiplier, multiplier);
    this.slowUntil = Math.max(this.slowUntil, now + durationMs);

    this.scene.time.delayedCall(durationMs + 40, () => {
      if (this.scene.time.now >= this.slowUntil) {
        this.slowMultiplier = 1;
      }
    });
  }

  tryDash(time) {
    if (this.scene.waitingForGameStart) return false;
    if (this.isControlLocked(time)) return false;
    if (this.isDashing || time < this.nextDashAt) return false;

    let direction = this.getInputVector();
    if (direction.lengthSq() === 0) {
      direction = this.lastMoveVector.clone();
    } else {
      direction.normalize();
      this.lastMoveVector.copy(direction);
    }

    this.updateFacingFromDirection(direction);
    direction.normalize().scale(this.dashSpeed);

    this.isDashing = true;
    this.perfectTriggeredThisDash = false;
    this.dashStartedAt = time;
    this.dashEndsAt = time + this.dashDuration;
    this.nextDashAt = time + this.dashCooldown;
    this.setVelocity(direction.x, direction.y);

    this.scene.spawnAfterImage(this);
    this.scene.onPlayerDashStarted?.(time);
    return true;
  }

  isInPerfectWindow(time) {
    return this.isDashing && (time - this.dashStartedAt) <= this.perfectWindow;
  }

  canPerfectDodge(time) {
    return this.isInPerfectWindow(time) && !this.perfectTriggeredThisDash;
  }

  markPerfectDodge() {
    this.perfectTriggeredThisDash = true;
  }

  flashDamageAlpha(targetAlpha = 0.35, duration = 55, repeat = 2) {
    if (!this.active) return;
    if (this.damageAlphaTween?.isPlaying?.()) this.damageAlphaTween.stop();
    this.damageAlphaTween = null;
    this.setAlpha(1);

    this.damageAlphaTween = this.scene.tweens.add({
      targets: this,
      alpha: targetAlpha,
      duration,
      yoyo: true,
      repeat,
      onComplete: () => {
        this.damageAlphaTween = null;
        if (this.active && this.hp > 0) this.setAlpha(1);
      },
      onStop: () => {
        this.damageAlphaTween = null;
        if (this.active && this.hp > 0) this.setAlpha(1);
      }
    });
  }

  takeDamage(rawDamage, now) {
    if (this.upgradeInvincible) return 0;
    if (this.isDashing) return 0;
    if (now < this.nextDamageAt) return 0;

    const totalReduction = Phaser.Math.Clamp(
      this.damageReduction + (this.scene.getSupportDamageReduction?.() ?? 0),
      0,
      0.78
    );
    const scaledRawDamage = rawDamage * this.difficultyIncomingDamageMultiplier;
    const damage = Math.max(1, Math.round(scaledRawDamage * (1 - totalReduction)));
    const actualDamage = Math.min(this.hp, damage);
    {
      this.hp = Math.max(0, this.hp - actualDamage);
    }
    this.nextDamageAt = now + this.contactInvulnMs;
    this.scene.addInjustice?.(Phaser.Math.Between(3, 4));

    this.flashDamageAlpha(0.35, 55, 2);

    return actualDamage;
  }

  rollReducedDamageFromRange(minDamage, maxDamage) {
    const minValue = Math.max(1, Math.round(Math.min(minDamage, maxDamage)));
    const maxValue = Math.max(minValue, Math.round(Math.max(minDamage, maxDamage)));
    const reduction = Phaser.Math.Clamp(
      this.damageReduction + (this.scene.getSupportDamageReduction?.() ?? 0),
      0,
      0.78
    );

    if (minValue === maxValue) return minValue;

    const values = [];
    for (let value = minValue; value <= maxValue; value += 1) values.push(value);
    const baseWeight = 1 / values.length;
    const weights = values.map((_, index) => (
      index === 0 ? baseWeight : baseWeight * (1 - reduction)
    ));
    const removedWeight = baseWeight * reduction * (values.length - 1);
    weights[0] += removedWeight;

    let roll = Math.random();
    for (let i = 0; i < values.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return values[i];
    }
    return values[0];
  }

  takeDamageRange(minDamage, maxDamage, now) {
    if (this.upgradeInvincible) return 0;
    if (this.isDashing) return 0;
    if (now < this.nextDamageAt) return 0;

    const rolledDamage = this.rollReducedDamageFromRange(minDamage, maxDamage);
    const damage = Math.max(1, Math.round(rolledDamage * this.difficultyIncomingDamageMultiplier));
    const actualDamage = Math.min(this.hp, damage);
    {
      this.hp = Math.max(0, this.hp - actualDamage);
    }
    this.nextDamageAt = now + this.contactInvulnMs;
    this.scene.addInjustice?.(Phaser.Math.Between(3, 4));

    this.flashDamageAlpha(0.35, 55, 2);

    return actualDamage;
  }

  takeDrainDamage(rawDamage) {
    if (this.upgradeInvincible) return 0;
    if (this.isDashing) return 0;

    const totalReduction = Phaser.Math.Clamp(
      this.damageReduction + (this.scene.getSupportDamageReduction?.() ?? 0),
      0,
      0.78
    );
    const scaledRawDamage = rawDamage * this.difficultyIncomingDamageMultiplier;
    const damage = Math.max(1, Math.round(scaledRawDamage * (1 - totalReduction)));
    const actualDamage = Math.min(this.hp, damage);
    {
      this.hp = Math.max(0, this.hp - actualDamage);
    }
    this.scene.addInjustice?.(Phaser.Math.Between(3, 4));

    this.flashDamageAlpha(0.55, 70, 1);

    return actualDamage;
  }

  takeUnavoidableFlatDamage(rawDamage = 10) {
    if (this.upgradeInvincible) return 0;
    if (this.hp <= 0) return 0;

    const damage = Math.max(1, Math.round(rawDamage));
    const actualDamage = Math.min(this.hp, damage);
    {
      this.hp = Math.max(0, this.hp - actualDamage);
    }
    this.isDashing = false;
    this.setVelocity(0, 0);
    this.nextDamageAt = Math.max(
      this.nextDamageAt,
      this.scene.time.now + Math.round(this.contactInvulnMs * 0.35)
    );
    this.scene.addInjustice?.(Phaser.Math.Between(3, 4));

    this.flashDamageAlpha(0.32, 44, 2);

    return actualDamage;
  }

  takeUnavoidableCurrentHpRatioDamage(ratio = 0.60) {
    if (this.upgradeInvincible) return 0;
    if (this.hp <= 0) return 0;

    const baseHp = this.hp;
    const damage = Math.max(
      1,
      Math.round(baseHp * Phaser.Math.Clamp(ratio, 0, 1))
    );
    const actualDamage = Math.min(this.hp, damage);

    {
      this.hp = Math.max(0, this.hp - actualDamage);
    }
    this.isDashing = false;
    this.setVelocity(0, 0);
    this.nextDamageAt = Math.max(
      this.nextDamageAt,
      this.scene.time.now + this.contactInvulnMs
    );
    this.scene.addInjustice?.(Phaser.Math.Between(3, 4));

    this.flashDamageAlpha(0.22, 48, 3);

    return actualDamage;
  }

  takeUnavoidableMaxHpRatioDamage(ratio = 0.60) {
    if (this.upgradeInvincible) return 0;
    if (this.hp <= 0) return 0;

    const damage = Math.max(
      1,
      Math.round(this.maxHp * Phaser.Math.Clamp(ratio, 0, 1))
    );
    const actualDamage = Math.min(this.hp, damage);
    {
      this.hp = Math.max(0, this.hp - actualDamage);
    }
    this.isDashing = false;
    this.setVelocity(0, 0);
    this.nextDamageAt = Math.max(
      this.nextDamageAt,
      this.scene.time.now + this.contactInvulnMs
    );
    this.scene.addInjustice?.(Phaser.Math.Between(3, 4));
    this.flashDamageAlpha(0.22, 48, 3);
    return actualDamage;
  }


  addSupport(amount) {
    this.support = Phaser.Math.Clamp(
      this.support + amount,
      0,
      PLAYER.SUPPORT_MAX
    );
  }

  addInjustice(amount) {
    this.injustice = Phaser.Math.Clamp(
      this.injustice + amount,
      0,
      PLAYER.KEY_UP_MAX
    );
  }

  applyStun(durationMs, now = this.scene.time.now) {
    this.stunnedUntil = Math.max(
      this.stunnedUntil,
      now + durationMs
    );
    this.isDashing = false;
    this.setVelocity(0, 0);
  }

  isControlLocked(time = this.scene.time.now) {
    return time < this.stunnedUntil;
  }

  applyPlayerVisualTexture(textureKey) {
    if (!this.scene.textures.exists(textureKey)) return false;

    this.cancelVisualAction({ restore: true, forceRestore: true });

    const targetWidth = Number.isFinite(this.xiafanVisualDisplayWidth)
      ? this.xiafanVisualDisplayWidth
      : Math.abs(Number(this.displayWidth) || 60);
    const targetHeight = Number.isFinite(this.xiafanVisualDisplayHeight)
      ? this.xiafanVisualDisplayHeight
      : Math.abs(Number(this.displayHeight) || 60);

    this.setTexture(textureKey);
    this.setDisplaySize(targetWidth, targetHeight);

    if (this.body) {
      const sx = Math.max(0.001, Math.abs(this.scaleX));
      const sy = Math.max(0.001, Math.abs(this.scaleY));
      this.body.setSize(35.625 / sx, 44.0625 / sy, true);
    }

    return true;
  }

  lockXiafanVisualDisplaySize() {
    this.xiafanVisualDisplayWidth = Math.abs(Number(this.displayWidth) || 60);
    this.xiafanVisualDisplayHeight = Math.abs(Number(this.displayHeight) || 60);
  }

  restoreXiafanVisualDisplaySize() {
    if (!Number.isFinite(this.xiafanVisualDisplayWidth)) return false;
    if (!Number.isFinite(this.xiafanVisualDisplayHeight)) return false;

    this.setDisplaySize(
      this.xiafanVisualDisplayWidth,
      this.xiafanVisualDisplayHeight
    );
    return true;
  }

  clearXiafanVisualDisplaySizeLock() {
    this.xiafanVisualDisplayWidth = null;
    this.xiafanVisualDisplayHeight = null;
  }

  lockXiafanVisualDepth() {
    if (!Number.isFinite(this.xiafanVisualDepth)) {
      this.xiafanVisualDepth = Number(this.depth) || 10;
    }
    this.setDepth(Math.max(this.xiafanVisualDepth + 1, 14));
  }

  restoreXiafanVisualDepth() {
    if (!Number.isFinite(this.xiafanVisualDepth)) return false;
    this.setDepth(this.xiafanVisualDepth);
    this.xiafanVisualDepth = null;
    return true;
  }

  lockXiafanVisualFlip() {
    if (typeof this.xiafanVisualFlipX !== 'boolean') {
      this.xiafanVisualFlipX = this.flipX === true;
    }
  }

  faceXiafanGuardTowardBoss(directionX = 0) {
    if (!Number.isFinite(directionX) || Math.abs(directionX) < 0.01) return;

    this.setFlipX(directionX < 0);
  }

  restoreXiafanVisualFlip() {
    if (typeof this.xiafanVisualFlipX !== 'boolean') return false;
    this.setFlipX(this.xiafanVisualFlipX);
    this.xiafanVisualFlipX = null;
    return true;
  }

  syncArcadeBodyToSprite() {
    if (!this.body) return;
    if (typeof this.body.updateFromGameObject === 'function') {
      this.body.updateFromGameObject();
    } else if (typeof this.body.reset === 'function') {
      this.body.reset(this.x, this.y);
    }
    this.setVelocity(0, 0);
  }

  stopSkySmashReactionTweens() {
    this.xiafanSlideTween?.stop();
    this.xiafanFlashTween?.stop();
    this.xiafanSlideTween = null;
    this.xiafanFlashTween = null;
    this.clearTint();
  }

  playSkySmashHitReaction({ slideDirection = null, slideDistance = 0, slideDurationMs = 0, flashDurationMs = 0 } = {}) {
    this.stopSkySmashReactionTweens();

    const direction = slideDirection instanceof Phaser.Math.Vector2
      ? slideDirection.clone()
      : new Phaser.Math.Vector2(slideDirection?.x ?? 0, slideDirection?.y ?? 0);

    if (direction.lengthSq() > 0.001 && slideDistance > 0 && slideDurationMs > 0) {
      direction.normalize().scale(slideDistance);

      const worldBounds = this.scene.physics?.world?.bounds;
      const halfWidth = Math.max(1, Math.abs(Number(this.displayWidth) || 60) * 0.5);
      const halfHeight = Math.max(1, Math.abs(Number(this.displayHeight) || 60) * 0.5);
      let targetX = this.x + direction.x;
      let targetY = this.y + direction.y;

      if (worldBounds) {
        targetX = Phaser.Math.Clamp(
          targetX,
          worldBounds.left + halfWidth,
          worldBounds.right - halfWidth
        );
        targetY = Phaser.Math.Clamp(
          targetY,
          worldBounds.top + halfHeight,
          worldBounds.bottom - halfHeight
        );
      }

      this.xiafanSlideTween = this.scene.tweens.add({
        targets: this,
        x: targetX,
        y: targetY,
        duration: slideDurationMs,
        ease: 'Quad.Out',
        onUpdate: () => this.syncArcadeBodyToSprite(),
        onComplete: () => {
          this.syncArcadeBodyToSprite();
          this.xiafanSlideTween = null;
        }
      });
    }

    if (flashDurationMs > 0) {
      const segments = 6;
      this.xiafanFlashTween = this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: flashDurationMs,
        ease: 'Linear',
        onUpdate: (tween) => {
          const value = tween.getValue();
          const segment = Math.floor(value * segments);
          if (segment % 2 === 0) {
            this.setTintFill(0xffffff);
          } else {
            this.clearTint();
          }
        },
        onComplete: () => {
          this.clearTint();
          this.xiafanFlashTween = null;
        }
      });
    }
  }


  playJudgmentKnockdownVisual(knockdownFrameMs, flickerFrameMs, reaction = {}, now = this.scene.time.now) {
    const holdMs = Math.max(0, knockdownFrameMs);
    const flickerMs = Math.max(0, flickerFrameMs);
    const totalMs = holdMs + flickerMs;

    this.applyStun(totalMs, now);

    this.xiafanRecoveryEvent?.remove(false);
    this.xiafanRestoreEvent?.remove(false);
    this.xiafanJudgmentFlickerEvent?.remove(false);
    this.xiafanJudgmentRestoreEvent?.remove(false);
    this.xiafanRecoveryEvent = null;
    this.xiafanRestoreEvent = null;
    this.xiafanJudgmentFlickerEvent = null;
    this.xiafanJudgmentRestoreEvent = null;
    this.xiafanJudgmentFlickerTween?.stop();
    this.xiafanJudgmentFlickerTween = null;

    this.setAlpha(1);
    this.clearTint?.();
    this.lockXiafanVisualDisplaySize();
    this.lockXiafanVisualDepth();
    this.lockXiafanVisualFlip();
    this.faceXiafanGuardTowardBoss(reaction.bossDirectionX ?? 0);
    this.applyPlayerVisualTexture('playerJudgmentKnockdownArt');
    this.playSkySmashHitReaction({
      slideDirection: reaction.slideDirection,
      slideDistance: reaction.slideDistance ?? 0,
      slideDurationMs: reaction.slideDurationMs ?? 0,
      flashDurationMs: 0
    });

    this.xiafanJudgmentFlickerEvent = this.scene.time.delayedCall(holdMs, () => {
      this.xiafanJudgmentFlickerEvent = null;
      if (!this.active || this.hp <= 0) return;
      this.xiafanJudgmentFlickerTween?.stop();
      this.setAlpha(1);
      this.xiafanJudgmentFlickerTween = this.scene.tweens.add({
        targets: this,
        alpha: 0.22,
        duration: 70,
        yoyo: true,
        repeat: 5,
        ease: 'Sine.InOut',
        onComplete: () => {
          this.setAlpha(1);
          this.xiafanJudgmentFlickerTween = null;
        }
      });
    });

    this.xiafanJudgmentRestoreEvent = this.scene.time.delayedCall(totalMs, () => {
      this.xiafanJudgmentRestoreEvent = null;
      if (!this.active || this.hp <= 0) return;
      this.xiafanJudgmentFlickerTween?.stop();
      this.xiafanJudgmentFlickerTween = null;
      this.stopSkySmashReactionTweens();
      this.setAlpha(1);
      this.clearTint?.();
      if (this.texture?.key === 'playerJudgmentKnockdownArt') {
        this.applyPlayerVisualTexture('playerArt');
      }
      this.setAlpha(1);
      this.clearXiafanVisualDisplaySizeLock();
      this.restoreXiafanVisualDepth();
      this.restoreXiafanVisualFlip();
    });
  }

  playSkySmashStunVisual(stunFrameMs, recoveryFrameMs, reaction = {}, now = this.scene.time.now) {
    const firstMs = Math.max(0, stunFrameMs);
    const secondMs = Math.max(0, recoveryFrameMs);
    const totalMs = firstMs + secondMs;

    this.applyStun(totalMs, now);

    this.xiafanRecoveryEvent?.remove(false);
    this.xiafanRestoreEvent?.remove(false);
    this.xiafanRecoveryEvent = null;
    this.xiafanRestoreEvent = null;

    this.lockXiafanVisualDisplaySize();
    this.lockXiafanVisualDepth();
    this.lockXiafanVisualFlip();
    this.faceXiafanGuardTowardBoss(reaction.bossDirectionX ?? 0);
    this.applyPlayerVisualTexture('playerXiafanStunArt');
    this.playSkySmashHitReaction(reaction);

    this.xiafanRecoveryEvent = this.scene.time.delayedCall(firstMs, () => {
      this.xiafanRecoveryEvent = null;
      if (!this.active || this.hp <= 0) return;
      if (this.texture?.key === 'playerXiafanStunArt') {
        this.applyPlayerVisualTexture('playerXiafanRecoverArt');
      }
    });

    this.xiafanRestoreEvent = this.scene.time.delayedCall(totalMs, () => {
      this.xiafanRestoreEvent = null;
      if (!this.active || this.hp <= 0) return;
      if ([
        'playerXiafanStunArt',
        'playerXiafanRecoverArt'
      ].includes(this.texture?.key)) {
        this.stopSkySmashReactionTweens();
        this.applyPlayerVisualTexture('playerArt');
        this.clearXiafanVisualDisplaySizeLock();
        this.restoreXiafanVisualDepth();
        this.restoreXiafanVisualFlip();
      }
    });
  }

  playLikeLaunchReaction({ launchHeight = 78, riseMs = 165, fallMs = 205, landingStunMs = 280, sourceX = null } = {}) {
    if (!this.active || this.hp <= 0) return false;

    const rise = Math.max(80, Number(riseMs) || 165);
    const fall = Math.max(100, Number(fallMs) || 205);
    const landing = Math.max(0, Number(landingStunMs) || 280);
    const total = rise + fall + landing;
    const lift = Math.max(36, Number(launchHeight) || 78);

    this.applyStun(total, this.scene.time.now);
    this.cancelVisualAction?.({ restore: true, forceRestore: true });

    this.likeLaunchTween?.stop?.();
    this.likeFallTween?.stop?.();
    this.likeLandingEvent?.remove?.(false);
    this.likeLaunchTween = null;
    this.likeFallTween = null;
    this.likeLandingEvent = null;

    const groundX = this.x;
    const groundY = this.y;
    const originalAngle = Number(this.angle) || 0;
    const originalDepth = Number(this.depth) || 10;
    const lean = Number.isFinite(sourceX)
      ? (sourceX < this.x ? 11 : -11)
      : -9;

    this.setVelocity(0, 0);
    this.setDepth(Math.max(originalDepth + 2, 15));

    const shadow = this.scene.add.ellipse(
      groundX,
      groundY + 22,
      38,
      14,
      0x0c1520,
      0.34
    ).setDepth(Math.max(1, originalDepth - 2));

    this.likeLaunchShadow = shadow;

    this.scene.tweens.add({
      targets: shadow,
      scaleX: 0.54,
      scaleY: 0.54,
      alpha: 0.16,
      duration: rise,
      ease: 'Quad.Out'
    });

    this.likeLaunchTween = this.scene.tweens.add({
      targets: this,
      y: groundY - lift,
      angle: originalAngle + lean,
      duration: rise,
      ease: 'Quad.Out',
      onUpdate: () => this.syncArcadeBodyToSprite(),
      onComplete: () => {
        this.likeLaunchTween = null;
        if (!this.active || this.hp <= 0) {
          shadow?.destroy?.();
          return;
        }

        this.scene.tweens.add({
          targets: shadow,
          scaleX: 1.08,
          scaleY: 1.08,
          alpha: 0.30,
          duration: fall,
          ease: 'Quad.In'
        });

        this.likeFallTween = this.scene.tweens.add({
          targets: this,
          y: groundY,
          angle: originalAngle,
          duration: fall,
          ease: 'Quad.In',
          onUpdate: () => this.syncArcadeBodyToSprite(),
          onComplete: () => {
            this.likeFallTween = null;
            this.setPosition(this.x, groundY);
            this.setAngle(originalAngle);
            this.syncArcadeBodyToSprite();
            shadow?.destroy?.();
            if (this.likeLaunchShadow === shadow) this.likeLaunchShadow = null;

            const ring = this.scene.add.ellipse(
              this.x,
              this.y + 23,
              34,
              12,
              0xffc95a,
              0.12
            )
              .setStrokeStyle(3, 0xffe59a, 0.72)
              .setDepth(Math.max(1, originalDepth - 1));
            this.scene.tweens.add({
              targets: ring,
              scaleX: 1.8,
              scaleY: 1.8,
              alpha: 0,
              duration: 240,
              ease: 'Quad.Out',
              onComplete: () => ring?.active && ring.destroy()
            });

            this.likeLandingEvent = this.scene.time.delayedCall(landing, () => {
              this.likeLandingEvent = null;
              if (!this.active) return;
              this.setAngle(originalAngle);
              this.setDepth(originalDepth);
              this.syncArcadeBodyToSprite();
            });
          }
        });
      }
    });

    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}
