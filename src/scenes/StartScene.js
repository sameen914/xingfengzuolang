import Phaser from 'phaser';
import { GAME, RELEASE, DIFFICULTY_PROFILES } from '../config/gameConfig.js';

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  preload() {
    // v1.1.0：标题页直接复用正常游戏的 Combo BGM。
    // 使用独立 key，避免标题页 Sound 与 GameScene 的 AdaptiveMusicSystem 共用实例。
    this.ensureBootLoadingOverlay({ hidden: false, copy: '正在加载标题资源…' });
    this.bindStartLoadingProgress();
    this.load.audio('menuGameplayMusic', 'assets/audio/adaptive/01_combo_smooth.wav');
  }

  create() {
    this.transitioningToGame = false;
    this.ensureBootLoadingOverlay({ hidden: true, copy: '正在兴风作浪……资源加载中' });
    this.cameras.main.setBackgroundColor('#08101b');

    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x0b1727, 0x10253a, 0x060b13, 0x091522, 1);
    bg.fillRect(0, 0, GAME.WIDTH, GAME.HEIGHT);

    // 低调的舞台光，不抢难度选择本身。
    for (let i = 0; i < 8; i += 1) {
      const x = 100 + i * 112;
      bg.fillStyle(i % 2 === 0 ? 0x183a55 : 0x122c42, 0.16);
      bg.fillEllipse(x, 260, 150, 420);
    }

    this.add.text(GAME.WIDTH / 2, 88, '兴风作浪', {
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#f4fbff',
      stroke: '#17324c',
      strokeThickness: 7
    }).setOrigin(0.5);

    this.add.text(GAME.WIDTH / 2, 137, RELEASE.BUILD_LABEL, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#94d5f3'
    }).setOrigin(0.5);

    this.add.text(GAME.WIDTH / 2, 202, '请选择游戏难度', {
      fontSize: '27px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#142334',
      strokeThickness: 5
    }).setOrigin(0.5);

    const options = [
      { key: 'easy', y: 286 },
      { key: 'normal', y: 366 },
      { key: 'hard', y: 446 }
    ];

    options.forEach(({ key, y }) => {
      const profile = DIFFICULTY_PROFILES[key];
      this.createDifficultyButton(GAME.WIDTH / 2, y, profile);
    });

    this.startMenuMusic();

    // 浏览器若阻止自动播放，第一次用户手势后补启标题 BGM。
    this.input.once('pointerdown', () => this.startMenuMusic());
    this.input.keyboard.once('keydown', () => this.startMenuMusic());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopMenuMusic();
    });
  }

  ensureBootLoadingOverlay({ hidden = false, copy = '正在兴风作浪……资源加载中' } = {}) {
    if (typeof document === 'undefined') return null;

    let root = document.getElementById('boot-loading');
    if (!root) {
      root = document.createElement('div');
      root.id = 'boot-loading';
      root.setAttribute('aria-live', 'polite');
      root.innerHTML = `
        <div class="boot-loading-card">
          <div class="boot-loading-title">兴风作浪</div>
          <div class="boot-loading-copy">${copy}</div>
          <div class="boot-wave" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
          <div class="boot-loading-track"><div id="boot-loading-fill"></div></div>
          <div id="boot-loading-percent">0%</div>
        </div>
      `;
      document.body.appendChild(root);
    }

    const copyNode = root.querySelector('.boot-loading-copy');
    if (copyNode) copyNode.textContent = copy;
    const percent = root.querySelector('#boot-loading-percent');
    const fill = root.querySelector('#boot-loading-fill');
    if (percent) percent.textContent = '0%';
    if (fill) fill.style.transform = 'scaleX(0)';

    root.classList.remove('boot-loading-complete');
    root.classList.toggle('boot-loading-hidden', Boolean(hidden));
    return root;
  }

  bindStartLoadingProgress() {
    if (typeof document === 'undefined') return;
    const root = document.getElementById('boot-loading');
    const percent = document.getElementById('boot-loading-percent');
    const fill = document.getElementById('boot-loading-fill');
    if (!root) return;

    const update = (value = 0) => {
      const safe = Phaser.Math.Clamp(Number(value) || 0, 0, 1);
      if (percent) percent.textContent = `${Math.round(safe * 100)}%`;
      if (fill) fill.style.transform = `scaleX(${safe})`;
    };

    update(0);
    this.load.on('progress', update);
    this.load.once('complete', () => update(1));
  }

  showGameResourceLoading() {
    return this.ensureBootLoadingOverlay({
      hidden: false,
      copy: '正在加载游戏资源…'
    });
  }

  startMenuMusic() {
    if (this.transitioningToGame) return null;
    if (!this.cache?.audio?.exists?.('menuGameplayMusic')) return null;

    this.sound?.unlock?.();
    if (!this.menuGameplayMusic) {
      this.menuGameplayMusic = this.sound.add('menuGameplayMusic', {
        loop: true,
        volume: 0.43
      });
    }

    if (!this.menuGameplayMusic.isPlaying && !this.menuGameplayMusic.isPaused) {
      try {
        this.menuGameplayMusic.play();
      } catch (_) {}
    }
    return this.menuGameplayMusic;
  }

  stopMenuMusic() {
    const sound = this.menuGameplayMusic;
    this.menuGameplayMusic = null;
    if (!sound) return;
    try {
      sound.stop();
      sound.destroy();
    } catch (_) {}
  }

  beginGameWithDifficulty(profile) {
    if (this.transitioningToGame) return;
    this.transitioningToGame = true;

    this.sound?.unlock?.();
    this.registry.set('selectedDifficulty', profile.key);
    this.registry.set('launchedFromStartScene', true);
    this.registry.set('internalTestAutoStart', true);
    this.registry.set('internalTestForceTitle', false);

    // 先把加载页盖上，再真正启动 GameScene。这样即使大量 PNG / 音频需要加载，
    // 玩家也始终看到明确的资源加载反馈，不会出现难度页消失后的空白档。
    this.showGameResourceLoading();

    const sound = this.menuGameplayMusic;
    if (sound && (sound.isPlaying || sound.isPaused)) {
      if (sound.isPaused) sound.resume();
      this.tweens.add({
        targets: sound,
        volume: 0,
        duration: 120,
        onComplete: () => this.stopMenuMusic()
      });
    }

    // 给 DOM 一个绘制机会，确保加载页先显示，再切场景触发 GameScene.preload()。
    this.time.delayedCall(90, () => {
      this.scene.start('GameScene', { difficulty: profile.key });
    });
  }

  createDifficultyButton(x, y, profile) {
    const width = 430;
    const height = 66;
    const panel = this.add.rectangle(x, y, width, height, 0x102238, 0.94)
      .setStrokeStyle(2, 0x5d7e9a, 0.72)
      .setInteractive({ useHandCursor: true });

    // v1.1.2：中文字体再缩小一级，并显式增加 Text texture padding。
    // 只移动 y 坐标不能解决部分浏览器 / 中文字体的 glyph 上下缘被裁问题，padding 才是根治。
    const label = this.add.text(x - 160, y - 2, profile.label, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: profile.key === 'hard' ? '#ffd7cf' : '#f5fbff'
    }).setOrigin(0, 0.5).setPadding(2, 6, 2, 6);

    const description = this.add.text(x - 58, y + 16, profile.description, {
      fontSize: '10px',
      color: '#9eb4c8'
    }).setOrigin(0, 0.5).setPadding(2, 5, 2, 5);

    const arrow = this.add.text(x + 172, y + 3, '›', {
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#94d5f3'
    }).setOrigin(0.5);

    const setHover = (hovered) => {
      panel.setFillStyle(hovered ? 0x183753 : 0x102238, hovered ? 1 : 0.94);
      panel.setStrokeStyle(hovered ? 3 : 2, hovered ? 0x94d5f3 : 0x5d7e9a, hovered ? 0.95 : 0.72);
      arrow.setX(x + (hovered ? 180 : 172));
    };

    panel.on('pointerover', () => setHover(true));
    panel.on('pointerout', () => setHover(false));
    panel.on('pointerdown', () => this.beginGameWithDifficulty(profile));

    return { panel, label, description, arrow };
  }
}
