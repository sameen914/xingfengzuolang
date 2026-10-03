import Phaser from 'phaser';
import EnemyBase from './EnemyBase.js';
import { ENEMIES } from '../config/gameConfig.js';

export default class PotatoCommander extends EnemyBase {
  constructor(scene, x, y) {
    const base = ENEMIES.potatoCommander;
    super(scene, x, y, 'potatoCommanderS1NormalArt', base, 'potatoCommander');

    this.isElite = true;
    this.isBoss = true;
    this.setTarget(scene.player);
    this.setDepth(13);

    // 正式使用四阶段锁定 normal 母版。成长更新后 Boss 视觉放大约 25%，
    // 但碰撞范围只温和增加，避免视觉放大偷偷扩大实际技能判定。
    this.applyPhaseNormalTexture(0);

    // Step 3.1：四层血与四阶段严格一一对应。
    // 第一层为天蓝色，之后依次为绿色、黄色、红色。
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
    // Step 3.3：所有阶段都有普通攻击「十字」。阶段越高，组频率越高、连击数越多。
    this.nextBasicAttackAt = scene.time.now + 1000;
    this.crossBurstShotsRemaining = 0;
    this.nextCrossBurstShotAt = -Infinity;
    this.crossBurstPhaseIndex = 0;
    this.nextNarrativeAt = scene.time.now + 2600;

    this.actionLockedUntil = -Infinity;
    this.calculationChaosStarted = false;
    this.cleanseComboUntil = -Infinity;
    this.graceComboUntil = -Infinity;
    // 0.9.2-dev14.9.27：Boss 大技能加入独立冷却与最近技能记录。
    // 避免同一技能连续刷屏，同时让配置中的各技能 interval 真正参与调度。
    this.lastSpecialAction = null;
    this.specialSkillReadyAt = {
      group: -Infinity,
      smash: -Infinity,
      holy: -Infinity,
      cleanse: -Infinity,
      absorb: -Infinity,
      like: -Infinity
    };

    // Internal Test v1.0.30：和丹麦鸭一致的主技能计划器。
    // single / combo 都由外层 AI 预选；单个技能函数绝不硬调用下一招。
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

    // 0.9.2-dev14.8：「圣恩有价」会把信奉土豆榨取成当前阶段治疗、护盾与「圣裁」充能。
    this.graceShieldHp = 0;
    this.judgmentFaithCharge = 0;
    // 0.9.2-dev14.9：圣裁改为“三次圣恩有价”明确计数，不再由抽取多少只土豆决定触发时机。
    this.judgmentGraceCount = 0;
    this.judgmentPending = false;

    // Step 1.1: hit feedback must never modify the locked sprite's base scale.
    this.hitFlashRestoreEvent = null;

    // Step 4A-C：整个抱团召唤演出期间保持阶段对应的抱团 PNG。
    // 如果召唤过程中破层，直接切到“新阶段的抱团图”，而不是跳回 normal。
    this.groupArtRestoreEvent = null;
    this.groupSkillArtUntil = -Infinity;

    // Step 2 debug-only inspection state. These flags are never used by normal spawns
    // unless the developer explicitly presses the Potato Commander debug keys.
    this.debugInspectionMode = false;
    this.debugForcedPhaseIndex = null;
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

  // 正式阶段不再使用 75% / 50% / 25% 总血量阈值。
  // 每一整层血只对应一个阶段：天蓝 → 绿 → 黄 → 红。
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
    // Step 2 debug tool: keep a manually selected stage stable while inspecting art.
    // Normal gameplay never sets debugForcedPhaseIndex, so the HP progression below
    // remains untouched.
    if (Number.isInteger(this.debugForcedPhaseIndex)) {
      this.phaseIndex = Phaser.Math.Clamp(this.debugForcedPhaseIndex, 0, 3);
      this.currentPhase = [
        'memory',
        'hands_on',
        'holy',
        'calculate'
      ][this.phaseIndex];
      return this.currentPhase;
    }

    const hpPhase = this.calculatePhaseIndexFromHp();

    // 阶段严格由“当前血层”推进：打空一整层才进入下一阶段。
    // 已破层不会被治疗复活，因此阶段只会向前。
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
        this.applyDebugInspectionTexture(
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
      // 破层后取消尚未执行的 combo 后续步骤，并给玩家一个短呼吸。
      // 已经启动的场景技能仍由自身状态机自然收尾。
      if (!this.activeMajorSkill) this.majorActionPlan = null;
      this.nextActionAt = Math.max(this.nextActionAt, this.scene.time.now + 1100);
      this.majorActionCooldownUntil = Math.max(
        this.majorActionCooldownUntil ?? -Infinity,
        this.scene.time.now + 1100
      );
    }

    return this.currentPhase;
  }

