import * as Phaser from 'phaser';
import StatusSystem from '../systems/StatusSystem.js';
import { STATUS_EFFECTS } from '../config/gameConfig.js';

export default class EnemyBase extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, stats, enemyType) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.enemyType = enemyType;
    const difficulty = scene.difficultyProfile ?? {};
    const isBoss = enemyType === 'duckQueen' || enemyType === 'potatoCommander';
    const hpMultiplier = Number(
      isBoss ? difficulty.bossHpMultiplier : difficulty.minionHpMultiplier
    ) || 1;
    const speedMultiplier = Number(
      isBoss ? difficulty.bossSpeedMultiplier : difficulty.minionSpeedMultiplier
    ) || 1;
    this.maxHp = Math.max(1, Math.round(stats.hp * hpMultiplier));
    this.hp = this.maxHp;
    this.baseMoveSpeed = stats.speed * speedMultiplier;
    this.moveSpeed = this.baseMoveSpeed;
    this.baseContactDamage = stats.damage;
    this.contactDamage = stats.damage;
    this.baseDefense = stats.defense ?? 0;
    this.defense = this.baseDefense;
    this.xpValue = stats.xp;
    this.baseContactCooldown = stats.contactCooldown;
    this.contactCooldown = stats.contactCooldown;
    this.knockbackScale = stats.knockbackScale ?? 1;
    this.nextContactAt = 0;
    this.target = null;
    this.isDead = false;
    this.isElite = false;

    this.statusSystem = new StatusSystem(this);
    this.statusLabel = scene.add.text(x, y - 30, '', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(25).setVisible(false);

    this.nextPoopShotAt = 0;
    this.nextPlagueSpreadAt = 0;
    this.stunnedUntil = 0;
    this.lastStatusIconText = '';
    this.lastAuraSignature = '';
    this.poopOverlayImage = null;
    this.poopOverlayKey = null;
    this.plagueOverlayImage = null;
    this.plagueOverlayKey = null;
    this.disableHitScale = false;
  }

  setTarget(target) {
    this.target = target;
    return this;
  }

  updateStatusCore(time = 0) {
    if (!this.active || this.isDead) return;

    this.statusSystem.update(time);

    // 鸭后的「嫉妒 / 嗑糖」现在是全局 Aura，不再反复写入每只怪的 StatusSystem。
    // 只有 Aura 开关真正改变时才刷新视觉，避免高频 tint / label 写入。
    const auraSignature = `${this.isJealousByQueen() ? 1 : 0}${this.isSugarHighByQueen() ? 1 : 0}`;
    if (auraSignature !== this.lastAuraSignature) {
      this.lastAuraSignature = auraSignature;
      this.refreshStatusPresentation();
    }

    this.updateStatusDerivedStats();
    this.updateStatusLabel();
    this.updatePoopOverlayTransform();
    this.updatePlagueOverlayTransform();
    this.handleStatusAbilities(time);
  }

  isJealousByQueen() {
    return this.enemyType === 'duck' && this.scene.duckQueenAuraActive === true;
  }

  isSugarHighByQueen() {
    return this.enemyType === 'roach' && this.scene.duckQueenAuraActive === true;
  }

  hasEffectiveStatus(id) {
    if (id === 'jealous') {
      return this.statusSystem.has('jealous') || this.isJealousByQueen();
    }
    if (id === 'sugar_high') {
      return this.statusSystem.has('sugar_high') || this.isSugarHighByQueen();
    }
    return this.statusSystem.has(id);
  }

  updateAI(time = 0) {
    if (!this.active || this.isDead) return;
    this.updateStatusCore(time);

    if (this.isStunned(time)) {
      this.setVelocity(0, 0);
      return;
    }

    if (!this.target?.active) return;

    const direction = new Phaser.Math.Vector2(
      this.target.x - this.x,
      this.target.y - this.y
    );

    if (direction.lengthSq() > 1) {
      direction.normalize().scale(this.moveSpeed);
      this.setVelocity(direction.x, direction.y);
    }
  }


  applyStun(durationMs, now = this.scene.time.now) {
    if (this.enemyType === 'ball' || this.isDead || !this.active) return;
    this.stunnedUntil = Math.max(this.stunnedUntil, now + durationMs);
  }

  isStunned(time = this.scene.time.now) {
    return this.enemyType !== 'ball' && time < this.stunnedUntil;
  }

  updateStatusDerivedStats() {
    let speedMultiplier = 1;
    let damageMultiplier = 1;
    let attackSpeedMultiplier = 1;

    if (this.statusSystem.has('plague')) {
      speedMultiplier *= STATUS_EFFECTS.plagueSpeedMultiplier;
    }

    if (this.hasEffectiveStatus('jealous')) {
      attackSpeedMultiplier *= STATUS_EFFECTS.jealousAttackSpeedMultiplier;
      speedMultiplier *= STATUS_EFFECTS.jealousSpeedMultiplier;
    }

    if (this.hasEffectiveStatus('sugar_high')) {
      speedMultiplier *= STATUS_EFFECTS.sugarHighSpeedMultiplier;
      damageMultiplier *= STATUS_EFFECTS.sugarHighDamageMultiplier;
    }

    this.moveSpeed = this.baseMoveSpeed * speedMultiplier;
    this.contactDamage = Math.max(1, Math.round(this.baseContactDamage * damageMultiplier));
    this.contactCooldown = Math.max(
      160,
      Math.round(this.baseContactCooldown / attackSpeedMultiplier)
    );
  }

  handleStatusAbilities(time) {
    if (this.statusSystem.has('poop_buff') && time >= this.nextPoopShotAt) {
      this.nextPoopShotAt = time + Phaser.Math.Between(2400, 3400);
      this.scene.firePoopProjectile(this);
    }

    if (this.statusSystem.has('plague') && time >= this.nextPlagueSpreadAt) {
      this.nextPlagueSpreadAt = time + Phaser.Math.Between(2700, 3600);
      this.scene.trySpreadPlagueFrom(this);
    }
  }

  refreshStatusPresentation() {
    if (!this.active) return;

    const hasPoop = this.statusSystem.has('poop_buff');
    const hasPlague = this.statusSystem.has('plague');
    const hasJealous = this.hasEffectiveStatus('jealous');
    const hasSugarHigh = this.hasEffectiveStatus('sugar_high');

    this.clearTint();
    // 双子猪污染：保留正式泥污 overlay，同时给本体一点棕色，远看也能马上辨认。
    // 瘟疫感染仍保持偏绿；两种状态同时存在时用偏橄榄棕的混合色。
    if (hasPoop && hasPlague) this.setTint(0x9b9568);
    else if (hasPoop) this.setTint(0xb88a68);
    else if (hasSugarHigh && hasPlague) this.setTint(0xc87adf);
    else if (hasSugarHigh) this.setTint(0xc064df);
    else if (hasJealous) this.setTint(0xffa15e);
    else if (hasPlague) this.setTint(0x69c75b);

    this.syncPoopOverlay(hasPoop);
    this.syncPlagueOverlay(hasPlague);
  }

  onStatusApplied(status) {
    if (status?.id === 'poop_buff') {
      this.poopOverlayKey = Phaser.Utils.Array.GetRandom([
        'poopOverlayAArt',
        'poopOverlayBArt',
        'poopOverlayCArt'
      ].filter((key) => this.scene.textures.exists(key)));
      this.scene.playPoopInfectBurst?.(this);
      this.nextPoopShotAt = Math.max(
        this.nextPoopShotAt,
        this.scene.time.now + Phaser.Math.Between(900, 1500)
      );
    }

    if (status?.id === 'plague') {
      this.plagueOverlayKey = Phaser.Utils.Array.GetRandom([
        'plagueOverlayAArt',
        'plagueOverlayBArt',
        'plagueOverlayCArt'
      ].filter((key) => this.scene.textures.exists(key)));
    }
  }

  syncPoopOverlay(hasPoop = this.statusSystem.has('poop_buff')) {
    if (!hasPoop || !this.poopOverlayKey) {
      if (this.poopOverlayImage?.active) this.poopOverlayImage.destroy(true);
      this.poopOverlayImage = null;
      return;
    }

    if (!this.poopOverlayImage?.active && this.scene.textures.exists(this.poopOverlayKey)) {
      this.poopOverlayImage = this.scene.add.image(this.x, this.y, this.poopOverlayKey)
        .setAlpha(0.78)
        .setDepth((this.depth ?? 8) + 1)
        .setOrigin(0.5, 0.5);
    }

    this.updatePoopOverlayTransform();
  }

  syncPlagueOverlay(hasPlague = this.statusSystem.has('plague')) {
    if (!hasPlague || !this.plagueOverlayKey) {
      if (this.plagueOverlayImage?.active) this.plagueOverlayImage.destroy(true);
      this.plagueOverlayImage = null;
      return;
    }

    if (!this.plagueOverlayImage?.active && this.scene.textures.exists(this.plagueOverlayKey)) {
      this.plagueOverlayImage = this.scene.add.image(this.x, this.y, this.plagueOverlayKey)
        .setAlpha(0.78)
        .setDepth((this.depth ?? 8) + 1)
        .setOrigin(0.5, 0.5);
    }

    this.updatePlagueOverlayTransform();
  }

  updatePoopOverlayTransform() {
    if (!this.poopOverlayImage?.active) return;

    const width = Math.max(this.displayWidth * 1.1, 48);
    const height = Math.max(this.displayHeight * 1.1, 48);

    this.poopOverlayImage
      .setPosition(this.x, this.y + 1)
      .setDisplaySize(width, height)
      .setAngle(this.angle ?? 0)
      .setDepth((this.depth ?? 8) + 1);

    this.poopOverlayImage.setScale(
      this.flipX ? -Math.abs(this.poopOverlayImage.scaleX) : Math.abs(this.poopOverlayImage.scaleX),
      Math.abs(this.poopOverlayImage.scaleY)
    );
  }

  updatePlagueOverlayTransform() {
    if (!this.plagueOverlayImage?.active) return;

    const width = Math.max(this.displayWidth * 1.14, 50);
    const height = Math.max(this.displayHeight * 1.14, 50);

    this.plagueOverlayImage
      .setPosition(this.x, this.y)
      .setDisplaySize(width, height)
      .setAngle(this.angle ?? 0)
      .setDepth((this.depth ?? 8) + 1);

    this.plagueOverlayImage.setScale(
      this.flipX ? -Math.abs(this.plagueOverlayImage.scaleX) : Math.abs(this.plagueOverlayImage.scaleX),
      Math.abs(this.plagueOverlayImage.scaleY)
    );
  }

  updateStatusLabel() {
    if (!this.statusLabel?.active) return;

    // 敌人持续状态统一通过头顶 Emoji 直接表达：
    // 💩 = 屎污染，☣️ = 瘟疫，🍬 = 紫蟑螂嗑糖。
    // 「嗑糖」虽然由女王鸭 Aura 提供，但必须和瘟疫/屎污染一样让玩家直接看见。
    const icons = [];
    if (this.statusSystem.has('poop_buff')) icons.push('💩');
    if (this.statusSystem.has('plague')) icons.push('☣️');

    // 紫蟑螂的 🍬 不只依赖二/三阶段 Aura：
    // 一阶段「发糖」已经会把蟑螂吸向糖点，因此从被糖吸引开始就必须看得到 🍬，
    // 到达糖点后再保留一个短暂尾段；若 Aura 正在生效则继续常驻显示。
    const queenCandyLinked = this.enemyType === 'roach' && (
      this.hasEffectiveStatus('sugar_high')
      || (
        this.queenCandyLure
        && this.scene.time.now < (this.queenCandyLuredUntil ?? -Infinity)
      )
      || this.scene.time.now < (this.queenCandyEatingUntil ?? -Infinity)
    );
    if (queenCandyLinked) icons.push('🍬');

    const iconText = icons.join('');
    if (iconText !== this.lastStatusIconText) {
      this.lastStatusIconText = iconText;
      this.statusLabel.setText(iconText);
      this.statusLabel.setVisible(iconText.length > 0);
    }

    if (iconText.length > 0) {
      this.statusLabel.setPosition(this.x, this.y - this.displayHeight * 0.72 - 12);
    }
  }

  applyStatus(id, options = {}) {
    return this.statusSystem.apply(id, options);
  }

  canReceiveSupportStatus() {
    return ['potato', 'duck', 'roach'].includes(this.enemyType) && !this.isElite;
  }

  receiveDamage(amount) {
    if (this.isDead) return false;

    const effectiveDamage = Math.max(1, Math.round(amount * (1 - this.defense)));
    this.hp -= effectiveDamage;

    if (this.disableHitScale) {
      // 双子猪正式素材受击只闪烁，不做 squash / scale punch。
      this.setAlpha(0.48);
      this.scene.time.delayedCall(58, () => {
        if (this.active && !this.isDead) this.setAlpha(1);
      });
    } else {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.20,
        scaleY: 0.82,
        duration: 55,
        yoyo: true
      });
    }

    if (this.hp <= 0) {
      this.isDead = true;
      return true;
    }

    return false;
  }

  destroy(fromScene) {
    if (this.statusLabel?.active) this.statusLabel.destroy();
    if (this.poopOverlayImage?.active) this.poopOverlayImage.destroy(true);
    if (this.plagueOverlayImage?.active) this.plagueOverlayImage.destroy(true);
    this.poopOverlayImage = null;
    this.plagueOverlayImage = null;
    super.destroy(fromScene);
  }
}
