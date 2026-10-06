import * as Phaser from 'phaser';
import EnemyBase from './EnemyBase.js?v=2.0.0';
import { ENEMIES } from '../config/gameConfig.js?v=2.0.0';

export default class PotatoCommander extends EnemyBase {
  constructor(scene, x, y) {
    const base = ENEMIES.potatoCommander;
    super(scene, x, y, 'potatoCommanderS1NormalArt', base, 'potatoCommander');

    this.isElite = true;
    this.isBoss = true;
    this.setTarget(scene.player);
    this.setDepth(13);

    this.applyPhaseNormalTexture(0);

    const bossHpMultiplier = Number(scene.difficultyProfile?.bossHpMultiplier) || 1;
    this.maxSkyBlueHp = Math.max(1, Math.round(base.skyBlueHp * bossHpMultiplier));
    this.skyBlueHp = this.maxSkyBlueHp;
    this.maxGreenHp = Math.max(1, Math.round(base.greenHp * bossHpMultiplier));
    this.greenHp = this.maxGreenHp;
    this.maxYellowHp = Math.max(1, Math.round(base.yellowHp * bossHpMultiplier));
    this.yellowHp = this.maxYellowHp;

    this.phaseIndex = 0;
    this.currentPhase = 'memory';

    this.nextActionAt = scene.time.now + 2800;
    this.nextBasicAttackAt = scene.time.now + 1000;
    this.crossBurstShotsRemaining = 0;
    this.nextCrossBurstShotAt = -Infinity;
    this.crossBurstPhaseIndex = 0;
    this.nextNarrativeAt = scene.time.now + 2600;

    this.actionLockedUntil = -Infinity;
    this.calculationChaosStarted = false;
    this.cleanseComboUntil = -Infinity;
    this.graceComboUntil = -Infinity;
    this.lastSpecialAction = null;
    this.specialSkillReadyAt = {
      group: -Infinity,
      smash: -Infinity,
      holy: -Infinity,
      cleanse: -Infinity,
      absorb: -Infinity,
      like: -Infinity
    };

    this.majorActionCooldownUntil = scene.time.now + 2800;
    this.majorActionPlan = null;
    this.activeMajorSkill = null;
    this.activeMajorSkillStartedAt = -Infinity;
    this.activeMajorSkillMinFinishAt = -Infinity;
    this.activeMajorSkillDeadline = -Infinity;
    this.activeMajorSkillCycleId = null;
    this.lastMajorActionPlanName = null;
    this.nextPopulationCheckAt = scene.time.now + 700;
    this.nextEmergencyGroupAt = scene.time.now + 700;

    this.graceShieldHp = 0;
    this.judgmentFaithCharge = 0;
    this.judgmentGraceCount = 0;
    this.judgmentPending = false;

    this.hitFlashRestoreEvent = null;

    this.groupArtRestoreEvent = null;
    this.groupSkillArtUntil = -Infinity;

  }

  getTotalMaxVitality() {
    return (
      this.maxSkyBlueHp
      + this.maxGreenHp
      + this.maxYellowHp
      + this.maxHp
    );
  }

  getTotalVitality() {
    return (
      Math.max(0, this.skyBlueHp)
      + Math.max(0, this.greenHp)
      + Math.max(0, this.yellowHp)
      + Math.max(0, this.hp)
    );
  }

  getVitalityRatio() {
    return Phaser.Math.Clamp(
      this.getTotalVitality() / this.getTotalMaxVitality(),
      0,
      1
    );
  }

  calculatePhaseIndexFromHp() {
    if (this.skyBlueHp > 0) return 0;
    if (this.greenHp > 0) return 1;
    if (this.yellowHp > 0) return 2;
    return 3;
  }

  getActiveLayerIndex() {
    return this.calculatePhaseIndexFromHp();
  }

  getLayerHpRatio(index = this.getActiveLayerIndex()) {
    const layerIndex = Phaser.Math.Clamp(Math.trunc(index), 0, 3);

    if (layerIndex === 0) {
      return Phaser.Math.Clamp(this.skyBlueHp / this.maxSkyBlueHp, 0, 1);
    }
    if (layerIndex === 1) {
      return Phaser.Math.Clamp(this.greenHp / this.maxGreenHp, 0, 1);
    }
    if (layerIndex === 2) {
      return Phaser.Math.Clamp(this.yellowHp / this.maxYellowHp, 0, 1);
    }
    return Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
  }

  updatePhaseProgression() {

    const hpPhase = this.calculatePhaseIndexFromHp();

    if (hpPhase > this.phaseIndex) {
      this.phaseIndex = hpPhase;

      const phases = [
        'memory',
        'hands_on',
        'holy',
        'calculate'
      ];

      this.currentPhase = phases[this.phaseIndex];

      if (this.isGroupSkillArtActive()) {
        this.applyPresentationTexture(
          this.getGroupTextureKey(this.phaseIndex)
        );
      } else {
        this.applyPhaseNormalTexture(this.phaseIndex);
      }

      this.scene.onPotatoCommanderPhaseChanged?.(
        this,
        this.currentPhase
      );

      this.nextNarrativeAt = this.scene.time.now + 800;
      this.cancelBasicAttackBurst();
      this.nextBasicAttackAt = this.scene.time.now + 520;
      if (!this.activeMajorSkill) this.majorActionPlan = null;
      this.nextActionAt = Math.max(this.nextActionAt, this.scene.time.now + 1100);
      this.majorActionCooldownUntil = Math.max(
        this.majorActionCooldownUntil ?? -Infinity,
        this.scene.time.now + 1100
      );
    }

    return this.currentPhase;
  }

