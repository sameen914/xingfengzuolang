import * as Phaser from 'phaser';
import StartScene from './scenes/StartScene.js?v=2.0.0';
import GameScene from './scenes/GameScene.js?v=2.0.0';
const isNativeAndroid = (() => {
  try {
    const platform = globalThis?.Capacitor?.getPlatform?.();
    if (platform === 'android') return true;
  } catch (_) {}
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /Android/i.test(ua) && /;\s*wv\)/i.test(ua);
})();

if (isNativeAndroid && typeof document !== 'undefined') {
  document.documentElement.classList.add('native-android');
}

function getUsableViewportRect() {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0, width: 960, height: 540 };
  }

  const vv = window.visualViewport;
  const widthCandidates = [
    vv?.width,
    window.innerWidth,
    document?.documentElement?.clientWidth
  ].filter((value) => Number.isFinite(value) && value > 0);
  const heightCandidates = [
    vv?.height,
    window.innerHeight,
    document?.documentElement?.clientHeight
  ].filter((value) => Number.isFinite(value) && value > 0);

  const width = Math.max(1, Math.floor(widthCandidates.length ? Math.min(...widthCandidates) : 960));
  const height = Math.max(1, Math.floor(heightCandidates.length ? Math.min(...heightCandidates) : 540));
  const x = Math.max(0, Math.floor(Number(vv?.offsetLeft) || 0));
  const y = Math.max(0, Math.floor(Number(vv?.offsetTop) || 0));

  return { x, y, width, height };
}

function syncGameContainerToViewport() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('game-container');
  const loading = document.getElementById('boot-loading');
  if (!container) return;

  const view = getUsableViewportRect();
  for (const el of [container, loading]) {
    if (!el) continue;
    el.style.left = `${view.x}px`;
    el.style.top = `${view.y}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.width = `${view.width}px`;
    el.style.height = `${view.height}px`;
  }

  document.documentElement.style.setProperty('--viewport-x', `${view.x}px`);
  document.documentElement.style.setProperty('--viewport-y', `${view.y}px`);
  document.documentElement.style.setProperty('--viewport-width', `${view.width}px`);
  document.documentElement.style.setProperty('--viewport-height', `${view.height}px`);
}

syncGameContainerToViewport();

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#20242c',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
    expandParent: false
  },
  scene: [StartScene, GameScene]
};

const game = new Phaser.Game(config);

function refreshViewportLayout() {
  if (isNativeAndroid) {
    try {
      const orientationLock = globalThis?.screen?.orientation?.lock?.('landscape');
      orientationLock?.catch?.(() => {});
    } catch (_) {}
  }

  const refresh = () => {
    syncGameContainerToViewport();
    try { game.scale?.refresh?.(); } catch (_) {}
  };

  requestAnimationFrame(refresh);
  setTimeout(refresh, 80);
  setTimeout(refresh, 260);
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', refreshViewportLayout, { passive: true });
  window.addEventListener('orientationchange', refreshViewportLayout, { passive: true });
  window.addEventListener('focus', refreshViewportLayout, { passive: true });
  window.addEventListener('pageshow', refreshViewportLayout, { passive: true });

  window.visualViewport?.addEventListener?.('resize', refreshViewportLayout, { passive: true });
  window.visualViewport?.addEventListener?.('scroll', refreshViewportLayout, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshViewportLayout();
  });

  refreshViewportLayout();
}