  debugForceInspectionPhase(index) {
    const nextIndex = Phaser.Math.Clamp(Math.trunc(index), 0, 3);
    const phases = ['memory', 'hands_on', 'holy', 'calculate'];

    this.debugInspectionMode = true;
    this.debugForcedPhaseIndex = nextIndex;
    this.phaseIndex = nextIndex;
    this.currentPhase = phases[nextIndex];

    this.applyPhaseNormalTexture(nextIndex);
    this.setVelocity(0, 0);

    return this.currentPhase;
  }

  debugExitInspection() {
    this.debugInspectionMode = false;
    this.debugForcedPhaseIndex = null;

    // Return to the stage implied by current vitality. This is debug-only and does not
    // change the normal one-way stage progression used during actual gameplay.
    this.phaseIndex = this.calculatePhaseIndexFromHp();
    this.currentPhase = [
      'memory',
      'hands_on',
      'holy',
      'calculate'
    ][this.phaseIndex];

    this.applyPhaseNormalTexture(this.phaseIndex);
    this.nextActionAt = this.scene.time.now + 1600;

    return this.currentPhase;
  }

  debugJumpToGameplayPhase(index) {
    const nextIndex = Phaser.Math.Clamp(Math.trunc(index), 0, 3);
    const phases = ['memory', 'hands_on', 'holy', 'calculate'];

    // 与静态“阶段检查”不同：这个入口直接修改四层血，使正常 AI 真正处在目标阶段。
    // 已经越过的血层清零；目标层与后续层保持满血，便于连续测试技能。
    this.skyBlueHp = nextIndex >= 1 ? 0 : this.maxSkyBlueHp;
    this.greenHp = nextIndex >= 2 ? 0 : this.maxGreenHp;
    this.yellowHp = nextIndex >= 3 ? 0 : this.maxYellowHp;
    this.hp = this.maxHp;

    this.debugInspectionMode = false;
    this.debugForcedPhaseIndex = null;
    this.phaseIndex = nextIndex;
    this.currentPhase = phases[nextIndex];

    if (this.groupArtRestoreEvent) {
      this.groupArtRestoreEvent.remove(false);
      this.groupArtRestoreEvent = null;
    }
    this.groupSkillArtUntil = -Infinity;

    this.cancelBasicAttackBurst();
    this.applyPhaseNormalTexture(nextIndex);
    this.setVelocity(0, 0);

    const now = this.scene.time.now;
    this.actionLockedUntil = -Infinity;
    this.nextActionAt = now + 650;
    this.majorActionCooldownUntil = now + 650;
    this.majorActionPlan = null;
    this.activeMajorSkill = null;
    this.activeMajorSkillStartedAt = -Infinity;
    this.activeMajorSkillMinFinishAt = -Infinity;
    this.activeMajorSkillDeadline = -Infinity;
    this.activeMajorSkillCycleId = null;
    this.nextBasicAttackAt = now + 380;
    this.nextNarrativeAt = now + 1100;
    this.cleanseComboUntil = -Infinity;
    this.graceComboUntil = -Infinity;
    this.lastSpecialAction = null;
    Object.keys(this.specialSkillReadyAt ?? {}).forEach((key) => {
      this.specialSkillReadyAt[key] = -Infinity;
    });

    this.scene.onPotatoCommanderPhaseChanged?.(
      this,
      this.currentPhase
    );

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
    return this.applyDebugInspectionTexture(
      this.getPhaseNormalTextureKey(index)
    );
  }

