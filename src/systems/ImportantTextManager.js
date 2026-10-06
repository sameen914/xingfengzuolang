import * as Phaser from 'phaser';

export default class ImportantTextManager {
  constructor(scene) {
    this.scene = scene;
    this.queues = new Map();
    this.activeBySource = new Map();
    this.activeLabels = [];
    this.sourceIds = new WeakMap();
    this.nextSourceId = 1;
    this.sequence = 1;
    this.defaultGapMs = 320;
    this.defaultFollowLagMs = 150;
  }

  getSourceKey(source, explicitKey = null) {
    if (explicitKey) return String(explicitKey);
    if (!source || (typeof source !== 'object' && typeof source !== 'function')) {
      return 'global';
    }

    if (!this.sourceIds.has(source)) {
      this.sourceIds.set(source, `source-${this.nextSourceId}`);
      this.nextSourceId += 1;
    }

    return this.sourceIds.get(source);
  }

  isSourceFree(source, explicitKey = null) {
    const key = this.getSourceKey(source, explicitKey);
    const active = this.activeBySource.get(key);
    const queue = this.queues.get(key) ?? [];
    return !active && queue.length === 0;
  }

  hasQueuedLowPriority(key, priority) {
    const queue = this.queues.get(key) ?? [];
    return queue.some((item) => item.priority <= priority);
  }

  enqueueWorld({
    source = null,
    sourceKey = null,
    x = null,
    y = null,
    text,
    color = '#ffffff',
    fontSize = 20,
    durationMs = 2600,
    gapMs = this.defaultGapMs,
    priority = 60,
    yOffset = 72,
    driftY = 24,
    shake = false,
    replaceLowerPriority = false,
    coalesceLowPriority = false,
    followSource = Boolean(source),
    followLagMs = this.defaultFollowLagMs,
    beatSynced = false,
    beatMs = 500
  }) {
    if (!text || this.scene.finished) return false;
    if (source && (!source.active || source.isDead)) return false;

    const key = this.getSourceKey(source, sourceKey);
    const active = this.activeBySource.get(key);

    if (
      active
      && replaceLowerPriority
      && priority > (active.priority ?? 0)
    ) {
      this.finishActive(key, active, true, true);
    }

    if (
      coalesceLowPriority
      && (
        (this.activeBySource.get(key)?.priority ?? Infinity) <= priority
        || this.hasQueuedLowPriority(key, priority)
      )
    ) {
      return false;
    }

    const queue = this.queues.get(key) ?? [];
    queue.push({
      source,
      sourceKey: key,
      x,
      y,
      text,
      color,
      fontSize,
      durationMs,
      gapMs,
      priority,
      yOffset,
      driftY,
      shake,
      followSource,
      followLagMs,
      beatSynced,
      beatMs,
      sequence: this.sequence
    });
    this.sequence += 1;

    queue.sort((a, b) => (
      b.priority - a.priority
      || a.sequence - b.sequence
    ));

    this.queues.set(key, queue);
    this.pump(key);
    return true;
  }

  pump(key) {
    if (this.scene.finished || this.activeBySource.has(key)) return;

    const queue = this.queues.get(key) ?? [];
    let item = queue.shift();

    while (item && item.source && (!item.source.active || item.source.isDead)) {
      item = queue.shift();
    }

    this.queues.set(key, queue);
    if (!item) return;

    this.startItem(key, item);
  }

  startItem(key, item) {
    const { scene } = this;
    if (scene.finished) return;
    if (item.source && (!item.source.active || item.source.isDead)) {
      this.pump(key);
      return;
    }

    const sourceX = item.source?.x ?? item.x ?? scene.player?.x ?? scene.cameras.main.worldView.centerX;
    const sourceY = item.source?.y ?? item.y ?? scene.player?.y ?? scene.cameras.main.worldView.centerY;

    const label = scene.add.text(
      sourceX,
      sourceY - item.yOffset,
      item.text,
      {
        fontSize: `${item.fontSize}px`,
        fontStyle: 'bold',
        color: item.color,
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: { width: 420, useAdvancedWrap: true }
      }
    )
      .setOrigin(0.5)
      .setDepth(70);

    const startY = this.placeImportantLabel(label, sourceX, sourceY - item.yOffset);
    const record = {
      ...item,
      label,
      key,
      followElapsedMs: 0
    };
    this.activeBySource.set(key, record);

    if (!(item.followSource && item.source)) {
      scene.tweens.add({
        targets: label,
        y: startY - item.driftY,
        duration: item.durationMs,
        ease: 'Sine.Out'
      });
    }

    const fadeMs = Math.min(600, Math.max(420, Math.round(item.durationMs * 0.18)));
    scene.tweens.add({
      targets: label,
      alpha: 0,
      duration: fadeMs,
      delay: Math.max(0, item.durationMs - fadeMs),
      ease: 'Quad.In',
      onComplete: () => this.finishActive(key, record, false)
    });

    if (item.shake && !(item.followSource && item.source)) {
      scene.tweens.add({
        targets: label,
        x: label.x + 6,
        duration: 72,
        yoyo: true,
        repeat: 5,
        ease: 'Sine.InOut'
      });
    }
  }

