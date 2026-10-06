import * as Phaser from 'phaser';
import EnemyBase from './EnemyBase.js?v=2.0.0';
import { ENEMIES } from '../config/gameConfig.js?v=2.0.0';

const DUCK_QUEEN_STAGE_NAMES = {
  gentle: '天降青梅',
  obsessed: '真心相待',
  frenzy: '听夜入梦'
};

const DUCK_QUEEN_DISPLAY_HEIGHT = 175;
const DUCK_QUEEN_COLLISION_WIDTH = 68;
const DUCK_QUEEN_COLLISION_HEIGHT = 57;

const VISUALS = {
  s1_normal: { key: 'queenDuckS1NormalArt' },
  s1_candy: { key: 'queenDuckS1CandyArt' },
  s2_normal: { key: 'queenDuckS2NormalArt' },
  s2_candy: { key: 'queenDuckS2CandyArt' },
  s2_tietie: { key: 'queenDuckS2TietieArt' },
  s3_normal: { key: 'queenDuckS3NormalArt' },
  s3_mood_normal: { key: 'queenDuckS3MoodNormalArt' },
  s3_mood_cold: { key: 'queenDuckS3MoodColdArt' },
  s3_mood_furious: { key: 'queenDuckS3MoodFuriousArt' },
  s3_mood_crying: { key: 'queenDuckS3MoodCryingArt' },
  s3_candy: { key: 'queenDuckS3CandyArt' },
  s3_tietie: { key: 'queenDuckS3TietieArt' },
  s3_blackframe: { key: 'queenDuckS3BlackframeCastArt' },
  s3_dafamai: { key: 'queenDuckS3DafamaiCastArt' }
};

export default class DuckQueen extends EnemyBase {
  constructor(scene, x, y) {
    const base = ENEMIES.duckQueen;
    super(scene, x, y, 'queenDuckS1NormalArt', base, 'duckQueen');

    this.isElite = true;
    this.isBoss = true;
    this.disableHitScale = true;
    this.setTarget(scene.player);
    this.setDepth(12);
    this.setOrigin(0.5, 0.5);
    this.visualState = null;

    const bossHpMultiplier = Number(scene.difficultyProfile?.bossHpMultiplier) || 1;
    this.maxArmorHp = Math.max(1, Math.round(base.armorHp * bossHpMultiplier));
    this.armorHp = this.maxArmorHp;

    this.attachDistance = base.attachDistance;
    this.preferredDistance = base.preferredDistance;

    this.nextStickDashAt = scene.time.now + 900;
    this.stickDashUntil = -Infinity;
    this.attachAttemptUntil = -Infinity;
    this.grappleCooldownUntil = -Infinity;

    this.nextFishSkillAt = scene.time.now + 5200;
    this.fishRushUntil = -Infinity;

    this.nextTangerineAt = scene.time.now + Phaser.Math.Between(1500, 2300);
    this.tangerineCastUntil = -Infinity;

    this.nextCandyAt = scene.time.now + Phaser.Math.Between(2600, 3400);
    this.candyCastUntil = -Infinity;

    this.nextCharmAt = scene.time.now + 4300;
    this.charmCastUntil = -Infinity;

    this.majorActionCooldownUntil = scene.time.now + (base.majorActionInitialCooldownMs ?? 1600);
    this.majorActionPlan = null;
    this.activeMajorSkill = null;
    this.activeMajorSkillStartedAt = -Infinity;
    this.activeMajorSkillDeadline = -Infinity;
    this.stickActionAuthorizedUntil = -Infinity;

    this.currentPhase = this.getPhase();
    this.ultimateCooldownUntil = scene.time.now + (base.ultimatePhaseEntryDelayMs ?? 5200);
    this.nextFrenzyMoodSwapAt = scene.time.now + Phaser.Math.Between(280, 520);
    this.frenzyMoodState = 's3_mood_normal';
    this.postGrappleRoamUntil = -Infinity;
    this.lastCruiseDirection = new Phaser.Math.Vector2(1, 0);
    this.applyPhaseVisual();
  }

  getPhaseVisualState(phase = this.getPhase()) {
    if (phase === 'obsessed') return 's2_normal';
    if (phase === 'frenzy') return 's3_mood_normal';
    return 's1_normal';
  }

