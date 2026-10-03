import Phaser from 'phaser';
import StartScene from './scenes/StartScene.js';
import GameScene from './scenes/GameScene.js';

let game = null;
let refreshQueued = false;

function getViewportMetrics() {
  const vv = window.visualViewport;
  const fallbackWidth = window.innerWidth || document.documentElement.clientWidth || 960;
  const fallbackHeight = window.innerHeight || document.documentElement.clientHeight || 540;

  return {
    x: Math.round(vv?.offsetLeft ?? 0),
    y: Math.round(vv?.offsetTop ?? 0),
    width: Math.max(1, Math.round(vv?.width ?? fallbackWidth)),
    height: Math.max(1, Math.round(vv?.height ?? fallbackHeight))
  };
}

function syncViewport() {
  const { x, y, width, height } = getViewportMetrics();
  const root = document.documentElement;
  root.style.setProperty('--viewport-x', `${x}px`);
  root.style.setProperty('--viewport-y', `${y}px`);
  root.style.setProperty('--viewport-width', `${width}px`);
  root.style.setProperty('--viewport-height', `${height}px`);

  if (!game || refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    game.scale?.refresh?.();
  });
}

syncViewport();

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
    height: 540
  },
  scene: [StartScene, GameScene]
};

game = new Phaser.Game(config);
syncViewport();

window.addEventListener('resize', syncViewport, { passive: true });
window.addEventListener('orientationchange', syncViewport, { passive: true });
window.addEventListener('pageshow', syncViewport, { passive: true });
window.addEventListener('focus', syncViewport, { passive: true });

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncViewport, { passive: true });
  window.visualViewport.addEventListener('scroll', syncViewport, { passive: true });
}

if ('ResizeObserver' in window) {
  const container = document.getElementById('game-container');
  if (container) {
    const observer = new ResizeObserver(syncViewport);
    observer.observe(container);
  }
}