  placeImportantLabel(label, x, y) {
    this.activeLabels = this.activeLabels.filter((item) => item?.active);
    let targetY = y;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      label.setPosition(x, targetY);
      const collision = this.activeLabels.find((other) => {
        if (!other?.active) return false;
        const horizontalLimit = (label.displayWidth + other.displayWidth) / 2 + 18;
        const verticalLimit = (label.displayHeight + other.displayHeight) / 2 + 12;
        return (
          Math.abs(label.x - other.x) < horizontalLimit
          && Math.abs(label.y - other.y) < verticalLimit
        );
      });

      if (!collision) break;
      targetY = collision.y
        - (label.displayHeight + collision.displayHeight) / 2
        - 14;
    }

    label.setPosition(x, targetY);
    this.activeLabels.push(label);
    return targetY;
  }

  resolveFollowTarget(record, x, y) {
    const label = record.label;
    let targetY = y;

    const blockers = [...this.activeBySource.values()]
      .filter((other) => (
        other !== record
        && other?.label?.active
        && (
          (other.priority ?? 0) > (record.priority ?? 0)
          || (
            (other.priority ?? 0) === (record.priority ?? 0)
            && (other.sequence ?? 0) < (record.sequence ?? 0)
          )
        )
      ));

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const collision = blockers.find((other) => {
        const otherLabel = other.label;
        const horizontalLimit = (label.displayWidth + otherLabel.displayWidth) / 2 + 18;
        const verticalLimit = (label.displayHeight + otherLabel.displayHeight) / 2 + 12;
        return (
          Math.abs(x - otherLabel.x) < horizontalLimit
          && Math.abs(targetY - otherLabel.y) < verticalLimit
        );
      });

      if (!collision) break;
      targetY = collision.label.y
        - (label.displayHeight + collision.label.displayHeight) / 2
        - 14;
    }

    return { x, y: targetY };
  }

  update(delta) {
    if (this.scene.finished) return;
    const dt = Phaser.Math.Clamp(Number(delta) || 0, 0, 80);
    if (dt <= 0) return;

    this.activeBySource.forEach((record) => {
      if (!record?.label?.active) return;

      record.followElapsedMs = (record.followElapsedMs ?? 0) + dt;

      if (record.beatSynced) {
        const beatMs = Math.max(1, record.beatMs ?? 500);
        const clock = this.scene.adaptiveMusic?.getClockMs?.() ?? record.followElapsedMs;
        const phase = ((clock % beatMs) + beatMs) % beatMs;
        const beatDistance = Math.min(phase, beatMs - phase);
        const pulse = Phaser.Math.Clamp(1 - beatDistance / 95, 0, 1);
        record.label.setScale(1 + pulse * pulse * 0.045);
      }

      if (!record.followSource || !record.source) return;
      if (!record.source.active || record.source.isDead) return;
      const progress = Phaser.Math.Clamp(
        record.followElapsedMs / Math.max(1, record.durationMs),
        0,
        1
      );

      let targetX = record.source.x;
      const baseTargetY = record.source.y
        - record.yOffset
        - record.driftY * progress;

      if (record.shake) {
        targetX += Math.sin(record.followElapsedMs * 0.055) * 4;
      }

      const target = this.resolveFollowTarget(record, targetX, baseTargetY);
      const lagMs = Math.max(80, record.followLagMs ?? this.defaultFollowLagMs);
      let followAlpha = 1 - Math.exp(-dt / lagMs);

      const distance = Phaser.Math.Distance.Between(
        record.label.x,
        record.label.y,
        target.x,
        target.y
      );
      if (distance > 180) followAlpha = Math.max(followAlpha, 0.55);

      record.label.x = Phaser.Math.Linear(record.label.x, target.x, followAlpha);
      record.label.y = Phaser.Math.Linear(record.label.y, target.y, followAlpha);
    });
  }

  finishActive(key, record, interrupted = false, skipPump = false) {
    const current = this.activeBySource.get(key);
    if (current !== record) return;

    const label = record.label;
    if (label?.active) {
      this.scene.tweens.killTweensOf(label);
      label.destroy();
    }

    this.activeLabels = this.activeLabels
      .filter((item) => item?.active && item !== label);
    this.activeBySource.delete(key);

    if (skipPump) return;

    const delay = interrupted ? 0 : Math.max(0, record.gapMs ?? this.defaultGapMs);
    if (delay <= 0) {
      this.pump(key);
      return;
    }

    this.scene.time.delayedCall(delay, () => this.pump(key));
  }

  clearSource(source, explicitKey = null) {
    const key = this.getSourceKey(source, explicitKey);
    const record = this.activeBySource.get(key);
    if (record?.label?.active) {
      this.scene.tweens.killTweensOf(record.label);
      record.label.destroy();
    }
    this.activeBySource.delete(key);
    this.queues.delete(key);
    this.activeLabels = this.activeLabels
      .filter((item) => item?.active && item !== record?.label);
  }

  getActiveLabels() {
    this.activeLabels = this.activeLabels.filter((item) => item?.active);
    return this.activeLabels;
  }

  clear() {
    this.activeBySource.forEach((record) => {
      if (record?.label?.active) {
        this.scene.tweens.killTweensOf(record.label);
        record.label.destroy();
      }
    });

    this.activeBySource.clear();
    this.activeLabels = [];
    this.queues.clear();
  }
}
