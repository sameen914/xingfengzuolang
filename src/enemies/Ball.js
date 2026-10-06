import * as Phaser from 'phaser';
import EnemyBase from './EnemyBase.js?v=2.0.0';
import { ENEMIES, GAME, SPAWN } from '../config/gameConfig.js?v=2.0.0';

export default class Ball extends EnemyBase {
  constructor(scene, x, y) {
    const base = ENEMIES.ball;
    super(scene, x, y, 'ballArt', base, 'ball');

    this.setDepth(7);
    this.setDisplaySize(50, 50);
    this.body.setCircle(47, 17, 17);
    this.setCollideWorldBounds(true);
    this.setBounce(1, 1);
    this.body.onWorldBounds = true;

    const player = scene.player;
    const direction = new Phaser.Math.Vector2(
      (player?.x ?? x + 1) - x,
      (player?.y ?? y + 1) - y
    );

    if (direction.lengthSq() < 1) {
      direction.set(1, 1);
    }

    direction.normalize().scale(this.moveSpeed);
    this.setVelocity(direction.x, direction.y);
    this.setAngularVelocity(Phaser.Math.Between(-300, 300));

    this.despawnAt = scene.time.now + Phaser.Math.Between(
      base.lifetimeMinMs,
      base.lifetimeMaxMs
    );
  }

  updateAI(time = 0) {
    if (!this.active || this.isDead) return;

    if (time >= this.despawnAt) {
      this.destroy();
      return;
    }

    const rampStartSeconds = SPAWN.BALL_SPEED_RAMP_START_SECONDS;
    const elapsedSeconds = Math.max(
      rampStartSeconds,
      this.scene.getGameplayElapsedSeconds?.() ?? rampStartSeconds
    );
    const accelerationWindow = GAME.PROTOTYPE_DURATION_SECONDS - rampStartSeconds;
    const speedProgress = Phaser.Math.Clamp(
      (elapsedSeconds - rampStartSeconds) / accelerationWindow,
      0,
      1
    );
    const targetSpeed = this.moveSpeed * Phaser.Math.Linear(1.0, 1.35, speedProgress);

    const currentVelocity = this.body.velocity.clone();
    if (currentVelocity.lengthSq() === 0) {
      currentVelocity.set(1, 1);
    }

    currentVelocity.normalize();

    if (this.scene.potatoPityActive) {
      const threat = this.scene.findNearestFactionTarget?.(
        this,
        ['potato'],
        310,
        (enemy) => enemy.berserk === true
      );

      if (threat?.active) {
        const away = new Phaser.Math.Vector2(
          this.x - threat.x,
          this.y - threat.y
        );

        if (away.lengthSq() > 1) {
          away.normalize().scale(0.46);
          currentVelocity.add(away).normalize();
        }
      }
    }

    currentVelocity.scale(targetSpeed);
    this.setVelocity(currentVelocity.x, currentVelocity.y);
  }
}