  getPhaseNormalTextureKey(index = this.phaseIndex) {
    return [
      'potatoCommanderS1NormalArt',
      'potatoCommanderS2NormalArt',
      'potatoCommanderS3NormalArt',
      'potatoCommanderS4NormalArt'
    ][Phaser.Math.Clamp(Math.trunc(index), 0, 3)];
  }

  applyPhaseNormalTexture(index = this.phaseIndex) {
    return this.applyPresentationTexture(
      this.getPhaseNormalTextureKey(index)
    );
  }

  applyPresentationTexture(textureKey) {
    if (!this.scene.textures.exists(textureKey)) return false;

    this.setTexture(textureKey);

    const frame = this.scene.textures.getFrame(textureKey);
    const sourceWidth = Math.max(1, frame?.realWidth ?? frame?.width ?? 1);
    const sourceHeight = Math.max(1, frame?.realHeight ?? frame?.height ?? 1);
    const displayHeight = 198;
    const displayWidth = displayHeight * (sourceWidth / sourceHeight);
    this.setDisplaySize(displayWidth, displayHeight);

    if (this.body) {
      const sx = Math.max(0.001, Math.abs(this.scaleX));
      const sy = Math.max(0.001, Math.abs(this.scaleY));
      this.body.setSize(86 / sx, 70 / sy, true);
    }

    return true;
  }

  getGroupTextureKey(index = this.phaseIndex) {
    return [
      'potatoCommanderS1GroupArt',
      'potatoCommanderS2GroupArt',
      'potatoCommanderS3GroupArt',
      'potatoCommanderS4GroupArt'
    ][Phaser.Math.Clamp(Math.trunc(index), 0, 3)];
  }

  isGroupSkillArtActive(time = this.scene.time.now) {
    return time < this.groupSkillArtUntil;
  }

  isGroupSkillTexture(textureKey = this.texture?.key) {
    return [
      'potatoCommanderS1GroupArt',
      'potatoCommanderS2GroupArt',
      'potatoCommanderS3GroupArt',
      'potatoCommanderS4GroupArt'
    ].includes(textureKey);
  }

  showGroupSkillArt(durationMs = ENEMIES.potatoCommander.groupCastArtMs) {
    if (!this.active || this.isDead) return false;

    if (this.groupArtRestoreEvent) {
      this.groupArtRestoreEvent.remove(false);
      this.groupArtRestoreEvent = null;
    }

    const duration = Math.max(0, durationMs);
    this.groupSkillArtUntil = this.scene.time.now + duration;

    const textureKey = this.getGroupTextureKey(this.phaseIndex);
    if (!this.applyPresentationTexture(textureKey)) return false;

    this.groupArtRestoreEvent = this.scene.time.delayedCall(duration, () => {
      this.groupArtRestoreEvent = null;
      this.groupSkillArtUntil = -Infinity;

      if (!this.active || this.isDead) return;

      if (this.isGroupSkillTexture()) {
        this.applyPhaseNormalTexture(this.phaseIndex);
      }
    });

    return true;
  }

  getSmashTextureKey(index = this.phaseIndex) {
    return [
      null,
      'potatoCommanderS2SmashArt',
      'potatoCommanderS3SmashArt',
      'potatoCommanderS4SmashArt'
    ][Phaser.Math.Clamp(Math.trunc(index), 0, 3)];
  }

  isSmashSkillTexture(textureKey = this.texture?.key) {
    return [
      'potatoCommanderS2SmashArt',
      'potatoCommanderS3SmashArt',
      'potatoCommanderS4SmashArt'
    ].includes(textureKey);
  }

  showSmashSkillArt() {
    if (!this.active || this.isDead) return false;

    const textureKey = this.getSmashTextureKey(this.phaseIndex);
    if (!textureKey) return false;

    return this.applyPresentationTexture(textureKey);
  }

  restoreNormalAfterSmash() {
    if (!this.active || this.isDead) return false;
    if (!this.isSmashSkillTexture()) return false;
    return this.applyPhaseNormalTexture(this.phaseIndex);
  }

  getBlessTextureKey(index = this.phaseIndex) {
    return [
      null,
      null,
      'potatoCommanderS3BlessArt',
      'potatoCommanderS4BlessArt'
    ][Phaser.Math.Clamp(Math.trunc(index), 0, 3)];
  }

  isBlessSkillTexture(textureKey = this.texture?.key) {
    return [
      'potatoCommanderS3BlessArt',
      'potatoCommanderS4BlessArt'
    ].includes(textureKey);
  }

  showBlessSkillArt() {
    if (!this.active || this.isDead) return false;
    const textureKey = this.getBlessTextureKey(this.phaseIndex);
    if (!textureKey) return false;
    return this.applyPresentationTexture(textureKey);
  }

