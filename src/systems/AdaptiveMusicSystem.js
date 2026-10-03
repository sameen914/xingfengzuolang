import { PLAYER } from '../config/gameConfig.js';

const BPM = 120;
const QUARTER_MS = 60000 / BPM; // 500 ms
const EIGHTH_MS = QUARTER_MS / 2; // 250 ms
const BAR_MS = QUARTER_MS * 4; // 2000 ms

const TRACKS = {
  combo: { key: 'musicCombo', volume: 0.43, loop: true, priority: 10 },
  critical_hp: { key: 'musicCriticalHp', volume: 0.43, loop: true, priority: 35 },
  elite: { key: 'musicElite', volume: 0.44, loop: true, priority: 40 },
  boss_appear: { key: 'musicBossAppear', volume: 0.47, loop: false, priority: 90, cue: true },
  boss_defeated: { key: 'musicBossDefeated', volume: 0.47, loop: false, priority: 95, cue: true },
  defeat: { key: 'musicDefeat', volume: 0.45, loop: false, priority: 100, cue: true }
};

const HEALTH_MUSIC = {
  CRITICAL_ENTER: 0.30,
  CRITICAL_EXIT: 0.35
};

/**
 * Prototype 0.9.0 adaptive BGM controller.
 *
 * Important design rule: game rhythm owns the clock; individual audio files do not.
 * All tracks were authored at 120 BPM and begin on a downbeat. Normal state changes
 * only happen on bar boundaries, so Perfect Dodge / Combo never drifts when music changes.
 */
export default class AdaptiveMusicSystem {
  constructor(scene) {
    this.scene = scene;
    this.sounds = {};
    this.started = false;
    this.paused = false;

    this.clockStartGameplayMs = 0;
    this.audioClockStartSec = null;
    this.audioPausedAccumSec = 0;
    this.audioPauseStartedSec = null;

    this.currentState = null;
    this.currentSound = null;
    this.pendingState = null;
    this.pendingSwitchClockMs = null;

    this.stateEnteredClockMs = 0;
    this.minStateHoldMs = 4000;
    this.cueActive = false;
    this.terminalCue = false;
    this.lastDynamicEvaluationAt = -Infinity;
    this.healthPressureState = 'normal';
  }

  create() {
    Object.entries(TRACKS).forEach(([state, config]) => {
      this.sounds[state] = this.scene.sound.add(config.key, {
        loop: config.loop,
        volume: config.volume
      });
    });
  }

  start() {
    if (this.started) return;

    this.started = true;
    this.clockStartGameplayMs = this.scene.gameplayElapsedMs ?? 0;

    // 0.9.1：优先使用 WebAudio 的高精度时钟。
    // 游戏帧掉帧时，蓝光与 Perfect Dodge 仍读取真实音频相位，不累积漂移。
    const audioContext = this.scene.sound?.context;
    this.audioClockStartSec = Number.isFinite(audioContext?.currentTime)
      ? audioContext.currentTime
      : null;
    this.audioPausedAccumSec = 0;
    this.audioPauseStartedSec = null;
    this.healthPressureState = 'normal';

    this.switchNow('combo', { fadeMs: 0 });
  }

  stopAll() {
    Object.values(this.sounds).forEach((sound) => {
      if (sound?.isPlaying || sound?.isPaused) sound.stop();
    });
    this.currentSound = null;
    this.currentState = null;
    this.pendingState = null;
    this.started = false;
    this.audioClockStartSec = null;
    this.audioPausedAccumSec = 0;
    this.audioPauseStartedSec = null;
    this.healthPressureState = 'normal';
  }

  pause() {
    if (!this.started || this.paused) return;
    this.paused = true;

    const audioContext = this.scene.sound?.context;
    if (
      this.audioClockStartSec !== null
      && Number.isFinite(audioContext?.currentTime)
    ) {
      this.audioPauseStartedSec = audioContext.currentTime;
    }

    Object.values(this.sounds).forEach((sound) => {
      if (sound?.isPlaying) sound.pause();
    });
  }

