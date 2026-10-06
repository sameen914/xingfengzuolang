import * as Phaser from 'phaser';
import EnemyBase from './EnemyBase.js?v=2.0.0';
import { ENEMIES } from '../config/gameConfig.js?v=2.0.0';

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

    if (this.angryIcon?.active) this.angryIcon.setVisible(false);

    if (this.queenEventIcon?.active) {
      let emoji = '';

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