  restoreNormalAfterBless() {
    if (!this.active || this.isDead) return false;
    if (!this.isBlessSkillTexture()) return false;
    return this.applyPhaseNormalTexture(this.phaseIndex);
  }

  getCleanseTextureKey(index = this.phaseIndex) {
    return [
      null,
      null,
      'potatoCommanderS3CleanseArt',
      'potatoCommanderS4CleanseArt'
    ][Phaser.Math.Clamp(Math.trunc(index), 0, 3)];
  }

  isCleanseSkillTexture(textureKey = this.texture?.key) {
    return [
      'potatoCommanderS3CleanseArt',
      'potatoCommanderS4CleanseArt'
    ].includes(textureKey);
  }

  showCleanseSkillArt() {
    if (!this.active || this.isDead) return false;
    const textureKey = this.getCleanseTextureKey(this.phaseIndex);
    if (!textureKey) return false;
    return this.applyPresentationTexture(textureKey);
  }

  restoreNormalAfterCleanse() {
    if (!this.active || this.isDead) return false;
    if (!this.isCleanseSkillTexture()) return false;
    return this.applyPhaseNormalTexture(this.phaseIndex);
  }

  isLikeSkillTexture(textureKey = this.texture?.key) {
    return textureKey === 'potatoCommanderS3LikeArt';
  }

  showLikeSkillArt() {
    if (!this.active || this.isDead) return false;
    if (this.phaseIndex !== 2) return false;
    return this.applyPresentationTexture('potatoCommanderS3LikeArt');
  }

  restoreNormalAfterLike() {
    if (!this.active || this.isDead) return false;
    if (!this.isLikeSkillTexture()) return false;
    return this.applyPhaseNormalTexture(this.phaseIndex);
  }

  showGraceSkillArt() {
    if (!this.active || this.isDead) return false;
    if (this.phaseIndex < 3) return false;
    return this.applyPresentationTexture('potatoCommanderS4GraceArt');
  }

  restoreNormalAfterGrace() {
    if (!this.active || this.isDead) return false;
    if (this.texture?.key !== 'potatoCommanderS4GraceArt') return false;
    return this.applyPhaseNormalTexture(this.phaseIndex);
  }

  showJudgmentSkillArt() {
    if (!this.active || this.isDead) return false;
    if (this.phaseIndex < 3) return false;
    return this.applyPresentationTexture('potatoCommanderS4JudgmentCastArt');
  }

  restoreNormalAfterJudgment() {
    if (!this.active || this.isDead) return false;
    if (this.texture?.key !== 'potatoCommanderS4JudgmentCastArt') return false;
    return this.applyPhaseNormalTexture(this.phaseIndex);
  }

  getActiveLayerMaxHp() {
    const index = this.getActiveLayerIndex();
    if (index === 0) return this.maxSkyBlueHp;
    if (index === 1) return this.maxGreenHp;
    if (index === 2) return this.maxYellowHp;
    return this.maxHp;
  }

  addGraceShield(amount) {
    const value = Math.max(0, Number(amount) || 0);
    const maxShield = this.getActiveLayerMaxHp()
      * ENEMIES.potatoCommander.absorbShieldCapRatio;
    const before = this.graceShieldHp;
    this.graceShieldHp = Phaser.Math.Clamp(before + value, 0, maxShield);
    return this.graceShieldHp - before;
  }

  addJudgmentFaithCharge(amount) {
    const value = Math.max(0, Number(amount) || 0);
    const before = this.judgmentFaithCharge;
    this.judgmentFaithCharge = Phaser.Math.Clamp(
      before + value,
      0,
      ENEMIES.potatoCommander.absorbJudgmentChargeCap
    );
    return this.judgmentFaithCharge - before;
  }

  addJudgmentGraceCast() {
    if (this.phaseIndex < 3 || this.judgmentPending) return this.judgmentGraceCount;
    const required = ENEMIES.potatoCommander.judgmentGraceCastsRequired ?? 3;
    this.judgmentGraceCount = Phaser.Math.Clamp(
      this.judgmentGraceCount + 1,
      0,
      required
    );
    if (this.judgmentGraceCount >= required) this.judgmentPending = true;
    return this.judgmentGraceCount;
  }

  resetJudgmentCycle() {
    this.judgmentGraceCount = 0;
    this.judgmentPending = false;
    this.judgmentFaithCharge = 0;
  }

  getPhase() {
    return this.currentPhase;
  }

  getPhaseLabel() {
    const labels = {
      memory: '「童年回忆」',
      hands_on: '「事必躬亲」',
      holy: '「圣光普照」',
      calculate: '「神恩归一」'
    };

    return labels[this.currentPhase];
  }

