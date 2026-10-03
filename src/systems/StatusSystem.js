export default class StatusSystem {
  constructor(owner) {
    this.owner = owner;
    this.statuses = new Map();
  }

  apply(id, options = {}) {
    const now = this.owner.scene.time.now;
    const existing = this.statuses.get(id);
    const durationMs = options.durationMs ?? 10000;

    if (existing) {
      // 高频 Buff 刷新只延长生命周期，避免重复触发显示/派生逻辑。
      existing.expiresAt = Math.max(existing.expiresAt, now + durationMs);
      const requestedLevel = options.level ?? existing.level ?? 1;
      if (requestedLevel > existing.level) existing.level = requestedLevel;
      if (options.source && options.source !== existing.source) existing.source = options.source;
      return existing;
    }

    const status = {
      id,
      level: options.level ?? 1,
      source: options.source ?? null,
      appliedAt: now,
      expiresAt: now + durationMs,
      nextTickAt: now,
      data: options.data ?? {}
    };

    this.statuses.set(id, status);
    this.owner.onStatusApplied?.(status);
    this.owner.refreshStatusPresentation?.();
    return status;
  }

  has(id) {
    return this.statuses.has(id);
  }

  get(id) {
    return this.statuses.get(id);
  }

  remove(id) {
    const status = this.statuses.get(id);
    if (!status) return;
    this.statuses.delete(id);
    this.owner.onStatusRemoved?.(status);
    this.owner.refreshStatusPresentation?.();
  }

  update(time) {
    for (const [id, status] of this.statuses.entries()) {
      if (time >= status.expiresAt) {
        this.remove(id);
        continue;
      }
      this.owner.onStatusTick?.(status, time);
    }
  }

  list() {
    return [...this.statuses.values()];
  }

  clear() {
    for (const id of [...this.statuses.keys()]) this.remove(id);
  }
}