  getTietieVisualState(phase = this.getPhase()) {
    return phase === 'frenzy' ? 's3_tietie' : 's2_tietie';
  }

  getCandyVisualState(phase = this.getPhase()) {
    if (phase === 'frenzy') return 's3_candy';
    if (phase === 'obsessed') return 's2_candy';
    return 's1_candy';
  }

  getVisualDisplaySize(state = this.visualState ?? this.getPhaseVisualState()) {
    const visual = VISUALS[state] ?? VISUALS.s1_normal;
    const frame = this.scene.textures.getFrame(visual.key);
    const sourceWidth = Math.max(1, frame?.realWidth ?? frame?.width ?? 1);
    const sourceHeight = Math.max(1, frame?.realHeight ?? frame?.height ?? 1);
    const height = DUCK_QUEEN_DISPLAY_HEIGHT;
    return {
      ...visual,
      width: height * (sourceWidth / sourceHeight),
      height
    };
  }

  getCurrentVisualBaseSize() {
    return this.getVisualDisplaySize();
  }

  restoreVisualDisplaySize() {
    if (!this.active) return null;
    const visual = this.getVisualDisplaySize();
    this.setDisplaySize(visual.width, visual.height);
    return visual;
  }

  applyVisualState(state) {
    if (!this.active) return;
    const visual = VISUALS[state] ?? VISUALS.s1_normal;
    if (this.visualState !== state) {
      this.visualState = state;
      if (this.scene.textures.exists(visual.key)) this.setTexture(visual.key);
    }

    const display = this.getVisualDisplaySize(state);
    this.setOrigin(0.5, 0.5);
    this.setDisplaySize(display.width, display.height);

    if (this.body) {
      const sx = Math.max(0.001, Math.abs(this.scaleX));
      const sy = Math.max(0.001, Math.abs(this.scaleY));
      this.body.setSize(
        DUCK_QUEEN_COLLISION_WIDTH / sx,
        DUCK_QUEEN_COLLISION_HEIGHT / sy,
        true
      );
    }
  }

  applyPhaseVisual() {
    if (this.scene?.duckQueenGrappleActive) return;
    this.applyVisualState(this.getPhaseVisualState());
  }


  resumeRoamingState(time = this.scene.time.now) {
    if (!this.active || this.isDead) return;

    this.stickDashUntil = -Infinity;
    this.fishRushUntil = -Infinity;
    this.attachAttemptUntil = -Infinity;
    this.candyCastUntil = -Infinity;
    this.tangerineCastUntil = -Infinity;
    this.stunnedUntil = Math.min(this.stunnedUntil ?? -Infinity, time);
    this.postGrappleRoamUntil = time + (ENEMIES.duckQueen.grapplePostReleaseRoamMs ?? 1600);

    if (this.body) {
      this.body.setEnable(true);
      this.body.moves = true;
    }

    const phase = this.getPhase();
    this.applyVisualState(this.getPhaseVisualState(phase));
    this.applyCruiseMotion(time, phase, 1.08);

    if (phase === 'frenzy') {
      this.frenzyMoodState = 's3_mood_normal';
      this.nextFrenzyMoodSwapAt = time + Phaser.Math.Between(320, 520);
    }
  }


  getFrenzyMoodStates() {
    return ['s3_mood_normal', 's3_mood_cold', 's3_mood_furious', 's3_mood_crying'];
  }

  updateFrenzyMood(time = this.scene.time.now) {
    if (!this.active || this.isDead) return;
    if (this.getPhase() !== 'frenzy') {
      this.frenzyMoodState = 's3_mood_normal';
      this.nextFrenzyMoodSwapAt = time + Phaser.Math.Between(300, 520);
      return;
    }

    if (this.scene?.duckQueenGrappleActive) return;
    if (time < this.nextFrenzyMoodSwapAt) return;
    if (time < this.candyCastUntil || time < this.tangerineCastUntil || time < this.charmCastUntil) return;

    const pool = this.getFrenzyMoodStates().filter((state) => state !== this.frenzyMoodState);
    this.frenzyMoodState = Phaser.Utils.Array.GetRandom(pool);
    this.applyVisualState(this.frenzyMoodState);
    this.nextFrenzyMoodSwapAt = time + Phaser.Math.Between(260, 520);
  }