  updateAI(time = 0) {
    if (!this.active || this.isDead || !this.target?.active) return;

    this.updateStatusCore(time);
    const phase = this.updatePhaseProgression();



    if (
      this.isStunned(time)
      || time < this.actionLockedUntil
      || this.scene.commanderSkySmashActive === true
      || this.scene.commanderJudgmentActive === true
    ) {
      this.cancelBasicAttackBurst();
      this.setVelocity(0, 0);
      return;
    }

    if (
      this.phaseIndex >= 3
      && this.judgmentPending === true
      && this.scene.commanderBlackwaterPreviewActive !== true
      && this.scene.isImportantTextFree?.(this)
    ) {
      this.abortMajorActionPlan(time, { cooldownMs: 0 });
      if (this.scene.startCommanderJudgment?.(this)) {
        this.cancelBasicAttackBurst();
        this.setVelocity(0, 0);
        return;
      }
    }

    if (time >= this.nextPopulationCheckAt) {
      this.nextPopulationCheckAt = time + ENEMIES.potatoCommander.commanderPopulationCheckMs;
      if (this.phaseIndex >= 3) this.scene.maintainCommanderFollowerRing?.(this);
      const potatoCount = this.scene.getActiveCommanderPotatoCount?.() ?? Infinity;
      if (
        potatoCount <= ENEMIES.potatoCommander.commanderGroupTriggerPopulation
        && time >= this.nextEmergencyGroupAt
        && this.scene.isImportantTextFree?.(this)
        && !this.majorActionPlan
        && !this.activeMajorSkill
      ) {
        this.specialSkillReadyAt.group = Math.min(this.specialSkillReadyAt.group ?? time, time);
        if (this.queueMajorActionPlan(['group'], time, {
          name: 'emergency_group',
          ignoreActionCooldown: true
        })) {
          this.nextEmergencyGroupAt = time + ENEMIES.potatoCommander.commanderEmergencyGroupCooldownMs;
        }
      }
    }

    const majorActionHandled = this.updateMajorActionScheduler(time, phase);
    if (majorActionHandled) {
      this.cancelBasicAttackBurst();
      this.setVelocity(0, 0);
      return;
    }

    if (time < this.actionLockedUntil) {
      this.cancelBasicAttackBurst();
      this.setVelocity(0, 0);
      return;
    }

    this.updateBasicCrossBurst(time);

    const direction = new Phaser.Math.Vector2(
      this.target.x - this.x,
      this.target.y - this.y
    );

    if (direction.lengthSq() <= 1) return;
    direction.normalize();

    const phaseSpeed = {
      memory: 0.72,
      hands_on: 0.86,
      holy: 0.66,
      calculate: 0.82
    }[phase];

    const side = phase === 'memory'
      ? Math.sin(time * 0.004) * 0.18
      : phase === 'calculate'
        ? Math.sin(time * 0.007) * 0.12
        : 0;

    const vx = direction.x - direction.y * side;
    const vy = direction.y + direction.x * side;

    this.setVelocity(
      vx * this.moveSpeed * phaseSpeed,
      vy * this.moveSpeed * phaseSpeed
    );
  }

  cancelBasicAttackBurst() {
    this.crossBurstShotsRemaining = 0;
    this.nextCrossBurstShotAt = -Infinity;
  }

  getBasicCrossBurstCount() {
    const counts = ENEMIES.potatoCommander.crossAttackBurstCountByPhase;
    return counts?.[Phaser.Math.Clamp(this.phaseIndex, 0, 3)] ?? 1;
  }

  getBasicCrossCooldownMs() {
    const cooldowns = ENEMIES.potatoCommander.crossAttackCooldownMsByPhase;
    return cooldowns?.[Phaser.Math.Clamp(this.phaseIndex, 0, 3)] ?? 1400;
  }

  updateBasicCrossBurst(time) {
    if (this.crossBurstShotsRemaining > 0) {
      if (time < this.nextCrossBurstShotAt) return;

      if (this.scene.firePotatoCommanderCross?.(this)) {
        this.crossBurstShotsRemaining -= 1;

        if (this.crossBurstShotsRemaining > 0) {
          this.nextCrossBurstShotAt =
            time + ENEMIES.potatoCommander.crossAttackBurstGapMs;
        } else {
          this.nextCrossBurstShotAt = -Infinity;
          this.nextBasicAttackAt = time + this.getBasicCrossCooldownMs();
        }
      }
      return;
    }

    if (time < this.nextBasicAttackAt) return;

    this.crossBurstPhaseIndex = this.phaseIndex;
    this.crossBurstShotsRemaining = this.getBasicCrossBurstCount();
    this.nextCrossBurstShotAt = time;

    this.updateBasicCrossBurst(time);
  }

  getSpecialSkillCooldownMs(action) {
    const config = ENEMIES.potatoCommander;
    return {
      group: config.groupIntervalMs ?? 6800,
      smash: config.skySmashIntervalMs ?? 6200,
      holy: config.holyIntervalMs ?? 8200,
      cleanse: config.cleanseIntervalMs ?? 6400,
      absorb: config.absorbIntervalMs ?? 7600,
      like: config.likeIntervalMs ?? 6600
    }[action] ?? 5000;
  }

  isSpecialSkillReady(action, time = this.scene.time.now) {
    return time >= (this.specialSkillReadyAt?.[action] ?? -Infinity);
  }

  markSpecialSkillUsed(action, time = this.scene.time.now) {
    if (!action) return;
    if (!this.specialSkillReadyAt) this.specialSkillReadyAt = {};
    this.specialSkillReadyAt[action] = time + this.getSpecialSkillCooldownMs(action);
    this.lastSpecialAction = action;
  }