  resume() {
    if (!this.started || !this.paused) return;

    const audioContext = this.scene.sound?.context;
    if (
      this.audioPauseStartedSec !== null
      && Number.isFinite(audioContext?.currentTime)
    ) {
      this.audioPausedAccumSec += Math.max(
        0,
        audioContext.currentTime - this.audioPauseStartedSec
      );
    }
    this.audioPauseStartedSec = null;
    this.paused = false;

    if (this.currentSound?.isPaused) this.currentSound.resume();
  }

  getClockMs() {
    if (!this.started) return null;

    const audioContext = this.scene.sound?.context;
    if (
      this.audioClockStartSec !== null
      && Number.isFinite(audioContext?.currentTime)
    ) {
      const clockNow = (
        this.paused
        && this.audioPauseStartedSec !== null
      )
        ? this.audioPauseStartedSec
        : audioContext.currentTime;

      return Math.max(
        0,
        (
          clockNow
          - this.audioClockStartSec
          - this.audioPausedAccumSec
        ) * 1000
      );
    }

    // HTML5Audio / 非 WebAudio 环境回退到游戏时钟。
    return Math.max(
      0,
      (this.scene.gameplayElapsedMs ?? 0) - this.clockStartGameplayMs
    );
  }

  getNextGridBoundaryMs(gridMs = BAR_MS) {
    const clock = this.getClockMs() ?? 0;
    return Math.ceil((clock + 1) / gridMs) * gridMs;
  }

  update() {
    if (!this.started || this.paused || this.terminalCue) return;

    this.updateBeatVisuals();

    const clock = this.getClockMs();
    if (clock === null) return;

    if (
      this.pendingState
      && this.pendingSwitchClockMs !== null
      && clock >= this.pendingSwitchClockMs
    ) {
      const next = this.pendingState;
      this.pendingState = null;
      this.pendingSwitchClockMs = null;
      this.switchNow(next);
    }

    if (this.cueActive) return;

    if (clock - this.lastDynamicEvaluationAt < 250) return;
    this.lastDynamicEvaluationAt = clock;

    const dynamic = this.determineDynamicState();
    this.requestState(dynamic);
  }

  updateBeatVisuals() {
    const clock = this.getClockMs();
    if (clock === null) return;

    // 0.9.1：蓝光直接读取当前音乐相位，每帧重算。
    // 不再用“跨过某个时间点才触发 tween”的方式，因此不会累积视觉漂移。
    this.scene.updateBeatIndicator?.(clock);
  }

  getBeatMatch() {
    const clock = this.getClockMs();
    if (clock === null) return null;

    const nearestSubdivision = Math.round(clock / EIGHTH_MS);
    const targetMs = nearestSubdivision * EIGHTH_MS;
    const deltaMs = Math.abs(clock - targetMs);
    const strong = nearestSubdivision % 2 === 0;
    const windowMs = strong
      ? PLAYER.BEAT_STRONG_WINDOW_MS
      : PLAYER.BEAT_AUX_WINDOW_MS;

    if (deltaMs > windowMs) return null;

    return {
      index: nearestSubdivision,
      strong,
      deltaMs
    };
  }

  determineDynamicState() {
    const scene = this.scene;

    // Boss battle after the one-shot entrance cue uses the heavier elite language.
    if (scene.bossActive) return 'elite';

    let eliteAlive = false;
    scene.enemies?.children?.iterate((enemy) => {
      if (
        enemy?.active
        && !enemy.isDead
        && enemy.isElite
        && !['duckQueen', 'potatoCommander'].includes(enemy.enemyType)
      ) {
        eliteAlive = true;
      }
    });
    if (eliteAlive) return 'elite';

    const hpRatio = scene.player?.maxHp > 0
      ? Math.max(0, Math.min(1, scene.player.hp / scene.player.maxHp))
      : 1;

    const healthState = this.determineHealthPressureState(hpRatio);
    if (healthState === 'critical') return 'critical_hp';

    // 0.9.2-dev05.1：怪物数量不再改变音乐；旧 low_hp 曲也不再使用。
    // HP < 30% 时直接切入原“怪潮”音乐，作为唯一低血量紧张层。
    return 'combo';
  }

