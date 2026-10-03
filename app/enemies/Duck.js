import * as Phaser from 'phaser';
import EnemyBase from './EnemyBase.js';
import { ENEMIES } from '../config/gameConfig.js';

export default class Duck extends EnemyBase {
  constructor(scene, x, y) {
    const base = ENEMIES.duck;
    super(scene, x, y, 'duckArt', {
      ...base,
      speed: base.speed + Phaser.Math.Between(-10, 12)
    }, 'duck');

    this.setTarget(scene.player);
    this.setDepth(6);
    this.baseArtScale = 58 / 128;
    this.setScale(this.baseArtScale);
    this.body.setSize(84, 86, true);
    this.wobbleOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.nextQuackAt = scene.time.now + Phaser.Math.Between(
      1400,
      3600
    );

    this.angryIcon = scene.add.image(x, y - 28, 'angryMark')
      .setDepth(24)
      .setVisible(false);
    this.queenEventIcon = scene.add.text(x, y - 34, '', {
      fontSize: '18px',
      stroke: '#191319',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(26).setVisible(false);

    this.lastQueenReactionState = 'normal';
    this.pityResponse = null;
  }

  updateAI(time = 0) {
    if (!this.active || this.isDead || !this.target?.active) return;
    this.updateStatusCore(time);

    if (time >= this.nextQuackAt) {
      this.nextQuackAt = time + Phaser.Math.Between(
        2500,
        5000
      );
      this.scene.tryShowDuckQuack?.(this);
    }

    if (this.scene.potatoPityActive) {
      if (!this.pityResponse) {
        this.pityResponse = Math.random() < 0.18
          ? 'worship'
          : 'avoid';
      }

      if (this.angryIcon?.active) {
        this.angryIcon.setVisible(false);
      }

      if (this.pityResponse === 'worship') {
        this.setTint(0xf4d98a);
        this.setScale(this.baseArtScale, this.baseArtScale * 0.62);

        const commander = this.scene.potatoCommander;

        if (commander?.active) {
          const direction = new Phaser.Math.Vector2(
            commander.x - this.x,
            commander.y - this.y
          );

          if (direction.lengthSq() > 105 * 105) {
            direction.normalize().scale(this.moveSpeed * 0.72);
            this.setVelocity(direction.x, direction.y);
          } else {
            this.setVelocity(0, 0);
          }
        }

        return;
      }

      // 「回避」：优先远离附近疯狂土豆，其次远离「土豆指挥官」。
      this.setScale(this.baseArtScale);
      this.clearTint();

      const threat = this.scene.findNearestFactionTarget?.(
        this,
        ['potato'],
        330,
        (enemy) => enemy.berserk === true
      );

      const source = threat?.active
        ? threat
        : this.scene.potatoCommander;

      if (source?.active) {
        const away = new Phaser.Math.Vector2(
          this.x - source.x,
          this.y - source.y
        );

        if (away.lengthSq() === 0) away.set(1, 0);

        away.normalize().scale(this.moveSpeed * 1.12);
        this.setVelocity(away.x, away.y);
      }

      return;
    } else if (this.pityResponse) {
      this.pityResponse = null;
      this.setScale(this.baseArtScale);
      this.clearTint();
      this.refreshStatusPresentation();
    }

    const queen = this.scene.duckQueen;
    const queenPhase = queen?.active && !queen.isDead
      ? queen.getPhase?.()
      : null;
    const queenAttached = this.scene.duckQueenGrappleActive === true;

    let reactionState = 'normal';
    let extraMoveMultiplier = 1;
    let extraAttackMultiplier = 1;
    let overrideTint = null;

    const candyEvent = time < (this.scene.duckQueenCandyReactionUntil ?? -Infinity);
    const tietieEvent = time < (this.scene.duckQueenTietieReactionUntil ?? -Infinity)
      || this.scene.duckQueenGrappleActive === true;
    const queenEventActive = candyEvent || tietieEvent;

    if (queenPhase === 'obsessed') {
      reactionState = queenAttached ? 'obsessed_attach' : 'obsessed';
      if (queenAttached) {
        extraMoveMultiplier = 1.10;
        extraAttackMultiplier = 1.05;
      }
    } else if (queenPhase === 'frenzy') {
      reactionState = queenAttached ? 'frenzy_attach' : 'frenzy';
      // 三阶段小鸭身体只轻微染红，不使用此前过重的整身深红。
      overrideTint = queenEventActive ? 0xff706a : 0xff918a;
      extraMoveMultiplier = queenAttached ? 1.25 : 1.12;
      extraAttackMultiplier = queenAttached ? 1.18 : 1.08;
    }

    this.contactCooldown = Math.max(
      150,
      Math.round(this.contactCooldown / extraAttackMultiplier)
    );

    if (reactionState !== this.lastQueenReactionState) {
      this.lastQueenReactionState = reactionState;
      this.refreshStatusPresentation();
    }

    if (overrideTint !== null) {
      this.setTint(overrideTint);
    }

    // 原来的图片版 angryMark 会造成长期常驻；现在改为只在关键事件窗口显示指定 Emoji。
    if (this.angryIcon?.active) this.angryIcon.setVisible(false);

    if (this.queenEventIcon?.active) {
      let emoji = '';

      // dev14.21.7.1：丹麦鸭一旦撒糖，所有阶段的小鸭都统一显示一阶段的生气符号。
      // Candy 反应优先于阶段情绪，不再在二/三阶段替换成 😡 / 🤬。
      if (candyEvent) {
        emoji = '💢';
      } else if (queenPhase === 'frenzy' && tietieEvent) {
        emoji = '🤬';
      } else if (tietieEvent) {
        emoji = '💢';
      }

      this.queenEventIcon.setText(emoji);
      this.queenEventIcon.setVisible(Boolean(emoji));
      if (emoji) {
        const pulse = 1 + Math.sin(time * 0.018) * 0.07;
        this.queenEventIcon
          .setPosition(this.x, this.y - this.displayHeight * 0.72 - 13)
          .setScale(pulse)
          .setAngle(queenPhase === 'frenzy' ? Math.sin(time * 0.024) * 5 : 0);
      }
    }

    if (this.isStunned(time)) {
      this.setVelocity(0, 0);
      return;
    }

    const direction = new Phaser.Math.Vector2(
      this.target.x - this.x,
      this.target.y - this.y
    );

    if (direction.lengthSq() > 1) {
      direction.normalize();
      const effectiveSpeed = this.moveSpeed * extraMoveMultiplier;

      if (queenPhase === 'obsessed' || queenPhase === 'frenzy') {
        // 二、三阶段的小鸭直接奔向主角。
        this.setVelocity(
          direction.x * effectiveSpeed,
          direction.y * effectiveSpeed
        );
      } else {
        const side = Math.sin(time * 0.006 + this.wobbleOffset) * 0.18;
        const x = direction.x - direction.y * side;
        const y = direction.y + direction.x * side;
        this.setVelocity(x * effectiveSpeed, y * effectiveSpeed);
      }

      // 小鸭不画逐帧腿：左右扭动 + 轻微弹性，形成小碎步感。
      const swaySpeed = queenPhase === 'frenzy' ? 0.020 : 0.014;
      const sway = Math.sin(time * swaySpeed + this.wobbleOffset);
      this.setAngle(sway * (queenPhase === 'frenzy' ? 7 : 5));
      this.setScale(
        this.baseArtScale * (1 + Math.abs(sway) * 0.018),
        this.baseArtScale * (1 - Math.abs(sway) * 0.020)
      );
      this.setFlipX(direction.x < 0);
    }
  }

  destroy(fromScene) {
    if (this.angryIcon?.active) this.angryIcon.destroy();
    if (this.queenEventIcon?.active) this.queenEventIcon.destroy();
    super.destroy(fromScene);
  }
}