  scheduleSpecialRetryWhenCoolingDown(time, candidates = []) {
    const readyTimes = candidates
      .map((action) => this.specialSkillReadyAt?.[action])
      .filter(Number.isFinite);
    const earliest = readyTimes.length > 0 ? Math.min(...readyTimes) : time + 700;
    this.nextActionAt = Math.max(time + 320, earliest + Phaser.Math.Between(120, 260));
  }

  getPhaseSpecialSkillPool(phase = this.currentPhase) {
    const pools = {
      memory: ['group', 'group', 'group'],
      hands_on: ['smash', 'smash', 'smash', 'group'],
      holy: [
        'like', 'like', 'like',
        'holy', 'holy',
        'smash', 'smash',
        'group',
        'cleanse'
      ],
      calculate: [
        'absorb', 'absorb', 'absorb',
        'holy', 'holy',
        'smash',
        'group',
        'cleanse'
      ]
    };
    return [...(pools[phase] ?? [])];
  }

  isSpecialSkillSupported(skill, phase = this.currentPhase) {
    if (skill === 'cross') return this.phaseIndex >= 2;
    if (skill === 'group') return true;
    if (skill === 'smash') return this.phaseIndex >= 1;
    if (skill === 'holy' || skill === 'cleanse') return this.phaseIndex >= 2;
    if (skill === 'like') return this.phaseIndex === 2;
    if (skill === 'absorb') return phase === 'calculate' && this.phaseIndex >= 3;
    return false;
  }

  hasHolyTargets() {
    const radius = ENEMIES.potatoCommander.holyRadius ?? 420;
    return (this.scene.getNearestEnemiesOfType?.(this, 'potato', radius, 999) ?? [])
      .some((potato) => potato?.active && !potato.isDead && (potato.holyGrowthLevel ?? 0) < 3);
  }

  isSpecialSkillExecutable(skill, time = this.scene.time.now, phase = this.currentPhase) {
    if (!this.isSpecialSkillSupported(skill, phase)) return false;
    if (skill !== 'cross' && !this.isSpecialSkillReady(skill, time)) return false;

    if (skill === 'group') return true;
    if (skill === 'smash') return this.scene.commanderSkySmashActive !== true;
    if (skill === 'holy') return this.hasHolyTargets();
    if (skill === 'cleanse') return this.scene.canCommanderCleanse?.(this) === true;
    if (skill === 'like') return this.scene.commanderLikeAttackActive !== true;
    if (skill === 'absorb') return this.scene.canCommanderGrace?.(this) === true;
    if (skill === 'cross') return true;
    return false;
  }

  isSpecialSkillPlanEligible(skill, time, phase, priorSteps = []) {
    if (!this.isSpecialSkillSupported(skill, phase)) return false;
    if (skill !== 'cross' && !this.isSpecialSkillReady(skill, time)) return false;

    const groupBefore = priorSteps.includes('group');
    if (skill === 'holy') return groupBefore || this.hasHolyTargets();
    if (skill === 'cleanse') return groupBefore || this.scene.canCommanderCleanse?.(this) === true;
    if (skill === 'absorb') return groupBefore || this.scene.canCommanderGrace?.(this) === true;
    if (skill === 'smash') return this.scene.commanderSkySmashActive !== true;
    if (skill === 'like') return this.scene.commanderLikeAttackActive !== true;
    return true;
  }

  chooseWeightedMajorAction(entries = []) {
    const usable = entries.filter((entry) => (entry?.weight ?? 0) > 0);
    if (!usable.length) return null;
    const total = usable.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Phaser.Math.FloatBetween(0, total);
    for (const entry of usable) {
      roll -= entry.weight;
      if (roll <= 0) return entry;
    }
    return usable[usable.length - 1] ?? null;
  }

  canQueueComboSteps(steps, time, phase) {
    const prior = [];
    for (const skill of steps) {
      if (!this.isSpecialSkillPlanEligible(skill, time, phase, prior)) return false;
      prior.push(skill);
    }
    return true;
  }