  determineHealthPressureState(hpRatio) {
    // 单一低血量层：HP < 30% 进入危急音乐；回血超过 35% 后才退出，
    // 避免在 30% 附近波动时反复切歌。
    if (this.healthPressureState === 'critical') {
      if (hpRatio <= HEALTH_MUSIC.CRITICAL_EXIT) return 'critical';
      this.healthPressureState = 'normal';
      return 'normal';
    }

    if (hpRatio < HEALTH_MUSIC.CRITICAL_ENTER) {
      this.healthPressureState = 'critical';
      return 'critical';
    }

    this.healthPressureState = 'normal';
    return 'normal';
  }

  requestState(state, options = {}) {
    if (!TRACKS[state] || this.cueActive || this.terminalCue) return false;

    // 如果条件在真正切换前恢复，取消已经排队的旧状态。
    // 例如低血量触发后立刻捡到蓝心，不应在下一个小节仍切入低血音乐。
    if (state === this.currentState) {
      if (this.pendingState) {
        this.pendingState = null;
        this.pendingSwitchClockMs = null;
      }
      return false;
    }

    if (state === this.pendingState) return false;

    const clock = this.getClockMs() ?? 0;
    const currentPriority = TRACKS[this.currentState]?.priority ?? 0;
    const nextPriority = TRACKS[state].priority;
    const heldLongEnough = clock - this.stateEnteredClockMs >= this.minStateHoldMs;

    // Higher pressure can interrupt the hold period; relaxing to a lower state waits.
    if (!heldLongEnough && nextPriority <= currentPriority) return false;

    this.pendingState = state;
    this.pendingSwitchClockMs = options.nextBeat
      ? this.getNextGridBoundaryMs(QUARTER_MS)
      : this.getNextGridBoundaryMs(BAR_MS);

    return true;
  }

  triggerCue(state) {
    if (!TRACKS[state]?.cue || this.terminalCue) return false;

    this.cueActive = true;
    this.pendingState = state;
    // Boss cues should feel responsive but still remain tempo-aligned.
    this.pendingSwitchClockMs = this.getNextGridBoundaryMs(QUARTER_MS);
    return true;
  }

  playTerminalCue(state = 'defeat') {
    if (!TRACKS[state]) return;
    this.terminalCue = true;
    this.cueActive = true;
    this.pendingState = null;
    this.pendingSwitchClockMs = null;
    this.switchNow(state, { fadeMs: 120, terminal: true });
  }

  switchNow(state, options = {}) {
    const config = TRACKS[state];
    if (!config) return;

    const fadeMs = options.fadeMs ?? 260;
    const previous = this.currentSound;
    const next = this.sounds[state];

    if (!next) return;

    if (previous && previous !== next && (previous.isPlaying || previous.isPaused)) {
      if (previous.isPaused) previous.resume();
      this.scene.tweens.add({
        targets: previous,
        volume: 0,
        duration: fadeMs,
        onComplete: () => {
          previous.stop();
          const previousState = Object.keys(this.sounds)
            .find((key) => this.sounds[key] === previous);
          if (previousState && TRACKS[previousState]) {
            previous.setVolume(TRACKS[previousState].volume);
          }
        }
      });
    }

    if (next.isPlaying || next.isPaused) next.stop();
    next.setLoop(config.loop);
    next.setVolume(fadeMs > 0 ? 0 : config.volume);
    next.play();

    if (fadeMs > 0) {
      this.scene.tweens.add({
        targets: next,
        volume: config.volume,
        duration: fadeMs
      });
    }

    this.currentState = state;
    this.currentSound = next;
    this.stateEnteredClockMs = this.getClockMs() ?? 0;

    console.debug('[adaptive-music]', `state=${state}`);

    if (config.cue && !options.terminal) {
      next.once('complete', () => {
        if (this.currentSound !== next || this.terminalCue) return;
        this.cueActive = false;
        const fallback = this.determineDynamicState();
        this.pendingState = fallback;
        this.pendingSwitchClockMs = this.getNextGridBoundaryMs(QUARTER_MS);
      });
    }
  }
}

export const MUSIC_TIMING = {
  BPM,
  QUARTER_MS,
  EIGHTH_MS,
  BAR_MS
};