  getTotalMaxVitality() {
    return this.maxArmorHp + this.maxHp;
  }

  getTotalVitality() {
    return Math.max(0, this.armorHp) + Math.max(0, this.hp);
  }

  getVitalityRatio() {
    return Phaser.Math.Clamp(
      this.getTotalVitality() / this.getTotalMaxVitality(),
      0,
      1
    );
  }

  getPhase() {
    const ratio = this.getVitalityRatio();

    if (ratio > ENEMIES.duckQueen.gentleThreshold) return 'gentle';
    if (ratio > ENEMIES.duckQueen.frenzyThreshold) return 'obsessed';
    return 'frenzy';
  }

  getPhaseLabel() {
    return `「${DUCK_QUEEN_STAGE_NAMES[this.getPhase()] ?? DUCK_QUEEN_STAGE_NAMES.gentle}」`;
  }


  getTangerineCooldownMs(phase = this.getPhase()) {
    if (phase === 'frenzy') return Phaser.Math.Between(2300, 2900);
    if (phase === 'obsessed') return Phaser.Math.Between(2500, 3100);
    return Phaser.Math.Between(2700, 3300);
  }

  getTangerineCount(phase = this.getPhase()) {
    if (phase === 'frenzy') return 3;
    if (phase === 'obsessed') return 2;
    return 1;
  }

  isFrenzied() {
    return this.getPhase() === 'frenzy';
  }

  getCandyCount(phase = this.getPhase()) {
    if (phase === 'frenzy') return Phaser.Math.Between(5, 8);
    if (phase === 'obsessed') return Phaser.Math.Between(3, 5);
    return Phaser.Math.Between(2, 3);
  }

  getCandyCooldownMs(phase = this.getPhase()) {
    if (phase === 'frenzy') return Phaser.Math.Between(5200, 6200);
    if (phase === 'obsessed') return Phaser.Math.Between(5900, 6900);
    return Phaser.Math.Between(6600, 7800);
  }

  beginCandyCast(time, phase = this.getPhase()) {
    const durationMs = 720;
    this.candyCastUntil = time + durationMs;
    this.nextCandyAt = time + this.getCandyCooldownMs(phase);
    this.applyVisualState(this.getCandyVisualState(phase));

    this.scene.castDuckQueenCandy?.(this, phase, this.getCandyCount(phase));

    this.scene.time.delayedCall(durationMs, () => {
      if (this.active && !this.isDead && !this.scene.duckQueenGrappleActive) {
        this.applyPhaseVisual();
        this.resolveMajorSkill('candy', this.scene.time.now, { chainAllowed: true });
      }
    });
  }