  chooseMajorActionPlan(time, phase) {
    let singles = this.getPhaseSpecialSkillPool(phase)
      .filter((skill) => this.isSpecialSkillExecutable(skill, time, phase));

    const distinctSingles = [...new Set(singles)];
    if (distinctSingles.length > 1 && this.lastSpecialAction) {
      const withoutRepeat = singles.filter((skill) => skill !== this.lastSpecialAction);
      if (withoutRepeat.length) singles = withoutRepeat;
    }

    const choices = [];
    if (singles.length) {
      choices.push({
        kind: 'single',
        weight: ENEMIES.potatoCommander.singleActionWeight ?? 68,
        skills: singles
      });
    }

    const comboWeightMultiplier = Number(this.scene.difficultyProfile?.bossComboWeightMultiplier) || 1;
    const addCombo = (name, steps, weight) => {
      if (!this.canQueueComboSteps(steps, time, phase)) return;
      choices.push({ kind: 'combo', name, steps, weight: weight * comboWeightMultiplier });
    };

    if (phase === 'hands_on') {
      addCombo(
        'group_smash',
        ['group', 'smash'],
        ENEMIES.potatoCommander.comboGroupSmashWeight ?? 14
      );
    }

    if (phase === 'holy' || phase === 'calculate') {
      addCombo('group_holy', ['group', 'holy'], ENEMIES.potatoCommander.comboGroupHolyWeight ?? 14);
      addCombo('group_cleanse', ['group', 'cleanse'], ENEMIES.potatoCommander.comboGroupCleanseWeight ?? 12);
      addCombo('cleanse_holy', ['cleanse', 'holy'], ENEMIES.potatoCommander.comboCleanseHolyWeight ?? 13);
      addCombo('smash_holy', ['smash', 'holy'], ENEMIES.potatoCommander.comboSmashHolyWeight ?? 11);
      addCombo('holy_cross', ['holy', 'cross'], ENEMIES.potatoCommander.comboHolyCrossWeight ?? 10);
      addCombo(
        'group_cleanse_holy',
        ['group', 'cleanse', 'holy'],
        ENEMIES.potatoCommander.comboGroupCleanseHolyWeight ?? 5
      );
    }

    if (phase === 'holy') {
      addCombo('like_holy', ['like', 'holy'], ENEMIES.potatoCommander.comboLikeHolyWeight ?? 12);
    }

    if (phase === 'calculate') {
      addCombo('group_absorb', ['group', 'absorb'], ENEMIES.potatoCommander.comboGroupAbsorbWeight ?? 12);
      addCombo('absorb_smash', ['absorb', 'smash'], ENEMIES.potatoCommander.comboAbsorbSmashWeight ?? 10);
    }

    const nonRepeat = choices.filter((entry) => (
      entry.kind !== 'combo' || entry.name !== this.lastMajorActionPlanName
    ));
    const weightedChoices = nonRepeat.length ? nonRepeat : choices;
    const selected = this.chooseWeightedMajorAction(weightedChoices);
    if (!selected) return null;

    if (selected.kind === 'single') {
      return {
        kind: 'single',
        name: 'single',
        steps: [Phaser.Utils.Array.GetRandom(selected.skills)],
        index: 0,
        waitingUntil: time
      };
    }

    return {
      kind: 'combo',
      name: selected.name,
      steps: selected.steps.slice(),
      index: 0,
      waitingUntil: time
    };
  }

  getMajorActionCooldownMs(stepCount = 1, phase = this.currentPhase) {
    const difficultyScale = Number(this.scene.difficultyProfile?.bossActionCooldownMultiplier) || 1;
    let cooldown;
    if (stepCount <= 1) {
      const min = ENEMIES.potatoCommander.singleActionCooldownMinMs ?? 4100;
      const max = ENEMIES.potatoCommander.singleActionCooldownMaxMs ?? 5600;
      const phaseScale = { memory: 1.08, hands_on: 1.0, holy: 0.94, calculate: 0.90 }[phase] ?? 1;
      cooldown = Phaser.Math.Between(min, max) * phaseScale;
    } else {
      const base = ENEMIES.potatoCommander.comboActionCooldownBaseMs ?? 2200;
      const perStep = ENEMIES.potatoCommander.comboActionCooldownPerStepMs ?? 620;
      const jitter = ENEMIES.potatoCommander.comboActionCooldownJitterMs ?? 520;
      cooldown = base + stepCount * perStep + Phaser.Math.Between(0, jitter);
    }
    return Math.max(400, Math.round(cooldown * difficultyScale));
  }

  queueMajorActionPlan(steps, time = this.scene.time.now, {
    name = 'forced',
    ignoreActionCooldown = false
  } = {}) {
    if (!Array.isArray(steps) || !steps.length || !this.active || this.isDead) return false;
    if (this.majorActionPlan || this.activeMajorSkill) return false;
    if (!ignoreActionCooldown && time < this.majorActionCooldownUntil) return false;

    this.majorActionPlan = {
      kind: steps.length > 1 ? 'combo' : 'single',
      name,
      steps: steps.slice(),
      index: 0,
      waitingUntil: time
    };
    return true;
  }

  finishMajorActionPlan(time = this.scene.time.now) {
    const plan = this.majorActionPlan;
    const stepCount = plan?.steps?.length ?? 1;
    const phase = this.currentPhase;
    if (plan?.kind === 'combo') this.lastMajorActionPlanName = plan.name;
    this.majorActionPlan = null;
    this.activeMajorSkill = null;
    this.activeMajorSkillStartedAt = -Infinity;
    this.activeMajorSkillMinFinishAt = -Infinity;
    this.activeMajorSkillDeadline = -Infinity;
    this.activeMajorSkillCycleId = null;
    const cooldown = this.getMajorActionCooldownMs(stepCount, phase);
    this.majorActionCooldownUntil = time + cooldown;
    this.nextActionAt = this.majorActionCooldownUntil;
  }

  abortMajorActionPlan(time = this.scene.time.now, { cooldownMs = null } = {}) {
    const phase = this.currentPhase;
    this.majorActionPlan = null;
    this.activeMajorSkill = null;
    this.activeMajorSkillStartedAt = -Infinity;
    this.activeMajorSkillMinFinishAt = -Infinity;
    this.activeMajorSkillDeadline = -Infinity;
    this.activeMajorSkillCycleId = null;
    const cooldown = cooldownMs == null
      ? Math.min(1600, this.getMajorActionCooldownMs(1, phase))
      : Math.max(0, cooldownMs);
    this.majorActionCooldownUntil = time + cooldown;
    this.nextActionAt = this.majorActionCooldownUntil;
  }

