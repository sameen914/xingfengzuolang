import * as Phaser from 'phaser';
import StartScene from './scenes/StartScene.js';
import GameScene from './scenes/GameScene.js';

const isNativeAndroid = (() => {
  try {
    const platform = globalThis?.Capacitor?.getPlatform?.();
    if (platform === 'android') return true;
  } catch (_) {}
  // Capacitor Android WebView fallback detection. Avoid matching ordinary Android Chrome.
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

  // Some in-app browsers report 100vh / 100dvh as the whole device screen even
  // while their own top/bottom chrome is visible. Use the smallest live viewport
  // measurement so the game never extends underneath browser UI.
  const width = Math.max(1, Math.floor(widthCandidates.length ? Math.min(...widthCandidates) : 960));
  const height = Math.max(1, Math.floor(heightCandidates.length ? Math.min(...heightCandidates) : 540));
  const x = Math.max(0, Math.floor(Number(vv?.offsetLeft) || 0));
  const y = Math.max(0, Math.floor(Number(vv?.offsetTop) || 0));

  return { x, y, width, height };
}

function syncGameContainerToViewport() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('game-container');
  if (!container) return;

  const view = getUsableViewportRect();
  container.style.left = `${view.x}px`;
  container.style.top = `${view.y}px`;
  container.style.right = 'auto';
  container.style.bottom = 'auto';
  container.style.width = `${view.width}px`;
  container.style.height = `${view.height}px`;

  document.documentElement.style.setProperty('--game-vv-width', `${view.width}px`);
  document.documentElement.style.setProperty('--game-vv-height', `${view.height}px`);
}

// Size the parent before Phaser measures it for the first time.
syncGameContainerToViewport();

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#20242c',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
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

// Refresh against the *actual visible viewport*, not the full device screen.
// This matters for mobile/in-app browsers whose own title/navigation bars stay visible.
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
  try { screen.orientation?.addEventListener?.('change', refreshViewportLayout); } catch (_) {}
  refreshViewportLayout();
}