  applyDebugInspectionTexture(textureKey) {
    if (!this.scene.textures.exists(textureKey)) return false;

    this.setTexture(textureKey);

    // Preserve each locked PNG's own aspect ratio. Every normal stage keeps the same
    // 198 px height, so the visible feet stay on the same gameplay baseline while later
    // stages can become wider through their more elaborate silhouettes.
    const frame = this.scene.textures.getFrame(textureKey);
    const sourceWidth = Math.max(1, frame?.realWidth ?? frame?.width ?? 1);
    const sourceHeight = Math.max(1, frame?.realHeight ?? frame?.height ?? 1);
    const displayHeight = 198;
    const displayWidth = displayHeight * (sourceWidth / sourceHeight);
    this.setDisplaySize(displayWidth, displayHeight);

    // Keep the collision footprint identical to the approved Step 1 fix.
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
    if (!this.active || this.isDead || this.debugInspectionMode) return false;

    if (this.groupArtRestoreEvent) {
      this.groupArtRestoreEvent.remove(false);
      this.groupArtRestoreEvent = null;
    }

    const duration = Math.max(0, durationMs);
    this.groupSkillArtUntil = this.scene.time.now + duration;

    const textureKey = this.getGroupTextureKey(this.phaseIndex);
    if (!this.applyDebugInspectionTexture(textureKey)) return false;

    this.groupArtRestoreEvent = this.scene.time.delayedCall(duration, () => {
      this.groupArtRestoreEvent = null;
      this.groupSkillArtUntil = -Infinity;

      if (!this.active || this.isDead || this.debugInspectionMode) return;

      // 只要当前还是任一阶段的抱团图，就回到“当前阶段” normal。
      // 若后续其他技能已经切图，不让旧抱团计时器覆盖它。
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
    if (!this.active || this.isDead || this.debugInspectionMode) return false;

    const textureKey = this.getSmashTextureKey(this.phaseIndex);
    if (!textureKey) return false;

    return this.applyDebugInspectionTexture(textureKey);
  }

  restoreNormalAfterSmash() {
    if (!this.active || this.isDead || this.debugInspectionMode) return false;
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
    if (!this.active || this.isDead || this.debugInspectionMode) return false;
    const textureKey = this.getBlessTextureKey(this.phaseIndex);
    if (!textureKey) return false;
    return this.applyDebugInspectionTexture(textureKey);
  }

  restoreNormalAfterBless() {
    if (!this.active || this.isDead || this.debugInspectionMode) return false;
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
    if (!this.active || this.isDead || this.debugInspectionMode) return false;
    const textureKey = this.getCleanseTextureKey(this.phaseIndex);
    if (!textureKey) return false;
    return this.applyDebugInspectionTexture(textureKey);
  }

  restoreNormalAfterCleanse() {
    if (!this.active || this.isDead || this.debugInspectionMode) return false;
    if (!this.isCleanseSkillTexture()) return false;
    return this.applyPhaseNormalTexture(this.phaseIndex);
  }

  isLikeSkillTexture(textureKey = this.texture?.key) {
    return textureKey === 'potatoCommanderS3LikeArt';
  }

  showLikeSkillArt() {
    if (!this.active || this.isDead || this.debugInspectionMode) return false;
    // 「点赞」目前属于第三阶段「圣光普照」专属技能，严格使用三阶段母版派生的专用帧。
    if (this.phaseIndex !== 2) return false;
    return this.applyDebugInspectionTexture('potatoCommanderS3LikeArt');
  }

  restoreNormalAfterLike() {
    if (!this.active || this.isDead || this.debugInspectionMode) return false;
    if (!this.isLikeSkillTexture()) return false;
    return this.applyPhaseNormalTexture(this.phaseIndex);
  }

  showGraceSkillArt() {
    if (!this.active || this.isDead || this.debugInspectionMode) return false;
    if (this.phaseIndex < 3) return false;
    return this.applyDebugInspectionTexture('potatoCommanderS4GraceArt');
  }

  restoreNormalAfterGrace() {
    if (!this.active || this.isDead || this.debugInspectionMode) return false;
    if (this.texture?.key !== 'potatoCommanderS4GraceArt') return false;
    return this.applyPhaseNormalTexture(this.phaseIndex);
  }

  showJudgmentSkillArt() {
    if (!this.active || this.isDead || this.debugInspectionMode) return false;
    if (this.phaseIndex < 3) return false;
    return this.applyDebugInspectionTexture('potatoCommanderS4JudgmentCastArt');
  }

  restoreNormalAfterJudgment() {
    if (!this.active || this.isDead || this.debugInspectionMode) return false;
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

    // Step 2 debug inspection deliberately freezes movement / random skills / narrative
    // so stage art can be checked without other boss logic changing underneath it.
    if (this.debugInspectionMode) {
      this.setVelocity(0, 0);
      return;
    }


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

    // 「下黑水」是独立 Ultimate：三枚十字 READY 后优先于任何 single/combo。
    // 它不属于 majorActionPlan，也不由「圣恩有价」技能函数硬调用。
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

    // S4 维护“信徒环 + 前线土豆”。低人口时仍可以紧急抱团，
    // 但不再直接调用技能：只向同一个 majorActionPlan 调度器塞入一个 forced single。
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
      // combo 内部等待期只留呼吸，不允许普通十字或另一个随机大技能插队。
      this.cancelBasicAttackBurst();
      this.setVelocity(0, 0);
      return;
    }

    // 本帧若刚进入特殊技能锁定，不允许普通十字重新起一组连击。
    if (time < this.actionLockedUntil) {
      this.cancelBasicAttackBurst();
      this.setVelocity(0, 0);
      return;
    }

    // 普通攻击不占技能名 / 台词通道。每阶段分别为 1 / 2 / 3 / 4 连击。
    // 组内十字以短间隔连续点射；特殊技能开始会立即取消尚未发出的连击。
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

    // 同一帧先发第一枚，使普通攻击反应更干脆。
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

    // 抱团会真实生成新土豆，所以后续团魂 / 独美 / 圣恩可在计划阶段先允许，
    // 到真正执行该步骤时再重新检查现场条件。
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

    // 不连续重复同一个组合；如果它是唯一可用方案才保留。
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

  // Compatibility wrapper for old debug/regression callers. Normal gameplay no longer
  // picks a skill here; all choices go through updateMajorActionScheduler().
  tryRandomInheritedSkill(time, phase) {
    return this.updateMajorActionScheduler(time, phase);
  }

  tryNarrative() {
    // 0.9.2-dev14.7.1：土豆指挥官不再播放阶段普通随机碎碎念。
    // 所有保留台词只绑定到对应技能触发。
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

    // 「圣恩有价」榨取出的护盾先于当前血层承伤，但永远不会复活已经破掉的血层。
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

    // Step 3.1：一次命中只结算当前血层。
    // 即使伤害超过当前层剩余 HP，也不穿透到下一层，
    // 从而保证每个阶段都拥有完整的一层血，不会被大伤害直接跳阶段。
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

    // 在破层这一击结束时立刻换母版 / 阶段，不等待下一帧 AI update。
    this.updatePhaseProgression();

    // Step 1.1: the old placeholder boss used an absolute scale tween on hit.
    // That made the high-resolution locked PNG grow dramatically on every contact.
    // Keep the locked display size unchanged and use alpha-only feedback instead.
    this.playHitFlash();

    return false;
  }

  playHitFlash() {
    if (!this.active || this.isDead) return;

    // Do not fight the existing sky-smash fade animation.
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

    // 已经破掉的上一级血层永久保持 0；治疗只补当前阶段这一层。
    // 因此总血量可以增加，但阶段 / 母版绝不会倒退。
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