  resolveMajorSkill(skill, time = this.scene.time.now, { chainAllowed = true } = {}) {
    if (this.activeMajorSkill !== skill) return false;

    this.activeMajorSkill = null;
    this.activeMajorSkillStartedAt = -Infinity;
    this.activeMajorSkillMinFinishAt = -Infinity;
    this.activeMajorSkillDeadline = -Infinity;
    this.activeMajorSkillCycleId = null;

    const plan = this.majorActionPlan;
    if (!plan) {
      this.majorActionCooldownUntil = time + this.getMajorActionCooldownMs(1, this.currentPhase);
      this.nextActionAt = this.majorActionCooldownUntil;
      return true;
    }

    const hasNext = plan.index < plan.steps.length - 1;
    if (!hasNext) {
      this.finishMajorActionPlan(time);
      return true;
    }

    if (!chainAllowed) {
      this.abortMajorActionPlan(time);
      return true;
    }

    plan.index += 1;
    plan.waitingUntil = time + Phaser.Math.Between(
      ENEMIES.potatoCommander.comboStepGapMinMs ?? 760,
      ENEMIES.potatoCommander.comboStepGapMaxMs ?? 1080
    );
    return true;
  }

  isActiveMajorSkillComplete(time = this.scene.time.now) {
    if (!this.activeMajorSkill) return false;
    if (time < this.activeMajorSkillMinFinishAt) return false;

    if (this.activeMajorSkill === 'group') return !this.isGroupSkillArtActive(time);
    if (this.activeMajorSkill === 'smash') return this.scene.commanderSkySmashActive !== true;
    if (this.activeMajorSkill === 'holy') {
      return !this.scene.hasCommanderHolySelfDestructCycle?.(this.activeMajorSkillCycleId);
    }
    if (this.activeMajorSkill === 'like') return this.scene.commanderLikeAttackActive !== true;
    return true;
  }

  executeMajorSkill(skill, time = this.scene.time.now, phase = this.currentPhase) {
    if (!this.isSpecialSkillExecutable(skill, time, phase)) return false;

    this.activeMajorSkill = skill;
    this.activeMajorSkillStartedAt = time;
    this.activeMajorSkillCycleId = null;
    let lockMs = 0;
    let minFinishMs = 0;
    let deadlineMs = 0;
    let started = true;

    if (skill === 'group') {
      this.scene.commanderEveryoneTogether?.(this);
      lockMs = ENEMIES.potatoCommander.groupCastArtMs ?? 1600;
      minFinishMs = lockMs;
      deadlineMs = lockMs + 2600;
    } else if (skill === 'smash') {
      this.scene.startCommanderSkySmash?.(this);
      started = this.scene.commanderSkySmashActive === true;
      lockMs = (ENEMIES.potatoCommander.skySmashWarningMs ?? 760) + 600;
      minFinishMs = lockMs;
      deadlineMs = lockMs + 2600;
    } else if (skill === 'holy') {
      const cycleId = this.scene.startCommanderWish?.(this);
      started = Number.isFinite(cycleId);
      this.activeMajorSkillCycleId = started ? cycleId : null;
      lockMs = (ENEMIES.potatoCommander.holyCastMs ?? 1900) + 180;
      minFinishMs = (ENEMIES.potatoCommander.holyReleaseMs ?? 1600)
        + (ENEMIES.potatoCommander.holySelfDestructArmMs ?? 340);
      deadlineMs = minFinishMs + (ENEMIES.potatoCommander.holySelfDestructMaxChaseMs ?? 5200) + 500;
    } else if (skill === 'cleanse') {
      started = this.scene.startCommanderCleanse?.(this) === true;
      lockMs = (ENEMIES.potatoCommander.cleanseCastMs ?? 1320) + 180;
      minFinishMs = lockMs;
      deadlineMs = lockMs + 900;
    } else if (skill === 'like') {
      started = this.scene.startCommanderLikeAttack?.(this) === true;
      lockMs = ENEMIES.potatoCommander.likeCastArtMs ?? 1320;
      minFinishMs = lockMs;
      deadlineMs = lockMs + 900;
    } else if (skill === 'absorb') {
      started = this.scene.commanderStopSpending?.(this) === true;
      lockMs = (ENEMIES.potatoCommander.absorbDurationMs ?? 2400) + 240;
      minFinishMs = lockMs;
      deadlineMs = lockMs + 900;
    } else if (skill === 'cross') {
      const count = Math.max(2, this.getBasicCrossBurstCount());
      const gap = ENEMIES.potatoCommander.comboCrossVolleyGapMs ?? 135;
      for (let i = 0; i < count; i += 1) {
        this.scene.time.delayedCall(i * gap, () => {
          if (!this.active || this.isDead || this.scene.commanderJudgmentActive) return;
          this.scene.firePotatoCommanderCross?.(this);
        });
      }
      lockMs = (count - 1) * gap + 260;
      minFinishMs = lockMs;
      deadlineMs = lockMs + 500;
    }

    if (!started || lockMs <= 0) {
      this.activeMajorSkill = null;
      this.activeMajorSkillStartedAt = -Infinity;
      this.activeMajorSkillCycleId = null;
      return false;
    }

    if (skill !== 'cross') this.markSpecialSkillUsed(skill, time);
    else this.lastSpecialAction = 'cross';
    this.actionLockedUntil = Math.max(this.actionLockedUntil ?? -Infinity, time + lockMs);
    this.activeMajorSkillMinFinishAt = time + Math.max(0, minFinishMs);
    this.activeMajorSkillDeadline = time + Math.max(lockMs + 300, deadlineMs);
    this.cancelBasicAttackBurst();
    return true;
  }