  applyCruiseMotion(time = this.scene.time.now, phase = this.getPhase(), speedScale = 1) {
    if (!this.target?.active) return;

    if (this.body) {
      if (!this.body.enable) this.body.setEnable(true);
      this.body.moves = true;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const rawDistance = Math.hypot(dx, dy);
    const distance = Math.max(0.001, rawDistance);

    let toward;
    if (rawDistance <= 2.5) {
      if (this.lastCruiseDirection?.lengthSq?.() > 0.01) {
        toward = this.lastCruiseDirection.clone().normalize();
      } else {
        const angle = time * 0.0037;
        toward = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
      }
    } else {
      toward = new Phaser.Math.Vector2(dx / rawDistance, dy / rawDistance);
      this.lastCruiseDirection.copy(toward);
    }
    const tangent = new Phaser.Math.Vector2(-toward.y, toward.x);

    const desiredRadius = phase === 'frenzy' ? 104 : phase === 'obsessed' ? 122 : 148;
    const baseMultiplier = phase === 'frenzy'
      ? ENEMIES.duckQueen.frenzySpeedMultiplier
      : phase === 'obsessed'
        ? ENEMIES.duckQueen.obsessedSpeedMultiplier
        : ENEMIES.duckQueen.gentleSpeedMultiplier;
    const speed = this.baseMoveSpeed * baseMultiplier * speedScale;
    const orbitSign = Math.sin(time * (phase === 'frenzy' ? 0.0068 : 0.0048)) >= 0 ? 1 : -1;

    let vx;
    let vy;

    if (distance < desiredRadius * 0.78) {
      vx = -toward.x * speed * 0.72 + tangent.x * speed * 0.54 * orbitSign;
      vy = -toward.y * speed * 0.72 + tangent.y * speed * 0.54 * orbitSign;
    } else if (distance <= desiredRadius * 1.22) {
      const radial = Phaser.Math.Clamp((distance - desiredRadius) / desiredRadius, -0.35, 0.35);
      vx = tangent.x * speed * 0.78 * orbitSign + toward.x * speed * radial * 0.8;
      vy = tangent.y * speed * 0.78 * orbitSign + toward.y * speed * radial * 0.8;
    } else {
      const side = Math.sin(time * (phase === 'frenzy' ? 0.010 : 0.0045)) * (phase === 'frenzy' ? 0.32 : 0.22);
      vx = (toward.x - toward.y * side) * speed;
      vy = (toward.y + toward.x * side) * speed;
    }

    this.setVelocity(vx, vy);
    if (Math.hypot(vx, vy) > 2) {
      this.lastCruiseDirection.set(vx, vy).normalize();
    }
  }

  ensureContinuousMotion(time = this.scene.time.now) {
    if (!this.active || this.isDead || !this.target?.active) return;
    if (this.scene?.duckQueenUltimateActive) {
      this.setVelocity(0, 0);
      return;
    }
    if (this.scene?.duckQueenGrappleActive) return;

    if (this.body) {
      if (!this.body.enable) this.body.setEnable(true);
      this.body.moves = true;
    }

    const vx = Number(this.body?.velocity?.x ?? 0);
    const vy = Number(this.body?.velocity?.y ?? 0);
    if ((vx * vx + vy * vy) > 9) return;

    const phase = this.getPhase();
    let speedScale = 1;
    if (this.scene?.duckQueenFishNetActive) speedScale = 0.34;
    else if (this.scene?.duckQueenCharmSpell) speedScale = 0.46;
    else if (this.isStunned(time)) speedScale = 0.20;
    else if (time < this.candyCastUntil || time < this.tangerineCastUntil || time < this.charmCastUntil) speedScale = 0.42;

    this.applyCruiseMotion(time, phase, speedScale);
  }

  resetMajorActionScheduler(time = this.scene.time.now, cooldownMs = 0) {
    this.majorActionPlan = null;
    this.activeMajorSkill = null;
    this.activeMajorSkillStartedAt = -Infinity;
    this.activeMajorSkillDeadline = -Infinity;
    this.stickActionAuthorizedUntil = -Infinity;
    this.majorActionCooldownUntil = time + Math.max(0, cooldownMs);
  }

  getMajorActionSingleSkills(time, phase, distance) {
    const skills = [];
    if (time >= this.nextCandyAt) skills.push('candy');

    if (phase !== 'gentle') {
      if (
        time >= this.nextCharmAt
        && !this.scene.duckQueenCharmSpell
        && time >= (this.scene.duckQueenCharmUntil ?? -Infinity)
      ) skills.push('charm');

      if (
        time >= this.nextFishSkillAt
        && !this.scene.duckQueenFishNetActive
        && distance >= ENEMIES.duckQueen.fishSkillDistance
      ) skills.push('fish');

      if (
        time >= this.nextStickDashAt
        && time >= this.grappleCooldownUntil
        && distance <= this.getStickTriggerRange(phase)
      ) skills.push('stick');
    }

    return skills;
  }

  isMajorSkillCooldownReady(skill, time, phase) {
    if (skill === 'candy') return time >= this.nextCandyAt;
    if (phase === 'gentle') return false;
    if (skill === 'charm') {
      return (
        time >= this.nextCharmAt
        && !this.scene.duckQueenCharmSpell
        && time >= (this.scene.duckQueenCharmUntil ?? -Infinity)
      );
    }
    if (skill === 'fish') return time >= this.nextFishSkillAt && !this.scene.duckQueenFishNetActive;
    if (skill === 'stick') return time >= this.nextStickDashAt && time >= this.grappleCooldownUntil;
    return false;
  }

  isMajorSkillExecutable(skill, time, phase, distance) {
    if (!this.isMajorSkillCooldownReady(skill, time, phase)) return false;
    if (skill === 'fish') return distance >= ENEMIES.duckQueen.fishSkillDistance;
    if (skill === 'stick') return distance <= this.getStickTriggerRange(phase);
    return true;
  }

  chooseWeightedMajorAction(entries) {
    const usable = entries.filter((entry) => entry.weight > 0);
    if (!usable.length) return null;
    const total = usable.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Phaser.Math.FloatBetween(0, total);
    for (const entry of usable) {
      roll -= entry.weight;
      if (roll <= 0) return entry;
    }
    return usable[usable.length - 1] ?? null;
  }

  chooseMajorActionPlan(time, phase, distance) {
    const singles = this.getMajorActionSingleSkills(time, phase, distance);
    const choices = [];

    if (singles.length) {
      choices.push({
        kind: 'single',
        weight: ENEMIES.duckQueen.singleActionWeight ?? 70,
        skills: singles
      });
    }

    if (phase !== 'gentle' && distance >= ENEMIES.duckQueen.fishSkillDistance) {
      const charmReady = this.isMajorSkillCooldownReady('charm', time, phase);
      const fishReady = this.isMajorSkillCooldownReady('fish', time, phase);
      const stickReady = this.isMajorSkillCooldownReady('stick', time, phase);

      if (charmReady && fishReady) {
        choices.push({
          kind: 'combo',
          name: 'charm_fish',
          weight: ENEMIES.duckQueen.comboCharmFishWeight ?? 12,
          steps: ['charm', 'fish']
        });
      }

      if (fishReady && stickReady) {
        choices.push({
          kind: 'combo',
          name: 'fish_stick',
          weight: ENEMIES.duckQueen.comboFishStickWeight ?? 13,
          steps: ['fish', 'stick']
        });
      }

      if (charmReady && fishReady && stickReady) {
        choices.push({
          kind: 'combo',
          name: 'charm_fish_stick',
          weight: ENEMIES.duckQueen.comboCharmFishStickWeight ?? 5,
          steps: ['charm', 'fish', 'stick']
        });
      }
    }

    const comboWeightMultiplier = Number(this.scene.difficultyProfile?.bossComboWeightMultiplier) || 1;
    choices.forEach((entry) => {
      if (entry.kind === 'combo') entry.weight *= comboWeightMultiplier;
    });
    const selected = this.chooseWeightedMajorAction(choices);
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

  getMajorActionCooldownMs(stepCount = 1) {
    const difficultyScale = Number(this.scene.difficultyProfile?.bossActionCooldownMultiplier) || 1;
    let cooldown;
    if (stepCount <= 1) {
      cooldown = Phaser.Math.Between(
        ENEMIES.duckQueen.singleActionCooldownMinMs ?? 2300,
        ENEMIES.duckQueen.singleActionCooldownMaxMs ?? 3100
      );
    } else {
      const base = ENEMIES.duckQueen.comboActionCooldownBaseMs ?? 2200;
      const perStep = ENEMIES.duckQueen.comboActionCooldownPerStepMs ?? 650;
      const jitter = ENEMIES.duckQueen.comboActionCooldownJitterMs ?? 450;
      cooldown = base + stepCount * perStep + Phaser.Math.Between(0, jitter);
    }
    return Math.max(350, Math.round(cooldown * difficultyScale));
  }

  finishMajorActionPlan(time = this.scene.time.now) {
    const stepCount = this.majorActionPlan?.steps?.length ?? 1;
    this.majorActionPlan = null;
    this.activeMajorSkill = null;
    this.activeMajorSkillStartedAt = -Infinity;
    this.activeMajorSkillDeadline = -Infinity;
    this.stickActionAuthorizedUntil = -Infinity;
    this.majorActionCooldownUntil = time + this.getMajorActionCooldownMs(stepCount);
  }

  abortMajorActionPlan(time = this.scene.time.now) {
    this.finishMajorActionPlan(time);
  }

  resolveMajorSkill(skill, time = this.scene.time.now, { chainAllowed = true } = {}) {
    if (this.activeMajorSkill !== skill) return false;

    this.activeMajorSkill = null;
    this.activeMajorSkillStartedAt = -Infinity;
    this.activeMajorSkillDeadline = -Infinity;
    if (skill === 'stick') this.stickActionAuthorizedUntil = -Infinity;

    const plan = this.majorActionPlan;
    if (!plan) {
      this.majorActionCooldownUntil = time + this.getMajorActionCooldownMs(1);
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
      ENEMIES.duckQueen.comboStepGapMinMs ?? 850,
      ENEMIES.duckQueen.comboStepGapMaxMs ?? 1250
    );
    return true;
  }

  isStickActionAuthorized(time = this.scene.time.now) {
    return this.activeMajorSkill === 'stick' && time <= this.stickActionAuthorizedUntil;
  }

  executeMajorSkill(skill, time, phase, distance) {
    if (!this.isMajorSkillExecutable(skill, time, phase, distance)) return false;

    this.activeMajorSkill = skill;
    this.activeMajorSkillStartedAt = time;

    if (skill === 'charm') {
      this.nextCharmAt = time + (ENEMIES.duckQueen.charmSkillCooldownMs ?? 6800);
      this.charmCastUntil = time + (ENEMIES.duckQueen.charmCastMs ?? 620);
      this.activeMajorSkillDeadline = time + (ENEMIES.duckQueen.charmCastMs ?? 620) + 1400;
      if (this.scene.triggerDuckQueenCharm?.(this, time)) return true;
    } else if (skill === 'fish') {
      this.nextFishSkillAt = time + (
        phase === 'frenzy'
          ? Math.round(ENEMIES.duckQueen.fishSkillCooldownMs * 0.82)
          : ENEMIES.duckQueen.fishSkillCooldownMs
      );
      this.activeMajorSkillDeadline = time + 15000;
      if (this.scene.triggerFishFeast?.(this)) return true;
    } else if (skill === 'stick') {
      this.activeMajorSkillDeadline = time + 8000;
      this.beginStickDash(time, phase);
      this.stickActionAuthorizedUntil = this.attachAttemptUntil + 120;
      return true;
    } else if (skill === 'candy') {
      this.activeMajorSkillDeadline = time + 1800;
      this.beginCandyCast(time, phase);
      return true;
    }

    this.activeMajorSkill = null;
    this.activeMajorSkillStartedAt = -Infinity;
    this.activeMajorSkillDeadline = -Infinity;
    return false;
  }

  updateMajorActionScheduler(time, phase, distance) {
    if (this.activeMajorSkill) {
      if (
        this.activeMajorSkill === 'stick'
        && !this.scene.duckQueenGrappleActive
        && time > this.attachAttemptUntil
      ) {
        this.resolveMajorSkill('stick', time, { chainAllowed: false });
        return true;
      }

      if (
        Number.isFinite(this.activeMajorSkillDeadline)
        && time > this.activeMajorSkillDeadline
        && !this.scene.duckQueenGrappleActive
        && !this.scene.duckQueenFishNetActive
        && !this.scene.duckQueenCharmSpell
      ) {
        this.abortMajorActionPlan(time);
      }
      return true;
    }

    if (this.majorActionPlan) {
      if (time < this.majorActionPlan.waitingUntil) return true;
      const nextSkill = this.majorActionPlan.steps[this.majorActionPlan.index];
      if (!this.executeMajorSkill(nextSkill, time, phase, distance)) {
        this.abortMajorActionPlan(time);
      }
      return true;
    }

    if (time < this.majorActionCooldownUntil) return false;

    const plan = this.chooseMajorActionPlan(time, phase, distance);
    if (!plan) return false;
    this.majorActionPlan = plan;
    if (!this.executeMajorSkill(plan.steps[0], time, phase, distance)) {
      this.abortMajorActionPlan(time);
    }
    return true;
  }

  canAttemptUltimate(time = this.scene.time.now, phase = this.getPhase()) {
    if (phase !== 'frenzy') return false;
    if (this.scene?.duckQueenUltimateActive) return false;
    if (this.majorActionPlan || this.activeMajorSkill) return false;
    if (time < this.majorActionCooldownUntil) return false;
    if (time < (this.ultimateCooldownUntil ?? -Infinity)) return false;
    if (this.scene?.duckQueenGrappleActive || this.scene?.duckQueenFishNetActive || this.scene?.duckQueenCharmSpell) return false;
    return true;
  }

  tryStartUltimate(time = this.scene.time.now, phase = this.getPhase()) {
    if (!this.canAttemptUltimate(time, phase)) return false;

    const chance = Phaser.Math.Clamp(ENEMIES.duckQueen.ultimateRollChance ?? 0.18, 0, 1);
    if (Math.random() >= chance) {
      this.ultimateCooldownUntil = time + (ENEMIES.duckQueen.ultimateRetryDelayMs ?? 2400);
      return false;
    }

    this.resetMajorActionScheduler(time, ENEMIES.duckQueen.ultimatePostRecoveryMs ?? 4500);
    return Boolean(this.scene.startDuckQueenUltimate?.(this));
  }

  registerUltimateCompleted(time = this.scene.time.now) {
    const minMs = ENEMIES.duckQueen.ultimateCooldownMinMs ?? 18000;
    const maxMs = Math.max(minMs, ENEMIES.duckQueen.ultimateCooldownMaxMs ?? 24000);
    this.ultimateCooldownUntil = time + Phaser.Math.Between(minMs, maxMs);
    this.resetMajorActionScheduler(time, ENEMIES.duckQueen.ultimatePostRecoveryMs ?? 4500);
    this.frenzyMoodState = 's3_mood_normal';
    this.nextFrenzyMoodSwapAt = time + Phaser.Math.Between(520, 780);
  }

  updateAI(time = 0) {
    if (!this.active || this.isDead || !this.target?.active) return;
    this.updateStatusCore(time);

    const phase = this.getPhase();

    if (phase !== this.currentPhase) {
      this.currentPhase = phase;
      if (phase !== 'frenzy') this.frenzyMoodState = 's3_normal';
      this.applyPhaseVisual();
      this.scene.onDuckQueenPhaseChanged?.(this, phase);
      this.nextFrenzyMoodSwapAt = time + Phaser.Math.Between(260, 520);
      if (phase === 'gentle') {
        this.nextCharmAt = Infinity;
      } else if (!Number.isFinite(this.nextCharmAt)) {
        this.nextCharmAt = time + 900;
      }
      if (phase === 'frenzy') {
        this.ultimateCooldownUntil = Math.max(
          this.ultimateCooldownUntil ?? -Infinity,
          time + (ENEMIES.duckQueen.ultimatePhaseEntryDelayMs ?? 5200)
        );
      }
    }

    if (this.scene.duckQueenUltimateActive) {
      this.setVelocity(0, 0);
      return;
    }

    this.updateFrenzyMood(time);

    if (this.scene.duckQueenGrappleActive) {
      if (phase === 'gentle') {
        this.scene.endDuckQueenGrapple?.(false);
        this.resumeRoamingState(time);
      } else {
        this.setVelocity(0, 0);
        return;
      }
    }

    if (this.scene.duckQueenFishNetActive) {
      this.applyCruiseMotion(time, phase, 0.34);
      return;
    }

    if (this.scene.duckQueenCharmSpell) {
      this.applyCruiseMotion(time, phase, 0.46);
      return;
    }

    if (time < this.postGrappleRoamUntil) {
      this.applyCruiseMotion(time, phase, 1.08);
      return;
    }

    if (this.isStunned(time)) {
      this.applyCruiseMotion(time, phase, 0.20);
      return;
    }

    if (time < this.candyCastUntil || time < this.tangerineCastUntil || time < this.charmCastUntil) {
      this.applyCruiseMotion(time, phase, 0.42);
      return;
    }

    this.setFlipX(this.target.x < this.x);

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y
    );

    if (this.tryStartUltimate(time, phase)) return;

    const majorActionHandled = this.updateMajorActionScheduler(time, phase, distance);

    if (time < this.stickDashUntil) {
      const dash = new Phaser.Math.Vector2(
        this.target.x - this.x,
        this.target.y - this.y
      );

      if (dash.lengthSq() > 1) {
        dash.normalize().scale(this.getStickDashSpeed(phase));
        this.setVelocity(dash.x, dash.y);
      }

      return;
    }

    if (majorActionHandled) {
      this.applyCruiseMotion(time, phase, 0.92);
      return;
    }

    if (time >= this.nextTangerineAt) {
      this.nextTangerineAt = time + this.getTangerineCooldownMs(phase);
      this.tangerineCastUntil = time + 300;
      this.applyCruiseMotion(time, phase, 0.50);

      this.scene.throwDuckQueenTangerineVolley?.(this, phase, this.getTangerineCount(phase));
      return;
    }

    if (
      !this.scene.duckQueenGrappleActive
      && phase !== 'frenzy'
      && this.visualState?.includes('tietie')
    ) {
      this.applyPhaseVisual();
    }

    this.applyCruiseMotion(time, phase, 1);
  }

  getStickTriggerRange(phase = this.getPhase()) {
    if (phase === 'obsessed') return ENEMIES.duckQueen.obsessedStickTriggerRange;
    if (phase === 'frenzy') return ENEMIES.duckQueen.frenzyStickTriggerRange;
    return ENEMIES.duckQueen.gentleStickTriggerRange;
  }

  getStickCooldown(phase = this.getPhase()) {
    if (phase === 'obsessed') return ENEMIES.duckQueen.obsessedStickCooldownMs;
    if (phase === 'frenzy') return ENEMIES.duckQueen.frenzyStickCooldownMs;
    return ENEMIES.duckQueen.gentleStickCooldownMs;
  }

  getStickDashSpeed(phase = this.getPhase()) {
    if (phase === 'obsessed') return ENEMIES.duckQueen.obsessedStickDashSpeed;
    if (phase === 'frenzy') return ENEMIES.duckQueen.frenzyStickDashSpeed;
    return ENEMIES.duckQueen.gentleStickDashSpeed;
  }

  beginStickDash(time, phase = this.getPhase()) {
    this.applyVisualState(this.getTietieVisualState(phase));
    this.scene.markDuckQueenMinionReaction?.('tietie', phase, 1250);
    this.nextStickDashAt = time + this.getStickCooldown(phase);
    this.stickDashUntil =
      time + ENEMIES.duckQueen.stickDashDurationMs;
    this.attachAttemptUntil =
      time + ENEMIES.duckQueen.stickDashDurationMs + 250;

    this.scene.showSkillImportantWorldText?.(
      this,
      '「💕 贴贴」',
      '#ff9fd1',
      20,
      { priority: 78, yOffset: 68 }
    );
  }

  canAttachNow(time = this.scene.time.now, distance = Infinity) {
    return (
      this.isStickActionAuthorized(time)
      && time >= this.grappleCooldownUntil
      && (distance <= this.attachDistance || time <= this.attachAttemptUntil)
    );
  }

  beginFishRush(time = this.scene.time.now) {
    this.fishRushUntil =
      time + ENEMIES.duckQueen.fishRushDurationMs;
    this.attachAttemptUntil =
      time + ENEMIES.duckQueen.fishRushDurationMs + 350;
  }

  onGrappleBroken(time = this.scene.time.now) {
    this.grappleCooldownUntil =
      time + ENEMIES.duckQueen.grappleReattachCooldownMs;
    this.stickDashUntil = -Infinity;
    this.fishRushUntil = -Infinity;
    this.attachAttemptUntil = -Infinity;
    this.nextStickDashAt = Math.max(
      this.nextStickDashAt,
      this.grappleCooldownUntil
    );
  }

  receiveDamage(amount) {
    if (this.isDead) return false;

    const effectiveDamage = Math.max(
      1,
      Math.round(amount * (1 - this.defense))
    );

    let remaining = effectiveDamage;

    if (this.armorHp > 0) {
      const armorDamage = Math.min(this.armorHp, remaining);
      this.armorHp -= armorDamage;
      remaining -= armorDamage;
    }

    if (remaining > 0) this.hp -= remaining;

    this.scene.tweens.killTweensOf(this);
    this.setAlpha(0.48);
    this.scene.time.delayedCall(70, () => {
      if (this.active && !this.isDead) this.setAlpha(1);
    });

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      return true;
    }

    return false;
  }

  healFromDrain(amount) {
    if (amount <= 0) return 0;

    if (this.armorHp > 0) {
      const before = this.armorHp;
      this.armorHp = Math.min(this.maxArmorHp, this.armorHp + amount);
      return this.armorHp - before;
    }

    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - before;
  }

  applyStun(durationMs, now = this.scene.time.now) {
    super.applyStun(Math.round(durationMs * 0.5), now);
  }

  destroy(fromScene) {
    super.destroy(fromScene);
  }
}
