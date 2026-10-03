import Phaser from 'phaser';
import { PLAYER_VFX_REFERENCE } from '../config/vfxConfig.js';
import { VFX_ASSETS, VFX_DEFAULTS } from '../config/vfxConfig.js';

export function preloadRegisteredVfx(scene) {
  VFX_ASSETS
    .filter((asset) => asset.preload)
    .forEach((asset) => {
      scene.load.image(asset.key, asset.path);
    });
}

export function getPlayerVisualAnchor(player, anchorName = 'feet', { xOffset = 0, yOffset = 0 } = {}) {
  if (!player) return { x: xOffset, y: yOffset };

  const ref = PLAYER_VFX_REFERENCE;
  const anchor = ref.anchors?.[anchorName];
  if (!anchor) {
    return { x: player.x + xOffset, y: player.y + yOffset };
  }

  const displayWidth = Math.abs(Number(player.displayWidth) || Number(player.width) || ref.sourceWidth);
  const displayHeight = Math.abs(Number(player.displayHeight) || Number(player.height) || ref.sourceHeight);
  const originX = Number.isFinite(player.originX) ? player.originX : 0.5;
  const originY = Number.isFinite(player.originY) ? player.originY : 0.5;

  return {
    x: player.x + (anchor.sourceX / ref.sourceWidth - originX) * displayWidth + xOffset,
    y: player.y + (anchor.sourceY / ref.sourceHeight - originY) * displayHeight + yOffset
  };
}

export default class VfxSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeObjects = new Set();
  }

  hasTexture(key) {
    return Boolean(key && this.scene?.textures?.exists(key));
  }

  spawnImage(key, x, y, options = {}) {
    if (!this.hasTexture(key)) return null;

    const image = this.scene.add.image(x, y, key)
      .setOrigin(options.originX ?? 0.5, options.originY ?? 0.5)
      .setDepth(options.depth ?? VFX_DEFAULTS.depth)
      .setAlpha(options.alpha ?? VFX_DEFAULTS.alpha)
      .setScale(options.scale ?? VFX_DEFAULTS.scale);

    // displayWidth/displayHeight are applied after base scale so long bolts / flat ground effects
    // can share normalized source canvases without hard-coding texture pixel sizes in GameScene.
    if (Number.isFinite(options.displayWidth) && Number.isFinite(options.displayHeight)) {
      image.setDisplaySize(options.displayWidth, options.displayHeight);
    }

    if (Number.isFinite(options.angle)) image.setAngle(options.angle);
    if (Number.isFinite(options.rotation)) image.setRotation(options.rotation);
    if (options.flipX != null) image.setFlipX(Boolean(options.flipX));
    if (options.flipY != null) image.setFlipY(Boolean(options.flipY));

    const blendMode = options.blendMode ?? VFX_DEFAULTS.blendMode;
    if (blendMode === 'ADD') image.setBlendMode(Phaser.BlendModes.ADD);
    else if (blendMode != null) image.setBlendMode(blendMode);

    this.activeObjects.add(image);
    image.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.activeObjects.delete(image);
    });

    return image;
  }

  tweenAndDestroy(target, tweenConfig = {}) {
    if (!target?.active) return null;

    const { targets: _ignoredTargets, onComplete, ...config } = tweenConfig;

    return this.scene.tweens.add({
      targets: target,
      ...config,
      onComplete: (...args) => {
        onComplete?.(...args);
        if (target?.active) target.destroy();
      }
    });
  }

  // 通用 spark 图像入口；电力等短生命周期 VFX 可直接复用。
  spawnSpark(key, x, y, options = {}) {
    return this.spawnImage(key, x, y, options);
  }

  destroyAll() {
    [...this.activeObjects].forEach((obj) => {
      if (obj?.active) obj.destroy();
    });
    this.activeObjects.clear();
  }
}