  updateMajorActionScheduler(time = this.scene.time.now, phase = this.currentPhase) {
    if (this.activeMajorSkill) {
      if (this.isActiveMajorSkillComplete(time)) {
        this.resolveMajorSkill(this.activeMajorSkill, time, { chainAllowed: true });
        return true;
      }

      if (Number.isFinite(this.activeMajorSkillDeadline) && time > this.activeMajorSkillDeadline) {
        this.abortMajorActionPlan(time);
      }
      return true;
    }

    if (this.majorActionPlan) {
      if (time < this.majorActionPlan.waitingUntil) return true;
      const nextSkill = this.majorActionPlan.steps[this.majorActionPlan.index];
      if (!this.executeMajorSkill(nextSkill, time, phase)) {
        this.abortMajorActionPlan(time);
      }
      return true;
    }

    if (time < this.majorActionCooldownUntil || time < this.nextActionAt) return false;
    if (!this.scene.isImportantTextFree?.(this)) return false;

    const plan = this.chooseMajorActionPlan(time, phase);
    if (!plan) {
      const possible = [...new Set(this.getPhaseSpecialSkillPool(phase))];
      this.scheduleSpecialRetryWhenCoolingDown(time, possible);
      this.majorActionCooldownUntil = Math.max(this.majorActionCooldownUntil, this.nextActionAt);
      return false;
    }

    this.majorActionPlan = plan;
    if (!this.executeMajorSkill(plan.steps[0], time, phase)) {
      this.abortMajorActionPlan(time);
    }
    return true;
  }

  tryRandomInheritedSkill(time, phase) {
    return this.updateMajorActionScheduler(time, phase);
  }

  tryNarrative() {
    return;
  }

  receiveDamage(amount) {
    if (this.isDead) return false;

    const worshipCount =
      this.scene.getWorshipDuckCount?.() ?? 0;

    const worshipShield = Math.min(
      ENEMIES.potatoCommander.worshipShieldCap,
      worshipCount
        * ENEMIES.potatoCommander.worshipShieldPerDuck
    );

    const totalDefense = Math.min(
      0.80,
      this.defense + worshipShield
    );

    let remaining = Math.max(
      1,
      Math.round(amount * (1 - totalDefense))
    );

    if (this.graceShieldHp > 0 && remaining > 0) {
      const absorbed = Math.min(this.graceShieldHp, remaining);
      this.graceShieldHp = Math.max(0, this.graceShieldHp - absorbed);
      remaining = Math.max(0, remaining - absorbed);

      if (absorbed > 0) {
        this.scene.onCommanderGraceShieldHit?.(this, absorbed);
      }

      if (remaining <= 0) {
        return false;
      }
    }

    if (this.skyBlueHp > 0) {
      this.skyBlueHp = Math.max(0, this.skyBlueHp - remaining);
    } else if (this.greenHp > 0) {
      this.greenHp = Math.max(0, this.greenHp - remaining);
    } else if (this.yellowHp > 0) {
      this.yellowHp = Math.max(0, this.yellowHp - remaining);
    } else {
      this.hp = Math.max(0, this.hp - remaining);
    }

    if (this.hp <= 0 && this.skyBlueHp <= 0 && this.greenHp <= 0 && this.yellowHp <= 0) {
      this.hp = 0;
      this.isDead = true;
      return true;
    }

    this.updatePhaseProgression();

    this.playHitFlash();

    return false;
  }

  playHitFlash() {
    if (!this.active || this.isDead) return;

    if (this.scene.commanderSkySmashActive === true || this.alpha < 0.98) return;

    if (this.hitFlashRestoreEvent) {
      this.hitFlashRestoreEvent.remove(false);
      this.hitFlashRestoreEvent = null;
    }

    this.setAlpha(0.80);
    this.hitFlashRestoreEvent = this.scene.time.delayedCall(70, () => {
      this.hitFlashRestoreEvent = null;
      if (!this.active || this.isDead) return;
      if (this.scene.commanderSkySmashActive === true) return;
      this.setAlpha(1);
    });
  }

  healActiveLayer(amount) {
    if (amount <= 0) return 0;

    if (this.skyBlueHp > 0) {
      const before = this.skyBlueHp;
      this.skyBlueHp = Math.min(
        this.maxSkyBlueHp,
        this.skyBlueHp + amount
      );
      return this.skyBlueHp - before;
    }

    if (this.greenHp > 0) {
      const before = this.greenHp;
      this.greenHp = Math.min(
        this.maxGreenHp,
        this.greenHp + amount
      );
      return this.greenHp - before;
    }

    if (this.yellowHp > 0) {
      const before = this.yellowHp;
      this.yellowHp = Math.min(
        this.maxYellowHp,
        this.yellowHp + amount
      );
      return this.yellowHp - before;
    }

    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }
}
