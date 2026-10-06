import { PLAYER } from '../config/gameConfig.js?v=2.0.0';

const BPM = 120;
const QUARTER_MS = 60000 / BPM;
const EIGHTH_MS = QUARTER_MS / 2;
const BAR_MS = QUARTER_MS * 4;

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

    return 'combo';
  }

  determineHealthPressureState(hpRatio) {
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
