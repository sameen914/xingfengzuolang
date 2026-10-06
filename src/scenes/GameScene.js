import * as Phaser from 'phaser';
import Player from '../player/Player.js?v=2.0.0';
import SpawnSystem from '../systems/SpawnSystem.js?v=2.0.0';
import AdaptiveMusicSystem from '../systems/AdaptiveMusicSystem.js?v=2.0.0';
import VfxSystem, { preloadRegisteredVfx, getPlayerVisualAnchor } from '../systems/VfxSystem.js?v=2.0.0';
import ImportantTextManager from '../systems/ImportantTextManager.js?v=2.0.0';
import { BEAT_VFX, SUPPORT_HEART_VFX, STAGE_SPIN_VFX, VFX_KEYS, getCrescentVfxLevel, getLightningVfxLevel } from '../config/vfxConfig.js?v=2.0.0';
import { GAME, PLAYER, ENEMIES, SPAWN, STATUS_EFFECTS, RELEASE, getDifficultyProfile } from '../config/gameConfig.js?v=2.0.0';
import { wrapUpgradeCardTextSemantic } from '../ui/upgradeTextWrap.js?v=2.0.0';

const PLAYER_COMBO_BREAK_MS = 2000;
const PLAYER_COMBO_FEEDBACK_START = 20;
const PLAYER_COMBO_BURST_MILESTONES = Object.freeze([25, 30, 40, 50, 60, 80, 100]);
const THEME_BLUE = 0x94d5f3;
const THEME_BLUE_HEX = '#94d5f3';
const GOLD_PARTICLE = 0xffd46b;
const LIFESTEAL_RED = 0xff4058;
const LIFESTEAL_RED_HOT = 0xff7b8a;
const UPGRADE_ROMAN = Object.freeze(['', 'I', 'II', 'III', 'IV']);
const KEY_UP_PEAK_MS = 560;
const KEY_UP_BURST_MS = 650;
const KEY_UP_VISUAL_MS = 1050;
const KEY_UP_VFX_GROUP_Y_OFFSET = 12;
const KEY_UP_BURST_Y_OFFSET = 24;
const KEY_UP_VFX_PIVOTS = Object.freeze({
  ground: Object.freeze({ x: 0.492, y: 0.797 }),
  spiralBack: Object.freeze({ x: 0.508, y: 0.930 }),
  spiralFront: Object.freeze({ x: 0.515, y: 0.926 }),
  burst: Object.freeze({ x: 0.493, y: 0.810 }),
  peak: Object.freeze({ x: 0.506, y: 0.568 })
});

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }


  init(data = {}) {
    const requested = data?.difficulty ?? this.registry.get('selectedDifficulty') ?? 'normal';
    this.difficultyKey = requested;
    this.difficultyProfile = getDifficultyProfile(requested);
    this.registry.set('selectedDifficulty', this.difficultyProfile.key);
  }

  bindBootLoadingProgress() {
    if (typeof document === 'undefined') return;

    const root = document.getElementById('boot-loading');
    const percent = document.getElementById('boot-loading-percent');
    const fill = document.getElementById('boot-loading-fill');
    if (!root) return;

    root.classList.remove('boot-loading-hidden', 'boot-loading-complete');

    const updateProgress = (value = 0) => {
      const safe = Phaser.Math.Clamp(Number(value) || 0, 0, 1);
      if (percent) percent.textContent = `${Math.round(safe * 100)}%`;
      if (fill) fill.style.transform = `scaleX(${safe})`;
    };

    updateProgress(0);
    this.load.on('progress', updateProgress);
    this.load.once('complete', () => {
      updateProgress(1);
      root.classList.add('boot-loading-complete');
      window.setTimeout(() => root.remove(), 260);
    });
  }

  preload() {
    this.bindBootLoadingProgress();

    this.load.image('playerArt', 'assets/player/player_idle.png');
    this.load.image('playerMutualSupportHealArt', 'assets/player/player_mutual_support_heal.png');
    this.load.image('playerKeyUpBurstArt', 'assets/player/player_key_up_burst.png');
    this.load.image('playerXiafanStunArt', 'assets/player/player_xiafan_stun.png');
    this.load.image('playerXiafanRecoverArt', 'assets/player/player_xiafan_recover.png');
    this.load.image('playerJudgmentKnockdownArt', 'assets/player/player_judgment_knockdown.png');
    this.load.image('playerFishNetCaughtArt', 'assets/player/player_fish_net_caught.png');
    this.load.image('playerFishNetPullArt', 'assets/player/player_fish_net_pull.png');
    this.load.image('playerDuckQueenDrainArt', 'assets/player/player_duck_queen_drain.png');
    this.load.image('playerDafamaiReliefArt', 'assets/player/player_dafamai_relief.png');
    this.load.image('playerDafamaiNoticeArt', 'assets/player/player_dafamai_notice.png');
    this.load.image('playerDafamaiPanic1Art', 'assets/player/player_dafamai_panic_1.png');
    this.load.image('playerDafamaiPanic2Art', 'assets/player/player_dafamai_panic_2.png');
    this.load.image('playerDafamaiTrappedArt', 'assets/player/player_dafamai_trapped.png');
    this.load.image('playerDafamaiImpaledArt', 'assets/player/player_dafamai_impaled.png');
    this.load.image('playerDafamaiHangingArt', 'assets/player/player_dafamai_hanging.png');
    this.load.image('playerBlackwaterAlertArt', 'assets/player/blackwater/player_blackwater_01.png');
    this.load.image('playerBlackwaterDodgeRightArt', 'assets/player/blackwater/player_blackwater_02.png');
    this.load.image('playerBlackwaterGlanceBackArt', 'assets/player/blackwater/player_blackwater_03.png');
    this.load.image('playerBlackwaterDodgeLeftArt', 'assets/player/blackwater/player_blackwater_04.png');
    this.load.image('playerBlackwaterExtremeDodgeArt', 'assets/player/blackwater/player_blackwater_05.png');
    this.load.image('playerBlackwaterWoundedDodgeAArt', 'assets/player/blackwater/player_blackwater_06.png');
    this.load.image('playerBlackwaterWoundedDodgeBArt', 'assets/player/blackwater/player_blackwater_07.png');
    this.load.image('playerBlackwaterDownArt', 'assets/player/blackwater/player_blackwater_08.png');
    this.load.image('playerBlackwaterEndingArt', 'assets/player/blackwater/player_blackwater_09.png');
    preloadRegisteredVfx(this);

    this.load.image('potatoNormalArt', 'assets/potato/potato_normal.png');
    this.load.image('potatoSproutArt', 'assets/potato/potato_sprout.png');
    this.load.image('potatoPoisonArt', 'assets/potato/potato_poison.png');
    this.load.image('potatoBlessedBigArt', 'assets/potato/potato_blessed_big.png');
    this.load.image('potatoBlessedSproutArt', 'assets/potato/potato_blessed_sprout.png');
    this.load.image('potatoBlessedPoisonArt', 'assets/potato/potato_blessed_poison.png');
    this.load.image('potatoDeadArt', 'assets/potato/potato_dead.png');


    const potatoCommanderArt = {
      potatoCommanderS1NormalArt: 'assets/potato_commander/stage1/potato_commander_s1_normal.png',
      potatoCommanderS1GroupArt: 'assets/potato_commander/stage1/potato_commander_s1_baotuan.png',

      potatoCommanderS2NormalArt: 'assets/potato_commander/stage2/potato_commander_s2_normal.png',
      potatoCommanderS2GroupArt: 'assets/potato_commander/stage2/potato_commander_s2_baotuan.png',
      potatoCommanderS2SmashArt: 'assets/potato_commander/stage2/potato_commander_s2_xiafan.png',

      potatoCommanderS3NormalArt: 'assets/potato_commander/stage3/potato_commander_s3_normal.png',
      potatoCommanderS3GroupArt: 'assets/potato_commander/stage3/potato_commander_s3_baotuan.png',
      potatoCommanderS3SmashArt: 'assets/potato_commander/stage3/potato_commander_s3_xiafan.png',
      potatoCommanderS3BlessArt: 'assets/potato_commander/stage3/potato_commander_s3_cifu.png',
      potatoCommanderS3CleanseArt: 'assets/potato_commander/stage3/potato_commander_s3_jingchang.png',
      potatoCommanderS3LikeArt: 'assets/potato_commander/stage3/potato_commander_s3_like.png',

      potatoCommanderS4NormalArt: 'assets/potato_commander/stage4/potato_commander_s4_normal.png',
      potatoCommanderS4GroupArt: 'assets/potato_commander/stage4/potato_commander_s4_baotuan.png',
      potatoCommanderS4SmashArt: 'assets/potato_commander/stage4/potato_commander_s4_xiafan.png',
      potatoCommanderS4BlessArt: 'assets/potato_commander/stage4/potato_commander_s4_cifu.png',
      potatoCommanderS4CleanseArt: 'assets/potato_commander/stage4/potato_commander_s4_jingchang.png',
      potatoCommanderS4GraceArt: 'assets/potato_commander/stage4/potato_commander_s4_shengen_youjia.png',
      potatoCommanderS4JudgmentCastArt: 'assets/potato_commander/stage4/potato_commander_s4_shengcai_cast.png',

      potatoCommanderSmashImpactArt: 'assets/potato_commander/vfx/xiafan_impact.png',
      potatoCommanderJudgmentWarningArt: 'assets/potato_commander/vfx/shengcai_warning_cross.png',
      potatoCommanderJudgmentExplosionArt: 'assets/potato_commander/vfx/shengcai_explosion.png',
      potatoCommanderJudgmentTitleArt: 'assets/potato_commander/vfx/shengcai_title.png',
      potatoCommanderJudgmentPipUnlitArt: 'assets/potato_commander/vfx/shengcai_pip_unlit.png',
      potatoCommanderJudgmentPipLitArt: 'assets/potato_commander/vfx/shengcai_pip_lit.png',
      potatoCommanderJudgmentRainArt: 'assets/potato_commander/vfx/shengcai_falling_cross.png',
      potatoCommanderBlackwaterTitleArt: 'assets/potato_commander/vfx/xiaheishui_title.png',
      potatoCommanderBlackwaterCraterSmallArt: 'assets/potato_commander/vfx/xiaheishui_crater_small.png',
      potatoCommanderBlackwaterCraterMediumArt: 'assets/potato_commander/vfx/xiaheishui_crater_medium.png',
      potatoCommanderBlackwaterFinalImpactArt: 'assets/potato_commander/vfx/xiaheishui_final_impact.png'
    };

    Object.entries(potatoCommanderArt).forEach(([key, path]) => {
      this.load.image(key, path);
    });

    this.load.image('duckArt', 'assets/duck/duck_normal.png');
    this.load.image('duckDeadArt', 'assets/duck/duck_dead.png');

    this.load.image('roachArt', 'assets/roach/roach_normal.png');
    this.load.image('roachDeadArt', 'assets/roach/roach_dead.png');

    this.load.image('ballArt', 'assets/football/football_normal.png');
    this.load.image('ballDeadArt', 'assets/football/football_dead.png');

    const enemyBloodSplatArt = {
      duckBlood01Art: 'assets/blood_splats/duck_blood_01.png',
      duckBlood02Art: 'assets/blood_splats/duck_blood_02.png',
      duckBlood03Art: 'assets/blood_splats/duck_blood_03.png',
      roachBlood01Art: 'assets/blood_splats/roach_blood_01.png',
      roachBlood02Art: 'assets/blood_splats/roach_blood_02.png',
      roachBlood03Art: 'assets/blood_splats/roach_blood_03.png',
      potatoBlood01Art: 'assets/blood_splats/potato_blood_01.png',
      potatoBlood02Art: 'assets/blood_splats/potato_blood_02.png',
      potatoBlood03Art: 'assets/blood_splats/potato_blood_03.png',
      ballBlood01Art: 'assets/blood_splats/ball_blood_01.png'
    };
    Object.entries(enemyBloodSplatArt).forEach(([key, path]) => this.load.image(key, path));

    this.load.image('twinPigsNormalArt', 'assets/twin_pigs/twin_pigs_normal.png');
    this.load.image('twinPigsPoopArt', 'assets/twin_pigs/twin_pigs_poop.png');
    this.load.image('twinPigsBeg01Art', 'assets/twin_pigs/twin_pigs_beg_01.png');
    this.load.image('twinPigsBeg02Art', 'assets/twin_pigs/twin_pigs_beg_02.png');
    this.load.image('poopOverlayAArt', 'assets/twin_pigs/poop_fx/poop_overlay_a.png');
    this.load.image('poopOverlayBArt', 'assets/twin_pigs/poop_fx/poop_overlay_b.png');
    this.load.image('poopOverlayCArt', 'assets/twin_pigs/poop_fx/poop_overlay_c.png');
    this.load.image('poopGroundPuddleArt', 'assets/twin_pigs/poop_fx/poop_ground_puddle.png');
    this.load.image('poopProjectileArt', 'assets/twin_pigs/poop_fx/poop_projectile.png');
    this.load.image('poopInfectBurstArt', 'assets/twin_pigs/poop_fx/poop_infect_burst.png');
    this.load.image('poopHitArt', 'assets/twin_pigs/poop_fx/poop_hit.png');

    this.load.image('plagueCatNormalArt', 'assets/plague_cat/plague_cat_normal.png');
    this.load.image('plagueCatSprayArt', 'assets/plague_cat/plague_cat_spray.png');
    this.load.image('plagueCatLovestruck01Art', 'assets/plague_cat/plague_cat_lovestruck_01.png');
    this.load.image('plagueCatLovestruck02Art', 'assets/plague_cat/plague_cat_lovestruck_02.png');
    this.load.image('plagueCatPounceArt', 'assets/plague_cat/plague_cat_pounce.png');
    this.load.image('plagueGroundGasArt', 'assets/plague_cat/plague_fx/plague_ground_toxic_gas_cloud.png');
    this.load.image('plagueOverlayAArt', 'assets/plague_cat/plague_fx/plague_overlay_a.png');
    this.load.image('plagueOverlayBArt', 'assets/plague_cat/plague_fx/plague_overlay_b.png');
    this.load.image('plagueOverlayCArt', 'assets/plague_cat/plague_fx/plague_overlay_c.png');

    this.load.image('queenDuckS1NormalArt', 'assets/duck_queen/queen_duck_s1_normal.png');
    this.load.image('queenDuckS1CandyArt', 'assets/duck_queen/queen_duck_s1_candy.png');
    this.load.image('queenDuckS2NormalArt', 'assets/duck_queen/queen_duck_s2_normal.png');
    this.load.image('queenDuckS2CandyArt', 'assets/duck_queen/queen_duck_s2_candy.png');
    this.load.image('queenDuckS2TietieArt', 'assets/duck_queen/queen_duck_s2_tietie.png');
    this.load.image('queenDuckS3NormalArt', 'assets/duck_queen/queen_duck_s3_normal.png');
    this.load.image('queenDuckS3MoodNormalArt', 'assets/duck_queen/queen_duck_s3_mood_normal.png');
    this.load.image('queenDuckS3MoodColdArt', 'assets/duck_queen/queen_duck_s3_mood_cold.png');
    this.load.image('queenDuckS3MoodFuriousArt', 'assets/duck_queen/queen_duck_s3_mood_furious.png');
    this.load.image('queenDuckS3MoodCryingArt', 'assets/duck_queen/queen_duck_s3_mood_crying.png');
    this.load.image('queenDuckS3CandyArt', 'assets/duck_queen/queen_duck_s3_candy.png');
    this.load.image('queenDuckS3TietieArt', 'assets/duck_queen/queen_duck_s3_tietie.png');
    this.load.image('queenDuckS3BlackframeCastArt', 'assets/duck_queen/queen_duck_s3_blackframe_cast.png');
    this.load.image('queenDuckBlackframeStandardArt', 'assets/duck_queen/blackframe_standard.png');
    this.load.image('queenDuckS3DafamaiCastArt', 'assets/duck_queen/queen_duck_s3_dafamai_cast.png');
    this.load.image('queenDuckDafamaiTitleArt', 'assets/duck_queen/dafamai_title.png');
    this.load.image('queenDuckDafamaiExplosionArt', 'assets/duck_queen/dafamai_explosion.png');
    this.load.image('queenDuckDafamaiGroundReliefArt', 'assets/duck_queen/dafamai/ground_relief.png');
    this.load.image('queenDuckDafamaiGroundNoticeArt', 'assets/duck_queen/dafamai/ground_notice.png');
    this.load.image('queenDuckDafamaiGroundPanic1Art', 'assets/duck_queen/dafamai/ground_panic_1.png');
    this.load.image('queenDuckDafamaiGroundPanic2Art', 'assets/duck_queen/dafamai/ground_panic_2.png');
    this.load.image('queenDuckDafamaiGroundTrappedArt', 'assets/duck_queen/dafamai/ground_trapped.png');
    this.load.image('queenDuckDafamaiImpaleBaseArt', 'assets/duck_queen/dafamai/impale_base.png');
    this.load.image('queenFishProjectileArt', 'assets/duck_queen/queen_fish_projectile.png');

    this.load.image('queenDuckEndingDefeatArt', 'assets/duck_queen/ending/queen_duck_defeated_cry.png');
    this.load.image('playerVictoryEnding01', 'assets/player/ending/victory_01_think.png');
    this.load.image('playerVictoryEnding02', 'assets/player/ending/victory_02_close.png');
    this.load.image('playerVictoryEnding03', 'assets/player/ending/victory_03_snap.png');
    this.load.image('playerVictoryEnding04', 'assets/player/ending/victory_04_smirk.png');
    this.load.image('playerVictoryEnding05', 'assets/player/ending/victory_05_close_flourish.png');
    this.load.image('playerVictoryEnding06', 'assets/player/ending/victory_06_close_final.png');

    const adaptiveTracks = {
      musicCombo: '01_combo_smooth.wav',
      musicCriticalHp: '03_swarm.wav',
      musicElite: '04_elite.wav',
      musicBossAppear: '05_boss_appear.wav',
      musicBossDefeated: '06_boss_defeated.wav',
      musicDefeat: '07_defeat.wav'
    };

    Object.entries(adaptiveTracks).forEach(([key, file]) => {
      this.load.audio(key, `assets/audio/adaptive/${file}`);
    });

    this.load.audio('hitLight', 'assets/audio/sfx/hit_light.wav');
    this.load.audio('blackwaterTitleOmenSfx', 'assets/audio/sfx/blackwater/blackwater_title_omen.wav');
    this.load.audio('blackwaterCrossWarningSfx', 'assets/audio/sfx/blackwater/blackwater_cross_warning.wav');
    this.load.audio('blackwaterCrossImpactSfx', 'assets/audio/sfx/blackwater/blackwater_cross_impact.wav');
    this.load.audio('blackwaterFrenzyRumbleSfx', 'assets/audio/sfx/blackwater/blackwater_frenzy_rumble.wav');
    this.load.audio('blackwaterFinalBlastSfx', 'assets/audio/sfx/blackwater/blackwater_final_blast.wav');
    this.load.audio('blackwaterBlindRingSfx', 'assets/audio/sfx/blackwater/blackwater_blind_ring.wav');
    this.load.image('mutualSupportMoonCrescentArt', 'assets/vfx/mutual_support/moon_crescent_smooth.png');
    this.load.image('mutualSupportSkyMoonArt', 'assets/vfx/mutual_support/moon_crescent_moonlight.png');
    this.load.image('mutualSupportBeamMainArt', 'assets/vfx/mutual_support/moon_beam_main.png');
    this.load.image('mutualSupportBeamHealArt', 'assets/vfx/mutual_support/moon_beam_heal.png');
    this.load.audio('mutualSupportHitSfx', 'assets/audio/sfx/mutual_support_hit.wav');
    this.load.audio('mutualSupportMoonlightSfx', 'assets/audio/sfx/mutual_support_moonlight.wav');
    this.load.audio('mutualSupportMoonAppearSfx', 'assets/audio/sfx/mutual_support_moon_appear.wav');
    this.load.audio('mutualSupportHealSfx', 'assets/audio/sfx/mutual_support_heal.wav');
    this.load.audio('mutualSupportCleanseSfx', 'assets/audio/sfx/mutual_support_cleanse.wav');
    this.load.image('keyUpSpiralBackArt', 'assets/vfx/key_up/key_up_spiral_back.png');
    this.load.image('keyUpSpiralFrontArt', 'assets/vfx/key_up/key_up_spiral_front.png');
    this.load.image('keyUpGroundFlameArt', 'assets/vfx/key_up/key_up_ground_flame.png');
    this.load.image('keyUpAoeBurstArt', 'assets/vfx/key_up/key_up_aoe_burst.png');
    this.load.image('keyUpPeakFlashArt', 'assets/vfx/key_up/key_up_peak_flash.png');
    this.load.audio('duckQueenVictoryMusic', 'assets/audio/ending/victory_0927.mp3');
    this.load.audio('danjiEndingMusic', 'assets/audio/ending/danji.mp3');
    this.load.audio('potatoEndingSendoffMusic', 'assets/audio/ending/songbie.mp3');
    this.load.audio('potatoEndingFrogMusic', 'assets/audio/ending/xiaotiaowa_long.mp3');
    this.load.image('potatoCommanderEndingDefeatedArt', 'assets/potato_commander/ending/potato_commander_defeated_cry.png');
  }

  create() {
    this.createPlaceholderTextures();
    this.vfx = new VfxSystem(this);
    this.activeElectricCasts = new Set();
    this.importantText = new ImportantTextManager(this);

    this.physics.world.setBounds(0, 0, GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT);
    this.createWorldGrid();

    this.player = new Player(this, GAME.WORLD_WIDTH / 2, GAME.WORLD_HEIGHT / 2);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.xpGems = this.physics.add.group();
    this.poopProjectiles = this.physics.add.group();
    this.fishProjectiles = this.physics.add.group();
    this.potatoCommanderCrossProjectiles = this.physics.add.group();
    this.cassetteDrops = this.physics.add.group();
    this.supportHearts = this.physics.add.group();
    this.fishStinkZones = [];
    this.enemyBloodPuddles = [];
    this.plagueZones = [];
    this.poopZones = [];
    this.spawnSystem = new SpawnSystem(this, this.enemies);
    this.statusEffects = STATUS_EFFECTS;

    this.bossActive = false;
    this.duckQueen = null;
    this.duckQueenAttached = false;
    this.duckQueenAuraActive = false;
    this.duckQueenAttachStartedAt = -Infinity;
    this.duckQueenGrappleActive = false;
    this.duckQueenEscapeInputs = 0;
    this.duckQueenGrappleSide = 1;
    this.duckQueenEscapeHint = null;
    this.nextDuckQueenDrainAt = 0;
    this.nextDuckQueenHeartAt = 0;
    this.duckQueenPinkPuddles = [];
    this.duckQueenPinkStains = [];
    this.duckQueenDazeUntil = -Infinity;
    this.duckQueenCharmSpell = null;
    this.duckQueenCharmUntil = -Infinity;
    this.duckQueenCharmMark = null;
    this.duckQueenCharmControlHint = null;
    this.playerInFishStink = false;
    this.playerInDuckQueenPinkPuddle = false;
    this.playerStatusNoticeTimes = new Map();
    this.duckQueenCandyReactionUntil = -Infinity;
    this.duckQueenCandyReactionPhase = null;
    this.duckQueenTietieReactionUntil = -Infinity;
    this.duckQueenTietieReactionPhase = null;
    this.duckQueenDafaReactionUntil = -Infinity;

    this.duckQueenFishNetActive = false;
    this.duckQueenFishNetEscapeInputs = 0;
    this.duckQueenFishNetPullStartsAt = -Infinity;
    this.duckQueenFishNetGraphics = null;
    this.duckQueenFishNetHint = null;
    this.duckQueenFishNetVisualState = null;


    this.duckQueenUltimateActive = false;
    this.duckQueenUltimateStage = 'idle';
    this.duckQueenUltimateEvents = [];
    this.duckQueenUltimateFx = [];
    this.duckQueenUltimateTitle = null;
    this.duckQueenUltimateSafeZone = null;
    this.duckQueenUltimateBlackframes = [];
    this.duckQueenUltimatePlayerActor = null;
    this.duckQueenUltimatePlayerRestore = null;
    this.duckQueenUltimateAnchorX = null;
    this.duckQueenUltimateAnchorY = null;
    this.duckQueenUltimateCutsceneActive = false;
    this.duckQueenDafamaiEvacuationActive = false;
    this.duckQueenDafamaiEvacuationCenterX = null;
    this.duckQueenDafamaiEvacuationCenterY = null;
    this.duckQueenDafamaiRoachFinaleActive = false;

    this.potatoCommander = null;
    this.potatoPityActive = false;
    this.potatoCommanderDefeated = false;
    this.commanderSkySmashActive = false;
    this.commanderLikeAttackActive = false;
    this.commanderLikePlayerHitUntil = -Infinity;
    this.commanderJudgmentActive = false;
    this.commanderBlackwaterPreviewActive = false;
    this.commanderBlackwaterEvents = [];
    this.commanderBlackwaterFx = [];
    this.commanderBlackwaterCraters = [];
    this.commanderBlackwaterPlayerActor = null;
    this.commanderBlackwaterCloseupActor = null;
    this.commanderBlackwaterCloseupGlow = null;
    this.commanderBlackwaterCloseupShade = null;
    this.commanderBlackwaterCloseupMaskSource = null;
    this.commanderBlackwaterCloseupBitmapMask = null;
    this.commanderBlackwaterPlayerRestore = null;
    this.commanderBlackwaterPhysicsWasPaused = false;
    this.judgmentRainAnchorX = null;
    this.judgmentRainAnchorY = null;
    this.judgmentRainCellOrder = [];
    this.judgmentRainCellCursor = 0;
    this.spawnSuppressedUntil = -Infinity;
    this.endingSequenceActive = false;
    this.victoryElapsedSeconds = null;

    this.duckQueenVictoryEndingActive = false;
    this.duckQueenVictoryEndingEvents = [];
    this.duckQueenVictoryEndingFx = [];
    this.duckQueenVictoryEndingDefeatActor = null;
    this.duckQueenVictoryEndingCutinActor = null;
    this.duckQueenVictoryEndingCassette = null;
    this.duckQueenVictoryEndingCassetteLabel = null;
    this.duckQueenVictoryEndingVictoryAudio = null;
    this.duckQueenVictoryEndingAudio = null;
    this.duckQueenVictoryEndingCrowd = [];
    this.duckQueenVictoryEndingCrowdExploded = false;
    this.duckQueenVictoryEndingHudSnapshot = [];
    this.duckQueenVictoryEndingCombatSnapshot = [];
    this.duckQueenVictoryEndingPlayerGroundY = null;
    this.duckQueenVictoryEndingGroundVfxSyncEvent = null;
    this.duckQueenVictoryEndingBeatSnapshot = null;

    this.potatoCommanderEndingActive = false;
    this.potatoCommanderEndingEvents = [];
    this.potatoCommanderEndingFx = [];
    this.potatoCommanderEndingAudio = null;
    this.potatoCommanderEndingFlag = null;
    this.potatoCommanderEndingFlagParts = null;
    this.potatoCommanderEndingBossActor = null;
    this.potatoCommanderEndingFrog = null;
    this.potatoCommanderEndingCurtain = null;
    this.potatoCommanderBattleSummaryFx = [];


    this.supportBuffUntil = -Infinity;
    this.nextSupportHeartAt = this.time.now + PLAYER.SUPPORT_HEART_FIRST_MS;
    this.mobileMoveVector = new Phaser.Math.Vector2(0, 0);
    this.mobileMovePointerId = null;
    this.mobileControls = [];
    this.mobileButtonState = {};
    this.mobileBeatGlobalState = null;

    this.prefersTouchEscape = Boolean(
      this.sys.game.device.input.touch
      || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
      || (
        typeof window !== 'undefined'
        && window.matchMedia
        && window.matchMedia('(pointer: coarse)').matches
      )
    );

    this.bossBarBg = null;
    this.bossBarRedFill = null;
    this.bossBarYellowFill = null;
    this.bossBarGreenFill = null;
    this.bossBarSkyBlueFill = null;
    this.bossBarText = null;
    this.bossSkillHudText = null;
    this.bossSkillHudSourceType = null;

    this.playerHpBarBg = null;
    this.playerHpBarRedFill = null;
    this.playerHpBarYellowFill = null;
    this.playerHpBarGreenFill = null;
    this.playerHpBarSkyBlueFill = null;
    this.playerHpBarWidth = 170;
    this.playerHpBarHeight = 15;

    this.judgmentHudTitle = null;
    this.judgmentHudCrosses = [];
    this.judgmentHudVisible = false;

    this.level = 1;
    this.xp = 0;
    this.xpNeeded = this.getXpNeeded();
    this.playerOutline = null;
    this.playerAuraBlueGlow = null;
    this.playerAuraRedGlow = null;
    this.playerAuraTransientFx = new Set();
    this.nextPlayerAuraBlueParticleAt = 0;
    this.nextPlayerAuraRedParticleAt = 0;
    this.nextPlayerAuraBlueArcAt = 0;
    this.nextPlayerAuraRedArcAt = 0;
    this.playerAuraOverdriveUntil = -Infinity;
    this.playerOccludedByCommander = false;
    this.playerOccludedByDuckQueen = false;
    this.duckQueenMinionOverlapCached = false;
    this.duckQueenMinionOcclusionNextCheckAt = -Infinity;
    this.createPlayerOutlineVisual();
    this.kills = {
      potato: 0,
      duck: 0,
      ball: 0,
      roach: 0,
      twinPig: 0,
      plagueCat: 0,
      duckQueen: 0,
      potatoCommander: 0
    };
    this.combo = 0;
    this.highestCombo = 0;
    this.lastSuccessfulRhythmGameplayMs = -Infinity;
    this.playerComboFeedbackText = null;

    this.beatCharge = false;
    this.beatChargeComboTier = 0;
    this.lastRhythmBeatIndex = null;
    this.lastFlashStepDashStartedAt = -Infinity;
    this.beatChargeIndicator = null;
    this.crescentVolleySerial = 0;
    this.crescentLifestealProcessedVolleys = new Set();

    this.playerOrbitCrescentUnlocked = false;
    this.playerOrbitCrescentPendingUnlock = false;
    this.playerOrbitCrescent = null;
    this.playerOrbitCrescentOutline = null;
    this.playerOrbitCrescentAngle = Math.PI * 0.12;
    this.playerOrbitCrescentHitCooldowns = new WeakMap();
    this.playerOrbitCrescentNextSfxAt = -Infinity;

    this.tutorialBeatActionHit = false;
    this.tutorialFlashStepHit = false;
    this.tutorialBeatActionHitAt = -Infinity;
    this.tutorialFlashStepHitAt = -Infinity;

    this.adaptiveMusic = new AdaptiveMusicSystem(this);
    this.adaptiveMusic.create();
    this.beatStrongImage = null;
    this.beatWeakImage = null;
    this.waitingForGameStart = true;
    this.gameStartInitiated = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.adaptiveMusic?.stopAll();
      this.activeElectricCasts?.clear();
      this.clearPlayerAuraTransientFx?.();
      this.playerAuraBlueGlow?.destroy?.();
      this.playerAuraRedGlow?.destroy?.();
      this.vfx?.destroyAll();
    });
    this.tutorialMoved = false;
    this.tutorialDashed = false;
    this.tutorialBeatHit = false;
    this.tutorialHintKey = null;
    this.tutorialHintText = null;
    this.tutorialStartX = this.player.x;
    this.tutorialStartY = this.player.y;

    this.activeWorldTextLabels = [];
    this.activeScreenNotices = [];

    this.xpFeedbackText = null;
    this.lastXpPickupAt = -Infinity;
    this.xpFeedbackBurst = 0;

    this.activeDuckQuacks = 0;

    this.startedAt = this.time.now;
    this.gameplayElapsedMs = 0;
    this.nextShotAt = 0;
    this.isChoosingUpgrade = false;
    this.pendingUpgradeChoices = 0;
    this.pendingUpgradeMilestoneLevels = [];
    this.activeUpgradeMilestoneLevel = null;
    this.upgradeBlockedUntil = -Infinity;
    this.finished = false;

    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHitsEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyTouchesPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.xpGems, this.onCollectXp, undefined, this);
    this.physics.add.overlap(this.player, this.poopProjectiles, this.onPoopHitsPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.fishProjectiles, this.onFishHitsPlayer, undefined, this);
    this.physics.add.overlap(
      this.player,
      this.potatoCommanderCrossProjectiles,
      this.onPotatoCommanderCrossHitsPlayer,
      undefined,
      this
    );
    this.physics.add.overlap(this.player, this.cassetteDrops, this.onCollectCassette, undefined, this);
    this.physics.add.overlap(this.player, this.supportHearts, this.onCollectSupportHeart, undefined, this);

    this.createHud();
    this.createMobileControls();
    this.scale.on('resize', this.applyResponsiveLayout, this);
    this.time.delayedCall(0, () => this.applyResponsiveLayout());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.applyResponsiveLayout, this);
    });

    this.tutorialHintText = this.add.text(
      GAME.WIDTH / 2,
      this.prefersTouchEscape
        ? 104
        : 94,
      '',
      {
        fontSize: this.prefersTouchEscape ? '17px' : '18px',
        fontStyle: 'bold',
        color: '#f4fbff',
        stroke: '#243447',
        strokeThickness: 4,
        align: 'center'
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(188)
      .setVisible(false);

    const launchedFromStartScene = this.registry.get('launchedFromStartScene') === true;
    const autoStartRun = this.registry.get('autoStartRun') === true;
    const forceTitleGate = this.registry.get('forceTitleGate') === true;
    this.registry.set('launchedFromStartScene', false);
    this.registry.set('autoStartRun', false);
    this.registry.set('forceTitleGate', false);

    if (!launchedFromStartScene) this.createGameStartGate();

    const startExperience = () => this.startGameplayExperience();
    if (!launchedFromStartScene) {
      this.input.once('pointerdown', startExperience);
      this.input.keyboard.once('keydown', startExperience);
    }

    if (launchedFromStartScene || autoStartRun) {
      this.time.delayedCall(0, () => this.startGameplayExperience());
    } else {
      const audioContext = this.sound?.context;
      if (
        !forceTitleGate
        && !this.sound?.locked
        && (!audioContext || audioContext.state === 'running')
      ) {
        this.time.delayedCall(0, () => this.startGameplayExperience());
      }
    }

    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.waitingForGameStart) return;
      if (this.finished || this.isChoosingUpgrade || this.player.hp <= 0) return;

      if (this.duckQueenGrappleActive) {
        this.registerDuckQueenEscapeInput();
        return;
      }

      if (this.duckQueenFishNetActive) {
        this.registerDuckQueenFishNetEscapeInput();
        return;
      }

      this.player.tryDash(this.time.now);
    });

    this.input.on('pointerdown', () => {
      if (
        this.duckQueenGrappleActive
        && this.prefersTouchEscape
        && !this.finished
        && !this.isChoosingUpgrade
      ) {
        this.registerDuckQueenEscapeInput();
        return;
      }

      if (
        this.duckQueenFishNetActive
        && this.prefersTouchEscape
        && !this.finished
        && !this.isChoosingUpgrade
      ) {
        this.registerDuckQueenFishNetEscapeInput();
      }
    });


    this.input.keyboard.on('keydown-Q', () => {
      if (!this.finished && !this.isChoosingUpgrade && !this.endingSequenceActive) {
        this.tryBeatAction();
      }
    });

    this.input.keyboard.on('keydown-E', () => {
      if (!this.finished && !this.isChoosingUpgrade && !this.endingSequenceActive) {
        this.tryKeyUp();
      }
    });

    this.input.keyboard.on('keydown-R', () => {
      if (this.endingSequenceActive) return;
      if (this.player.hp <= 0 || this.finished) {
        this.registry.set('autoStartRun', true);
        this.scene.restart();
        return;
      }

      if (!this.isChoosingUpgrade) {
        this.tryMutualSupport();
      }
    });

    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (!this.finished) return;
      if (false) return;

      const overInteractive = Array.isArray(currentlyOver)
        && currentlyOver.some((obj) => obj?.input?.enabled);

      if (!overInteractive) {
        this.scene.restart();
      }
    });
  }

  update(time, delta) {
    if (
      this.finished
      || this.endingSequenceActive
    ) return;

    if (this.isChoosingUpgrade) {
      this.updateFinalBossActorDepthSort();
      this.updatePotatoCommanderOcclusion(delta * 0.25);
      this.updateDuckQueenOcclusion(delta * 0.25);
      this.updatePlayerOutlineVisual();
      this.updatePlayerGrowthAura(time);
      this.importantText?.update(delta * 0.25);
      this.updateBossHud();
      this.updateHud(this.getGameplayElapsedSeconds(), time);
      return;
    }

    if (this.waitingForGameStart) return;

    if (this.tryPresentPendingUpgradeChoice()) return;

    this.gameplayElapsedMs += delta;

    if (this.player.hp <= 0) {
      this.endRun(false);
      return;
    }

    this.updateRhythmComboTimeout(this.gameplayElapsedMs);

    this.player.updateVisualAction?.(time);
    this.player.updateMovement(time);
    const elapsedSeconds = this.getGameplayElapsedSeconds();

    this.adaptiveMusic?.update();
    this.updateScreenNoticeBeatSync();
    this.updateTutorial(elapsedSeconds);

    this.spawnSystem.update(time, elapsedSeconds);

      this.enemies.children.iterate((enemy) => {
        if (!enemy?.active) return;
        if (this.updateDuckQueenDafamaiMinionEvacuation(enemy, time)) return;
        enemy.updateAI(time);
      });

    this.applyMinionSeparationSteering(time);

    this.updateFinalBossActorDepthSort();
    this.updatePotatoCommanderOcclusion(delta);
    this.updateDuckQueenOcclusion(delta);
    this.updatePlayerOutlineVisual();
    this.updatePlayerGrowthAura(time);

    this.importantText?.update(delta);
    this.updateDuckQueenUltimate(time);
    this.updateDuckQueenEcology(time);
    this.updateDuckQueenCharm(time, delta);
    this.updateDuckQueenFishNet(time);
    this.updateDuckQueenGrapple(time);
    this.duckQueen?.ensureContinuousMotion?.(time);
    this.updateDuckQueenDrainVisual(time);
    this.updateDuckQueenPinkPuddles(time);
    this.updateDuckQueenPinkStains(time);
    this.updateDuckQueenDazeVisual(time);
    this.updateBossHud();
    this.updateXpMagnet();
    this.updateSupportHearts(time);
    this.updatePlayerPoison(delta);

    this.updatePlagueZones(time);
    this.updatePoopZones(time);
    this.updateFishStinkZones(time);
    this.updateEnemyBloodPuddles(time);
    this.cleanupPoopProjectiles(time);
    this.cleanupFishProjectiles(time);
    this.cleanupPotatoCommanderCrossProjectiles(time);

    this.updatePlayerAoe(time);
    this.updateElectricRadiance(time);
    this.updateBeatChargeIndicator();
    this.updatePlayerOrbitCrescent(time, delta);
    if (time >= this.nextShotAt) this.autoFire(time);
    this.updateElectricCastAnchors();
    this.cleanupBullets(time);

    this.updateHud(elapsedSeconds, time);
  }

  getGameplayElapsedSeconds() {
    return this.gameplayElapsedMs / 1000;
  }

  applyMinionSeparationSteering(time = this.time.now) {
    if (this.duckQueenUltimateCutsceneActive || this.finished) return;

    const minionTypes = new Set(['potato', 'duck', 'roach', 'ball']);
    const candidates = [];

    this.enemies.children.iterate((enemy) => {
      if (
        !enemy?.active
        || enemy.isDead
        || enemy.isElite
        || !minionTypes.has(enemy.enemyType)
        || enemy.beingAbsorbed === true
        || enemy.dafamaiPendingExplosion === true
        || enemy.body?.enable === false
        || enemy.isStunned?.(time)
      ) return;

      if (!Number.isFinite(enemy.swarmSeparationSeed)) {
        enemy.swarmSeparationSeed = Phaser.Math.FloatBetween(0, Math.PI * 2);
      }
      candidates.push(enemy);
    });

    if (candidates.length < 2) return;

    const cellSize = 48;
    const grid = new Map();
    const cellKey = (cx, cy) => `${cx},${cy}`;

    candidates.forEach((enemy) => {
      const cx = Math.floor(enemy.x / cellSize);
      const cy = Math.floor(enemy.y / cellSize);
      const key = cellKey(cx, cy);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(enemy);
    });

    candidates.forEach((enemy) => {
      const cx = Math.floor(enemy.x / cellSize);
      const cy = Math.floor(enemy.y / cellSize);
      const selfRadius = Phaser.Math.Clamp(
        Math.min(enemy.displayWidth || 40, enemy.displayHeight || 40) * 0.62,
        26,
        43
      );

      let pushX = 0;
      let pushY = 0;
      let pressure = 0;

      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oy = -1; oy <= 1; oy += 1) {
          const neighbors = grid.get(cellKey(cx + ox, cy + oy));
          if (!neighbors) continue;

          neighbors.forEach((other) => {
            if (other === enemy || !other?.active || other.isDead) return;

            let dx = enemy.x - other.x;
            let dy = enemy.y - other.y;
            let distSq = dx * dx + dy * dy;
            const otherRadius = Phaser.Math.Clamp(
              Math.min(other.displayWidth || 40, other.displayHeight || 40) * 0.62,
              26,
              43
            );
            const minDistance = Math.max(selfRadius, otherRadius);
            if (distSq >= minDistance * minDistance) return;

            if (distSq < 0.01) {
              const angle = enemy.swarmSeparationSeed - (other.swarmSeparationSeed ?? 0);
              dx = Math.cos(angle || enemy.swarmSeparationSeed);
              dy = Math.sin(angle || enemy.swarmSeparationSeed);
              distSq = 1;
            }

            const distance = Math.sqrt(distSq);
            const weight = 1 - distance / minDistance;
            pushX += (dx / distance) * weight;
            pushY += (dy / distance) * weight;
            pressure += weight;
          });
        }
      }

      if (pressure <= 0.001) return;

      const push = new Phaser.Math.Vector2(pushX, pushY);
      if (push.lengthSq() <= 0.0001) return;
      push.normalize();

      const current = new Phaser.Math.Vector2(
        enemy.body?.velocity?.x ?? 0,
        enemy.body?.velocity?.y ?? 0
      );
      const speed = Math.max(42, enemy.moveSpeed ?? enemy.baseMoveSpeed ?? current.length() ?? 80);
      const separationStrength = Phaser.Math.Clamp(0.22 + pressure * 0.20, 0.22, 0.54);
      push.scale(speed * separationStrength);
      current.add(push);

      const maxSpeed = speed * 1.08;
      if (current.lengthSq() > maxSpeed * maxSpeed) current.setLength(maxSpeed);
      enemy.setVelocity?.(current.x, current.y);
    });
  }

  createPlayerOutlineVisual() {
    if (!this.player?.active) return;

    this.playerOutline?.destroy();
    this.playerAuraBlueGlow?.destroy?.();
    this.playerAuraRedGlow?.destroy?.();

    const auraTexture = this.player.texture?.key || 'playerArt';
    this.playerAuraBlueGlow = this.add.sprite(this.player.x, this.player.y, auraTexture)
      .setOrigin(this.player.originX, this.player.originY)
      .setTintFill(0x79dfff)
      .setAlpha(0.02)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth((this.player.depth ?? 10) - 0.045);

    this.playerAuraRedGlow = this.add.sprite(this.player.x, this.player.y, auraTexture)
      .setOrigin(this.player.originX, this.player.originY)
      .setTintFill(0xff5a68)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth((this.player.depth ?? 10) - 0.04);

    this.playerOutline = this.add.sprite(
      this.player.x,
      this.player.y,
      this.player.texture?.key || 'playerArt'
    )
      .setOrigin(this.player.originX, this.player.originY)
      .setTintFill(0x94d5f3)
      .setAlpha(0.055)
      .setDepth((this.player.depth ?? 10) - 0.02);

    this.updatePlayerOutlineVisual();
    this.updatePlayerGrowthAura(this.time?.now ?? 0, { allowSpawn: false });
  }

  getPlayerOutlineBaseAlpha() {
    const level = Math.max(1, Number(this.level) || 1);
    const linear = Phaser.Math.Clamp((level - 1) * 0.0048, 0, 0.125);
    const milestone = (level >= 20 ? 0.035 : 0) + (level >= 40 ? 0.045 : 0);
    return Phaser.Math.Clamp(0.060 + linear + milestone, 0.060, 0.285);
  }

  updatePlayerOutlineVisual() {
    if (!this.player?.active || !this.playerOutline?.active) return;

    const outline = this.playerOutline;
    if (this.player.visible === false || (Number(this.player.alpha) || 0) <= 0.001) {
      outline.setVisible(false);
      return;
    }
    outline.setVisible(true);

    const textureKey = this.player.texture?.key || 'playerArt';
    if (outline.texture?.key !== textureKey && this.textures.exists(textureKey)) {
      outline.setTexture(textureKey);
    }

    outline
      .setPosition(this.player.x, this.player.y)
      .setOrigin(this.player.originX, this.player.originY)
      .setFlipX(this.player.flipX)
      .setFlipY(this.player.flipY)
      .setAngle(this.player.angle);

    const level = Math.max(1, Number(this.level) || 1);
    const outlineScale = Phaser.Math.Clamp(1.026 + (level - 1) * 0.0005, 1.026, 1.036);
    outline.setDisplaySize(
      Math.abs(Number(this.player.displayWidth) || 60) * outlineScale,
      Math.abs(Number(this.player.displayHeight) || 60) * outlineScale
    );

    const occlusionBoost = (this.playerOccludedByCommander || this.playerOccludedByDuckQueen) ? 0.16 : 0;
    outline.setAlpha(Phaser.Math.Clamp(
      this.getPlayerOutlineBaseAlpha() + occlusionBoost,
      0.055,
      0.38
    ));

    outline.setDepth((Number(this.player.depth) || 10) - 0.02);
  }

  getPlayerAuraGrowthState() {
    const level = Math.max(1, Number(this.level) || 1);
    const growth = Phaser.Math.Clamp((level - 1) / 39, 0, 1);
    const auraTier = level >= 40 ? 3 : level >= 20 ? 2 : level >= 10 ? 1 : 0;
    const evolutionStage = level >= 40 ? 2 : level >= 20 ? 1 : 0;
    const blueEnergy = level >= 10
      ? Phaser.Math.Clamp((level - 9) / 31, 0.10, 1)
      : 0;
    const redEnergy = level >= 15
      ? Phaser.Math.Clamp((level - 14) / 26, 0.08, 1)
      : 0;
    const milestoneBoost = auraTier >= 3 ? 1 : auraTier >= 2 ? 0.52 : auraTier >= 1 ? 0.18 : 0;
    const overdrive = this.time?.now < (this.playerAuraOverdriveUntil ?? -Infinity) ? 1 : 0;
    return {
      level,
      growth,
      auraTier,
      evolutionStage,
      blueEnergy,
      redEnergy,
      milestoneBoost,
      overdrive
    };
  }

  getPlayerEvolutionStage(level = Math.max(1, Number(this.level) || 1)) {
    if (level >= 40) return 2;
    if (level >= 20) return 1;
    return 0;
  }

  trackPlayerAuraTransientFx(obj) {
    if (!obj) return obj;
    this.playerAuraTransientFx ??= new Set();
    this.playerAuraTransientFx.add(obj);
    return obj;
  }

  releasePlayerAuraTransientFx(obj) {
    this.playerAuraTransientFx?.delete?.(obj);
    if (obj?.active) obj.destroy();
  }

  clearPlayerAuraTransientFx() {
    (this.playerAuraTransientFx ?? new Set()).forEach((obj) => {
      if (obj?.active) obj.destroy();
    });
    this.playerAuraTransientFx?.clear?.();
  }

  startPlayerAuraOverdrive(durationMs = 700) {
    this.playerAuraOverdriveUntil = Math.max(
      this.playerAuraOverdriveUntil ?? -Infinity,
      (this.time?.now ?? 0) + Math.max(1, Number(durationMs) || 1)
    );
  }

  getPlayerAuraSpawnProfile(level = Math.max(1, Number(this.level) || 1)) {
    const blueUnlocked = level >= 10;
    const redUnlocked = level >= 15;
    const blueProgress = blueUnlocked ? Phaser.Math.Clamp((level - 10) / 30, 0, 1) : 0;
    const redProgress = redUnlocked ? Phaser.Math.Clamp((level - 15) / 25, 0, 1) : 0;
    const tier20 = level >= 20 ? 1 : 0;
    const tier40 = level >= 40 ? 1 : 0;

    return {
      blueUnlocked,
      redUnlocked,
      blueProgress,
      redProgress,
      blueParticleCount: blueUnlocked
        ? Phaser.Math.Clamp(1 + Math.floor((level - 10) / 4) + tier20 + tier40 * 2, 1, 10)
        : 0,
      redParticleCount: redUnlocked
        ? Phaser.Math.Clamp(1 + Math.floor((level - 15) / 5) + tier20 + tier40, 1, 7)
        : 0,
      blueArcCount: blueUnlocked ? Phaser.Math.Clamp(1 + tier20 + tier40, 1, 3) : 0,
      redArcCount: redUnlocked ? Phaser.Math.Clamp(1 + tier40, 1, 2) : 0,
      blueParticleInterval: blueUnlocked
        ? Math.max(110, Math.round(470 - blueProgress * 250 - tier20 * 45 - tier40 * 70))
        : Infinity,
      redParticleInterval: redUnlocked
        ? Math.max(150, Math.round(650 - redProgress * 315 - tier20 * 55 - tier40 * 80))
        : Infinity,
      blueArcInterval: blueUnlocked
        ? Math.max(320, Math.round(1120 - blueProgress * 520 - tier20 * 120 - tier40 * 150))
        : Infinity,
      redArcInterval: redUnlocked
        ? Math.max(420, Math.round(1420 - redProgress * 620 - tier20 * 120 - tier40 * 170))
        : Infinity
    };
  }

  updatePlayerGrowthAura(time = this.time?.now ?? 0, { allowSpawn = true } = {}) {
    if (!this.player?.active) return;
    const blue = this.playerAuraBlueGlow;
    const red = this.playerAuraRedGlow;
    if (!blue?.active || !red?.active) return;

    const playerVisualVisible = this.player.visible !== false && (Number(this.player.alpha) || 0) > 0.001;
    blue.setVisible(playerVisualVisible);
    red.setVisible(playerVisualVisible);
    if (!playerVisualVisible) return;

    const { level, growth, auraTier, blueEnergy, redEnergy, milestoneBoost, overdrive } = this.getPlayerAuraGrowthState();
    const pulse = 0.5 + 0.5 * Math.sin(time * (0.0044 + growth * 0.0010));
    const playerSize = Math.max(
      Math.abs(Number(this.player.displayWidth) || 60),
      Math.abs(Number(this.player.displayHeight) || 60)
    );

    const textureKey = this.player.texture?.key || 'playerArt';
    for (const aura of [blue, red]) {
      if (aura.texture?.key !== textureKey && this.textures.exists(textureKey)) aura.setTexture(textureKey);
      aura
        .setPosition(this.player.x, this.player.y)
        .setOrigin(this.player.originX, this.player.originY)
        .setFlipX(this.player.flipX)
        .setFlipY(this.player.flipY)
        .setAngle(this.player.angle);
    }

    const playerW = Math.max(1, Math.abs(Number(this.player.displayWidth) || playerSize));
    const playerH = Math.max(1, Math.abs(Number(this.player.displayHeight) || playerSize));

    const blueScale = 1.014 + growth * 0.006 + overdrive * 0.005;
    const blueTierBoost = auraTier >= 3 ? 0.045 : auraTier >= 2 ? 0.024 : auraTier >= 1 ? 0.010 : 0;
    blue
      .setDisplaySize(playerW * blueScale, playerH * blueScale)
      .setAlpha(
        0.022
        + growth * 0.038
        + blueTierBoost
        + milestoneBoost * 0.018
        + pulse * (0.005 + growth * 0.008)
        + overdrive * 0.024
      )
      .setDepth((Number(this.player.depth) || 10) - 0.045);

    const redScale = 1.016 + overdrive * 0.006;
    red
      .setDisplaySize(playerW * redScale, playerH * redScale)
      .setAlpha(overdrive > 0 ? 0.018 + redEnergy * 0.012 + pulse * 0.006 : 0)
      .setDepth((Number(this.player.depth) || 10) - 0.04);

    if (!allowSpawn || this.finished || this.endingSequenceActive || this.isChoosingUpgrade) return;

    const profile = this.getPlayerAuraSpawnProfile(level);

    if (profile.blueUnlocked && time >= (this.nextPlayerAuraBlueParticleAt ?? 0)) {
      for (let i = 0; i < profile.blueParticleCount; i += 1) {
        this.spawnPlayerAuraParticle('blue', blueEnergy, i * 18);
      }
      this.nextPlayerAuraBlueParticleAt = time + Phaser.Math.Between(
        Math.max(95, Math.round(profile.blueParticleInterval * 0.82)),
        Math.max(120, Math.round(profile.blueParticleInterval * 1.18))
      );
    }

    if (profile.redUnlocked && time >= (this.nextPlayerAuraRedParticleAt ?? 0)) {
      for (let i = 0; i < profile.redParticleCount; i += 1) {
        this.spawnPlayerAuraParticle('red', redEnergy, i * 22);
      }
      this.nextPlayerAuraRedParticleAt = time + Phaser.Math.Between(
        Math.max(135, Math.round(profile.redParticleInterval * 0.84)),
        Math.max(170, Math.round(profile.redParticleInterval * 1.16))
      );
    }

    if (profile.blueUnlocked && time >= (this.nextPlayerAuraBlueArcAt ?? 0)) {
      for (let i = 0; i < profile.blueArcCount; i += 1) {
        this.spawnPlayerAuraArc('blue', blueEnergy);
      }
      this.nextPlayerAuraBlueArcAt = time + Phaser.Math.Between(
        Math.max(260, Math.round(profile.blueArcInterval * 0.84)),
        Math.max(340, Math.round(profile.blueArcInterval * 1.16))
      );
    }

    if (profile.redUnlocked && time >= (this.nextPlayerAuraRedArcAt ?? 0)) {
      for (let i = 0; i < profile.redArcCount; i += 1) {
        this.spawnPlayerAuraArc('red', redEnergy);
      }
      this.nextPlayerAuraRedArcAt = time + Phaser.Math.Between(
        Math.max(360, Math.round(profile.redArcInterval * 0.86)),
        Math.max(460, Math.round(profile.redArcInterval * 1.14))
      );
    }
  }

  spawnPlayerAuraParticle(colorMode = 'blue', strength = 0.35, delay = 0) {
    if (!this.player?.active) return;
    const isRed = colorMode === 'red';
    const color = isRed
      ? Phaser.Math.RND.pick([0xff5062, 0xff6d72, 0xff8a80])
      : Phaser.Math.RND.pick([0x76dfff, 0x94d5f3, 0xdff8ff]);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(20, Math.round(25 + strength * 6));
    const x = this.player.x + Math.cos(angle) * radius;
    const y = this.player.y + Math.sin(angle) * radius * 0.70;
    const particle = this.trackPlayerAuraTransientFx(
      this.add.circle(
        x,
        y,
        Phaser.Math.FloatBetween(1.0, 1.7 + strength * 0.45),
        color,
        isRed ? 0.72 : 0.66
      )
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth((Number(this.player.depth) || 10) + (Math.random() < 0.35 ? 0.08 : -0.01))
        .setAlpha(0)
    );

    this.tweens.add({
      targets: particle,
      alpha: { from: 0, to: isRed ? 0.72 : 0.66 },
      duration: 45,
      delay,
      yoyo: false,
      onComplete: () => {
        if (!particle?.active) return;
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * Phaser.Math.Between(6, 14),
          y: y - Phaser.Math.Between(12, 26),
          alpha: 0,
          scaleX: 0.35,
          scaleY: 0.35,
          duration: Phaser.Math.Between(230, 360),
          ease: 'Sine.Out',
          onComplete: () => this.releasePlayerAuraTransientFx(particle)
        });
      }
    });
  }

  spawnPlayerAuraArc(colorMode = 'blue', strength = 0.5) {
    if (!this.player?.active) return;
    const isRed = colorMode === 'red';
    const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
    const rx = 23 + strength * 5;
    const ry = 20 + strength * 5;
    const startX = Math.cos(angle) * rx;
    const startY = Math.sin(angle) * ry;
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);
    const length = Phaser.Math.FloatBetween(9, 14 + strength * 4);
    const arc = this.trackPlayerAuraTransientFx(this.add.graphics())
      .setPosition(this.player.x, this.player.y + 2)
      .setDepth((Number(this.player.depth) || 10) + 0.12)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha((isRed ? 0.34 : 0.30) + strength * 0.24);
    arc.lineStyle(
      1.0 + strength * 1.05,
      isRed ? 0xff5a68 : 0x8de8ff,
      isRed ? 0.88 : 0.84
    );
    arc.beginPath();
    arc.moveTo(startX, startY);
    arc.lineTo(
      startX + tangentX * length * 0.34 + Phaser.Math.FloatBetween(-2.5, 2.5),
      startY + tangentY * length * 0.34 + Phaser.Math.FloatBetween(-2.5, 2.5)
    );
    arc.lineTo(
      startX + tangentX * length * 0.67 + Phaser.Math.FloatBetween(-2.5, 2.5),
      startY + tangentY * length * 0.67 + Phaser.Math.FloatBetween(-2.5, 2.5)
    );
    arc.lineTo(startX + tangentX * length, startY + tangentY * length);
    arc.strokePath();

    this.tweens.add({
      targets: arc,
      x: arc.x + Math.cos(angle) * Phaser.Math.FloatBetween(1.5, 4),
      y: arc.y + Math.sin(angle) * Phaser.Math.FloatBetween(1.5, 4),
      scaleX: 1.06,
      scaleY: 1.06,
      alpha: 0,
      duration: isRed ? 180 : 165,
      ease: 'Quad.Out',
      onComplete: () => this.releasePlayerAuraTransientFx(arc)
    });
  }

  playPlayerLevelUpAuraPulse(gainedLevels = 1) {
    if (!this.player?.active) return;
    const { redEnergy } = this.getPlayerAuraGrowthState();
    const tweenTimeScale = this.isChoosingUpgrade ? 4 : 1;
    const repeats = Phaser.Math.Clamp(Math.round(Number(gainedLevels) || 1), 1, 3);

    for (let i = 0; i < repeats; i += 1) {
      const delay = i * 70;
      const blueRing = this.trackPlayerAuraTransientFx(
        this.add.circle(this.player.x, this.player.y + 2, 24, 0x8de8ff, 0.035)
          .setStrokeStyle(2.6, 0xbff5ff, 0.82)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth((Number(this.player.depth) || 10) + 0.2)
          .setScale(0.72)
      );
      this.tweens.add({
        targets: blueRing,
        scaleX: 2.15,
        scaleY: 2.15,
        alpha: 0,
        delay,
        duration: 360,
        timeScale: tweenTimeScale,
        ease: 'Cubic.Out',
        onComplete: () => this.releasePlayerAuraTransientFx(blueRing)
      });
    }

    if (redEnergy > 0.001) {
      const redRing = this.trackPlayerAuraTransientFx(
        this.add.circle(this.player.x, this.player.y + 3, 29, 0xff5c6c, 0)
          .setStrokeStyle(2.2, 0xff6674, 0.32 + redEnergy * 0.32)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth((Number(this.player.depth) || 10) + 0.16)
          .setScale(0.78)
      );
      this.tweens.add({
        targets: redRing,
        scaleX: 2.25,
        scaleY: 2.25,
        alpha: 0,
        duration: 390,
        timeScale: tweenTimeScale,
        ease: 'Cubic.Out',
        onComplete: () => this.releasePlayerAuraTransientFx(redRing)
      });
    }

    [-12, 0, 12].forEach((offsetX, index) => {
      const streak = this.trackPlayerAuraTransientFx(
        this.add.rectangle(
          this.player.x + offsetX,
          this.player.y + 15,
          index === 1 ? 4 : 2,
          index === 1 ? 34 : 24,
          index === 1 ? 0xdff8ff : 0x8de8ff,
          index === 1 ? 0.50 : 0.30
        )
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth((Number(this.player.depth) || 10) + 0.18)
      );
      this.tweens.add({
        targets: streak,
        y: streak.y - 42 - index * 4,
        alpha: 0,
        scaleY: 1.55,
        duration: 320 + index * 25,
        timeScale: tweenTimeScale,
        ease: 'Quad.Out',
        onComplete: () => this.releasePlayerAuraTransientFx(streak)
      });
    });
  }

  getKeyUpVfxUniformScale(image, targetWidth) {
    if (!image?.active) return 1;
    const source = image.texture?.getSourceImage?.();
    const sourceWidth = Math.max(1, Number(source?.width) || Number(image.width) || 1);
    return Math.max(0.001, Number(targetWidth) / sourceWidth);
  }

  setKeyUpVfxWidth(image, targetWidth) {
    if (!image?.active) return 1;
    const scale = this.getKeyUpVfxUniformScale(image, targetWidth);
    image.setScale(scale);
    return scale;
  }

  clearKeyUpChargeVfx({ fadeMs = 0 } = {}) {
    const state = this.keyUpChargeVfxState;
    if (!state) return;
    state.followEvent?.remove?.(false);
    state.followEvent = null;

    const destroy = (target) => {
      if (!target?.active) return;
      this.tweens.killTweensOf(target);
      if (fadeMs > 0) {
        this.tweens.add({
          targets: target,
          alpha: 0,
          duration: fadeMs,
          ease: 'Sine.In',
          onComplete: () => target?.active && target.destroy()
        });
      } else {
        target.destroy();
      }
    };

    [state.ground, state.back, state.front].forEach(destroy);
    if (this.keyUpChargeVfxState === state) this.keyUpChargeVfxState = null;
  }

  getKeyUpVfxGroupAnchor(player = this.player) {
    const feet = getPlayerVisualAnchor(player, 'feet');
    return {
      x: feet.x,
      y: feet.y + KEY_UP_VFX_GROUP_Y_OFFSET
    };
  }

  spawnKeyUpChargeVfx() {
    if (!this.player?.active) return;
    this.clearKeyUpChargeVfx();

    const player = this.player;
    const playerDepth = Number(player.depth) || 10;
    const radius = PLAYER.KEY_UP_RADIUS;
    const fullDiameter = radius * 2;
    const visualDiameter = fullDiameter * 0.78;
    const visualRadius = visualDiameter * 0.5;
    const group = this.getKeyUpVfxGroupAnchor(player);

    const ground = this.add.image(group.x, group.y, 'keyUpGroundFlameArt')
      .setOrigin(KEY_UP_VFX_PIVOTS.ground.x, KEY_UP_VFX_PIVOTS.ground.y)
      .setDepth(playerDepth - 0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    this.setKeyUpVfxWidth(ground, visualDiameter * 0.28);
    const groundTargetScale = this.getKeyUpVfxUniformScale(ground, visualDiameter * 0.74);

    const back = this.add.image(group.x, group.y, 'keyUpSpiralBackArt')
      .setOrigin(KEY_UP_VFX_PIVOTS.spiralBack.x, KEY_UP_VFX_PIVOTS.spiralBack.y)
      .setDepth(playerDepth - 0.08)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    this.setKeyUpVfxWidth(back, visualDiameter * 0.24);
    const backTargetScale = this.getKeyUpVfxUniformScale(back, visualDiameter * 0.62);

    const front = this.add.image(group.x, group.y, 'keyUpSpiralFrontArt')
      .setOrigin(KEY_UP_VFX_PIVOTS.spiralFront.x, KEY_UP_VFX_PIVOTS.spiralFront.y)
      .setDepth(playerDepth + 0.13)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    this.setKeyUpVfxWidth(front, visualDiameter * 0.19);
    const frontTargetScale = this.getKeyUpVfxUniformScale(front, visualDiameter * 0.54);

    const state = {
      ground,
      back,
      front,
      followEvent: null,
      visualDiameter,
      visualRadius
    };
    this.keyUpChargeVfxState = state;

    state.followEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (this.keyUpChargeVfxState !== state || !player?.active || this.finished) return;
        const liveGroup = this.getKeyUpVfxGroupAnchor(player);
        ground.setPosition(liveGroup.x, liveGroup.y);
        back.setPosition(liveGroup.x, liveGroup.y);
        front.setPosition(liveGroup.x, liveGroup.y);
      }
    });

    this.tweens.add({
      targets: ground,
      alpha: 0.28,
      scaleX: groundTargetScale,
      scaleY: groundTargetScale,
      duration: KEY_UP_PEAK_MS,
      ease: 'Cubic.Out'
    });
    this.tweens.add({
      targets: back,
      alpha: 0.42,
      scaleX: backTargetScale,
      scaleY: backTargetScale,
      angle: -8,
      duration: KEY_UP_PEAK_MS,
      ease: 'Cubic.Out'
    });
    this.tweens.add({
      targets: front,
      alpha: 0.32,
      scaleX: frontTargetScale,
      scaleY: frontTargetScale,
      angle: 7,
      duration: KEY_UP_PEAK_MS,
      ease: 'Cubic.Out'
    });

    for (let i = 0; i < 16; i += 1) {
      const delay = 90 + i * 24;
      this.time.delayedCall(delay, () => {
        if (!player?.active || this.finished || this.keyUpChargeVfxState !== state) return;
        const liveGroup = this.getKeyUpVfxGroupAnchor(player);
        const side = i % 2 === 0 ? -1 : 1;
        const spark = this.add.circle(
          liveGroup.x + side * Phaser.Math.Between(20, Math.max(24, Math.round(visualRadius * 0.38))),
          liveGroup.y + Phaser.Math.Between(-10, 18),
          Phaser.Math.FloatBetween(1.4, 3.2),
          i % 4 === 0 ? 0xe8fbff : 0x62cfff,
          Phaser.Math.FloatBetween(0.42, 0.78)
        )
          .setDepth(playerDepth + 0.16)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: spark,
          y: spark.y - Phaser.Math.Between(58, 128),
          x: spark.x + Phaser.Math.Between(-18, 18),
          alpha: 0,
          scaleX: 0.35,
          scaleY: 1.8,
          duration: Phaser.Math.Between(330, 560),
          ease: 'Sine.Out',
          onComplete: () => spark?.active && spark.destroy()
        });
      });
    }
  }

  spawnKeyUpPeakVfx() {
    if (!this.player?.active || this.finished) return;
    const player = this.player;
    const playerDepth = Number(player.depth) || 10;
    const peakAnchor = getPlayerVisualAnchor(player, 'center', { yOffset: -28 });
    const flash = this.add.image(peakAnchor.x, peakAnchor.y, 'keyUpPeakFlashArt')
      .setOrigin(KEY_UP_VFX_PIVOTS.peak.x, KEY_UP_VFX_PIVOTS.peak.y)
      .setDepth(playerDepth + 0.34)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    const targetScale = this.getKeyUpVfxUniformScale(
      flash,
      Math.max(128, PLAYER.KEY_UP_RADIUS * 0.38)
    );
    flash.setScale(targetScale * 0.58);
    this.tweens.add({
      targets: flash,
      alpha: 0.92,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 58,
      yoyo: true,
      hold: 18,
      ease: 'Quad.Out',
      onComplete: () => flash?.active && flash.destroy()
    });
    this.cameras.main.flash(72, 192, 238, 255, false);
  }

  spawnKeyUpBurstVfx() {
    if (!this.player?.active) return;
    const player = this.player;
    const radius = PLAYER.KEY_UP_RADIUS;
    const fullDiameter = radius * 2;
    const visualDiameter = fullDiameter * 0.78;
    const visualRadius = visualDiameter * 0.5;
    const playerDepth = Number(player.depth) || 10;
    const group = this.getKeyUpVfxGroupAnchor(player);

    const burst = this.add.image(
      group.x,
      group.y + KEY_UP_BURST_Y_OFFSET,
      'keyUpAoeBurstArt'
    )
      .setOrigin(KEY_UP_VFX_PIVOTS.burst.x, KEY_UP_VFX_PIVOTS.burst.y)
      .setDepth(playerDepth + 0.24)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    const burstTargetScale = this.getKeyUpVfxUniformScale(burst, visualDiameter);
    burst.setScale(burstTargetScale * 0.58);
    this.tweens.add({
      targets: burst,
      alpha: 0.82,
      scaleX: burstTargetScale,
      scaleY: burstTargetScale,
      duration: 115,
      ease: 'Cubic.Out',
      onComplete: () => {
        if (!burst?.active) return;
        this.tweens.add({
          targets: burst,
          alpha: 0,
          scaleX: burstTargetScale * 1.06,
          scaleY: burstTargetScale * 1.06,
          duration: 280,
          ease: 'Sine.In',
          onComplete: () => burst?.active && burst.destroy()
        });
      }
    });

    const state = this.keyUpChargeVfxState;
    if (state?.ground?.active) {
      const groundFullScale = this.getKeyUpVfxUniformScale(
        state.ground,
        state.visualDiameter ? state.visualDiameter * 0.92 : visualDiameter * 0.92
      );
      const liveGroup = this.getKeyUpVfxGroupAnchor(player);
      state.ground.setPosition(liveGroup.x, liveGroup.y);
      this.tweens.add({
        targets: state.ground,
        alpha: 0.48,
        scaleX: groundFullScale,
        scaleY: groundFullScale,
        duration: 105,
        ease: 'Cubic.Out',
        onComplete: () => {
          if (!state.ground?.active) return;
          this.tweens.add({
            targets: state.ground,
            alpha: 0,
            duration: 300,
            ease: 'Sine.In',
            onComplete: () => state.ground?.active && state.ground.destroy()
          });
        }
      });
    }

    for (const layer of [state?.back, state?.front]) {
      if (!layer?.active) continue;
      const liveGroup = this.getKeyUpVfxGroupAnchor(player);
      layer.setPosition(liveGroup.x, liveGroup.y);
      this.tweens.add({
        targets: layer,
        alpha: 0,
        scaleX: layer.scaleX * 1.08,
        scaleY: layer.scaleY * 1.08,
        duration: 300,
        ease: 'Sine.In',
        onComplete: () => layer?.active && layer.destroy()
      });
    }
    state?.followEvent?.remove?.(false);
    if (this.keyUpChargeVfxState === state) this.keyUpChargeVfxState = null;

    for (let i = 0; i < 20; i += 1) {
      const angle = (Math.PI * 2 * i) / 20 + Phaser.Math.FloatBetween(-0.10, 0.10);
      const travel = Phaser.Math.Between(
        Math.round(visualRadius * 0.72),
        Math.round(visualRadius * 1.00)
      );
      const spark = this.add.rectangle(
        group.x + Math.cos(angle) * 20,
        group.y + Math.sin(angle) * 12,
        Phaser.Math.Between(2, 4),
        Phaser.Math.Between(12, 26),
        i % 5 === 0 ? 0xf1fdff : 0x78dcff,
        Phaser.Math.FloatBetween(0.56, 0.86)
      )
        .setRotation(angle + Math.PI / 2)
        .setDepth(playerDepth + 0.32)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: spark,
        x: group.x + Math.cos(angle) * travel,
        y: group.y + Math.sin(angle) * travel * 0.64,
        alpha: 0,
        scaleY: 0.28,
        duration: Phaser.Math.Between(230, 380),
        ease: 'Quad.Out',
        onComplete: () => spark?.active && spark.destroy()
      });
    }
  }

  isPotatoCommanderOccludingPlayer() {
    const commander = this.potatoCommander;
    const player = this.player;

    if (!commander?.active || commander.isDead || !player?.active) return false;
    if (this.commanderSkySmashActive) return false;
    if (Number.isFinite(player.xiafanVisualDepth)) return false;

    if ((Number(commander.depth) || 0) <= (Number(player.depth) || 0) + 0.001) return false;

    const playerWidth = Math.abs(Number(player.displayWidth) || 60);
    const playerHeight = Math.abs(Number(player.displayHeight) || 60);
    const bossWidth = Math.abs(Number(commander.displayWidth) || 140);
    const bossHeight = Math.abs(Number(commander.displayHeight) || 158);

    const dx = Math.abs(commander.x - player.x);
    const dy = Math.abs(commander.y - player.y);

    const overlapX = dx < bossWidth * 0.29 + playerWidth * 0.30;
    const overlapY = dy < bossHeight * 0.27 + playerHeight * 0.36;

    return overlapX && overlapY;
  }

  isPotatoCommanderOverlappingMinorEnemy() {
    const commander = this.potatoCommander;
    if (!commander?.active || commander.isDead || !this.enemies) return false;

    const bossWidth = Math.abs(Number(commander.displayWidth) || 140);
    const bossHeight = Math.abs(Number(commander.displayHeight) || 158);

    const children = this.enemies.getChildren?.() ?? [];
    for (const enemy of children) {
      if (!enemy?.active || enemy.isDead || enemy === commander) continue;
      if (
        enemy.enemyType === 'potatoCommander'
        || enemy.enemyType === 'duckQueen'
        || enemy.enemyType === 'twinPig'
        || enemy.enemyType === 'plagueCat'
      ) continue;

      const coarseDx = commander.x - enemy.x;
      const coarseDy = commander.y - enemy.y;
      if (coarseDx * coarseDx + coarseDy * coarseDy > 240 * 240) continue;

      const enemyWidth = Math.abs(Number(enemy.displayWidth) || Number(enemy.width) || 48);
      const enemyHeight = Math.abs(Number(enemy.displayHeight) || Number(enemy.height) || 48);
      const dx = Math.abs(commander.x - enemy.x);
      const dy = Math.abs(commander.y - enemy.y);

      const overlapX = dx < bossWidth * 0.27 + enemyWidth * 0.28;
      const overlapY = dy < bossHeight * 0.24 + enemyHeight * 0.30;
      if (overlapX && overlapY) return true;
    }

    return false;
  }

  isDuckQueenOccludingPlayer() {
    const queen = this.duckQueen;
    const player = this.player;

    if (!queen?.active || queen.isDead || !player?.active) return false;
    if (Number.isFinite(player.xiafanVisualDepth)) return false;

    if ((Number(queen.depth) || 0) <= (Number(player.depth) || 0) + 0.001) return false;

    const playerWidth = Math.abs(Number(player.displayWidth) || 60);
    const playerHeight = Math.abs(Number(player.displayHeight) || 60);
    const bossWidth = Math.abs(Number(queen.displayWidth) || 140);
    const bossHeight = Math.abs(Number(queen.displayHeight) || 140);
    const dx = Math.abs(queen.x - player.x);
    const dy = Math.abs(queen.y - player.y);

    const overlapX = dx < bossWidth * 0.29 + playerWidth * 0.30;
    const overlapY = dy < bossHeight * 0.27 + playerHeight * 0.36;
    return overlapX && overlapY;
  }

  isDuckQueenOverlappingMinorEnemy() {
    const queen = this.duckQueen;
    if (!queen?.active || queen.isDead || !this.enemies) return false;

    const bossWidth = Math.abs(Number(queen.displayWidth) || 140);
    const bossHeight = Math.abs(Number(queen.displayHeight) || 140);
    const children = this.enemies.getChildren?.() ?? [];

    for (const enemy of children) {
      if (!enemy?.active || enemy.isDead || enemy === queen) continue;
      if (
        enemy.enemyType === 'potatoCommander'
        || enemy.enemyType === 'duckQueen'
        || enemy.enemyType === 'twinPig'
        || enemy.enemyType === 'plagueCat'
      ) continue;

      const coarseDx = queen.x - enemy.x;
      const coarseDy = queen.y - enemy.y;
      if (coarseDx * coarseDx + coarseDy * coarseDy > 220 * 220) continue;

      const enemyWidth = Math.abs(Number(enemy.displayWidth) || Number(enemy.width) || 48);
      const enemyHeight = Math.abs(Number(enemy.displayHeight) || Number(enemy.height) || 48);
      const dx = Math.abs(queen.x - enemy.x);
      const dy = Math.abs(queen.y - enemy.y);
      const overlapX = dx < bossWidth * 0.27 + enemyWidth * 0.28;
      const overlapY = dy < bossHeight * 0.24 + enemyHeight * 0.30;
      if (overlapX && overlapY) return true;
    }

    return false;
  }

  updateDuckQueenOcclusion(delta = 16.67) {
    const queen = this.duckQueen;
    const playerOccluded = this.isDuckQueenOccludingPlayer();
    const now = Number(this.time?.now) || 0;
    let minionOverlap = this.duckQueenMinionOverlapCached === true;

    if (now >= (this.duckQueenMinionOcclusionNextCheckAt ?? -Infinity)) {
      minionOverlap = this.isDuckQueenOverlappingMinorEnemy();
      this.duckQueenMinionOverlapCached = minionOverlap;
      this.duckQueenMinionOcclusionNextCheckAt = now + 55;
    }

    this.playerOccludedByDuckQueen = playerOccluded;
    if (!queen?.active || queen.isDead) return;

    const targetAlpha = playerOccluded ? 0.68 : (minionOverlap ? 0.85 : 1);
    const currentAlpha = Phaser.Math.Clamp(Number(queen.alpha) || 1, 0, 1);
    const blend = Phaser.Math.Clamp(1 - Math.exp(-Math.max(1, delta) / 95), 0.08, 0.36);

    if (currentAlpha < 0.60) return;

    queen.setAlpha(
      Math.abs(currentAlpha - targetAlpha) < 0.01
        ? targetAlpha
        : Phaser.Math.Linear(currentAlpha, targetAlpha, blend)
    );
  }

  updatePotatoCommanderOcclusion(delta = 16.67) {
    const commander = this.potatoCommander;
    const playerOccluded = this.isPotatoCommanderOccludingPlayer();
    const now = Number(this.time?.now) || 0;
    let minionOverlap = this.commanderMinionOverlapCached === true;
    if (now >= (this.commanderMinionOcclusionNextCheckAt ?? -Infinity)) {
      minionOverlap = this.isPotatoCommanderOverlappingMinorEnemy();
      this.commanderMinionOverlapCached = minionOverlap;
      this.commanderMinionOcclusionNextCheckAt = now + 55;
    }
    this.playerOccludedByCommander = playerOccluded;

    if (!commander?.active || commander.isDead) return;
    if (this.commanderSkySmashActive) return;

    const targetAlpha = playerOccluded ? 0.68 : (minionOverlap ? 0.85 : 1);
    const currentAlpha = Phaser.Math.Clamp(Number(commander.alpha) || 1, 0, 1);
    const blend = Phaser.Math.Clamp(1 - Math.exp(-Math.max(1, delta) / 95), 0.08, 0.36);

    commander.setAlpha(
      Math.abs(currentAlpha - targetAlpha) < 0.01
        ? targetAlpha
        : Phaser.Math.Linear(currentAlpha, targetAlpha, blend)
    );
  }

  updateFinalBossActorDepthSort() {
    const commander = this.potatoCommander;
    const queen = this.duckQueen;
    const boss = commander?.active && !commander.isDead
      ? commander
      : (queen?.active && !queen.isDead ? queen : null);

    const restoreDepth = (actor) => {
      if (!actor || !Number.isFinite(actor._preFinalBossDepth)) return;
      actor.setDepth(actor._preFinalBossDepth);
      actor._preFinalBossDepth = null;
    };

    if (!boss) {
      restoreDepth(this.player);
      this.enemies.children.iterate((enemy) => restoreDepth(enemy));
      return;
    }

    const applyDepth = (actor) => {
      if (!actor?.active || actor.isDead) return;

      if (actor === this.player && this.commanderBlackwaterPreviewActive === true) {
        if (!Number.isFinite(actor._preFinalBossDepth)) {
          actor._preFinalBossDepth = Number(actor.depth) || 10;
        }
        actor.setDepth(19960);
        return;
      }

      if (actor === this.player && this.duckQueenUltimateCutsceneActive === true) {
        if (!Number.isFinite(actor._preFinalBossDepth)) {
          actor._preFinalBossDepth = Number(actor.depth) || 10;
        }
        actor.setDepth(40);
        return;
      }

      if (actor === this.player && Number.isFinite(this.player.xiafanVisualDepth)) return;

      if (!Number.isFinite(actor._preFinalBossDepth)) {
        actor._preFinalBossDepth = Number(actor.depth) || 10;
      }

      if (actor.cleanseFlightActive === true) {
        actor.setDepth(12.45);
        return;
      }

      const normalizedY = Phaser.Math.Clamp(actor.y / GAME.WORLD_HEIGHT, 0, 1);

      if (actor === this.player || actor === boss) {
        actor.setDepth(11 + normalizedY * 0.90);
      } else {
        actor.setDepth(10 + normalizedY * 0.90);
      }
    };

    applyDepth(this.player);
    this.enemies.children.iterate((enemy) => applyDepth(enemy));
  }

  getActiveCommanderPotatoCount() {
    if (!this.enemies) return 0;
    let count = 0;
    this.enemies.children.iterate((enemy) => {
      if (
        enemy?.active
        && !enemy.isDead
        && enemy.enemyType === 'potato'
      ) count += 1;
    });
    return count;
  }

  getCommanderFollowerPotatoes(commander = this.potatoCommander) {
    if (!commander?.active || commander.isDead || !this.enemies) return [];
    const followers = [];
    this.enemies.children.iterate((enemy) => {
      if (
        enemy?.active
        && !enemy.isDead
        && enemy.enemyType === 'potato'
        && enemy.commanderFollower === true
        && enemy.commanderFollowerOwner === commander
        && !enemy.isBlessedToxicPotato
      ) followers.push(enemy);
    });
    return followers;
  }

  maintainCommanderFollowerRing(commander = this.potatoCommander) {
    if (!commander?.active || commander.isDead || !this.enemies) return 0;

    if (commander.phaseIndex < 3) {
      this.enemies.children.iterate((enemy) => {
        if (enemy?.enemyType === 'potato' && enemy.commanderFollower === true) {
          enemy.clearCommanderFollower?.();
        }
      });
      return 0;
    }

    const config = ENEMIES.potatoCommander;
    const desired = Math.max(0, config.commanderFollowerDesired ?? 5);
    const maxFollowers = Math.max(desired, config.commanderFollowerMax ?? 6);
    let followers = this.getCommanderFollowerPotatoes(commander)
      .filter((potato) => (
        potato?.active
        && !potato.isDead
        && potato.beingAbsorbed !== true
        && potato.cleanseFlightActive !== true
        && !potato.isBlessedToxicPotato
      ));

    if (followers.length > maxFollowers) {
      followers
        .sort((a, b) => (
          Phaser.Math.Distance.Squared(commander.x, commander.y, a.x, a.y)
          - Phaser.Math.Distance.Squared(commander.x, commander.y, b.x, b.y)
        ));
      followers.slice(maxFollowers).forEach((potato) => potato.clearCommanderFollower?.());
      followers = followers.slice(0, maxFollowers);
    }

    if (followers.length < desired) {
      const followerSet = new Set(followers);
      const candidates = [];
      this.enemies.children.iterate((enemy) => {
        if (
          !enemy?.active
          || enemy.isDead
          || enemy.enemyType !== 'potato'
          || followerSet.has(enemy)
          || enemy.commanderFollower === true
          || enemy.beingAbsorbed === true
          || enemy.cleanseFlightActive === true
          || enemy.isBlessedToxicPotato
          || this.time.now < (enemy.summonArrivalLockedUntil ?? -Infinity)
        ) return;

        candidates.push({
          potato: enemy,
          distanceSq: Phaser.Math.Distance.Squared(
            commander.x,
            commander.y,
            enemy.x,
            enemy.y
          ),
          growth: Math.max(0, Math.trunc(enemy.holyGrowthLevel ?? 0))
        });
      });

      candidates.sort((a, b) => (
        b.growth - a.growth
        || a.distanceSq - b.distanceSq
      ));

      const needed = desired - followers.length;
      candidates.slice(0, needed).forEach(({ potato }) => followers.push(potato));
    }

    const total = Math.max(1, followers.length);
    followers.forEach((potato, index) => {
      potato.setCommanderFollower?.(commander, index, total);
    });

    return followers.length;
  }

  getCommanderCleanseCandidates(commander, limit = ENEMIES.potatoCommander.cleanseTargets) {
    if (!commander?.active || commander.isDead || !this.enemies) return [];

    const radius = ENEMIES.potatoCommander.cleanseRadius;
    const radiusSq = radius * radius;
    const candidates = [];

    this.enemies.children.iterate((enemy) => {
      if (
        !enemy?.active
        || enemy.isDead
        || enemy.enemyType !== 'potato'
        || enemy.cleanseFlightActive === true
        || enemy.beingAbsorbed === true
      ) return;

      const dx = enemy.x - commander.x;
      const dy = enemy.y - commander.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq > radiusSq) return;

      candidates.push({
        potato: enemy,
        distanceSq,
        growth: Math.max(0, Number(enemy.holyGrowthLevel) || 0)
      });
    });

    candidates.sort((a, b) => (
      b.growth - a.growth
      || a.distanceSq - b.distanceSq
    ));

    return candidates
      .slice(0, Math.max(0, limit))
      .map((entry) => entry.potato);
  }

  canCommanderCleanse(commander) {
    if (!commander?.active || commander.isDead || commander.phaseIndex < 2) return false;
    return this.getCommanderCleanseCandidates(
      commander,
      ENEMIES.potatoCommander.cleanseMinTargets
    ).length >= ENEMIES.potatoCommander.cleanseMinTargets;
  }

  getCommanderGraceCandidates(commander, limit = ENEMIES.potatoCommander.absorbCount) {
    if (!commander?.active || commander.isDead || !this.enemies) return [];

    const radius = ENEMIES.potatoCommander.absorbRadius;
    const radiusSq = radius * radius;
    const candidates = [];

    this.enemies.children.iterate((enemy) => {
      if (
        !enemy?.active
        || enemy.isDead
        || enemy.enemyType !== 'potato'
        || enemy.cleanseFlightActive === true
        || enemy.beingAbsorbed === true
      ) return;

      const dx = enemy.x - commander.x;
      const dy = enemy.y - commander.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq > radiusSq) return;

      candidates.push({
        potato: enemy,
        follower: enemy.commanderFollower === true ? 1 : 0,
        growth: Phaser.Math.Clamp(Math.trunc(enemy.holyGrowthLevel ?? 0), 0, 3),
        distanceSq
      });
    });

    candidates.sort((a, b) => (
      b.follower - a.follower
      || b.growth - a.growth
      || a.distanceSq - b.distanceSq
    ));

    return candidates
      .slice(0, Math.max(0, limit))
      .map((entry) => entry.potato);
  }

  canCommanderGrace(commander) {
    if (!commander?.active || commander.isDead || commander.phaseIndex < 3) return false;
    if (this.commanderJudgmentActive === true || commander.judgmentPending === true) return false;
    const required = ENEMIES.potatoCommander.judgmentGraceCastsRequired ?? 3;
    if ((commander.judgmentGraceCount ?? 0) >= required) return false;
    return this.getCommanderGraceCandidates(commander, 1).length > 0;
  }

  spawnCommanderCleanseSweep(commander) {
    if (!commander?.active || commander.isDead) return;

    const player = this.player;
    const aimAngle = player?.active
      ? Phaser.Math.Angle.Between(commander.x, commander.y, player.x, player.y)
      : 0;
    const rotationDeg = Phaser.Math.RadToDeg(aimAngle);
    const duration = ENEMIES.potatoCommander.cleanseSweepMs;
    const sweepSpecs = [
      { radius: 72, width: 11, color: 0xfff3bc, alpha: 0.76, delay: 0 },
      { radius: 91, width: 7, color: 0xffdf7a, alpha: 0.56, delay: 26 },
      { radius: 108, width: 4, color: 0xffffff, alpha: 0.38, delay: 48 }
    ];

    sweepSpecs.forEach((spec) => {
      this.time.delayedCall(spec.delay, () => {
        if (!commander?.active || commander.isDead) return;

        const arc = this.add.arc(
          commander.x,
          commander.y + 3,
          spec.radius,
          -62,
          -62,
          false,
          spec.color,
          0
        )
          .setStrokeStyle(spec.width, spec.color, spec.alpha)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAngle(rotationDeg)
          .setScale(1, 0.58)
          .setDepth(12.15);

        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration,
          ease: 'Cubic.Out',
          onUpdate: (tween) => {
            if (!arc.active) return;
            const t = tween.getValue();
            arc.setEndAngle(-62 + 124 * t);
            arc.setAlpha(Phaser.Math.Linear(0.92, 0.34, t));
          },
          onComplete: () => {
            if (!arc.active) return;
            this.tweens.add({
              targets: arc,
              alpha: 0,
              scaleX: 1.12,
              scaleY: 0.65,
              duration: 150,
              ease: 'Quad.Out',
              onComplete: () => arc.destroy()
            });
          }
        });
      });
    });

    const floorFlash = this.add.ellipse(
      commander.x,
      commander.y + 20,
      162,
      48,
      0xffe48d,
      0.10
    )
      .setStrokeStyle(2, 0xfff2b4, 0.50)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4);

    this.tweens.add({
      targets: floorFlash,
      scaleX: 1.28,
      scaleY: 1.28,
      alpha: 0,
      duration: duration + 120,
      ease: 'Quad.Out',
      onComplete: () => floorFlash.destroy()
    });
  }

  launchCommanderCleansePotato(potato, index, total, landingBaseAngle = 0) {
    if (!potato?.active || potato.isDead || !this.player?.active) return;

    const config = ENEMIES.potatoCommander;
    potato.clearCommanderFollower?.();
    const player = this.player;
    const startX = potato.x;
    const startY = potato.y;
    const playerVx = Number(player.body?.velocity?.x) || 0;
    const playerVy = Number(player.body?.velocity?.y) || 0;
    const predictedX = player.x + playerVx * 0.14;
    const predictedY = player.y + playerVy * 0.14;

    const ringAngle = (
      landingBaseAngle
      + (index / Math.max(1, total)) * Math.PI * 2
      + Phaser.Math.FloatBetween(-0.15, 0.15)
    );
    const landingRadius = Phaser.Math.FloatBetween(
      config.cleanseLandingRadiusMin,
      config.cleanseLandingRadiusMax
    );
    const targetX = Phaser.Math.Clamp(
      predictedX + Math.cos(ringAngle) * landingRadius,
      36,
      GAME.WORLD_WIDTH - 36
    );
    const targetY = Phaser.Math.Clamp(
      predictedY + Math.sin(ringAngle) * landingRadius * 0.58,
      36,
      GAME.WORLD_HEIGHT - 36
    );

    const midX = (startX + targetX) * 0.5;
    const midY = (startY + targetY) * 0.5;
    const perpendicular = Phaser.Math.Angle.Between(startX, startY, targetX, targetY) + Math.PI * 0.5;
    const sideBend = Phaser.Math.FloatBetween(-22, 22);
    const controlX = midX + Math.cos(perpendicular) * sideBend;
    const controlY = midY - Phaser.Math.FloatBetween(58, 82);
    const flightMs = Phaser.Math.Between(
      config.cleanseFlightMsMin,
      config.cleanseFlightMsMax
    );

    potato.cleanseFlightActive = true;
    potato.setVelocity(0, 0);
    if (potato.body) potato.body.enable = false;

    const baseScale = potato.baseArtScale * potato.getGrowthArtScale();
    potato.setScale(baseScale);
    potato.setDepth(12.45);

    const shadow = this.add.ellipse(
      startX,
      startY + 15,
      34,
      12,
      0x3f342d,
      0.16
    ).setDepth(3.5);

    const flight = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: flightMs,
      ease: 'Sine.InOut',
      onUpdate: (tween) => {
        if (!potato?.active || potato.isDead) {
          flight.stop();
          shadow.destroy();
          return;
        }

        const t = tween.getValue();
        const u = 1 - t;
        const x = u * u * startX + 2 * u * t * controlX + t * t * targetX;
        const y = u * u * startY + 2 * u * t * controlY + t * t * targetY;
        const height = Math.sin(Math.PI * t);
        const tinyScale = 1 - height * 0.24;

        potato.setPosition(x, y);
        potato.setScale(baseScale * tinyScale);
        potato.setAngle(Math.sin(Math.PI * t) * (index % 2 === 0 ? 15 : -15));

        shadow.setPosition(
          Phaser.Math.Linear(startX, targetX, t),
          Phaser.Math.Linear(startY, targetY, t) + 15
        );
        shadow.setScale(1 - height * 0.46, 1 - height * 0.24);
        shadow.setAlpha(0.16 - height * 0.07);
      },
      onComplete: () => {
        if (!potato?.active || potato.isDead) {
          shadow.destroy();
          return;
        }

        potato.setPosition(targetX, targetY);
        potato.setScale(baseScale);
        potato.setAngle(0);
        potato.cleanseFlightActive = false;
        potato.applyGuidance?.(900, this.time.now);

        if (potato.body) {
          potato.body.enable = true;
          potato.body.reset(targetX, targetY);
        }

        shadow.destroy();

        const landing = this.add.ellipse(
          targetX,
          targetY + 13,
          42,
          15,
          0xffe69a,
          0.10
        )
          .setStrokeStyle(2, 0xfff1b4, 0.52)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(4);

        this.tweens.add({
          targets: landing,
          scaleX: 1.45,
          scaleY: 1.45,
          alpha: 0,
          duration: 190,
          ease: 'Quad.Out',
          onComplete: () => landing.destroy()
        });
      }
    });
  }

  startCommanderCleanse(commander) {
    if (
      !commander?.active
      || commander.isDead
      || commander.phaseIndex < 2
    ) return false;

    const config = ENEMIES.potatoCommander;
    const potatoes = this.getCommanderCleanseCandidates(
      commander,
      config.cleanseTargets
    );

    if (potatoes.length < config.cleanseMinTargets) return false;

    commander.setVelocity(0, 0);
    const previousFlipX = commander.flipX;
    const playerIsLeft = this.player?.active && this.player.x < commander.x;
    commander.showCleanseSkillArt?.();
    if (commander.phaseIndex >= 3) {
      commander.setFlipX(playerIsLeft);
    }
    this.showSkillImportantWorldText(
      commander,
      '「拒绝恶意捆绑」',
      '#ffe8a3',
      22,
      { priority: 87, yOffset: 72, replaceLowerPriority: true }
    );

    this.spawnCommanderCleanseSweep(commander);

    const landingBaseAngle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
    potatoes.forEach((potato, index) => {
      const delay = (
        config.cleanseLaunchDelayMs
        + index * config.cleanseLaunchStaggerMs
      );

      this.time.delayedCall(delay, () => {
        this.launchCommanderCleansePotato(
          potato,
          index,
          potatoes.length,
          landingBaseAngle
        );
      });
    });

    this.time.delayedCall(config.cleanseCastMs, () => {
      if (!commander?.active || commander.isDead) return;
      commander.restoreNormalAfterCleanse?.();
      commander.setFlipX(previousFlipX);
    });

    return true;
  }

  createPlaceholderTextures() {
    if (this.textures.exists('potato')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });


    g.fillStyle(0x9a6238, 1);
    g.fillEllipse(20, 18, 35, 29);
    g.fillStyle(0x6d4328, 1);
    g.fillCircle(11, 14, 2);
    g.fillCircle(27, 21, 2);
    g.fillCircle(22, 10, 2);
    g.generateTexture('potato', 40, 36);
    g.clear();

    g.fillStyle(0xf2cf4a, 1);
    g.fillEllipse(19, 18, 30, 23);
    g.fillCircle(29, 14, 8);
    g.fillStyle(0xf18b34, 1);
    g.fillTriangle(35, 13, 43, 16, 35, 19);
    g.fillStyle(0x111111, 1);
    g.fillCircle(31, 12, 2);
    g.generateTexture('duck', 44, 34);
    g.clear();

    g.lineStyle(4, 0xff4d4d, 1);
    g.beginPath();
    g.moveTo(2, 16);
    g.lineTo(8, 7);
    g.lineTo(12, 13);
    g.lineTo(18, 3);
    g.strokePath();
    g.lineStyle(3, 0xff8a4d, 1);
    g.beginPath();
    g.moveTo(10, 18);
    g.lineTo(15, 12);
    g.lineTo(20, 17);
    g.strokePath();
    g.generateTexture('angryMark', 23, 21);
    g.clear();

    g.fillStyle(0xf2f2f2, 1);
    g.fillCircle(18, 18, 16);
    g.lineStyle(2, 0x333333, 1);
    g.strokeCircle(18, 18, 16);
    g.fillStyle(0x333333, 1);
    g.fillCircle(18, 18, 5);
    g.fillCircle(10, 10, 3);
    g.fillCircle(27, 11, 3);
    g.fillCircle(11, 27, 3);
    g.fillCircle(27, 27, 3);
    g.generateTexture('ball', 36, 36);
    g.clear();

    g.fillStyle(0x7f38a8, 1);
    g.fillEllipse(17, 15, 25, 14);
    g.fillEllipse(10, 15, 9, 12);
    g.lineStyle(2, 0xbb75df, 1);
    g.lineBetween(5, 6, 0, 0);
    g.lineBetween(5, 23, 0, 29);
    g.lineBetween(14, 6, 12, 0);
    g.lineBetween(14, 24, 12, 30);
    g.lineBetween(23, 7, 29, 2);
    g.lineBetween(23, 23, 29, 28);
    g.generateTexture('roach', 32, 30);
    g.clear();

    g.fillStyle(0x78c96c, 1);
    g.fillEllipse(24, 22, 32, 24);
    g.fillTriangle(12, 13, 16, 2, 21, 13);
    g.fillTriangle(27, 13, 34, 2, 38, 15);
    g.fillStyle(0x1d321d, 1);
    g.fillCircle(18, 19, 2);
    g.fillCircle(30, 19, 2);
    g.generateTexture('plagueCat', 48, 40);
    g.clear();

    g.fillStyle(0xffc9e0, 1);
    g.fillEllipse(42, 35, 58, 38);
    g.fillCircle(66, 25, 18);
    g.fillStyle(0xffa9cd, 1);
    g.fillEllipse(34, 42, 34, 18);
    g.fillStyle(0xffd96a, 1);
    g.fillTriangle(80, 24, 94, 29, 80, 34);
    g.fillStyle(0x3b2732, 1);
    g.fillCircle(70, 21, 3);
    g.fillStyle(0xff7eb8, 1);
    g.fillCircle(16, 11, 5);
    g.fillCircle(24, 6, 4);
    g.generateTexture('duckQueen', 98, 58);
    g.clear();

    g.fillStyle(0x6f3514, 0.95);
    g.fillCircle(16, 16, 13);
    g.fillStyle(0xf7941d, 1);
    g.fillCircle(16, 16, 11);
    g.fillStyle(0xffb12c, 0.92);
    g.fillCircle(13, 12, 7);
    g.fillStyle(0xffd46a, 0.88);
    g.fillEllipse(11, 9, 6, 3);
    g.fillStyle(0x4f8e38, 1);
    g.fillTriangle(16, 5, 20, 1, 24, 6);
    g.generateTexture('queenTangerine', 32, 32);
    g.clear();

    g.fillStyle(0xff68ad, 1);
    g.fillCircle(12, 11, 8);
    g.fillCircle(24, 11, 8);
    g.fillTriangle(4, 12, 32, 12, 18, 30);
    g.generateTexture('queenFanHeart', 36, 32);
    g.clear();

    g.fillStyle(0xff86be, 1);
    g.fillRoundedRect(0, 0, 52, 34, 7);
    g.fillStyle(0xffe6f1, 1);
    g.fillRoundedRect(5, 5, 42, 13, 4);
    g.fillStyle(0xc94c83, 1);
    g.fillCircle(16, 26, 5);
    g.fillCircle(36, 26, 5);
    g.fillStyle(0x6e2148, 1);
    g.fillCircle(16, 26, 2);
    g.fillCircle(36, 26, 2);
    g.generateTexture('danjiCassette', 52, 34);
    g.clear();

    g.fillStyle(0x72d2e8, 1);
    g.fillEllipse(16, 9, 24, 11);
    g.fillTriangle(4, 9, 0, 2, 0, 16);
    g.fillStyle(0x1b5060, 1);
    g.fillCircle(22, 7, 2);
    g.generateTexture('fishSmall', 30, 18);
    g.clear();

    g.fillStyle(0x5db5d1, 1);
    g.fillEllipse(24, 14, 40, 20);
    g.fillTriangle(7, 14, 0, 3, 0, 25);
    g.fillStyle(0x153e4d, 1);
    g.fillCircle(34, 11, 3);
    g.generateTexture('fishBig', 48, 28);
    g.clear();

    g.fillStyle(0x8fb06b, 1);
    g.fillEllipse(20, 11, 31, 15);
    g.fillTriangle(5, 11, 0, 3, 0, 20);
    g.fillStyle(0x345024, 1);
    g.fillCircle(28, 8, 2);
    g.generateTexture('fishStinky', 38, 22);
    g.clear();

    g.lineStyle(4, 0x3d8a48, 1);
    g.beginPath();
    g.moveTo(11, 22);
    g.lineTo(11, 8);
    g.strokePath();
    g.fillStyle(0x68bd66, 1);
    g.fillEllipse(6, 8, 10, 6);
    g.fillEllipse(16, 6, 10, 6);
    g.generateTexture('potatoSprout', 22, 24);
    g.clear();

    g.fillStyle(0x8f5a2d, 1);
    g.fillEllipse(50, 42, 78, 64);
    g.fillStyle(0x6e3e24, 1);
    g.fillCircle(34, 34, 4);
    g.fillCircle(63, 38, 4);
    g.fillCircle(50, 54, 4);
    g.fillStyle(0xf1d15b, 1);
    g.fillTriangle(25, 13, 35, 0, 42, 15);
    g.fillTriangle(39, 13, 50, 0, 58, 15);
    g.fillTriangle(55, 13, 67, 1, 75, 17);
    g.fillRect(24, 13, 52, 10);
    g.generateTexture('potatoCommander', 100, 78);
    g.clear();

    g.fillStyle(0x94d5f3, 0.72);
    g.fillEllipse(7, 3, 13, 5);
    g.generateTexture('crescentTrail', 14, 6);
    g.clear();

    g.fillStyle(0xd7a93d, 0.98);
    g.fillRoundedRect(11, 1, 10, 46, 3);
    g.fillRoundedRect(2, 14, 28, 10, 3);
    g.fillStyle(0xfff1b8, 1);
    g.fillRoundedRect(14, 4, 4, 40, 2);
    g.fillRoundedRect(5, 17, 22, 4, 2);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 19, 3.5);
    g.generateTexture('potatoCommanderCrossProjectile', 32, 48);
    g.clear();

    g.fillStyle(0x65f4d3, 1);
    g.fillTriangle(8, 0, 16, 8, 8, 16);
    g.fillTriangle(8, 0, 0, 8, 8, 16);
    g.generateTexture('xp', 16, 16);
    g.clear();

    g.fillStyle(0xffa23a, 1);
    g.fillTriangle(10, 0, 20, 10, 10, 20);
    g.fillTriangle(10, 0, 0, 10, 10, 20);
    g.fillStyle(0xffd28a, 0.95);
    g.fillCircle(10, 10, 3.2);
    g.generateTexture('xpElite', 20, 20);
    g.clear();

    g.fillStyle(0xff4657, 1);
    g.fillTriangle(12, 0, 24, 12, 12, 24);
    g.fillTriangle(12, 0, 0, 12, 12, 24);
    g.fillStyle(0xff9aa3, 0.95);
    g.fillCircle(12, 12, 3.8);
    g.generateTexture('xpBoss', 24, 24);
    g.destroy();
  }

  createWorldGrid() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0xffffff, 0.055);
    for (let x = 0; x <= GAME.WORLD_WIDTH; x += 100) graphics.lineBetween(x, 0, x, GAME.WORLD_HEIGHT);
    for (let y = 0; y <= GAME.WORLD_HEIGHT; y += 100) graphics.lineBetween(0, y, GAME.WORLD_WIDTH, y);

    const border = this.add.rectangle(GAME.WORLD_WIDTH / 2, GAME.WORLD_HEIGHT / 2, GAME.WORLD_WIDTH, GAME.WORLD_HEIGHT);
    border.setStrokeStyle(4, 0xffffff, 0.15);
  }

  addInjustice(amount) {
    this.player.addInjustice(amount);
  }

  registerKill(type, amount = 1) {
    const count = Math.max(0, Math.trunc(Number(amount) || 0));
    if (count <= 0 || this.kills?.[type] === undefined) return 0;

    this.kills[type] += count;

    if (this.player?.active && !this.finished) {
      let gained = 0;
      for (let i = 0; i < count; i += 1) gained += Phaser.Math.Between(1, 2);
      this.addInjustice(gained);
    }

    return count;
  }

  getStageSpinCenter() {
    return getPlayerVisualAnchor(this.player, STAGE_SPIN_VFX.anchor);
  }

  getStageSpinAlphaEnvelope(progress) {
    const p = Phaser.Math.Clamp(progress, 0, 1);
    const fadeIn = Phaser.Math.Clamp(p / 0.16, 0, 1);
    const fadeOut = Phaser.Math.Clamp((1 - p) / 0.22, 0, 1);
    return Math.min(fadeIn, fadeOut);
  }

  spawnStageSpinStage(stageConfig, effectRadius = this.player.stageSpinRadius) {
    if (!this.player?.active || this.finished) return;

    const center = this.getStageSpinCenter();
    const displaySize = Math.max(1, effectRadius * stageConfig.radiusScale);

    const back = this.vfx.spawnImage(stageConfig.key, center.x, center.y, {
      displayWidth: displaySize,
      displayHeight: displaySize,
      depth: 9,
      alpha: 0,
      blendMode: 'ADD'
    });
    if (!back) return;

    const front = this.vfx.spawnImage(stageConfig.key, center.x, center.y, {
      displayWidth: displaySize,
      displayHeight: displaySize,
      depth: 11,
      alpha: 0,
      blendMode: 'ADD'
    });

    if (front) {
      const cropY = Math.round(front.frame.height * STAGE_SPIN_VFX.frontCropRatio);
      front.setCrop(0, cropY, front.frame.width, front.frame.height - cropY);
    }

    const trails = stageConfig.trailOffsets.map((offset, index) => {
      const trailScale = 1 - (index + 1) * 0.018;
      return this.vfx.spawnImage(stageConfig.key, center.x, center.y, {
        displayWidth: displaySize * trailScale,
        displayHeight: displaySize * trailScale,
        depth: 8,
        alpha: 0,
        blendMode: 'ADD'
      });
    }).filter(Boolean);

    const objects = [back, front, ...trails].filter(Boolean);
    const baseScales = new Map(objects.map((obj) => [obj, { x: obj.scaleX, y: obj.scaleY }]));

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: stageConfig.durationMs,
      ease: 'Linear',
      onUpdate: (tween) => {
        if (!this.player?.active || this.finished) return;

        const p = tween.getValue();
        const anchor = this.getStageSpinCenter();
        const angle = Phaser.Math.Linear(stageConfig.startAngle, stageConfig.endAngle, p);
        const envelope = this.getStageSpinAlphaEnvelope(p);
        const pulse = 1 + Math.sin(Math.PI * p) * stageConfig.pulseScale;

        objects.forEach((obj) => obj?.active && obj.setPosition(anchor.x, anchor.y));

        if (back?.active) {
          const base = baseScales.get(back);
          back
            .setAngle(angle)
            .setScale(base.x * pulse, base.y * pulse)
            .setAlpha(stageConfig.alpha * 0.72 * envelope);
        }

        if (front?.active) {
          const base = baseScales.get(front);
          front
            .setAngle(angle)
            .setScale(base.x * pulse, base.y * pulse)
            .setAlpha(stageConfig.alpha * envelope);
        }

        trails.forEach((trail, index) => {
          if (!trail?.active) return;
          const base = baseScales.get(trail);
          const trailPulse = 1 + Math.sin(Math.PI * p) * stageConfig.pulseScale * 0.65;
          trail
            .setAngle(angle - stageConfig.trailOffsets[index])
            .setScale(base.x * trailPulse, base.y * trailPulse)
            .setAlpha(stageConfig.alpha * envelope * (0.16 - index * 0.045));
        });
      },
      onComplete: () => {
        objects.forEach((obj) => {
          if (obj?.active) obj.destroy();
        });
      }
    });
  }


  rearmComboStageSpinMilestones() {}

  checkComboStageSpinMilestones() {}

  getComboStageSpinReward(comboValue = this.combo) {
    const combo = Math.max(0, Math.floor(Number(comboValue) || 0));
    const comboLevel = Phaser.Math.Clamp(Math.floor(combo / 10), 0, 6);
    const stageIndex = combo >= 20 ? 2 : combo >= 10 ? 1 : 0;
    const stageConfig = STAGE_SPIN_VFX.stages?.[stageIndex] ?? STAGE_SPIN_VFX.stages?.[0];
    const radiusScale = Math.max(0.001, Number(stageConfig?.radiusScale) || 1);

    const growthStart = PLAYER.STAGE_SPIN_SIZE_GROWTH_START_COMBO ?? 40;
    const growthComboStep = Math.max(1, PLAYER.STAGE_SPIN_SIZE_GROWTH_COMBO_STEP ?? 10);
    const growthSteps = combo >= growthStart
      ? 1 + Math.floor((combo - growthStart) / growthComboStep)
      : 0;
    const growthScale = Math.min(
      PLAYER.STAGE_SPIN_SIZE_MAX_SCALE ?? 1.20,
      1 + Math.max(0, growthSteps) * (PLAYER.STAGE_SPIN_SIZE_GROWTH_PER_STEP ?? 0.05)
    );
    const baseDisplaySize = PLAYER.STAGE_SPIN_BASE_DISPLAY_SIZE ?? 160;

    const effectRadius = (baseDisplaySize * growthScale) / radiusScale;

    const damageTable = PLAYER.STAGE_SPIN_DAMAGE_BY_COMBO_LEVEL ?? [6, 7, 8, 9, 10, 11, 12];
    const damage = Math.max(1, Number(damageTable[comboLevel]) || PLAYER.STAGE_SPIN_DAMAGE || 6);

    return {
      combo,
      comboLevel,
      stageIndex,
      effectRadius,
      displaySize: baseDisplaySize * growthScale,
      growthScale,
      damage,
      label: '「舞台回旋」'
    };
  }

  getStageSpinPixelAlphaAtWorld(sprite, worldX, worldY) {
    if (!sprite?.active || !sprite.frame || !sprite.texture?.key) return 0;

    const scaleX = Math.abs(Number(sprite.scaleX) || 0);
    const scaleY = Math.abs(Number(sprite.scaleY) || 0);
    if (scaleX <= 0.0001 || scaleY <= 0.0001) return 0;

    const dx = worldX - sprite.x;
    const dy = worldY - sprite.y;
    const rotation = Number(sprite.rotation) || 0;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const localX = (cos * dx + sin * dy) / scaleX
      + sprite.frame.width * (Number(sprite.originX) || 0.5);
    const localY = (-sin * dx + cos * dy) / scaleY
      + sprite.frame.height * (Number(sprite.originY) || 0.5);

    if (
      localX < 0 || localY < 0
      || localX >= sprite.frame.width || localY >= sprite.frame.height
    ) return 0;

    return this.textures.getPixelAlpha(
      Math.floor(localX),
      Math.floor(localY),
      sprite.texture.key,
      sprite.frame.name
    ) ?? 0;
  }

  stageSpinSpriteOverlapsEnemy(sprite, enemy) {
    if (!sprite?.active || !enemy?.active || enemy.isDead) return false;

    const spriteBounds = sprite.getBounds?.();
    const enemyBounds = enemy.getBounds?.();
    if (
      spriteBounds && enemyBounds
      && !Phaser.Geom.Intersects.RectangleToRectangle(spriteBounds, enemyBounds)
    ) return false;

    const bounds = enemyBounds ?? new Phaser.Geom.Rectangle(
      enemy.x - Math.abs(enemy.displayWidth || 36) * 0.5,
      enemy.y - Math.abs(enemy.displayHeight || 36) * 0.5,
      Math.abs(enemy.displayWidth || 36),
      Math.abs(enemy.displayHeight || 36)
    );
    const threshold = PLAYER.STAGE_SPIN_ALPHA_HIT_THRESHOLD ?? 20;
    const fractions = [0.22, 0.50, 0.78];

    for (const fx of fractions) {
      for (const fy of fractions) {
        const sampleX = bounds.left + bounds.width * fx;
        const sampleY = bounds.top + bounds.height * fy;
        if (this.getStageSpinPixelAlphaAtWorld(sprite, sampleX, sampleY) >= threshold) {
          return true;
        }
      }
    }
    return false;
  }

  applyStageSpinSpriteHits(sprite, damage, hitEnemies) {
    if (!sprite?.active || !Number.isFinite(damage) || damage <= 0) return;
    const victims = [];

    this.enemies?.children?.iterate?.((enemy) => {
      if (!enemy?.active || enemy.isDead || hitEnemies.has(enemy)) return;
      if (this.stageSpinSpriteOverlapsEnemy(sprite, enemy)) victims.push(enemy);
    });

    victims.forEach((enemy) => {
      if (!enemy?.active || enemy.isDead || hitEnemies.has(enemy)) return;
      hitEnemies.add(enemy);
      const killed = enemy.receiveDamage(damage);
      if (killed) this.killEnemy(enemy);
    });
  }

  spawnStageSpinStage(
    stageConfig,
    effectRadius = this.player.stageSpinRadius,
    { damage = 0, enableDamage = false } = {}
  ) {
    if (!this.player?.active || this.finished) return;

    const center = this.getStageSpinCenter();
    const displaySize = Math.max(1, effectRadius * stageConfig.radiusScale);

    const back = this.vfx.spawnImage(stageConfig.key, center.x, center.y, {
      displayWidth: displaySize,
      displayHeight: displaySize,
      depth: 9,
      alpha: 0,
      blendMode: 'ADD'
    });
    if (!back) return;

    const front = this.vfx.spawnImage(stageConfig.key, center.x, center.y, {
      displayWidth: displaySize,
      displayHeight: displaySize,
      depth: 11,
      alpha: 0,
      blendMode: 'ADD'
    });

    if (front) {
      const cropY = Math.round(front.frame.height * STAGE_SPIN_VFX.frontCropRatio);
      front.setCrop(0, cropY, front.frame.width, front.frame.height - cropY);
    }

    const trails = stageConfig.trailOffsets.map((offset, index) => {
      const trailScale = 1 - (index + 1) * 0.018;
      return this.vfx.spawnImage(stageConfig.key, center.x, center.y, {
        displayWidth: displaySize * trailScale,
        displayHeight: displaySize * trailScale,
        depth: 8,
        alpha: 0,
        blendMode: 'ADD'
      });
    }).filter(Boolean);

    const objects = [back, front, ...trails].filter(Boolean);
    const baseScales = new Map(objects.map((obj) => [obj, { x: obj.scaleX, y: obj.scaleY }]));
    const hitEnemies = new Set();

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: stageConfig.durationMs,
      ease: 'Linear',
      onUpdate: (tween) => {
        if (!this.player?.active || this.finished) return;

        const progress = tween.getValue();
        const anchor = this.getStageSpinCenter();
        const angle = Phaser.Math.Linear(stageConfig.startAngle, stageConfig.endAngle, progress);
        const envelope = this.getStageSpinAlphaEnvelope(progress);
        const pulse = 1 + Math.sin(Math.PI * progress) * stageConfig.pulseScale;

        objects.forEach((obj) => obj?.active && obj.setPosition(anchor.x, anchor.y));

        if (back?.active) {
          const base = baseScales.get(back);
          back
            .setAngle(angle)
            .setScale(base.x * pulse, base.y * pulse)
            .setAlpha(stageConfig.alpha * 0.72 * envelope);
        }

        if (front?.active) {
          const base = baseScales.get(front);
          front
            .setAngle(angle)
            .setScale(base.x * pulse, base.y * pulse)
            .setAlpha(stageConfig.alpha * envelope);
        }

        trails.forEach((trail, index) => {
          if (!trail?.active) return;
          const base = baseScales.get(trail);
          const trailPulse = 1 + Math.sin(Math.PI * progress) * stageConfig.pulseScale * 0.65;
          trail
            .setAngle(angle - stageConfig.trailOffsets[index])
            .setScale(base.x * trailPulse, base.y * trailPulse)
            .setAlpha(stageConfig.alpha * envelope * (0.16 - index * 0.045));
        });

        if (enableDamage && envelope >= 0.16) {
          this.applyStageSpinSpriteHits(back, damage, hitEnemies);
        }
      },
      onComplete: () => {
        objects.forEach((obj) => {
          if (obj?.active) obj.destroy();
        });
      }
    });
  }

  triggerComboStageSpinReward(reward) {
    if (
      !reward
      || !this.player?.active
      || this.finished
      || this.isChoosingUpgrade
      || this.duckQueenGrappleActive
    ) return false;

    const stageConfig = STAGE_SPIN_VFX.stages[reward.stageIndex];
    if (!stageConfig) return false;

    this.spawnStageSpinStage(stageConfig, reward.effectRadius, {
      damage: reward.damage,
      enableDamage: true
    });

    {
      this.showPassiveSkillImportantWorldText(
        this.player,
        reward.label,
        '#9bddff',
        reward.stageIndex === 2 ? 20 : 18,
        { priority: 70 + reward.stageIndex, yOffset: 58 }
      );
    }

    if (reward.stageIndex === 2) {
      this.cameras.main.shake(62, 0.0018);
    }
    return true;
  }

  triggerBeatStageSpin() {
    return this.triggerComboStageSpinReward(this.getComboStageSpinReward(this.combo));
  }

  pulseComboHud() {
    if (!this.comboText?.active) return;

    this.tweens.killTweensOf(this.comboText);
    this.comboText.setScale(1);
    this.tweens.add({
      targets: this.comboText,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 70,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: () => {
        if (this.comboText?.active) this.comboText.setScale(1);
      }
    });
  }

  updateRhythmComboTimeout(gameplayElapsedMs = this.gameplayElapsedMs) {
    if (this.combo <= 0) return;
    if (!Number.isFinite(this.lastSuccessfulRhythmGameplayMs)) return;

    if (gameplayElapsedMs - this.lastSuccessfulRhythmGameplayMs < PLAYER_COMBO_BREAK_MS) {
      return;
    }

    this.combo = 0;
    this.beatChargeComboTier = 0;
    this.lastSuccessfulRhythmGameplayMs = -Infinity;
    this.rearmComboStageSpinMilestones();

    if (this.playerComboFeedbackText?.active) {
      this.tweens.killTweensOf(this.playerComboFeedbackText);
      this.playerComboFeedbackText.destroy();
      this.playerComboFeedbackText = null;
    }

    this.pulseComboHud();
  }

  showRhythmComboFeedback(combo, { strong = false } = {}) {
    if (!this.player?.active || this.finished || combo < PLAYER_COMBO_FEEDBACK_START) return;

    if (this.playerComboFeedbackText?.active) {
      this.tweens.killTweensOf(this.playerComboFeedbackText);
      this.playerComboFeedbackText.destroy();
      this.playerComboFeedbackText = null;
    }

    const milestone = PLAYER_COMBO_BURST_MILESTONES.includes(combo);
    const intensity = Phaser.Math.Clamp((combo - PLAYER_COMBO_FEEDBACK_START) / 80, 0, 1);
    const visualTop = this.player.y - Math.max(60, Math.abs(Number(this.player.displayHeight) || 60) * 0.78);
    const baseFontSize = Math.round(22 + intensity * 8 + (milestone ? 3 : 0));
    const popScale = 1.08 + intensity * 0.14 + (milestone ? 0.10 : 0);
    const textColor = combo >= 80
      ? '#fff3b0'
      : combo >= 50
        ? '#ffd66b'
        : '#ffbd4a';
    const strokeColor = combo >= 60 ? '#9b4f00' : '#5d2b00';

    const label = this.add.text(
      this.player.x,
      visualTop,
      `COMBO x${combo}`,
      {
        fontSize: `${baseFontSize}px`,
        fontStyle: 'bold',
        color: textColor,
        stroke: strokeColor,
        strokeThickness: milestone ? 5 : 4,
        align: 'center',
        shadow: {
          offsetX: 0,
          offsetY: 2,
          color: '#000000',
          blur: milestone ? 5 : 3,
          stroke: false,
          fill: true
        }
      }
    )
      .setOrigin(0.5)
      .setDepth(205)
      .setScale(0.76)
      .setAlpha(0.96);

    this.playerComboFeedbackText = label;

    this.tweens.add({
      targets: label,
      scaleX: popScale,
      scaleY: popScale,
      y: visualTop - (milestone ? 8 : 5),
      duration: milestone ? 105 : 82,
      ease: 'Back.Out',
      onComplete: () => {
        if (!label?.active) return;
        this.tweens.add({
          targets: label,
          y: label.y - (milestone ? 30 : 24),
          alpha: 0,
          scaleX: 0.96 + intensity * 0.04,
          scaleY: 0.96 + intensity * 0.04,
          delay: milestone ? 125 : 70,
          duration: milestone ? 330 : 270,
          ease: 'Quad.In',
          onComplete: () => {
            if (this.playerComboFeedbackText === label) this.playerComboFeedbackText = null;
            if (label.active) label.destroy();
          }
        });
      }
    });

    if (milestone) {
      this.spawnRhythmComboMilestoneBurst(combo, visualTop, { strong });
    }
  }

  spawnRhythmComboMilestoneBurst(combo, centerY, { strong = false } = {}) {
    if (!this.player?.active || this.finished) return;

    const milestoneIndex = Math.max(0, PLAYER_COMBO_BURST_MILESTONES.indexOf(combo));
    const particleCount = Math.min(28, 10 + milestoneIndex * 3);
    const radius = 34 + milestoneIndex * 4;
    const depth = 204;

    for (let i = 0; i < particleCount; i += 1) {
      const angle = (Math.PI * 2 * i) / particleCount + Phaser.Math.FloatBetween(-0.10, 0.10);
      const distance = radius + Phaser.Math.Between(4, 22);
      const spark = this.add.rectangle(
        this.player.x + Math.cos(angle) * 8,
        centerY + Math.sin(angle) * 5,
        i % 3 === 0 ? 3 : 2,
        Phaser.Math.Between(8, 16) + milestoneIndex,
        i % 4 === 0 ? 0xfff4bf : 0xffb443,
        i % 4 === 0 ? 0.90 : 0.72
      )
        .setRotation(angle + Math.PI / 2)
        .setDepth(depth)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: spark,
        x: this.player.x + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance * 0.70,
        alpha: 0,
        scaleY: 0.30,
        duration: Phaser.Math.Between(220, 330) + milestoneIndex * 12,
        ease: 'Quad.Out',
        onComplete: () => spark?.active && spark.destroy()
      });
    }

    if (combo >= 50) {
      this.cameras.main.shake(
        combo >= 100 ? 78 : combo >= 80 ? 62 : 48,
        combo >= 100 ? 0.0022 : combo >= 80 ? 0.0017 : 0.0012,
        false
      );
    }

    if (combo >= 100 || (strong && combo >= 60)) {
      this.cameras.main.flash(
        combo >= 100 ? 70 : 45,
        255,
        216,
        120,
        false
      );
    }
  }

  showBeatStepImpact(beat) {
    if (!this.player?.active) return;

    const strong = Boolean(beat?.strong);
    const config = strong ? BEAT_VFX.strong : BEAT_VFX.weak;
    const pos = this.getBeatVfxPosition(config);
    const impactColor = strong ? 0xdff8ff : 0x9bddff;

    const ground = this.add.ellipse(
      pos.x,
      pos.y + 1,
      strong ? 62 : 50,
      strong ? 14 : 11,
      impactColor,
      strong ? 0.20 : 0.14
    )
      .setDepth(11.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.66, 0.92);
    ground.setStrokeStyle(strong ? 2.5 : 2, impactColor, strong ? 0.88 : 0.68);

    this.tweens.add({
      targets: ground,
      scaleX: strong ? 1.55 : 1.42,
      scaleY: 0.48,
      alpha: 0,
      duration: strong ? 175 : 150,
      ease: 'Quad.Out',
      onComplete: () => ground?.active && ground.destroy()
    });

    [-1, 1].forEach((side) => {
      const streak = this.add.rectangle(
        pos.x + side * 7,
        pos.y - 1,
        strong ? 17 : 13,
        strong ? 3 : 2,
        impactColor,
        strong ? 0.88 : 0.66
      )
        .setDepth(12)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAngle(side * -16);

      this.tweens.add({
        targets: streak,
        x: streak.x + side * (strong ? 28 : 22),
        y: streak.y - (strong ? 4 : 3),
        alpha: 0,
        scaleX: 0.35,
        duration: strong ? 160 : 135,
        ease: 'Quad.Out',
        onComplete: () => streak?.active && streak.destroy()
      });
    });
  }

  showRhythmHitPulse(beat, text, color = '#b9efff') {
    const config = beat?.strong ? BEAT_VFX.strong : BEAT_VFX.weak;
    const pos = this.getBeatVfxPosition(config);
    const pulse = this.vfx?.spawnImage(config.key, pos.x, pos.y, {
      displayWidth: config.displayWidth * 1.08,
      displayHeight: config.displayHeight * 1.08,
      depth: 12,
      alpha: 0.98,
      originX: config.originX,
      originY: config.originY,
      blendMode: 'ADD'
    });

    if (pulse) {
      const baseX = pulse.scaleX;
      const baseY = pulse.scaleY;
      pulse.setScale(baseX * 1.18, baseY * 1.18);
      this.tweens.add({
        targets: pulse,
        scaleX: baseX * 0.72,
        scaleY: baseY * 0.72,
        alpha: 0,
        duration: 155,
        ease: 'Quad.Out',
        onComplete: () => pulse.active && pulse.destroy()
      });
    }

    this.player?.setTintFill?.(0xeafcff);
    this.time.delayedCall(70, () => {
      if (this.player?.active) this.player.clearTint();
    });

    this.showWorldText(
      this.player.x,
      this.player.y - 48,
      text,
      color,
      19,
      620
    );
  }

  refreshBeatChargeIndicator() {
    const crescentVfx = getCrescentVfxLevel(this.player.crescentLevel);

    if (this.beatChargeIndicator?.active) {
      this.beatChargeIndicator.setTexture(crescentVfx.attackKey);
      return;
    }

    this.beatChargeIndicator = this.vfx?.spawnImage(
      crescentVfx.attackKey,
      this.player.x,
      this.player.y,
      {
        displayWidth: 24,
        displayHeight: 24,
        depth: 12,
        alpha: 0.82,
        blendMode: 'ADD'
      }
    ) ?? null;
  }

  clearBeatChargeIndicator() {
    if (this.beatChargeIndicator?.active) {
      this.beatChargeIndicator.destroy();
    }
    this.beatChargeIndicator = null;
  }

  updateBeatChargeIndicator() {
    const indicator = this.beatChargeIndicator;
    if (!indicator?.active) return;

    if (!this.beatCharge || !this.player?.active || this.finished) {
      this.clearBeatChargeIndicator();
      return;
    }

    const t = this.time.now * 0.0045;
    indicator
      .setPosition(
        this.player.x + 23 + Math.cos(t) * 2,
        this.player.y - 25 + Math.sin(t) * 2
      )
      .setAngle((this.time.now * 0.055) % 360)
      .setAlpha(0.72 + Math.sin(t * 1.7) * 0.12);
  }

  getBeatChargeComboTier(comboValue = this.combo) {
    const combo = Math.max(0, Number(comboValue) || 0);
    if (combo < PLAYER.BEAT_CHARGE_COMBO_START) return 0;
    const raw = 1 + Math.floor((combo - PLAYER.BEAT_CHARGE_COMBO_START) / PLAYER.BEAT_CHARGE_COMBO_STEP);
    const maxTier = Math.max(
      0,
      Math.round(
        (PLAYER.BEAT_CHARGE_COMBO_MAX_MULTIPLIER - PLAYER.BEAT_CHARGE_DAMAGE_MULTIPLIER)
        / PLAYER.BEAT_CHARGE_COMBO_DAMAGE_STEP
      )
    );
    return Phaser.Math.Clamp(raw, 0, maxTier);
  }

  getBeatChargeDamageMultiplier(tier = this.beatChargeComboTier) {
    return Math.min(
      PLAYER.BEAT_CHARGE_COMBO_MAX_MULTIPLIER,
      PLAYER.BEAT_CHARGE_DAMAGE_MULTIPLIER
        + Math.max(0, Number(tier) || 0) * PLAYER.BEAT_CHARGE_COMBO_DAMAGE_STEP
    );
  }

  spawnHighComboBeatParticles(x, y, tier = 0, { hit = false } = {}) {
    const safeTier = Math.max(0, Math.trunc(Number(tier) || 0));
    if (safeTier <= 0) return;
    const count = Math.min(14, (hit ? 4 : 3) + safeTier * 2);
    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const startR = Phaser.Math.FloatBetween(4, hit ? 12 : 9);
      const travel = Phaser.Math.FloatBetween(hit ? 16 : 12, hit ? 34 : 28) + safeTier * 1.8;
      const color = i % 4 === 0 ? 0xeefbff : THEME_BLUE;
      const particle = this.add.circle(
        x + Math.cos(angle) * startR,
        y + Math.sin(angle) * startR,
        Phaser.Math.FloatBetween(1.2, 2.4),
        color,
        Phaser.Math.FloatBetween(0.55, 0.90)
      ).setDepth(hit ? 32 : 10).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * travel,
        y: particle.y + Math.sin(angle) * travel,
        alpha: 0,
        scaleX: 0.35,
        scaleY: 0.35,
        duration: Phaser.Math.Between(130, 210),
        ease: 'Quad.Out',
        onComplete: () => particle?.active && particle.destroy()
      });
    }
  }

  tryBeatAction(tapPoint = null) {
    if (
      this.waitingForGameStart
      || this.finished
      || this.isChoosingUpgrade
      || this.duckQueenGrappleActive
      || this.player.hp <= 0
    ) return false;

    const beat = this.getCurrentBeatMatch();
    if (!beat || beat.index === this.lastRhythmBeatIndex) {
      this.showMobileBeatMissFeedback(tapPoint);
      return false;
    }

    this.lastRhythmBeatIndex = beat.index;
    this.beatCharge = false;
    this.beatChargeComboTier = 0;
    this.clearBeatChargeIndicator();
    this.combo += 1;
    this.highestCombo = Math.max(this.highestCombo, this.combo);
    this.lastSuccessfulRhythmGameplayMs = this.gameplayElapsedMs;
    this.triggerBeatStageSpin();
    this.pulseComboHud();
    this.showRhythmComboFeedback(this.combo, { strong: Boolean(beat.strong) });
    if (!this.tutorialBeatActionHit) {
      this.tutorialBeatActionHitAt = this.getGameplayElapsedSeconds();
    }
    this.tutorialBeatActionHit = true;
    this.tutorialBeatHit = true;

    this.player.playBeatActionVisual?.(this.time.now, { strong: Boolean(beat.strong) });
    this.showBeatStepImpact(beat);
    this.showRhythmHitPulse(beat, '「踩拍！」');
    this.showMobileBeatHitFeedback(Boolean(beat.strong), tapPoint);

    if (beat.strong) {
      this.cameras.main.shake(58, 0.0018);
    }

    return true;
  }

  tryKeyUp() {
    if (
      this.finished
      || this.isChoosingUpgrade
      || this.duckQueenGrappleActive
      || this.player.injustice < PLAYER.KEY_UP_MAX
    ) return false;

    this.player.injustice = 0;

    this.vibrateMobile(20);

    this.player.playKeyUpVisual?.(this.time.now);
    this.showSkillScreenNotice('「升Key！」', '#94d5f3');

    this.time.delayedCall(KEY_UP_PEAK_MS, () => {
      if (!this.player?.active || this.finished) return;
      this.spawnKeyUpPeakVfx();
      this.showWorldText(
        this.player.x,
        this.player.y - 70,
        'KEY ↑↑↑',
        '#eafcff',
        27,
        520
      );
    });

    this.time.delayedCall(KEY_UP_BURST_MS, () => {
      if (!this.player?.active || this.finished) return;

      this.spawnKeyUpBurstVfx();
      this.vibrateMobile(90);

      this.damageEnemiesInRadius(
        this.player.x,
        this.player.y,
        PLAYER.KEY_UP_RADIUS,
        PLAYER.KEY_UP_DAMAGE,
        PLAYER.KEY_UP_KNOCKBACK
      );

      this.clearEnemyProjectilesInRadius(
        this.player.x,
        this.player.y,
        PLAYER.KEY_UP_RADIUS
      );

      this.cameras.main.shake(155, 0.0065);
    });

    this.time.delayedCall(KEY_UP_VISUAL_MS + 80, () => {
      if (this.keyUpChargeVfxState) this.clearKeyUpChargeVfx({ fadeMs: 120 });
    });

    return true;
  }

  spawnSupportHeart(position = null) {
    if (this.supportHearts.countActive(true) >= 2) return null;

    const view = this.cameras.main.worldView;
    const margin = 72;
    const minDistance = PLAYER.SUPPORT_HEART_MIN_DISTANCE;
    const maxDistance = PLAYER.SUPPORT_HEART_MAX_DISTANCE;

    let best = null;
    let bestEnemyDistance = -Infinity;

    if (
      position
      && Number.isFinite(position.x)
      && Number.isFinite(position.y)
    ) {
      best = {
        x: Phaser.Math.Clamp(position.x, 45, GAME.WORLD_WIDTH - 45),
        y: Phaser.Math.Clamp(position.y, 45, GAME.WORLD_HEIGHT - 45)
      };
    }

    for (let attempt = 0; !best && attempt < 10; attempt += 1) {
      const angle = Phaser.Math.FloatBetween(
        0,
        Math.PI * 2
      );
      const distance = Phaser.Math.Between(
        minDistance,
        maxDistance
      );

      const x = Phaser.Math.Clamp(
        this.player.x + Math.cos(angle) * distance,
        Math.max(45, view.left + margin),
        Math.min(GAME.WORLD_WIDTH - 45, view.right - margin)
      );
      const y = Phaser.Math.Clamp(
        this.player.y + Math.sin(angle) * distance,
        Math.max(45, view.top + margin),
        Math.min(GAME.WORLD_HEIGHT - 45, view.bottom - margin)
      );

      let nearestEnemy = Infinity;
      this.enemies.children.iterate((enemy) => {
        if (!enemy?.active || enemy.isDead) return;

        nearestEnemy = Math.min(
          nearestEnemy,
          Phaser.Math.Distance.Between(
            x,
            y,
            enemy.x,
            enemy.y
          )
        );
      });

      if (nearestEnemy > bestEnemyDistance) {
        bestEnemyDistance = nearestEnemy;
        best = { x, y };
      }
    }

    if (!best) return;

    const heart = this.supportHearts.create(
      best.x,
      best.y,
      VFX_KEYS.SUPPORT_HEART
    );

    heart.baseVfxScale = SUPPORT_HEART_VFX.pickupScale;
    heart.setScale(heart.baseVfxScale);

    heart.createdAt = this.time.now;
    heart.baseY = best.y;
    heart.floatSeed = Phaser.Math.FloatBetween(
      0,
      Math.PI * 2
    );
    heart.setVelocity(0, 0);
    heart.setDepth(12);

    this.showWorldText(
      best.x,
      best.y - 30,
      '「投喂🩵」',
      '#9ce8ff',
      16,
      1200
    );
    return heart;
  }


  applyPlayerPoison({ kind = 'ordinary' } = {}) {
    const blessed = kind === 'blessed';
    const duration = blessed
      ? STATUS_EFFECTS.blessedToxicPoisonDurationMs
      : (STATUS_EFFECTS.toxicPotatoPoisonDurationMs ?? 10000);

    const wasPoisoned =
      this.player.poisonRemainingMs > 0;
    const wasBlessed = this.player.poisonKind === 'blessed';

    if (blessed || !this.player.poisonKind) {
      this.player.poisonKind = kind;
    }

    this.player.poisonRemainingMs = Math.max(
      this.player.poisonRemainingMs,
      duration
    );

    if (!wasPoisoned || (blessed && !wasBlessed)) {
      this.player.poisonTickAccumulatorMs = 0;
      this.showPlayerStatusNotice(
        blessed ? 'toxic_poison' : 'poison',
        blessed ? '「中剧毒了！」' : '「中毒了！」',
        '#b8d85f',
        1500
      );
    }
  }

  spawnBlessedToxicContactBurst(x, y) {
    const ring = this.add.circle(x, y, 12, 0x8be63f, 0.22)
      .setStrokeStyle(3, 0xc8ff83, 0.72)
      .setDepth(24);

    this.tweens.add({
      targets: ring,
      scaleX: 2.8,
      scaleY: 2.2,
      alpha: 0,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy()
    });

    for (let i = 0; i < 5; i += 1) {
      const bubble = this.add.circle(
        x + Phaser.Math.Between(-12, 12),
        y + Phaser.Math.Between(-6, 10),
        Phaser.Math.Between(3, 6),
        0x9be64c,
        0.58
      ).setDepth(25);

      this.tweens.add({
        targets: bubble,
        x: bubble.x + Phaser.Math.Between(-16, 16),
        y: bubble.y - Phaser.Math.Between(16, 30),
        alpha: 0,
        scaleX: 0.45,
        scaleY: 0.45,
        duration: Phaser.Math.Between(220, 360),
        ease: 'Quad.Out',
        onComplete: () => bubble.destroy()
      });
    }
  }

  clearPlayerPoison(showNotice = true, source = 'heart') {
    if (this.player.poisonRemainingMs <= 0) return false;

    if (
      this.player.poisonKind === 'blessed'
      && source !== 'mutual'
    ) {
      return false;
    }

    this.player.poisonRemainingMs = 0;
    this.player.poisonTickAccumulatorMs = 0;
    this.player.poisonKind = null;

    if (showNotice) {
      this.showScreenNotice(
        source === 'mutual'
          ? '「被接住了🩵」'
          : '「蓝心投喂：中毒解除🩵」',
        '#9ce8ff'
      );
    }

    return true;
  }

  clearPlayerNegativeStatusesByMutualSupport() {
    if (!this.player) {
      return {
        purifiedPoison: false,
        clearedAny: false,
        removedFishStinkZones: 0
      };
    }

    const now = this.time.now;
    let clearedAny = false;
    let removedFishStinkZones = 0;

    const purifiedPoison = this.clearPlayerPoison(false, 'mutual');
    if (purifiedPoison) clearedAny = true;

    const hadPull = this.player.pullTarget?.active || now < this.player.pullUntil || Math.abs(this.player.pullStrength ?? 0) > 0;
    const hadSlow = now < this.player.slowUntil || (this.player.slowMultiplier ?? 1) < 1;
    if (hadPull || hadSlow) clearedAny = true;
    this.player.pullTarget = null;
    this.player.pullUntil = -Infinity;
    this.player.pullStrength = 0;
    this.player.slowUntil = -Infinity;
    this.player.slowMultiplier = 1;

    const hadStun = now < this.player.stunnedUntil
      || ['playerXiafanStunArt', 'playerXiafanRecoverArt', 'playerJudgmentKnockdownArt']
        .includes(this.player.texture?.key);
    if (hadStun) {
      clearedAny = true;
      this.player.stunnedUntil = -Infinity;
      this.player.xiafanRecoveryEvent?.remove?.(false);
      this.player.xiafanRestoreEvent?.remove?.(false);
      this.player.xiafanJudgmentFlickerEvent?.remove?.(false);
      this.player.xiafanJudgmentRestoreEvent?.remove?.(false);
      this.player.xiafanRecoveryEvent = null;
      this.player.xiafanRestoreEvent = null;
      this.player.xiafanJudgmentFlickerEvent = null;
      this.player.xiafanJudgmentRestoreEvent = null;
      this.player.xiafanJudgmentFlickerTween?.stop?.();
      this.player.xiafanJudgmentFlickerTween = null;
      this.player.stopSkySmashReactionTweens?.();
      this.player.setAlpha?.(1);
      this.player.clearTint?.();
      if (['playerXiafanStunArt', 'playerXiafanRecoverArt', 'playerJudgmentKnockdownArt']
        .includes(this.player.texture?.key)) {
        this.player.applyPlayerVisualTexture?.('playerArt');
      }
      this.player.clearXiafanVisualDisplaySizeLock?.();
      this.player.restoreXiafanVisualDepth?.();
      this.player.restoreXiafanVisualFlip?.();
    }

    if (this.duckQueenFishNetActive) {
      clearedAny = true;
      this.endDuckQueenFishNet(true, { silentNotice: true });
    }

    const hadCharm = now < this.duckQueenCharmUntil
      || Boolean(this.duckQueenCharmSpell)
      || Boolean(this.duckQueenCharmMark)
      || Boolean(this.duckQueenCharmControlHint);
    if (hadCharm) {
      clearedAny = true;
      this.duckQueenCharmUntil = -Infinity;
      this.clearDuckQueenCharmSpell();
      this.clearDuckQueenCharmMark();
      this.clearDuckQueenCharmControlHint();
    }

    if (this.playerInFishStink) {
      clearedAny = true;
      this.playerInFishStink = false;
    }

    const stinkRadius = STATUS_EFFECTS.fishStinkZoneRadius ?? 88;
    this.fishStinkZones = this.fishStinkZones.filter((zone) => {
      if (!zone?.active) return false;
      const distance = Phaser.Math.Distance.Between(zone.x, zone.y, this.player.x, this.player.y);
      if (distance <= (zone.radius ?? stinkRadius) + 6) {
        zone.destroy();
        removedFishStinkZones += 1;
        clearedAny = true;
        return false;
      }
      return true;
    });

    ['fish_stink', 'gas', 'dirty', 'duck_queen_charm'].forEach((key) => {
      this.playerStatusNoticeTimes?.delete?.(key);
    });

    return {
      purifiedPoison,
      clearedAny,
      removedFishStinkZones
    };
  }

  updatePlayerPoison(delta) {
    if (this.player.poisonRemainingMs <= 0) return;

    const activeDelta = Math.min(
      delta,
      this.player.poisonRemainingMs
    );

    this.player.poisonRemainingMs -= activeDelta;
    this.player.poisonTickAccumulatorMs += activeDelta;

    const blessed = this.player.poisonKind === 'blessed';
    const tickMs = blessed
      ? STATUS_EFFECTS.blessedToxicPoisonTickMs
      : (STATUS_EFFECTS.toxicPotatoPoisonTickMs ?? 1000);
    const tickDamage = blessed
      ? STATUS_EFFECTS.blessedToxicPoisonDamage
      : (STATUS_EFFECTS.toxicPotatoPoisonDamage ?? 1);

    while (
      this.player.poisonTickAccumulatorMs
      >= tickMs
      && this.player.hp > 0
    ) {
      this.player.poisonTickAccumulatorMs -=
        tickMs;

      const poisonDamage = Math.min(this.player.hp, tickDamage);
      {
        this.player.hp = Math.max(
          0,
          this.player.hp - poisonDamage
        );
      }

      if (poisonDamage > 0) {
        this.showHpDamageText(
          'toxicPotato',
          this.player.x + Phaser.Math.Between(-12, 12),
          this.player.y - 54 + Phaser.Math.Between(-4, 4),
          poisonDamage,
          {
            durationMs: blessed ? 520 : 760,
            rise: blessed ? 24 : 28,
            depth: 150
          }
        );
      }
    }

    if (this.player.poisonRemainingMs <= 0) {
      this.player.poisonRemainingMs = 0;
      this.player.poisonTickAccumulatorMs = 0;
      this.player.poisonKind = null;
    }
  }

  updateSupportHearts(time) {
    if (
      time >= this.nextSupportHeartAt
      && !this.endingSequenceActive
    ) {
      const supportHeartIntervalMultiplier = Math.max(0.35, Number(
        this.difficultyProfile?.supportHeartIntervalMultiplier
      ) || 1);
      this.nextSupportHeartAt =
        time + Math.round(Phaser.Math.Between(
          PLAYER.SUPPORT_HEART_MIN_INTERVAL_MS,
          PLAYER.SUPPORT_HEART_MAX_INTERVAL_MS
        ) * supportHeartIntervalMultiplier);
      this.spawnSupportHeart();
    }

    this.supportHearts.children.iterate((heart) => {
      if (!heart?.active) return;

      const age = time - heart.createdAt;
      const remaining =
        PLAYER.SUPPORT_HEART_LIFETIME_MS - age;

      if (remaining <= 0) {
        heart.destroy();
        return;
      }

      heart.setVelocity(0, 0);
      heart.y =
        (heart.baseY ?? heart.y)
        + Math.sin(
          time * 0.0045 + (heart.floatSeed ?? 0)
        ) * 4;

      const endingPulse =
        remaining < 3000
          ? 0.76 + Math.sin(time * 0.018) * 0.18
          : 1;

      const poisonedBoost =
        this.player.poisonRemainingMs > 0
        && this.player.poisonKind !== 'blessed'
          ? 1.16 + Math.sin(time * 0.012) * 0.05
          : 1;

      heart.setAlpha(endingPulse);
      heart.setScale(
        (heart.baseVfxScale ?? SUPPORT_HEART_VFX.pickupScale)
        * poisonedBoost
      );
    });
  }

  onCollectSupportHeart(player, heart) {
    if (!heart?.active) return;

    if (heart.body) {
      heart.body.enable = false;
    }
    heart.setVelocity(0, 0);
    heart.setDepth(30);

    const heal = player.hp / player.maxHp < 0.30
      ? PLAYER.SUPPORT_HEAL_LOW_HP
      : PLAYER.SUPPORT_HEAL_NORMAL;

    player.heal(heal);
    player.addSupport(PLAYER.SUPPORT_PER_HEART);
    this.clearPlayerPoison(true, 'heart');

    const collectEndScale =
      (heart.baseVfxScale ?? SUPPORT_HEART_VFX.pickupScale)
      * SUPPORT_HEART_VFX.collectEndScaleFactor;

    this.tweens.add({
      targets: heart,
      x: player.x,
      y: player.y,
      scaleX: collectEndScale,
      scaleY: collectEndScale,
      alpha: 0,
      duration: 240,
      ease: 'Quad.In',
      onComplete: () => heart.destroy()
    });

    const glow = this.add.circle(
      player.x,
      player.y,
      18,
      0x9ce8ff,
      0.30
    ).setDepth(18);

    this.tweens.add({
      targets: glow,
      scaleX: 2.6,
      scaleY: 2.6,
      alpha: 0,
      duration: 360,
      ease: 'Quad.Out',
      onComplete: () => glow.destroy()
    });

    this.showWorldText(
      player.x,
      player.y - 48,
      player.hp / player.maxHp < 0.36
        ? '「被接住了🩵」'
        : '「收到投喂🩵」',
      '#9ce8ff',
      18,
      1500
    );

    this.showWorldText(
      player.x,
      player.y - 70,
      `「应援值 +${PLAYER.SUPPORT_PER_HEART}%」`,
      '#b9efff',
      14,
      1100
    );

    if (player.support >= PLAYER.SUPPORT_MAX) {
      this.showScreenNotice('「双向奔赴 READY」', '#9ce8ff');
    }
  }

  spawnMutualSupportConvergeVfx() {
    if (!this.player?.active || this.finished) return;

    const player = this.player;
    const startX = player.x;
    const startY = player.y;
    const heartOffsets = [-34, -17, 0, 17, 34];

    const spawnFollowerHeart = (side, offsetY, index) => {
      const direction = side < 0 ? -1 : 1;
      const sx = startX + direction * (122 + index * 7);
      const sy = startY + offsetY;
      const heart = this.add.image(sx, sy, VFX_KEYS.SUPPORT_HEART)
        .setDepth((Number(player.depth) || 10) + 0.55)
        .setScale(SUPPORT_HEART_VFX.mutualSupportScale * (0.64 + index * 0.035))
        .setAlpha(0.26 + index * 0.055)
        .setTint(index % 2 === 0 ? 0xcdf7ff : 0x8fe9ff)
        .setBlendMode(Phaser.BlendModes.ADD);

      const progress = { t: 0 };
      const duration = 300 + index * 22;
      this.tweens.add({
        targets: progress,
        t: 1,
        delay: index * 18,
        duration,
        ease: 'Cubic.In',
        onUpdate: () => {
          if (!heart?.active || !player?.active) return;
          const t = Phaser.Math.Clamp(progress.t, 0, 1);
          const curve = Math.sin(Math.PI * t) * (10 + Math.abs(offsetY) * 0.12);
          heart.x = Phaser.Math.Linear(sx, player.x, t);
          heart.y = Phaser.Math.Linear(sy, player.y - 2, t) - curve;
          heart.setAlpha(Phaser.Math.Linear(0.34 + index * 0.045, 0.92, t));
          const scale = SUPPORT_HEART_VFX.mutualSupportScale
            * Phaser.Math.Linear(0.66 + index * 0.03, 0.95, t);
          heart.setScale(scale);
        },
        onComplete: () => {
          if (heart?.active) heart.destroy();
        }
      });
    };

    heartOffsets.forEach((offsetY, index) => {
      spawnFollowerHeart(-1, offsetY, index);
      spawnFollowerHeart(1, -offsetY, index);
    });

    [-1, 1].forEach((side) => {
      for (let i = 0; i < 4; i += 1) {
        const laneY = startY + (i - 1.5) * 14;
        const streak = this.add.rectangle(
          startX + side * (106 + i * 12),
          laneY,
          38 + i * 8,
          i % 2 === 0 ? 2 : 3,
          i % 2 === 0 ? 0xbff5ff : 0x7fdfff,
          0.36
        )
          .setDepth((Number(player.depth) || 10) + 0.42)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: streak,
          x: startX + side * 10,
          alpha: 0,
          scaleX: 0.28,
          duration: 250 + i * 26,
          delay: i * 16,
          ease: 'Cubic.In',
          onComplete: () => streak?.active && streak.destroy()
        });
      }
    });

    this.time.delayedCall(330, () => this.spawnMutualSupportBurstVfx());
  }

  spawnMutualSupportBurstVfx() {
    if (!this.player?.active || this.finished) return;
    const px = this.player.x;
    const py = this.player.y;
    const depth = (Number(this.player.depth) || 10) + 0.64;

    const flash = this.add.image(px, py, VFX_KEYS.SUPPORT_HEART)
      .setDepth(depth + 0.14)
      .setScale(SUPPORT_HEART_VFX.mutualSupportScale * 1.22)
      .setTint(0xf3fdff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(1);
    const bloom = this.add.circle(px, py, 12, 0x94d5f3, 0.72)
      .setDepth(depth + 0.08)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: flash,
      scaleX: flash.scaleX * 1.82,
      scaleY: flash.scaleY * 1.82,
      alpha: 0,
      duration: 150,
      ease: 'Quad.Out',
      onComplete: () => flash?.active && flash.destroy()
    });
    this.tweens.add({
      targets: bloom,
      scaleX: 2.1,
      scaleY: 1.65,
      alpha: 0,
      duration: 135,
      ease: 'Quad.Out',
      onComplete: () => bloom?.active && bloom.destroy()
    });

    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10 + Phaser.Math.FloatBetween(-0.10, 0.10);
      const distance = Phaser.Math.Between(34, 58);
      const spark = this.add.rectangle(
        px + Math.cos(angle) * 8,
        py + Math.sin(angle) * 6,
        2,
        Phaser.Math.Between(8, 15),
        i % 3 === 0 ? 0xf4fdff : 0x94d5f3,
        i % 3 === 0 ? 0.78 : 0.58
      )
        .setRotation(angle + Math.PI / 2)
        .setDepth(depth)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: spark,
        x: px + Math.cos(angle) * distance,
        y: py + Math.sin(angle) * distance * 0.66,
        alpha: 0,
        scaleY: 0.36,
        duration: Phaser.Math.Between(180, 260),
        ease: 'Quad.Out',
        onComplete: () => spark?.active && spark.destroy()
      });
    }

    this.sound?.play?.('mutualSupportHitSfx', { volume: 0.42 });
    this.cameras.main.flash(55, 220, 247, 255, false);

    this.time.delayedCall(75, () => this.spawnMutualSupportMoonSalvationVfx());
  }

  spawnMutualSupportMoonSalvationVfx() {
    if (!this.player?.active || this.finished) return;

    const player = this.player;
    const playerDepth = Number(player.depth) || 10;
    const cam = this.cameras.main;
    const playerH = Math.max(1, Math.abs(Number(player.displayHeight) || 60));

    const moonSize = 68;

    const getAnchors = () => {
      const currentH = Math.max(1, Math.abs(Number(player.displayHeight) || playerH));
      const originY = Number.isFinite(player.originY) ? player.originY : 0.5;
      const feet = getPlayerVisualAnchor(player, 'feet');
      const headY = player.y + (5 / 128 - originY) * currentH;
      const cameraTop = cam?.worldView?.y ?? (headY - 192);
      const desiredMoonY = headY - 96;
      const moonY = Math.max(cameraTop + moonSize * 0.42, desiredMoonY);
      const beamTopY = moonY + moonSize * 0.18;
      const beamBottomY = feet.y - 8;
      const beamHeight = Math.max(1, beamBottomY - beamTopY);
      return {
        x: Number.isFinite(player.x) ? player.x : feet.x,
        centerY: player.y,
        moonY,
        beamTopY,
        beamBottomY,
        beamHeight
      };
    };

    const getTextureSize = (image) => {
      const source = image?.texture?.getSourceImage?.();
      const width = Math.max(1, Number(source?.width) || Number(image?.width) || 724);
      const height = Math.max(1, Number(source?.height) || Number(image?.height) || 2172);
      return { width, height };
    };

    const fitBeamHeight = (image, targetHeight) => {
      if (!image?.active) return;
      const { height } = getTextureSize(image);
      const scale = Math.max(0.001, targetHeight / height);
      image.setScale(scale);
    };

    const revealBeamWithCrop = (image, duration, ease = 'Sine.Out') => {
      if (!image?.active) return;
      const { width, height } = getTextureSize(image);
      const state = { progress: 0.05 };
      image.setCrop(0, 0, width, Math.max(1, height * state.progress));
      this.tweens.add({
        targets: state,
        progress: 1,
        duration,
        ease,
        onUpdate: () => {
          if (!image?.active) return;
          image.setCrop(0, 0, width, Math.max(1, height * state.progress));
        },
        onComplete: () => {
          if (!image?.active) return;
          image.setCrop();
          image.setData('revealed', true);
        }
      });
    };

    const firstAnchor = getAnchors();

    const shade = this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0x03111c, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(playerDepth - 0.42);
    this.tweens.add({
      targets: shade,
      alpha: 0.05,
      duration: 140,
      yoyo: true,
      hold: 700,
      ease: 'Sine.InOut',
      onComplete: () => shade?.active && shade.destroy()
    });

    const moon = this.add.image(firstAnchor.x, firstAnchor.moonY, 'mutualSupportSkyMoonArt')
      .setDepth(playerDepth + 0.20)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    moon.setDisplaySize(moonSize, moonSize);
    const moonTargetScaleX = moon.scaleX;
    const moonTargetScaleY = moon.scaleY;
    moon.setScale(moonTargetScaleX * 0.90, moonTargetScaleY * 0.90);
    this.sound?.play?.('mutualSupportMoonAppearSfx', { volume: 0.24 });

    let beamSoft = null;
    let beamCore = null;
    let playerMoonGlow = null;

    const syncPlayerMoonGlow = () => {
      if (!playerMoonGlow?.active || !player?.active) return;
      const key = player.texture?.key;
      if (key && playerMoonGlow.texture?.key !== key && this.textures.exists(key)) {
        playerMoonGlow.setTexture(key);
      }
      const center = getPlayerVisualAnchor(player, 'center');
      playerMoonGlow
        .setPosition(center.x, center.y)
        .setOrigin(player.originX ?? 0.5, player.originY ?? 0.5)
        .setFlipX(Boolean(player.flipX))
        .setFlipY(Boolean(player.flipY))
        .setAngle(Number(player.angle) || 0)
        .setDisplaySize(
          Math.max(1, Math.abs(Number(player.displayWidth) || 60)) * 1.035,
          Math.max(1, Math.abs(Number(player.displayHeight) || 60)) * 1.035
        );
    };

    const followEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!player?.active || this.finished) return;
        const anchor = getAnchors();
        if (moon?.active) moon.setPosition(anchor.x, anchor.moonY);
        if (beamSoft?.active) {
          const softTopY = anchor.beamTopY - 8;
          beamSoft.setPosition(anchor.x, softTopY);
          fitBeamHeight(beamSoft, Math.max(1, anchor.beamBottomY - softTopY));
        }
        if (beamCore?.active) {
          beamCore.setPosition(anchor.x, anchor.beamTopY);
          fitBeamHeight(beamCore, Math.max(1, anchor.beamBottomY - anchor.beamTopY));
        }
        syncPlayerMoonGlow();
      }
    });
    this.time.delayedCall(1160, () => followEvent?.remove?.(false));

    this.tweens.add({
      targets: moon,
      alpha: 0.86,
      scaleX: moonTargetScaleX,
      scaleY: moonTargetScaleY,
      duration: 150,
      ease: 'Sine.Out'
    });

    this.time.delayedCall(78, () => {
      if (!player?.active || this.finished) return;
      const anchor = getAnchors();
      const softTopY = anchor.beamTopY - 8;
      beamSoft = this.add.image(anchor.x, softTopY, 'mutualSupportBeamMainArt')
        .setOrigin(0.5, 0)
        .setDepth(playerDepth - 0.07)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0);
      fitBeamHeight(beamSoft, Math.max(1, anchor.beamBottomY - softTopY));
      this.tweens.add({ targets: beamSoft, alpha: 0.15, duration: 210, ease: 'Sine.Out' });
      revealBeamWithCrop(beamSoft, 230, 'Sine.Out');
    });

    this.time.delayedCall(112, () => {
      if (!player?.active || this.finished) return;
      this.sound?.play?.('mutualSupportMoonlightSfx', { volume: 0.40 });
      const anchor = getAnchors();

      player.enterMutualSupportHealPose?.();

      beamCore = this.add.image(anchor.x, anchor.beamTopY, 'mutualSupportBeamHealArt')
        .setOrigin(0.5, 0)
        .setDepth(playerDepth - 0.035)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0);
      fitBeamHeight(beamCore, Math.max(1, anchor.beamBottomY - anchor.beamTopY));
      this.tweens.add({
        targets: beamCore,
        alpha: 0.34,
        duration: 175,
        ease: 'Cubic.In'
      });
      revealBeamWithCrop(beamCore, 185, 'Cubic.In');

      this.time.delayedCall(170, () => {
        if (!player?.active || this.finished) return;
        const key = player.texture?.key;
        if (key && this.textures.exists(key)) {
          playerMoonGlow = this.add.image(player.x, player.y, key)
            .setDepth((Number(player.depth) || playerDepth) + 0.028)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setTint(0xdff7ff)
            .setAlpha(0);
          syncPlayerMoonGlow();
          this.tweens.add({
            targets: playerMoonGlow,
            alpha: 0.18,
            duration: 110,
            yoyo: true,
            hold: 90,
            ease: 'Sine.InOut',
            onComplete: () => {
              if (playerMoonGlow?.active) playerMoonGlow.destroy();
              playerMoonGlow = null;
            }
          });
        }

        this.spawnMutualSupportMoonImpactVfx(player.x, player.y, Number(player.depth) || playerDepth);
      });

      this.time.delayedCall(535, () => {
        if (!beamCore?.active) return;
        this.tweens.add({
          targets: beamCore,
          alpha: 0,
          duration: 270,
          ease: 'Sine.In',
          onComplete: () => {
            if (beamCore?.active) beamCore.destroy();
            beamCore = null;
          }
        });
      });
      this.time.delayedCall(625, () => {
        if (!beamSoft?.active) return;
        this.tweens.add({
          targets: beamSoft,
          alpha: 0,
          duration: 340,
          ease: 'Sine.In',
          onComplete: () => {
            if (beamSoft?.active) beamSoft.destroy();
            beamSoft = null;
          }
        });
      });
    });

    this.time.delayedCall(790, () => {
      if (!moon?.active) return;
      this.tweens.add({
        targets: moon,
        alpha: 0,
        duration: 300,
        ease: 'Sine.In',
        onComplete: () => moon?.active && moon.destroy()
      });
    });
  }

  spawnMutualSupportMoonImpactVfx(px, py, playerDepth = 10) {
    if (!this.player?.active || this.finished) return;


    for (let i = 0; i < 14; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const offsetX = side * Phaser.Math.Between(24, 48);
      const offsetY = Phaser.Math.Between(-18, 34);
      const size = Phaser.Math.Between(10, 18);
      const crescent = this.add.image(px + offsetX, py + offsetY, 'mutualSupportMoonCrescentArt')
        .setDepth(playerDepth + 0.16)
        .setDisplaySize(size, size)
        .setTint(i % 3 === 0 ? 0xd8f5ff : 0x94d5f3)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(Phaser.Math.FloatBetween(0.34, 0.62))
        .setAngle(Phaser.Math.Between(-35, 35));
      this.tweens.add({
        targets: crescent,
        x: crescent.x + Phaser.Math.Between(-16, 16),
        y: crescent.y - Phaser.Math.Between(72, 138),
        angle: crescent.angle + Phaser.Math.Between(-28, 28),
        alpha: 0,
        scaleX: crescent.scaleX * 0.64,
        scaleY: crescent.scaleY * 0.64,
        duration: Phaser.Math.Between(500, 760),
        delay: Phaser.Math.Between(0, 100),
        ease: 'Sine.Out',
        onComplete: () => crescent?.active && crescent.destroy()
      });
    }

    for (let i = 0; i < 2; i += 1) {
      const ripple = this.add.graphics()
        .setPosition(px, py + 27)
        .setDepth(playerDepth + 0.02)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(i === 0 ? 0.34 : 0.18);
      ripple.lineStyle(i === 0 ? 1.6 : 1.1, 0x94d5f3, 1);
      ripple.beginPath();
      ripple.arc(0, 0, 34 + i * 8, Math.PI * 0.10, Math.PI * 0.42, false);
      ripple.strokePath();
      ripple.beginPath();
      ripple.arc(0, 0, 34 + i * 8, Math.PI * 0.58, Math.PI * 0.90, false);
      ripple.strokePath();
      ripple.setScale(0.72, 0.30);
      this.tweens.add({
        targets: ripple,
        scaleX: 1.52 + i * 0.16,
        scaleY: 0.56 + i * 0.06,
        alpha: 0,
        duration: 420 + i * 90,
        delay: i * 55,
        ease: 'Quad.Out',
        onComplete: () => ripple?.active && ripple.destroy()
      });
    }

    for (let i = 0; i < 12; i += 1) {
      const dot = this.add.circle(
        px + Phaser.Math.Between(-52, 52),
        py + Phaser.Math.Between(-28, 42),
        Phaser.Math.FloatBetween(1.2, 2.6),
        i % 4 === 0 ? 0xffffff : 0x94d5f3,
        Phaser.Math.FloatBetween(0.34, 0.70)
      )
        .setDepth(playerDepth + 0.12)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(45, 92),
        x: dot.x + Phaser.Math.Between(-10, 10),
        alpha: 0,
        duration: Phaser.Math.Between(430, 680),
        ease: 'Sine.Out',
        onComplete: () => dot?.active && dot.destroy()
      });
    }

    this.cameras.main.flash(70, 148, 213, 243, false);
    this.cameras.main.shake(75, 0.0008, false);
  }

  tryMutualSupport() {
    if (
      this.finished
      || this.isChoosingUpgrade
      || this.duckQueenGrappleActive
      || this.player.support < PLAYER.SUPPORT_MAX
    ) return false;

    this.player.support = 0;

    this.vibrateMobile([18, 55, 22, 70, 32]);

    const healTarget = Math.max(1, Math.round(this.player.maxHp * 0.25));
    const hpBefore = this.player.hp;
    this.player.heal(healTarget);
    const actualHeal = Math.max(0, this.player.hp - hpBefore);

    this.supportBuffUntil =
      this.time.now + PLAYER.SUPPORT_ACTIVE_DURATION_MS;

    const cleanseResult = this.clearPlayerNegativeStatusesByMutualSupport();

    this.player.playMutualSupportVisual?.(this.time.now);
    const mutualSupportNotice = this.showSkillScreenNotice('「双向奔赴🩵」', '#9ce8ff');

    this.time.delayedCall(690, () => {
      if (!this.player?.active || this.finished) return;

      this.sound?.play?.('mutualSupportHealSfx', { volume: 0.28 });
      this.time.delayedCall(55, () => {
        if (!this.player?.active || this.finished) return;
        this.sound?.play?.('mutualSupportCleanseSfx', { volume: 0.20 });
      });

      this.showWorldText(
        this.player.x,
        this.player.y - 72,
        `HP+${actualHeal}`,
        '#94d5f3',
        22,
        1300,
        { strokeColor: '#59d97a', strokeThickness: 4 }
      );

      if (mutualSupportNotice?.active) {
        this.attachSkillNoticeSubtext(mutualSupportNotice, '负面状态已清除', '#9ce8ff', 810);
      }

      if (cleanseResult.purifiedPoison) {
        this.showWorldText(
          this.player.x,
          this.player.y - 48,
          '「被接住了🩵」',
          '#9ce8ff',
          18,
          1200
        );
      }
    });

    return true;
  }

  getSupportDamageReduction() {
    return this.time.now < this.supportBuffUntil
      ? PLAYER.SUPPORT_ACTIVE_EXTRA_REDUCTION
      : 0;
  }

  createMobileControls() {
    if (!this.prefersTouchEscape) return;

    this.input.addPointer(3);

    const baseX = 112;
    const baseY = GAME.HEIGHT - 105;
    const baseRadius = 62;

    this.mobileJoystickBase = this.add.circle(
      baseX,
      baseY,
      baseRadius,
      0xffffff,
      0.10
    )
      .setStrokeStyle(2, 0xffffff, 0.26)
      .setScrollFactor(0)
      .setDepth(230);

    this.mobileJoystickThumb = this.add.circle(
      baseX,
      baseY,
      27,
      0xffffff,
      0.22
    )
      .setScrollFactor(0)
      .setDepth(231);

    this.mobileControls.push(
      this.mobileJoystickBase,
      this.mobileJoystickThumb
    );

    this.input.on('pointerdown', (pointer) => {
      if (this.duckQueenGrappleActive) return;

      if (
        this.isPointInsideMobileJoystickInputArea(pointer.x, pointer.y)
        && this.mobileMovePointerId === null
      ) {
        this.mobileMovePointerId = pointer.id;
        this.updateMobileJoystickPointer(pointer);
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (pointer.id === this.mobileMovePointerId) {
        this.updateMobileJoystickPointer(pointer);
      }
    });

    const release = (pointer) => {
      if (pointer.id !== this.mobileMovePointerId) return;
      this.mobileMovePointerId = null;
      this.mobileMoveVector.set(0, 0);
      this.mobileJoystickThumb.setPosition(this.mobileJoystickBase.x, this.mobileJoystickBase.y);
    };

    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);

    this.createMobileActionButton(
      'B', '闪身', 844, 326,
      () => this.player.tryDash(this.time.now),
      { width: 114, height: 60, cut: 14 }
    );
    this.createMobileActionButton(
      'X', '踩拍', 906, 404,
      (pointer) => this.tryBeatAction({ x: pointer.x, y: pointer.y }),
      { width: 104, height: 72, cut: 16, primary: true }
    );
    this.createMobileActionButton(
      'A', '双向奔赴', 838, 482,
      () => this.tryMutualSupport(),
      { width: 138, height: 60, cut: 14 }
    );
    this.createMobileActionButton(
      'Y', '升Key', 760, 404,
      () => this.tryKeyUp(),
      { width: 108, height: 64, cut: 14 }
    );

    this.createMobileGlobalBeatInput();
  }

  isPointInsideMobileJoystickInputArea(x, y) {
    const view = this.responsiveVisibleRect ?? this.getResponsiveVisibleRect();
    return (
      x < view.x + view.width * 0.42
      && y > view.y + view.height * 0.52
    );
  }

  isPointInsideMobileActionControl(x, y) {
    for (const key of ['B', 'X', 'A', 'Y']) {
      const btn = this.mobileButtonState?.[key];
      if (!btn?.hitPolygon) continue;

      if (Phaser.Geom.Polygon.Contains(btn.hitPolygon, x, y)) {
        return true;
      }
    }

    return false;
  }

  createMobileGlobalBeatInput() {
    const onPointerDown = (pointer) => {
      if (
        this.waitingForGameStart
        || this.finished
        || this.endingSequenceActive
        || this.isChoosingUpgrade
        || this.duckQueenGrappleActive
        || this.duckQueenFishNetActive
        || this.player.hp <= 0
      ) return;

      if (this.isPointInsideMobileJoystickInputArea(pointer.x, pointer.y)) return;
      if (this.isPointInsideMobileActionControl(pointer.x, pointer.y)) return;

      pointer.event?.preventDefault?.();

      const view = this.responsiveVisibleRect ?? this.getResponsiveVisibleRect();
      const tapPoint = {
        x: Phaser.Math.Clamp(pointer.x, view.x, view.right),
        y: Phaser.Math.Clamp(pointer.y, view.y, view.bottom)
      };

      this.tryBeatAction(tapPoint);
    };

    this.input.on('pointerdown', onPointerDown);
    this.mobileBeatGlobalState = { onPointerDown };
  }

  updateMobileJoystickPointer(pointer) {
    const baseX = this.mobileJoystickBase.x;
    const baseY = this.mobileJoystickBase.y;
    const maxDistance = 56;

    const vector = new Phaser.Math.Vector2(
      pointer.x - baseX,
      pointer.y - baseY
    );

    if (vector.length() > maxDistance) {
      vector.setLength(maxDistance);
    }

    this.mobileJoystickThumb.setPosition(
      baseX + vector.x,
      baseY + vector.y
    );

    this.mobileMoveVector.set(
      vector.x / maxDistance,
      vector.y / maxDistance
    );
  }

  showMobileBeatMissFeedback(tapPoint = null) {
    if (!this.prefersTouchEscape || !Number.isFinite(tapPoint?.x) || !Number.isFinite(tapPoint?.y)) return;

    const view = this.responsiveVisibleRect ?? this.getResponsiveVisibleRect();
    const x = Phaser.Math.Clamp(tapPoint.x, view.x + 10, view.right - 10);
    const y = Phaser.Math.Clamp(tapPoint.y, view.y + 10, view.bottom - 10);

    const ring = this.add.circle(x, y, 30, 0xff5a5f, 0)
      .setStrokeStyle(4, 0xff6469, 0.94)
      .setScrollFactor(0)
      .setDepth(234)
      .setBlendMode(Phaser.BlendModes.ADD);

    const dot = this.add.circle(x, y, 7, 0xff8a8e, 0.72)
      .setScrollFactor(0)
      .setDepth(234.2)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: [ring, dot],
      alpha: 0,
      duration: 230,
      hold: 35,
      ease: 'Sine.In',
      onComplete: () => {
        if (ring?.active) ring.destroy();
        if (dot?.active) dot.destroy();
      }
    });
  }

  createMobileActionButton(key, label, x, y, callback, options = {}) {
    const width = Math.max(72, options.width ?? 108);
    const height = Math.max(52, options.height ?? 60);
    const cut = Phaser.Math.Clamp(options.cut ?? 14, 8, Math.min(width, height) * 0.28);
    const primary = options.primary === true;

    const localPoints = [
      { x: cut, y: 0 },
      { x: width - cut, y: 0 },
      { x: width, y: cut },
      { x: width, y: height - cut },
      { x: width - cut, y: height },
      { x: cut, y: height },
      { x: 0, y: height - cut },
      { x: 0, y: cut }
    ];

    const worldPoints = localPoints.map((point) => ({
      x: x - width * 0.5 + point.x,
      y: y - height * 0.5 + point.y
    }));

    const shadow = this.add.polygon(
      x + 3,
      y + 4,
      localPoints,
      0x02070f,
      0.42
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(229);

    const shape = this.add.polygon(
      x,
      y,
      localPoints,
      primary ? 0x173f63 : 0x14253d,
      primary ? 0.88 : 0.76
    )
      .setOrigin(0.5)
      .setStrokeStyle(
        primary ? 3 : 2,
        primary ? 0xb8efff : 0x94d5f3,
        primary ? 0.94 : 0.72
      )
      .setScrollFactor(0)
      .setDepth(230)
      .setInteractive(
        new Phaser.Geom.Polygon(localPoints),
        Phaser.Geom.Polygon.Contains
      );

    const keyText = this.add.text(
      x - width * 0.5 + 18,
      y - height * 0.5 + 15,
      key,
      {
        fontSize: primary ? '15px' : '14px',
        fontStyle: 'bold',
        color: primary ? '#eaffff' : '#bfeeff',
        stroke: '#0b1828',
        strokeThickness: 3
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(231);

    const labelText = this.add.text(
      x + (primary ? 4 : 5),
      y + 3,
      `「${label}」`,
      {
        fontSize: primary ? '16px' : (label.length > 4 ? '14px' : '15px'),
        fontStyle: 'bold',
        color: primary ? '#ffffff' : '#e4f6ff',
        stroke: '#0b1828',
        strokeThickness: 3,
        align: 'center'
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(231);

    shape.on('pointerdown', (pointer) => {
      if (
        this.finished
        || this.isChoosingUpgrade
        || this.duckQueenGrappleActive
      ) return;

      pointer.event?.preventDefault?.();
      this.showMobileButtonPressFeedback(key);
      callback(pointer);
    });

    this.mobileButtonState[key] = {
      shape,
      shadow,
      circle: shape,
      keyText,
      labelText,
      hitTarget: shape,
      hitPolygon: new Phaser.Geom.Polygon(worldPoints),
      baseLabel: label,
      width,
      height,
      cut,
      primary
    };

    this.mobileControls.push(shadow, shape, keyText, labelText);
  }

  showMobileButtonPressFeedback(key) {
    const btn = this.mobileButtonState?.[key];
    if (!btn?.shape?.active) return;

    const targets = [btn.shadow, btn.shape, btn.keyText, btn.labelText]
      .filter((obj) => obj?.active);

    this.tweens.killTweensOf(targets);
    targets.forEach((obj) => obj.setScale(1));

    this.tweens.add({
      targets,
      scaleX: btn.primary ? 0.90 : 0.93,
      scaleY: btn.primary ? 0.90 : 0.93,
      duration: 52,
      yoyo: true,
      ease: 'Quad.Out'
    });

    const originalFillAlpha = btn.primary ? 0.88 : 0.76;
    btn.shape.setFillStyle(btn.primary ? 0x2f6f98 : 0x24506f, 0.96);
    this.time.delayedCall(105, () => {
      if (!btn.shape?.active) return;
      btn.shape.setFillStyle(
        btn.primary ? 0x173f63 : 0x14253d,
        originalFillAlpha
      );
    });
  }

  showMobileBeatHitFeedback(strong = false, tapPoint = null) {
    if (!this.prefersTouchEscape) return;

    const x = Number.isFinite(tapPoint?.x)
      ? Phaser.Math.Clamp(tapPoint.x, 8, GAME.WIDTH - 8)
      : GAME.WIDTH * 0.5;
    const y = Number.isFinite(tapPoint?.y)
      ? Phaser.Math.Clamp(tapPoint.y, 8, GAME.HEIGHT - 8)
      : GAME.HEIGHT * 0.5;
    const radius = strong ? 34 : 30;

    const flash = this.add.circle(
      x,
      y,
      radius * 0.76,
      strong ? 0xffffff : 0xdff8ff,
      strong ? 0.96 : 0.86
    )
      .setScrollFactor(0)
      .setDepth(234)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: flash,
      scaleX: strong ? 1.72 : 1.54,
      scaleY: strong ? 1.72 : 1.54,
      alpha: 0,
      duration: strong ? 180 : 155,
      ease: 'Quad.Out',
      onComplete: () => flash?.active && flash.destroy()
    });

    const makeRing = (delay, width, alpha, targetScale) => {
      const ring = this.add.circle(x, y, radius, 0x94d5f3, 0)
        .setStrokeStyle(width, strong ? 0xf3fdff : 0x94d5f3, alpha)
        .setScrollFactor(0)
        .setDepth(233.5)
        .setBlendMode(Phaser.BlendModes.ADD);

      ring.setScale(0.72);
      this.tweens.add({
        targets: ring,
        scaleX: targetScale,
        scaleY: targetScale,
        alpha: 0,
        duration: strong ? 310 : 270,
        delay,
        ease: 'Quad.Out',
        onComplete: () => ring?.active && ring.destroy()
      });
    };

    makeRing(0, strong ? 5 : 4, strong ? 0.96 : 0.82, strong ? 2.05 : 1.88);
    makeRing(strong ? 56 : 48, strong ? 3 : 2, strong ? 0.78 : 0.62, strong ? 2.62 : 2.34);
  }

  vibrateMobile(pattern) {
    if (!this.prefersTouchEscape) return false;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;

    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  updateMobileControls(time) {
    if (!this.prefersTouchEscape) return;

    const locked =
      this.finished
      || this.isChoosingUpgrade
      || this.duckQueenGrappleActive;

    const setButton = (
      key,
      enabled,
      suffix = '',
      overrideLabel = null
    ) => {
      const btn = this.mobileButtonState[key];
      if (!btn) return;

      btn.circle.setAlpha(enabled && !locked ? 0.82 : 0.30);
      btn.labelText.setAlpha(enabled && !locked ? 1 : 0.48);
      btn.keyText.setAlpha(enabled && !locked ? 1 : 0.48);

      const text = overrideLabel ?? `${btn.baseLabel}${suffix}`;
      btn.labelText.setText(`「${text}」`);
    };

    const dashReadyIn = Math.max(
      0,
      this.player.nextDashAt - time
    );
    setButton(
      'B',
      dashReadyIn <= 0,
      dashReadyIn > 0
        ? ` ${(dashReadyIn / 1000).toFixed(1)}`
        : ''
    );

    setButton(
      'Y',
      this.player.injustice >= PLAYER.KEY_UP_MAX,
      '',
      this.player.injustice >= PLAYER.KEY_UP_MAX
        ? '升Key'
        : `愤怒值 ${Math.round(this.player.injustice)}%`
    );

    setButton(
      'A',
      this.player.support >= PLAYER.SUPPORT_MAX,
      '',
      this.player.support >= PLAYER.SUPPORT_MAX
        ? '双向奔赴'
        : `应援值 ${Math.round(this.player.support)}%`
    );

    const controlsAlpha = this.duckQueenGrappleActive ? 0.16 : 1;
    [this.mobileJoystickBase, this.mobileJoystickThumb]
      .forEach((obj) => obj?.setAlpha(controlsAlpha * (obj === this.mobileJoystickBase ? 0.30 : 0.62)));

    if (this.duckQueenGrappleActive) {
      this.mobileMoveVector.set(0, 0);
      this.mobileMovePointerId = null;
      this.mobileJoystickThumb?.setPosition(
        this.mobileJoystickBase.x,
        this.mobileJoystickBase.y
      );
    }
  }

  updatePlayerAoe(time) {
    if (this.player.isControlLocked?.(time)) return;

    const isMoving = this.player.isDashing || this.player.body.velocity.lengthSq() > 25;
    if (!isMoving) return;

    if (this.player.soundWaveUnlocked && time >= this.player.nextSoundWaveAt) {
      this.castSoundWave();
      this.player.nextSoundWaveAt = time + this.player.soundWaveInterval;
    }
  }

  castSoundWave() {
    const center = this.getBeatVfxPosition(BEAT_VFX.strong);
    const x = center.x;
    const y = center.y;
    const level = Phaser.Math.Clamp(Math.trunc(this.player.soundWaveLevel || 1), 1, 4);
    const radiusX = this.player.soundWaveRadius;
    const perspectiveRatio = BEAT_VFX.strong.displayHeight / Math.max(1, BEAT_VFX.strong.displayWidth);
    const radiusY = radiusX * perspectiveRatio;
    const stunMs = PLAYER.SOUND_WAVE_STUN_MS_BY_LEVEL?.[level - 1] ?? 800;

    this.paralyzeEnemiesInSoundWave(x, y, radiusX, radiusY, stunMs);
    this.showSoundWaveVfx(x, y, radiusX, radiusY, level);
    this.showPassiveSkillImportantWorldText(
      this.player,
      '「♫ 声浪」',
      THEME_BLUE_HEX,
      17,
      { priority: 68, yOffset: 58, coalesceLowPriority: true }
    );
  }

  paralyzeEnemiesInSoundWave(x, y, radiusX, radiusY, stunMs) {
    const now = this.time.now;
    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.isDead) return;
      const isBoss = enemy.isBoss === true || ['duckQueen', 'potatoCommander'].includes(enemy.enemyType);
      if (isBoss) return;

      if (enemy.enemyType === 'ball') return;

      const padX = Math.max(8, (Number(enemy.displayWidth) || 0) * 0.20);
      const padY = Math.max(6, (Number(enemy.displayHeight) || 0) * 0.16);
      const nx = (enemy.x - x) / Math.max(1, radiusX + padX);
      const ny = (enemy.y - y) / Math.max(1, radiusY + padY);
      if (nx * nx + ny * ny > 1) return;

      const duration = Math.max(
        120,
        Math.round(stunMs * (enemy.isElite ? PLAYER.SOUND_WAVE_ELITE_STUN_MULTIPLIER : 1))
      );
      enemy.applyStun?.(duration, now);
      enemy.setVelocity?.(0, 0);
    });
  }

  showSoundWaveVfx(x, y, radiusX, radiusY, level = 1) {
    const safeLevel = Phaser.Math.Clamp(Math.trunc(level || 1), 1, 4);
    const waveCount = safeLevel >= 4 ? 5 : safeLevel >= 2 ? 4 : 3;
    const initialCenter = this.getBeatVfxPosition(BEAT_VFX.strong);
    const group = this.add.container(initialCenter.x, initialCenter.y).setDepth(8.5);

    const perspectiveRatio = radiusY / Math.max(1, radiusX);
    for (let i = 0; i < waveCount; i += 1) {
      const baseWidth = 44 + i * 8;
      const baseHeight = baseWidth * perspectiveRatio;
      const wave = this.add.ellipse(
        0,
        0,
        baseWidth,
        baseHeight,
        THEME_BLUE,
        0.018
      )
        .setStrokeStyle(4.6 - i * 0.5, i === 0 ? 0xeafcff : THEME_BLUE, 0.88 - i * 0.075)
        .setBlendMode(Phaser.BlendModes.ADD);
      group.add(wave);

      const finalRadiusX = radiusX * (0.76 + i * 0.08);
      const finalWidth = finalRadiusX * 2;
      const finalScale = finalWidth / Math.max(1, baseWidth);
      wave.setScale(0.72);
      this.tweens.add({
        targets: wave,
        scaleX: finalScale,
        scaleY: finalScale,
        alpha: 0,
        duration: 430 + safeLevel * 48,
        delay: i * 76,
        ease: 'Cubic.Out'
      });
    }

    const coreW = 38;
    const coreH = coreW * perspectiveRatio;
    const core = this.add.ellipse(0, 0, coreW, coreH, THEME_BLUE, 0.20)
      .setStrokeStyle(3, 0xf1fdff, 0.90)
      .setBlendMode(Phaser.BlendModes.ADD);
    group.add(core);
    this.tweens.add({
      targets: core,
      scaleX: 1.75 + safeLevel * 0.08,
      scaleY: 1.75 + safeLevel * 0.08,
      alpha: 0,
      duration: 260,
      ease: 'Quad.Out'
    });

    const goldCounts = [0, 5, 11, 20];
    const goldCount = goldCounts[safeLevel - 1] || 0;
    for (let i = 0; i < goldCount; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const startR = Phaser.Math.FloatBetween(12, 30);
      const endR = Phaser.Math.FloatBetween(radiusX * 0.52, radiusX * 0.96);
      const particle = this.add.circle(
        Math.cos(angle) * startR,
        Math.sin(angle) * startR * perspectiveRatio,
        Phaser.Math.FloatBetween(1.3, safeLevel >= 4 ? 2.8 : 2.2),
        GOLD_PARTICLE,
        Phaser.Math.FloatBetween(0.58, 0.94)
      ).setBlendMode(Phaser.BlendModes.ADD);
      group.add(particle);
      this.tweens.add({
        targets: particle,
        x: Math.cos(angle) * endR,
        y: Math.sin(angle) * endR * perspectiveRatio,
        alpha: 0,
        scaleX: 0.35,
        scaleY: 0.35,
        duration: Phaser.Math.Between(330, 560),
        ease: 'Quad.Out'
      });
    }

    const follow = { t: 0 };
    const followDuration = 980 + safeLevel * 40;
    this.tweens.add({
      targets: follow,
      t: 1,
      duration: followDuration,
      onUpdate: () => {
        if (group?.active && this.player?.active) {
          const center = this.getBeatVfxPosition(BEAT_VFX.strong);
          group.setPosition(center.x, center.y);
        }
      },
      onComplete: () => group?.active && group.destroy(true)
    });
  }

  damageEnemiesInRadius(x, y, radius, damage, knockback = 0) {
    const victims = [];

    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.isDead) return;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance <= radius + Math.max(enemy.displayWidth, enemy.displayHeight) * 0.25) {
        victims.push(enemy);
      }
    });

    victims.forEach((enemy) => {
      if (!enemy.active || enemy.isDead) return;

      const killed = enemy.receiveDamage(damage);

      if (!killed && knockback > 0 && enemy.enemyType !== 'ball') {
        const direction = new Phaser.Math.Vector2(enemy.x - x, enemy.y - y);
        if (direction.lengthSq() < 1) direction.set(1, 0);
        direction
          .normalize()
          .scale(
            knockback
            * (enemy.knockbackScale ?? 1)
          );
        enemy.setVelocity(direction.x, direction.y);
      }

      if (killed) this.killEnemy(enemy);
    });
  }

  showAoeRing(x, y, radius, color, alpha = 0.45, duration = 260) {
    const ring = this.add.circle(x, y, 14, color, 0.06)
      .setStrokeStyle(5, color, alpha)
      .setDepth(7);

    const finalScale = radius / 14;
    this.tweens.add({
      targets: ring,
      scaleX: finalScale,
      scaleY: finalScale,
      alpha: 0,
      duration,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy()
    });
  }

  updateElectricRadiance(time) {
    if (this.player.isControlLocked?.(time)) return;
    if (!this.player.electricUnlocked || time < this.player.nextElectricAt) return;
    this.castElectricRadiance();
    this.player.nextElectricAt = time + this.player.electricInterval;
  }

  createElectricCastContext(level) {
    const center = getPlayerVisualAnchor(this.player, 'center');
    const cast = {
      level,
      lastCenter: { x: center.x, y: center.y },
      followers: [],
      expiresAt: this.time.now + 900
    };
    this.activeElectricCasts.add(cast);
    return cast;
  }

  getElectricCastCenter(cast) {
    if (this.player?.active) {
      const center = getPlayerVisualAnchor(this.player, 'center');
      cast.lastCenter.x = center.x;
      cast.lastCenter.y = center.y;
    }
    return cast.lastCenter;
  }

  trackElectricVfxToCast(cast, object, offsetX = 0, offsetY = 0) {
    if (!cast || !object?.active) return object;
    const center = this.getElectricCastCenter(cast);
    object.setPosition(center.x + offsetX, center.y + offsetY);
    cast.followers.push({ object, offsetX, offsetY });
    return object;
  }

  updateElectricCastAnchors() {
    if (!this.activeElectricCasts?.size) return;
    const now = this.time.now;

    for (const cast of [...this.activeElectricCasts]) {
      const center = this.getElectricCastCenter(cast);
      cast.followers = cast.followers.filter((follower) => {
        if (!follower.object?.active) return false;
        follower.object.setPosition(
          center.x + follower.offsetX,
          center.y + follower.offsetY
        );
        return true;
      });

      if (now >= cast.expiresAt && cast.followers.length === 0) {
        this.activeElectricCasts.delete(cast);
      }
    }
  }

  castElectricRadiance() {
    const electricVfxLevel = Math.max(1, Math.min(3, this.player.electricLevel || 1));
    const electricCast = this.createElectricCastContext(electricVfxLevel);
    const { x, y } = this.getElectricCastCenter(electricCast);

    const victims = [];
    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.isDead) return;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance <= this.player.electricBurstRadius + Math.max(enemy.displayWidth, enemy.displayHeight) * 0.25) {
        victims.push(enemy);
      }
    });

    victims.forEach((enemy) => {
      if (!enemy.active || enemy.isDead) return;
      const killed = enemy.receiveDamage(this.player.electricBurstDamage);
      if (killed) {
        this.killEnemy(enemy);
      } else {
        enemy.applyStun?.(this.player.electricStunMs, this.time.now);
      }
    });

    this.showElectricBurst(electricCast);
    this.showPassiveSkillImportantWorldText(
      this.player,
      '「⚡ 电力四射！」',
      '#fff27a',
      21,
      { priority: 80, yOffset: 64, replaceLowerPriority: true }
    );

    this.time.delayedCall(this.player.electricShockDelay, () => {
      if (this.finished || !this.player?.active) return;
      this.castElectricShockwave(electricCast);
    });
  }

  getElectricArcAngles(count, { jitterRatio = 0.24 } = {}) {
    const safeCount = Math.max(1, Math.round(count || 1));
    const rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const sector = (Math.PI * 2) / safeCount;

    return Array.from({ length: safeCount }, (_, index) => (
      rotation
      + sector * index
      + Phaser.Math.FloatBetween(-sector * jitterRatio, sector * jitterRatio)
    ));
  }

  scheduleElectricCastVfx(cast, delayMs, callback) {
    if (!cast || typeof callback !== 'function') return;
    cast.expiresAt = Math.max(cast.expiresAt, this.time.now + delayMs + 520);
    this.time.delayedCall(delayMs, () => {
      if (this.finished || !this.player?.active || !this.activeElectricCasts?.has(cast)) return;
      callback();
    });
  }

  chooseElectricPattern(level) {
    if (level <= 1) return 'radial';

    const roll = Math.random();
    if (level === 2) {
      if (roll < 0.40) return 'radial';
      if (roll < 0.72) return 'sweep';
      return 'chain';
    }

    if (roll < 0.30) return 'radial';
    if (roll < 0.65) return 'sweep';
    return 'chain';
  }

  spawnElectricBoltVfx(
    cast,
    angle,
    length,
    cfg,
    {
      aftershock = false,
      alphaScale = 1,
      startOffsetX = 0,
      startOffsetY = 0,
      heightScale = 1,
      key = null,
      durationOverride = null
    } = {}
  ) {
    const center = this.getElectricCastCenter(cast);
    const height = cfg.boltHeight
      * (aftershock ? 1.08 : 1)
      * heightScale
      * Phaser.Math.FloatBetween(0.88, 1.08);
    const bolt = this.vfx?.spawnImage(key || cfg.boltKey, center.x + startOffsetX, center.y + startOffsetY, {
      originX: 0.02,
      originY: 0.5,
      depth: 19,
      angle: Phaser.Math.RadToDeg(angle),
      alpha: (aftershock ? 0.92 : 0.88) * alphaScale,
      displayWidth: length,
      displayHeight: height,
      flipY: Math.random() < 0.5
    });

    if (bolt) {
      this.trackElectricVfxToCast(cast, bolt, startOffsetX, startOffsetY);
      const startScaleX = bolt.scaleX;
      const startScaleY = bolt.scaleY;
      const startAngle = bolt.angle;
      this.vfx.tweenAndDestroy(bolt, {
        alpha: 0,
        angle: startAngle + Phaser.Math.FloatBetween(-4.5, 4.5),
        scaleX: startScaleX * Phaser.Math.FloatBetween(1.02, 1.07),
        scaleY: startScaleY * Phaser.Math.FloatBetween(0.88, 0.98),
        duration: durationOverride ?? (aftershock ? cfg.shockDurationMs : cfg.burstDurationMs),
        ease: 'Quad.Out'
      });
    }

    return {
      startOffsetX,
      startOffsetY,
      offsetX: startOffsetX + Math.cos(angle) * length,
      offsetY: startOffsetY + Math.sin(angle) * length,
      angle,
      length
    };
  }

  spawnElectricBranchVfx(cast, parent, cfg, { aftershock = false } = {}) {
    if (!parent?.length) return null;

    const side = Math.random() < 0.5 ? -1 : 1;
    const startDistance = parent.length * Phaser.Math.FloatBetween(0.38, 0.72);
    const startOffsetX = parent.startOffsetX + Math.cos(parent.angle) * startDistance;
    const startOffsetY = parent.startOffsetY + Math.sin(parent.angle) * startDistance;
    const branchAngle = parent.angle
      + side * Phaser.Math.FloatBetween(0.34, 0.72)
      + Phaser.Math.FloatBetween(-0.10, 0.10);
    const branchLength = parent.length * Phaser.Math.FloatBetween(0.22, aftershock ? 0.43 : 0.38);

    const endpoint = this.spawnElectricBoltVfx(cast, branchAngle, branchLength, cfg, {
      aftershock,
      alphaScale: Phaser.Math.FloatBetween(0.55, aftershock ? 0.76 : 0.68),
      startOffsetX,
      startOffsetY,
      heightScale: Phaser.Math.FloatBetween(0.36, 0.52),
      key: VFX_KEYS.LIGHTNING_01,
      durationOverride: Phaser.Math.Between(aftershock ? 175 : 145, aftershock ? 245 : 210)
    });

    if (Math.random() < cfg.nodeSparkChance) {
      this.spawnElectricNodeSparkVfx(cast, startOffsetX, startOffsetY, cfg, {
        strong: cast.level >= 2
      });
    }

    return endpoint;
  }

  spawnElectricCenterArcsVfx(cast, cfg, { countOverride = null } = {}) {
    const count = countOverride ?? Math.max(1, cfg.centerArcCount - 1);
    const center = this.getElectricCastCenter(cast);

    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const startRadius = Phaser.Math.FloatBetween(8, 20);
      const offsetX = Math.cos(angle) * startRadius;
      const offsetY = Math.sin(angle) * startRadius;
      const arcAngle = angle + Phaser.Math.FloatBetween(-0.8, 0.8);
      const length = Phaser.Math.Between(32, 58);
      const arc = this.vfx?.spawnImage(VFX_KEYS.LIGHTNING_01, center.x + offsetX, center.y + offsetY, {
        originX: 0.04,
        originY: 0.5,
        depth: 20,
        angle: Phaser.Math.RadToDeg(arcAngle),
        alpha: Phaser.Math.FloatBetween(0.34, 0.58),
        displayWidth: length,
        displayHeight: Phaser.Math.FloatBetween(12, 20),
        flipY: Math.random() < 0.5
      });
      if (!arc) continue;

      this.trackElectricVfxToCast(cast, arc, offsetX, offsetY);
      const sx = arc.scaleX;
      const sy = arc.scaleY;
      const startAngle = arc.angle;
      this.vfx.tweenAndDestroy(arc, {
        alpha: 0,
        angle: startAngle + Phaser.Math.FloatBetween(-7, 7),
        scaleX: sx * Phaser.Math.FloatBetween(0.98, 1.10),
        scaleY: sy * Phaser.Math.FloatBetween(0.76, 0.94),
        duration: Phaser.Math.Between(105, 155),
        ease: 'Quad.Out'
      });
    }
  }

  spawnElectricNodeSparkVfx(cast, offsetX, offsetY, cfg, { strong = false } = {}) {
    const center = this.getElectricCastCenter(cast);
    const key = strong ? VFX_KEYS.SPARK_02 : VFX_KEYS.SPARK_01;
    const size = strong ? Phaser.Math.Between(17, 24) : Phaser.Math.Between(12, 18);
    const spark = this.vfx?.spawnSpark(key, center.x + offsetX, center.y + offsetY, {
      depth: 21,
      alpha: Phaser.Math.FloatBetween(0.58, 0.88),
      angle: Phaser.Math.Between(0, 359),
      displayWidth: size,
      displayHeight: size
    });
    if (!spark) return;

    this.trackElectricVfxToCast(cast, spark, offsetX, offsetY);
    const sx = spark.scaleX;
    const sy = spark.scaleY;
    this.vfx.tweenAndDestroy(spark, {
      alpha: 0,
      scaleX: sx * Phaser.Math.FloatBetween(1.12, 1.32),
      scaleY: sy * Phaser.Math.FloatBetween(1.12, 1.32),
      duration: Phaser.Math.Between(115, 180),
      ease: 'Cubic.Out'
    });
  }

  spawnElectricGroundContactVfx(cast, point, scale = 1) {
    const center = this.getElectricCastCenter(cast);
    const hit = this.vfx?.spawnImage(
      VFX_KEYS.LIGHTNING_GROUND_HIT,
      center.x + point.offsetX,
      center.y + point.offsetY,
      {
        depth: 17,
        alpha: Phaser.Math.FloatBetween(0.54, 0.72),
        angle: Phaser.Math.RadToDeg(point.angle) + Phaser.Math.FloatBetween(-10, 10),
        displayWidth: 62 * scale,
        displayHeight: 31 * scale
      }
    );
    if (!hit) return;

    this.trackElectricVfxToCast(cast, hit, point.offsetX, point.offsetY);
    const sx = hit.scaleX;
    const sy = hit.scaleY;
    this.vfx.tweenAndDestroy(hit, {
      alpha: 0,
      scaleX: sx * 1.12,
      scaleY: sy * 1.05,
      duration: 190,
      ease: 'Quad.Out'
    });
  }

  spawnElectricSparksVfx(cast, cfg, radius, { aftershock = false, countScale = 1 } = {}) {
    const center = this.getElectricCastCenter(cast);
    const count = Math.max(1, Math.round((cfg.sparkCount + (aftershock ? 1 : 0)) * countScale));
    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(radius * 0.12, radius * (aftershock ? 0.64 : 0.46));
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance;
      const key = i === 0 || cast.level === 1 ? VFX_KEYS.SPARK_01 : cfg.sparkKey;
      const spark = this.vfx?.spawnSpark(
        key,
        center.x + offsetX,
        center.y + offsetY,
        {
          depth: 20,
          alpha: Phaser.Math.FloatBetween(0.50, 0.82),
          angle: Phaser.Math.Between(0, 359),
          displayWidth: Phaser.Math.Between(12, aftershock ? 24 : 20),
          displayHeight: Phaser.Math.Between(12, aftershock ? 24 : 20)
        }
      );
      if (!spark) continue;
      this.trackElectricVfxToCast(cast, spark, offsetX, offsetY);
      const sx = spark.scaleX;
      const sy = spark.scaleY;
      this.vfx.tweenAndDestroy(spark, {
        alpha: 0,
        scaleX: sx * Phaser.Math.FloatBetween(1.10, 1.28),
        scaleY: sy * Phaser.Math.FloatBetween(1.10, 1.28),
        duration: Phaser.Math.Between(135, 205),
        ease: 'Quad.Out'
      });
    }
  }

  spawnElectricMaxThemeParticles(cast, radius, { aftershock = false } = {}) {
    if (!cast || cast.level < 4) return;
    const center = this.getElectricCastCenter(cast);
    const count = aftershock ? 34 : 28;
    for (let i = 0; i < count; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const startR = Phaser.Math.FloatBetween(10, radius * (aftershock ? 0.28 : 0.20));
      const endR = Phaser.Math.FloatBetween(radius * 0.42, radius * (aftershock ? 0.98 : 0.78));
      const size = Phaser.Math.FloatBetween(1.4, i % 5 === 0 ? 3.2 : 2.5);
      const particle = this.add.circle(
        center.x + Math.cos(angle) * startR,
        center.y + Math.sin(angle) * startR,
        size,
        i % 6 === 0 ? 0xe8fbff : THEME_BLUE,
        Phaser.Math.FloatBetween(0.58, 0.96)
      ).setDepth(20.5).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: particle,
        x: center.x + Math.cos(angle) * endR,
        y: center.y + Math.sin(angle) * endR,
        alpha: 0,
        scaleX: 0.25,
        scaleY: 0.25,
        duration: Phaser.Math.Between(aftershock ? 210 : 170, aftershock ? 420 : 330),
        delay: Phaser.Math.Between(0, aftershock ? 90 : 55),
        ease: 'Quad.Out',
        onComplete: () => particle?.active && particle.destroy()
      });
    }
  }

  spawnElectricRadialPattern(cast, radius, cfg) {
    const level = cast.level;
    const count = level === 1 ? 4 : Phaser.Math.Between(level === 2 ? 4 : 5, level === 2 ? 5 : 5);
    const angles = this.getElectricArcAngles(count, { jitterRatio: 0.20 });
    const endpoints = [];

    angles.forEach((angle, index) => {
      const delay = index % 2 === 0 ? 0 : 28;
      const length = Phaser.Math.Between(
        Math.round(radius * 0.62),
        Math.round(radius * (level >= 3 ? 0.98 : 0.90))
      );
      const endpoint = {
        startOffsetX: 0,
        startOffsetY: 0,
        offsetX: Math.cos(angle) * length,
        offsetY: Math.sin(angle) * length,
        angle,
        length
      };
      endpoints.push(endpoint);

      this.scheduleElectricCastVfx(cast, delay, () => {
        const parent = this.spawnElectricBoltVfx(cast, angle, length, cfg, {
          alphaScale: Phaser.Math.FloatBetween(0.88, 1.0)
        });
        if (level >= 2 && Math.random() < cfg.branchChance * 0.72) {
          this.spawnElectricBranchVfx(cast, parent, cfg);
        }
      });
    });

    this.spawnElectricCenterArcsVfx(cast, cfg, { countOverride: level >= 3 ? 2 : 1 });
    return endpoints;
  }

  spawnElectricSweepPattern(cast, radius, cfg) {
    const level = cast.level;
    const count = level >= 3 ? 7 : 6;
    const direction = Math.random() < 0.5 ? -1 : 1;
    const startAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const sweepSpan = level >= 3 ? Math.PI * 1.82 : Math.PI * 1.42;
    const endpoints = [];

    for (let i = 0; i < count; i += 1) {
      const t = count <= 1 ? 0 : i / (count - 1);
      const orbitAngle = startAngle + direction * sweepSpan * t;
      const orbitRadius = Phaser.Math.Between(level >= 3 ? 23 : 20, level >= 3 ? 34 : 30);
      const startOffsetX = Math.cos(orbitAngle) * orbitRadius;
      const startOffsetY = Math.sin(orbitAngle) * orbitRadius;
      const tangentAngle = orbitAngle + direction * Math.PI / 2 + Phaser.Math.FloatBetween(-0.16, 0.16);
      const delay = i * (level >= 3 ? 27 : 32);
      const orbitArcLength = Phaser.Math.Between(level >= 3 ? 64 : 54, level >= 3 ? 92 : 80);

      this.scheduleElectricCastVfx(cast, delay, () => {
        this.spawnElectricBoltVfx(cast, tangentAngle, orbitArcLength, cfg, {
          startOffsetX,
          startOffsetY,
          heightScale: 0.52,
          alphaScale: Phaser.Math.FloatBetween(0.56, 0.76),
          key: VFX_KEYS.LIGHTNING_01,
          durationOverride: Phaser.Math.Between(105, 145)
        });
        this.spawnElectricNodeSparkVfx(cast, startOffsetX, startOffsetY, cfg, {
          strong: level >= 3 && i % 2 === 0
        });
      });

      const shouldLashOut = i === 1 || i === count - 2 || (level >= 3 && i === Math.floor(count / 2));
      if (shouldLashOut) {
        const lashAngle = orbitAngle + Phaser.Math.FloatBetween(-0.18, 0.18);
        const lashLength = Phaser.Math.Between(
          Math.round(radius * 0.58),
          Math.round(radius * (level >= 3 ? 0.92 : 0.82))
        );
        const endpoint = {
          startOffsetX,
          startOffsetY,
          offsetX: startOffsetX + Math.cos(lashAngle) * lashLength,
          offsetY: startOffsetY + Math.sin(lashAngle) * lashLength,
          angle: lashAngle,
          length: lashLength
        };
        endpoints.push(endpoint);

        this.scheduleElectricCastVfx(cast, delay + 18, () => {
          this.spawnElectricBoltVfx(cast, lashAngle, lashLength, cfg, {
            startOffsetX,
            startOffsetY,
            heightScale: 0.82,
            alphaScale: Phaser.Math.FloatBetween(0.76, 0.92),
            durationOverride: Phaser.Math.Between(145, 185)
          });
        });
      }
    }

    return endpoints;
  }

  spawnElectricChainPattern(cast, radius, cfg) {
    const level = cast.level;
    const segmentCount = level >= 3 ? 4 : 3;
    const endpoints = [];
    let startOffsetX = 0;
    let startOffsetY = 0;
    let angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

    for (let i = 0; i < segmentCount; i += 1) {
      const remaining = Math.max(1, segmentCount - i);
      const segmentLength = i === 0
        ? radius * Phaser.Math.FloatBetween(0.30, 0.38)
        : radius * Phaser.Math.FloatBetween(0.22, 0.32);
      const segmentStartX = startOffsetX;
      const segmentStartY = startOffsetY;
      const segmentAngle = angle;
      const endpoint = {
        startOffsetX: segmentStartX,
        startOffsetY: segmentStartY,
        offsetX: segmentStartX + Math.cos(segmentAngle) * segmentLength,
        offsetY: segmentStartY + Math.sin(segmentAngle) * segmentLength,
        angle: segmentAngle,
        length: segmentLength
      };
      endpoints.push(endpoint);

      this.scheduleElectricCastVfx(cast, i * 42, () => {
        const spawned = this.spawnElectricBoltVfx(cast, segmentAngle, segmentLength, cfg, {
          startOffsetX: segmentStartX,
          startOffsetY: segmentStartY,
          heightScale: i === 0 ? 0.94 : 0.70,
          alphaScale: i === 0 ? 0.98 : 0.84,
          key: i === 0 ? cfg.boltKey : VFX_KEYS.LIGHTNING_01,
          durationOverride: Phaser.Math.Between(175, 225)
        });
        this.spawnElectricNodeSparkVfx(cast, spawned.offsetX, spawned.offsetY, cfg, {
          strong: i > 0 || level >= 3
        });
        if (level >= 3 && i === 1 && Math.random() < 0.68) {
          this.spawnElectricBranchVfx(cast, spawned, cfg);
        }
      });

      startOffsetX = endpoint.offsetX;
      startOffsetY = endpoint.offsetY;
      const side = i % 2 === 0 ? 1 : -1;
      angle += side * Phaser.Math.FloatBetween(0.46, 0.86) + Phaser.Math.FloatBetween(-0.16, 0.16);
    }

    return endpoints;
  }

  spawnElectricPattern(cast, radius, cfg, pattern) {
    if (pattern === 'sweep') return this.spawnElectricSweepPattern(cast, radius, cfg);
    if (pattern === 'chain') return this.spawnElectricChainPattern(cast, radius, cfg);
    return this.spawnElectricRadialPattern(cast, radius, cfg);
  }

  spawnElectricAftershockRing(cast, radius, cfg) {
    const level = cast.level;
    const count = level === 1 ? 4 : level === 2 ? 5 : 6;
    const rotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const endpoints = [];

    for (let i = 0; i < count; i += 1) {
      const angle = rotation + (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.10, 0.10);
      const orbitRadius = radius * Phaser.Math.FloatBetween(0.24, 0.38);
      const startOffsetX = Math.cos(angle) * orbitRadius;
      const startOffsetY = Math.sin(angle) * orbitRadius;
      const outwardAngle = angle + Phaser.Math.FloatBetween(-0.22, 0.22);
      const length = Phaser.Math.Between(
        Math.round(radius * 0.18),
        Math.round(radius * (level >= 3 ? 0.31 : 0.26))
      );
      const delay = i * 18;
      const endpoint = {
        startOffsetX,
        startOffsetY,
        offsetX: startOffsetX + Math.cos(outwardAngle) * length,
        offsetY: startOffsetY + Math.sin(outwardAngle) * length,
        angle: outwardAngle,
        length
      };
      endpoints.push(endpoint);

      this.scheduleElectricCastVfx(cast, delay, () => {
        this.spawnElectricBoltVfx(cast, outwardAngle, length, cfg, {
          aftershock: true,
          startOffsetX,
          startOffsetY,
          heightScale: 0.48,
          alphaScale: Phaser.Math.FloatBetween(0.50, 0.72),
          key: VFX_KEYS.LIGHTNING_01,
          durationOverride: Phaser.Math.Between(135, 195)
        });
      });
    }

    const groundTargets = Phaser.Utils.Array.Shuffle([...endpoints]);
    const groundCount = Math.min(level >= 3 ? 2 : 1, groundTargets.length);
    groundTargets.slice(0, groundCount).forEach((point, index) => {
      this.scheduleElectricCastVfx(cast, 35 + index * 28, () => {
        const len = Math.hypot(point.offsetX, point.offsetY) || 1;
        const factor = (radius * Phaser.Math.FloatBetween(0.56, 0.72)) / len;
        this.spawnElectricGroundContactVfx(cast, {
          ...point,
          offsetX: point.offsetX * factor,
          offsetY: point.offsetY * factor
        }, 0.86 + level * 0.05);
      });
    });

    return endpoints;
  }

  showElectricBurst(cast) {
    const level = cast.level;
    const cfg = getLightningVfxLevel(level);
    const pattern = this.chooseElectricPattern(level);
    cast.pattern = pattern;
    const endpoints = this.spawnElectricPattern(
      cast,
      this.player.electricBurstRadius,
      cfg,
      pattern
    );
    cast.primaryEndpoints = endpoints;

    const shuffled = Phaser.Utils.Array.Shuffle([...endpoints]);
    const groundCount = Math.min(level >= 3 ? 2 : 1, shuffled.length);
    shuffled.slice(0, groundCount).forEach((point, index) => {
      this.scheduleElectricCastVfx(cast, 60 + index * 30, () => {
        this.spawnElectricGroundContactVfx(cast, point, 0.86 + level * 0.05);
      });
    });

    const center = this.getElectricCastCenter(cast);

    if (cfg.centerKey) {
      const centerBurst = this.vfx?.spawnImage(cfg.centerKey, center.x, center.y, {
        depth: 9,
        alpha: 0.74,
        angle: Phaser.Math.Between(-12, 12),
        displayWidth: 138,
        displayHeight: 138
      });
      if (centerBurst) {
        this.trackElectricVfxToCast(cast, centerBurst, 0, 0);
        const sx = centerBurst.scaleX;
        const sy = centerBurst.scaleY;
        this.vfx.tweenAndDestroy(centerBurst, {
          alpha: 0,
          angle: centerBurst.angle + Phaser.Math.FloatBetween(-5, 5),
          scaleX: sx * 1.12,
          scaleY: sy * 1.12,
          duration: 235,
          ease: 'Cubic.Out'
        });
      }
    }

    const coreKey = level >= 2 ? VFX_KEYS.SPARK_02 : VFX_KEYS.SPARK_01;
    const core = this.vfx?.spawnImage(coreKey, center.x, center.y, {
      depth: 20,
      alpha: 0.90,
      angle: Phaser.Math.Between(0, 359),
      displayWidth: level >= 3 ? 36 : 28,
      displayHeight: level >= 3 ? 36 : 28
    });
    if (core) {
      this.trackElectricVfxToCast(cast, core, 0, 0);
      const sx = core.scaleX;
      const sy = core.scaleY;
      this.vfx.tweenAndDestroy(core, {
        alpha: 0,
        scaleX: sx * 1.50,
        scaleY: sy * 1.50,
        duration: 155,
        ease: 'Cubic.Out'
      });
    }

    this.spawnElectricSparksVfx(cast, cfg, this.player.electricBurstRadius, {
      countScale: pattern === 'chain' ? 0.72 : pattern === 'sweep' ? 0.82 : 0.90
    });
    this.spawnElectricMaxThemeParticles(cast, this.player.electricBurstRadius, { aftershock: false });
    this.cameras.main.shake(75, 0.0035);
  }

  castElectricShockwave(cast) {
    const { x, y } = this.getElectricCastCenter(cast);
    const level = cast.level;
    const radius = this.player.electricShockRadius;
    const victims = [];

    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.isDead) return;
      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance <= radius + Math.max(enemy.displayWidth, enemy.displayHeight) * 0.25) {
        victims.push(enemy);
      }
    });

    victims.forEach((enemy) => {
      if (!enemy.active || enemy.isDead) return;
      const killed = enemy.receiveDamage(this.player.electricShockDamage);
      if (killed) {
        this.killEnemy(enemy);
        return;
      }

      const direction = new Phaser.Math.Vector2(enemy.x - x, enemy.y - y);
      if (direction.lengthSq() < 1) direction.set(1, 0);
      direction.normalize();

      if (enemy.enemyType === 'ball') {
        const ballSpeed = Math.max(enemy.body.velocity.length(), enemy.moveSpeed);
        const tangent = new Phaser.Math.Vector2(-direction.y, direction.x)
          .scale(Phaser.Math.FloatBetween(-0.55, 0.55));
        direction.add(tangent).normalize().scale(ballSpeed);
        enemy.setVelocity(direction.x, direction.y);
      } else {
        direction.scale(
          this.player.electricShockKnockback
          * (enemy.knockbackScale ?? 1)
        );
        enemy.setVelocity(direction.x, direction.y);
      }
    });

    this.clearEnemyProjectilesInRadius(x, y, radius);
    this.showElectricAftershock(cast, radius);
    this.cameras.main.shake(150, 0.0065);
  }

  showElectricAftershock(cast, radius) {
    const level = cast.level;
    const cfg = getLightningVfxLevel(level);

    this.spawnElectricAftershockRing(cast, radius, cfg);

    const center = this.getElectricCastCenter(cast);
    const coreKey = level >= 2 ? VFX_KEYS.SPARK_02 : VFX_KEYS.SPARK_01;
    const core = this.vfx?.spawnImage(coreKey, center.x, center.y, {
      depth: 20,
      alpha: 0.88,
      angle: Phaser.Math.Between(0, 359),
      displayWidth: level >= 3 ? 42 : level >= 2 ? 34 : 28,
      displayHeight: level >= 3 ? 42 : level >= 2 ? 34 : 28
    });
    if (core) {
      this.trackElectricVfxToCast(cast, core, 0, 0);
      const sx = core.scaleX;
      const sy = core.scaleY;
      this.vfx.tweenAndDestroy(core, {
        alpha: 0,
        scaleX: sx * 1.62,
        scaleY: sy * 1.62,
        duration: 175,
        ease: 'Cubic.Out'
      });
    }

    if (cfg.centerKey) {
      const centerBurst = this.vfx?.spawnImage(cfg.centerKey, center.x, center.y, {
        depth: 9,
        alpha: 0.62,
        angle: Phaser.Math.Between(-18, 18),
        displayWidth: 158,
        displayHeight: 158
      });
      if (centerBurst) {
        this.trackElectricVfxToCast(cast, centerBurst, 0, 0);
        const sx = centerBurst.scaleX;
        const sy = centerBurst.scaleY;
        this.vfx.tweenAndDestroy(centerBurst, {
          alpha: 0,
          angle: centerBurst.angle + Phaser.Math.FloatBetween(-7, 7),
          scaleX: sx * 1.18,
          scaleY: sy * 1.18,
          duration: 235,
          ease: 'Quad.Out'
        });
      }
    }

    this.spawnElectricSparksVfx(cast, cfg, radius, {
      aftershock: true,
      countScale: level >= 3 ? 0.82 : 0.68
    });
    this.spawnElectricMaxThemeParticles(cast, radius, { aftershock: true });

    const flash = this.add.rectangle(
      this.cameras.main.midPoint.x,
      this.cameras.main.midPoint.y,
      GAME.WIDTH,
      GAME.HEIGHT,
      0xeaf8ff,
      0.10
    )
      .setScrollFactor(0)
      .setDepth(18);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 120,
      onComplete: () => flash.destroy()
    });
  }

  createGameStartGate() {
    const shade = this.add.rectangle(
      GAME.WIDTH / 2,
      GAME.HEIGHT / 2,
      GAME.WIDTH,
      GAME.HEIGHT,
      0x07111e,
      0.72
    )
      .setScrollFactor(0)
      .setDepth(260);

    const title = this.add.text(
      GAME.WIDTH / 2,
      GAME.HEIGHT / 2 - 38,
      '兴风作浪',
      {
        fontSize: this.prefersTouchEscape ? '30px' : '36px',
        fontStyle: 'bold',
        color: '#f3fbff',
        stroke: '#17324c',
        strokeThickness: 5
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(261);

    const buildLabel = this.add.text(
      GAME.WIDTH / 2,
      GAME.HEIGHT / 2 + 2,
      RELEASE.BUILD_LABEL,
      {
        fontSize: '15px',
        color: '#94d5f3',
        fontStyle: 'bold'
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(261);

    const prompt = this.add.text(
      GAME.WIDTH / 2,
      GAME.HEIGHT / 2 + 44,
      '「点击 / 按键开始」',
      {
        fontSize: this.prefersTouchEscape ? '20px' : '22px',
        color: '#dce4ef',
        stroke: '#17324c',
        strokeThickness: 4
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(261);

    this.gameStartGate = [shade, title, buildLabel, prompt];
  }

  startGameplayExperience() {
    if (!this.waitingForGameStart || this.gameStartInitiated) return;
    this.gameStartInitiated = true;

    const begin = () => {
      this.adaptiveMusic?.start();
      this.waitingForGameStart = false;
      this.gameStartInitiated = false;

      (this.gameStartGate ?? []).forEach((item) => item?.destroy());
      this.gameStartGate = null;

      this.updateBeatIndicator(0);
    };

    const audioContext = this.sound?.context;
    this.sound?.unlock?.();
    if (audioContext?.state === 'suspended' && audioContext.resume) {
      Promise.resolve(audioContext.resume())
        .then(begin)
        .catch(begin);
      return;
    }

    begin();
  }

  startGameplayMusic() {
    if (this.waitingForGameStart) {
      this.startGameplayExperience();
    } else {
      this.adaptiveMusic?.start();
    }
  }

  getCurrentBeatMatch() {
    return this.adaptiveMusic?.getBeatMatch?.() ?? null;
  }

  getBeatVfxPosition(config) {
    const anchor = getPlayerVisualAnchor(this.player, config.anchor ?? 'feet', {
      xOffset: config.xOffset ?? 0,
      yOffset: config.groundGap ?? 0
    });
    return anchor;
  }

  ensureBeatIndicator() {
    if (!this.beatStrongImage?.active) {
      const strongPos = this.getBeatVfxPosition(BEAT_VFX.strong);
      this.beatStrongImage = this.vfx?.spawnImage(
        VFX_KEYS.BEAT_STRONG,
        strongPos.x,
        strongPos.y,
        {
          depth: BEAT_VFX.strong.depth,
          alpha: 0,
          originX: BEAT_VFX.strong.originX,
          originY: BEAT_VFX.strong.originY,
          blendMode: 'ADD'
        }
      ) ?? null;
    }

    if (!this.beatWeakImage?.active) {
      const weakPos = this.getBeatVfxPosition(BEAT_VFX.weak);
      this.beatWeakImage = this.vfx?.spawnImage(
        VFX_KEYS.BEAT_WEAK,
        weakPos.x,
        weakPos.y,
        {
          depth: BEAT_VFX.weak.depth,
          alpha: 0,
          originX: BEAT_VFX.weak.originX,
          originY: BEAT_VFX.weak.originY,
          blendMode: 'ADD'
        }
      ) ?? null;
    }
  }

  updateBeatIndicator(clockMs = null) {
    if (!this.player?.active || this.waitingForGameStart) return;

    const clock = clockMs ?? this.adaptiveMusic?.getClockMs?.();
    if (clock === null || clock === undefined) return;

    this.ensureBeatIndicator();

    const quarter = 500;
    const phase = ((clock % quarter) + quarter) % quarter;
    const strongDistance = Math.min(phase, quarter - phase);
    const auxDistance = Math.abs(phase - quarter / 2);

    const strongVisualWindow = BEAT_VFX.strong.visualWindowMs;
    const auxVisualWindow = BEAT_VFX.weak.visualWindowMs;
    const strongAmount = Phaser.Math.Clamp(
      1 - strongDistance / strongVisualWindow,
      0,
      1
    );
    const auxAmount = Phaser.Math.Clamp(
      1 - auxDistance / auxVisualWindow,
      0,
      1
    );

    const strongEase = strongAmount * strongAmount;
    const auxEase = auxAmount * auxAmount;

    if (this.beatStrongImage?.active) {
      const strongScale = BEAT_VFX.strong.baseScale + strongEase * BEAT_VFX.strong.pulseScale;
      const strongPos = this.getBeatVfxPosition(BEAT_VFX.strong);
      this.beatStrongImage
        .setPosition(strongPos.x, strongPos.y)
        .setAlpha(BEAT_VFX.strong.baseAlpha + strongEase * BEAT_VFX.strong.pulseAlpha)
        .setDisplaySize(
          BEAT_VFX.strong.displayWidth * strongScale,
          BEAT_VFX.strong.displayHeight * strongScale
        );
    }

    if (this.beatWeakImage?.active) {
      const weakScale = BEAT_VFX.weak.baseScale + auxEase * BEAT_VFX.weak.pulseScale;
      const weakPos = this.getBeatVfxPosition(BEAT_VFX.weak);
      this.beatWeakImage
        .setPosition(weakPos.x, weakPos.y)
        .setAlpha(BEAT_VFX.weak.baseAlpha + auxEase * BEAT_VFX.weak.pulseAlpha)
        .setDisplaySize(
          BEAT_VFX.weak.displayWidth * weakScale,
          BEAT_VFX.weak.displayHeight * weakScale
        );
    }
  }

  showBeatPulse() {
    this.updateBeatIndicator();
  }

  onPlayerDashStarted(time = this.time.now) {
    this.tutorialDashed = true;
    this.startGameplayMusic();

    const beat = this.getCurrentBeatMatch();
    const beatSynced = Boolean(beat && beat.index !== this.lastRhythmBeatIndex);

    this.player.playDashVisual?.(time, {
      direction: this.player.lastMoveVector,
      beatSynced,
      strong: Boolean(beatSynced && beat?.strong)
    });

    if (!beat || beat.index === this.lastRhythmBeatIndex) return;

    this.lastRhythmBeatIndex = beat.index;
    this.lastFlashStepDashStartedAt = time;
    this.combo += 1;
    this.highestCombo = Math.max(this.highestCombo, this.combo);
    this.lastSuccessfulRhythmGameplayMs = this.gameplayElapsedMs;
    this.pulseComboHud();
    this.showRhythmComboFeedback(this.combo, { strong: Boolean(beat.strong) });
    if (!this.tutorialFlashStepHit) {
      this.tutorialFlashStepHitAt = this.getGameplayElapsedSeconds();
    }
    this.tutorialFlashStepHit = true;
    this.tutorialBeatHit = true;
    this.showRhythmHitPulse(beat, '「闪步！」', '#dff8ff');

    if (beat.strong) {
      this.cameras.main.shake(72, 0.0025);
    }
  }

  setTutorialHint(key, text) {
    if (
      !this.tutorialHintText?.active
      || this.tutorialHintKey === key
    ) return;

    this.tutorialHintKey = key;
    this.tweens.killTweensOf(this.tutorialHintText);

    this.tutorialHintText
      .setText(text)
      .setAlpha(0)
      .setVisible(true);

    this.tweens.add({
      targets: this.tutorialHintText,
      alpha: 1,
      duration: 130
    });
  }

  hideTutorialHint() {
    if (!this.tutorialHintText?.active) return;
    if (!this.tutorialHintText.visible) return;

    this.tutorialHintKey = null;
    this.tweens.killTweensOf(this.tutorialHintText);

    this.tweens.add({
      targets: this.tutorialHintText,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        if (this.tutorialHintText?.active) {
          this.tutorialHintText.setVisible(false);
        }
      }
    });
  }

  updateTutorial(elapsedSeconds) {
    if (
      elapsedSeconds > 70
      || this.isChoosingUpgrade
      || this.bossActive
      || !this.tutorialHintText?.active
    ) {
      this.hideTutorialHint();
      return;
    }

    const movedDistance =
      Phaser.Math.Distance.Between(
        this.tutorialStartX,
        this.tutorialStartY,
        this.player.x,
        this.player.y
      );

    if (movedDistance >= 44) {
      this.tutorialMoved = true;
      this.startGameplayMusic();
    }

    if (
      elapsedSeconds < 10
      && !this.tutorialMoved
    ) {
      this.setTutorialHint(
        'move',
        this.prefersTouchEscape
          ? '「左侧摇杆移动，躲开它们」'
          : '「WASD / 方向键移动，躲开它们」'
      );
      return;
    }

    if (!this.tutorialBeatActionHit) {
      this.setTutorialHint(
        'beat-action',
        this.prefersTouchEscape
          ? '「脚下蓝光亮起时，按右侧「踩拍」或点击屏幕空白处」'
          : '「脚下蓝光亮起时，按 Q「踩拍」」'
      );
      return;
    }

    const beatActionAge = elapsedSeconds - this.tutorialBeatActionHitAt;
    if (beatActionAge < 3.8) {
      this.setTutorialHint(
        'beat-charge',
        '「踩中节拍 → 触发舞台回旋」'
      );
      return;
    }

    if (!this.tutorialFlashStepHit) {
      this.setTutorialHint(
        'flash-step',
        this.prefersTouchEscape
          ? '「蓝光亮起时按 B 闪身 → 闪步 +1」'
          : '「蓝光亮起时按 Space 闪身 → 闪步 +1」'
      );
      return;
    }

    const flashStepAge = elapsedSeconds - this.tutorialFlashStepHitAt;
    if (flashStepAge < 4.0) {
      this.setTutorialHint(
        'combo',
        '「保持更高 Combo，舞台回旋会越来越强」'
      );
      return;
    }

    this.hideTutorialHint();
  }

  tryShowDuckQuack(duck) {
    if (
      !duck?.active
      || this.activeDuckQuacks
        >= SPAWN.DUCK_QUACK_MAX_VISIBLE
    ) return false;

    const view = this.cameras.main.worldView;
    if (!view.contains(duck.x, duck.y)) return false;

    const distance = Phaser.Math.Distance.Between(
      duck.x,
      duck.y,
      this.player.x,
      this.player.y
    );

    const chance = distance < 360 ? 0.72 : 0.38;
    if (Math.random() > chance) return false;

    const options = [
      '「嘎」',
      '「嘎嘎」',
      '「嘎！」',
      '「嘎？？」'
    ];

    const text = this.add.text(
      duck.x,
      duck.y - duck.displayHeight * 0.72 - 8,
      Phaser.Utils.Array.GetRandom(options),
      {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#fff8d7',
        stroke: '#5a4922',
        strokeThickness: 3
      }
    )
      .setOrigin(0.5)
      .setDepth(25);

    this.activeDuckQuacks += 1;

    this.tweens.add({
      targets: text,
      y: text.y - 15,
      alpha: 0,
      duration: Phaser.Math.Between(620, 900),
      ease: 'Quad.Out',
      onComplete: () => {
        if (text.active) text.destroy();
        this.activeDuckQuacks = Math.max(
          0,
          this.activeDuckQuacks - 1
        );
      }
    });

    return true;
  }

  clearEnemyProjectilesInRadius(x, y, radius) {
    [this.poopProjectiles, this.fishProjectiles].forEach((group) => {
      group.children.iterate((projectile) => {
        if (!projectile?.active) return;
        const distance = Phaser.Math.Distance.Between(x, y, projectile.x, projectile.y);
        if (distance <= radius) projectile.destroy();
      });
    });
  }

  destroyPlayerOrbitCrescentVisuals() {
    if (this.playerOrbitCrescent?.active) this.playerOrbitCrescent.destroy();
    if (this.playerOrbitCrescentOutline?.active) this.playerOrbitCrescentOutline.destroy();
    this.playerOrbitCrescent = null;
    this.playerOrbitCrescentOutline = null;
  }

  ensurePlayerOrbitCrescent() {
    if (!this.playerOrbitCrescentUnlocked || !this.player?.active) return null;

    if (!this.playerOrbitCrescent?.active) {
      this.destroyPlayerOrbitCrescentVisuals();

      const sprite = this.add.image(
        this.player.x,
        this.player.y + PLAYER.MOON_GUARD_ANCHOR_Y_OFFSET,
        VFX_KEYS.CRESCENT_ATTACK_01
      )
        .setDepth((this.player.depth ?? 10) + 0.34)
        .setAlpha(PLAYER.MOON_GUARD_PNG_ALPHA)
        .setBlendMode(Phaser.BlendModes.ADD);
      sprite.setDisplaySize(PLAYER.MOON_GUARD_PNG_SIZE, PLAYER.MOON_GUARD_PNG_SIZE);

      this.playerOrbitCrescent = sprite;
    }

    return this.playerOrbitCrescent;
  }

  spawnMoonGuardianRedParticles(time, orbitX, orbitY, tangentX, tangentY, orbitDepth, alphaFactor = 1) {
    if (time < this.playerOrbitCrescentNextParticleAt) return;
    this.playerOrbitCrescentNextParticleAt = time + PLAYER.MOON_GUARD_PARTICLE_INTERVAL_MS;

    const tangentLength = Math.max(1, Math.hypot(tangentX, tangentY));
    const tx = tangentX / tangentLength;
    const ty = tangentY / tangentLength;
    const nx = -ty;
    const ny = tx;

    const count = Math.random() < 0.34 ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      const lateral = Phaser.Math.FloatBetween(-5.0, 5.0);
      const along = Phaser.Math.FloatBetween(-2.5, 2.5);
      const radius = Phaser.Math.FloatBetween(
        PLAYER.MOON_GUARD_PARTICLE_MIN_RADIUS,
        PLAYER.MOON_GUARD_PARTICLE_MAX_RADIUS
      );
      const color = Math.random() < 0.28
        ? PLAYER.MOON_GUARD_PARTICLE_HOT_COLOR
        : PLAYER.MOON_GUARD_PARTICLE_COLOR;
      const particle = this.add.circle(
        orbitX + nx * lateral + tx * along,
        orbitY + ny * lateral + ty * along,
        radius,
        color,
        0.92 * alphaFactor
      )
        .setDepth(orbitDepth + 0.03)
        .setBlendMode(Phaser.BlendModes.ADD);

      const tail = Phaser.Math.FloatBetween(6, 12);
      const sideDrift = Phaser.Math.FloatBetween(-4.5, 4.5);
      const duration = Phaser.Math.Between(
        PLAYER.MOON_GUARD_PARTICLE_MIN_LIFESPAN_MS,
        PLAYER.MOON_GUARD_PARTICLE_MAX_LIFESPAN_MS
      );
      this.tweens.add({
        targets: particle,
        x: particle.x - tx * tail + nx * sideDrift,
        y: particle.y - ty * tail + ny * sideDrift,
        alpha: 0,
        scaleX: 0.20,
        scaleY: 0.20,
        duration,
        ease: 'Quad.Out',
        onComplete: () => particle.destroy()
      });
    }
  }

  getMoonGuardianDamageMultiplier() {
    return Number(this.difficultyProfile?.guardianDamageMultiplier) || 1;
  }

  unlockMoonGuardian() {
    if (this.playerOrbitCrescentUnlocked || !this.player?.active) return false;

    this.playerOrbitCrescentPendingUnlock = false;
    this.playerOrbitCrescentUnlocked = true;
    this.playerOrbitCrescentAngle = Math.PI * 0.12;
    this.playerOrbitCrescentHitCooldowns = new WeakMap();

    const sprite = this.ensurePlayerOrbitCrescent();
    if (sprite?.active) {
      sprite.setAlpha(0).setScale(0.82);
      this.tweens.add({
        targets: sprite,
        alpha: PLAYER.MOON_GUARD_PNG_ALPHA,
        scaleX: 1,
        scaleY: 1,
        duration: 220,
        ease: 'Back.Out'
      });
    }

    this.showScreenNotice(
      '获得被动防御技能「月之守卫」',
      '#94d5f3',
      2500
    );
    return true;
  }

  updatePlayerOrbitCrescent(time, delta) {
    if (!this.playerOrbitCrescentUnlocked || !this.player?.active || this.player.hp <= 0) return;
    if (this.endingSequenceActive) return;

    const sprite = this.ensurePlayerOrbitCrescent();
    if (!sprite?.active) return;

    const normalizedAngle = Phaser.Math.Angle.Normalize(this.playerOrbitCrescentAngle);
    const occlusionRatio = Phaser.Math.Clamp(
      PLAYER.MOON_GUARD_BODY_OCCLUSION_HALF_WIDTH / PLAYER.MOON_GUARD_RADIUS_X,
      0.01,
      0.98
    );
    const occlusionHalfAngle = Math.asin(occlusionRatio);
    const occlusionCenterAngle = Math.PI * 1.5;
    const hideEntryAngle = occlusionCenterAngle - occlusionHalfAngle;
    const hideExitAngle = occlusionCenterAngle + occlusionHalfAngle;
    const angularDistance = (a, b) => Math.abs(Phaser.Math.Angle.Wrap(a - b));
    const speedPeak = (targetAngle) => {
      const d = angularDistance(normalizedAngle, targetAngle);
      const width = PLAYER.MOON_GUARD_TRANSITION_SPEED_WIDTH_RAD;
      return Math.exp(-(d * d) / (2 * width * width));
    };
    const transitionBoost = Math.min(
      1.15,
      speedPeak(hideEntryAngle) + speedPeak(hideExitAngle)
    );
    const currentlyHidden = Math.sin(normalizedAngle) < 0
      && Math.abs(Math.cos(normalizedAngle) * PLAYER.MOON_GUARD_RADIUS_X)
        < PLAYER.MOON_GUARD_BODY_OCCLUSION_HALF_WIDTH;
    const speedMultiplier = 1
      + transitionBoost * PLAYER.MOON_GUARD_TRANSITION_SPEED_BOOST
      + (currentlyHidden ? PLAYER.MOON_GUARD_HIDDEN_SPEED_BOOST : 0);

    this.playerOrbitCrescentAngle += PLAYER.MOON_GUARD_SPEED_RAD_PER_MS * speedMultiplier * delta;

    const angle = this.playerOrbitCrescentAngle;
    const sidePhase = Math.cos(angle);
    const depthPhase = Math.sin(angle);
    const centerX = this.player.x;
    const centerY = this.player.y + PLAYER.MOON_GUARD_ANCHOR_Y_OFFSET;

    const verticalRadius = depthPhase >= 0
      ? PLAYER.MOON_GUARD_FRONT_RADIUS_Y
      : PLAYER.MOON_GUARD_BACK_RADIUS_Y;
    const orbitX = centerX + sidePhase * PLAYER.MOON_GUARD_RADIUS_X;
    const orbitY = centerY + depthPhase * verticalRadius;

    const tangentX = -PLAYER.MOON_GUARD_RADIUS_X * Math.sin(angle);
    const tangentY = verticalRadius * Math.cos(angle);
    const orbitRotation = Math.atan2(tangentY, tangentX);

    const isBehind = depthPhase < 0;
    const playerDepth = this.player.depth ?? 10;

    const perspectiveT = Phaser.Math.Clamp((depthPhase + 1) * 0.5, 0, 1);
    const perspectiveScale = Phaser.Math.Linear(
      PLAYER.MOON_GUARD_BACK_SCALE,
      PLAYER.MOON_GUARD_FRONT_SCALE,
      perspectiveT
    );
    const coreSize = PLAYER.MOON_GUARD_PNG_SIZE * perspectiveScale;

    const hiddenDirectlyBehind = isBehind
      && Math.abs(orbitX - centerX) < PLAYER.MOON_GUARD_BODY_OCCLUSION_HALF_WIDTH;
    const visualAlphaFactor = isBehind ? PLAYER.MOON_GUARD_BACK_ALPHA_FACTOR : 1;
    const orbitDepth = playerDepth + (
      isBehind
        ? PLAYER.MOON_GUARD_BACK_DEPTH_OFFSET
        : PLAYER.MOON_GUARD_FRONT_DEPTH_OFFSET
    );

    sprite
      .setPosition(orbitX, orbitY)
      .setRotation(orbitRotation)
      .setDisplaySize(coreSize, coreSize)
      .setDepth(orbitDepth)
      .setAlpha(PLAYER.MOON_GUARD_PNG_ALPHA * visualAlphaFactor)
      .setVisible(!hiddenDirectlyBehind);

    if (!hiddenDirectlyBehind) {
      this.spawnMoonGuardianRedParticles(
        time,
        orbitX,
        orbitY,
        tangentX,
        tangentY,
        orbitDepth,
        visualAlphaFactor
      );
    }

    const canHit = depthPhase >= 0;
    if (!canHit) return;

    const hitRadius = PLAYER.MOON_GUARD_HIT_RADIUS;
    const hitRadiusSq = hitRadius * hitRadius;
    const damage = Math.max(
      1,
      Math.round(
        this.player.attackDamage
        * PLAYER.MOON_GUARD_DAMAGE_MULTIPLIER
        * this.getMoonGuardianDamageMultiplier()
      )
    );
    const crescentVfx = getCrescentVfxLevel(this.player.crescentLevel);

    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.isDead) return;

      const enemyRadius = Math.max(
        12,
        Math.min(34, Math.max(enemy.displayWidth ?? 0, enemy.displayHeight ?? 0) * 0.18)
      );
      const dx = enemy.x - orbitX;
      const dy = enemy.y - orbitY;
      const combined = hitRadius + enemyRadius;
      if (dx * dx + dy * dy > Math.max(hitRadiusSq, combined * combined)) return;

      const previousHit = this.playerOrbitCrescentHitCooldowns.get(enemy) ?? -Infinity;
      if (time - previousHit < PLAYER.MOON_GUARD_HIT_COOLDOWN_MS) return;
      this.playerOrbitCrescentHitCooldowns.set(enemy, time);

      const hitAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      this.createBasicHitSpark(enemy.x, enemy.y, hitAngle, crescentVfx.level, false);
      this.createBasicHitFlash(enemy, false);

      if (time >= this.playerOrbitCrescentNextSfxAt) {
        this.playerOrbitCrescentNextSfxAt = time + 120;
        this.sound.play('hitLight', { volume: 0.11, rate: 0.92 });
      }

      if (enemy.receiveDamage(damage)) {
        this.killEnemy(enemy);
        return;
      }

      const isBoss = enemy.isBoss === true || ['duckQueen', 'potatoCommander'].includes(enemy.enemyType);
      if (isBoss) return;

      const eliteScale = enemy.isElite ? 0.42 : 1;
      const knockback = PLAYER.MOON_GUARD_KNOCKBACK
        * eliteScale
        * (enemy.knockbackScale ?? 1);
      const distance = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / distance;
      const ny = dy / distance;
      const body = enemy.body;
      if (body) {
        enemy.setVelocity(nx * knockback, ny * knockback);
        this.time.delayedCall(75, () => {
          if (!enemy?.active || enemy.isDead || !enemy.body) return;
          enemy.body.velocity.scale(0.55);
        });
      }
    });
  }

  getAttackCrescentVolley(level = this.level) {
    const safeLevel = Math.max(1, Number(level) || 1);
    if (safeLevel >= 40) {
      const spread = Phaser.Math.DegToRad(PLAYER.MULTI_CRESCENT_THREE_SPREAD_DEG);
      return {
        count: 3,
        angleOffsets: [-spread, 0, spread],
        spawnOffsets: [-PLAYER.MULTI_CRESCENT_SPAWN_OFFSET, 0, PLAYER.MULTI_CRESCENT_SPAWN_OFFSET],
        damageMultiplier: PLAYER.MULTI_CRESCENT_THREE_DAMAGE_MULTIPLIER
      };
    }
    if (safeLevel >= 20) {
      const spread = Phaser.Math.DegToRad(PLAYER.MULTI_CRESCENT_TWO_SPREAD_DEG);
      return {
        count: 2,
        angleOffsets: [-spread, spread],
        spawnOffsets: [-PLAYER.MULTI_CRESCENT_SPAWN_OFFSET * 0.72, PLAYER.MULTI_CRESCENT_SPAWN_OFFSET * 0.72],
        damageMultiplier: PLAYER.MULTI_CRESCENT_TWO_DAMAGE_MULTIPLIER
      };
    }
    return {
      count: 1,
      angleOffsets: [0],
      spawnOffsets: [0],
      damageMultiplier: 1
    };
  }

  playAttackCrescentMilestonePreview(count = 2) {
    if (!this.player?.active) return;
    const crescentVfx = getCrescentVfxLevel(this.player.crescentLevel);
    const safeCount = Phaser.Math.Clamp(Math.trunc(count), 2, 3);
    const startAngle = -Math.PI * 0.5 - (safeCount - 1) * 0.22;

    for (let i = 0; i < safeCount; i += 1) {
      const angle = startAngle + i * 0.44;
      const radius = 42;
      const image = this.add.image(
        this.player.x + Math.cos(angle) * radius,
        this.player.y + Math.sin(angle) * radius,
        crescentVfx.attackKey
      )
        .setDepth((this.player.depth ?? 10) + 0.7)
        .setRotation(angle + Math.PI * 0.5)
        .setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD);
      image.setDisplaySize(crescentVfx.attackDisplaySize * 0.72, crescentVfx.attackDisplaySize * 0.72);
      const sx = image.scaleX;
      const sy = image.scaleY;
      this.tweens.add({
        targets: image,
        alpha: { from: 0, to: 0.96 },
        scaleX: { from: sx * 0.72, to: sx },
        scaleY: { from: sy * 0.72, to: sy },
        duration: 220,
        yoyo: true,
        hold: 360,
        ease: 'Sine.Out',
        onComplete: () => image?.active && image.destroy()
      });
    }
  }

  autoFire(time) {
    if (this.player.isControlLocked?.(time)) return;

    const target = this.findNearestEnemy();
    if (!target) return;

    const baseAngle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      target.x,
      target.y
    );

    const charged = this.beatCharge === true;
    const chargeTier = charged ? Math.max(0, this.beatChargeComboTier || 0) : 0;
    const chargeDamageMultiplier = charged ? this.getBeatChargeDamageMultiplier(chargeTier) : 1;
    const volley = this.getAttackCrescentVolley(this.level);
    const volleyId = ++this.crescentVolleySerial;

    this.player.playBasicAttackVisual?.(baseAngle, time, { charged });
    this.createBasicAttackReleaseAccent(baseAngle, charged, chargeTier);

    const crescentVfx = getCrescentVfxLevel(this.player.crescentLevel);
    volley.angleOffsets.forEach((angleOffset, index) => {
      const angle = baseAngle + angleOffset;
      const lateral = volley.spawnOffsets[index] ?? 0;
      const perpX = -Math.sin(baseAngle);
      const perpY = Math.cos(baseAngle);
      const spawnX = this.player.x + perpX * lateral;
      const spawnY = this.player.y + perpY * lateral;

      const bullet = this.bullets.create(spawnX, spawnY, crescentVfx.attackKey);
      bullet.crescentLevel = crescentVfx.level;
      bullet.charged = charged;
      bullet.beatChargeComboTier = chargeTier;
      bullet.volleyCount = volley.count;
      bullet.volleyId = volleyId;
      bullet.lifestealLevel = Math.max(0, this.player.lifestealLevel || 0);
      bullet.damage = Math.max(
        1,
        Math.round(
          this.player.attackDamage
          * volley.damageMultiplier
          * chargeDamageMultiplier
        )
      );
      bullet.createdAt = time;
      bullet.nextTrailAt = time;
      bullet.nextLifestealParticleAt = time;
      bullet.setDepth(8);
      bullet.setRotation(angle);

      const displaySize = crescentVfx.attackDisplaySize;
      bullet.setDisplaySize(displaySize, displaySize);
      if (charged) bullet.setTint(0xe8fbff);

      bullet.body.setCircle(48, 80, 80);
      this.physics.velocityFromRotation(angle, PLAYER.BULLET_SPEED, bullet.body.velocity);
    });

    if (charged) {
      this.beatCharge = false;
      this.beatChargeComboTier = 0;
      this.clearBeatChargeIndicator();
    }

    this.nextShotAt = time + this.player.fireInterval;
  }

  createBasicAttackReleaseAccent(angle, charged = false, chargeTier = 0) {
    if (!this.player?.active) return;
    const distance = charged ? 24 : 19;
    const x = this.player.x + Math.cos(angle) * distance;
    const y = this.player.y + Math.sin(angle) * distance;
    const key = charged ? VFX_KEYS.SPARK_02 : VFX_KEYS.SPARK_01;
    const accent = this.vfx.spawnImage(key, x, y, {
      displayWidth: charged ? 24 : 15,
      displayHeight: charged ? 24 : 15,
      depth: (this.player.depth ?? 10) + 0.35,
      rotation: angle,
      alpha: charged ? 0.96 : 0.78,
      blendMode: 'ADD'
    });
    if (!accent) return;
    if (charged && chargeTier > 0) this.spawnHighComboBeatParticles(x, y, chargeTier, { hit: false });

    const sx = accent.scaleX;
    const sy = accent.scaleY;
    this.tweens.add({
      targets: accent,
      x: x + Math.cos(angle) * (charged ? 12 : 8),
      y: y + Math.sin(angle) * (charged ? 12 : 8),
      scaleX: sx * (charged ? 1.7 : 1.4),
      scaleY: sy * (charged ? 1.7 : 1.4),
      alpha: 0,
      duration: charged ? 115 : 90,
      ease: 'Quad.Out',
      onComplete: () => accent.active && accent.destroy()
    });
  }

  findNearestEnemy() {
    let nearest = null;
    let bestDistanceSq = Infinity;

    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.isDead) return;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      let d2 = dx * dx + dy * dy;

      if (enemy.enemyType === 'potato') {
        d2 *= 0.85 * 0.85;
      }

      if (d2 < bestDistanceSq) {
        bestDistanceSq = d2;
        nearest = enemy;
      }
    });

    return nearest;
  }

  onBulletHitsEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active || enemy.isDead) return;

    const hitX = bullet.x;
    const hitY = bullet.y;
    const hitAngle = bullet.rotation;
    const damage = bullet.damage;
    const crescentLevel = bullet.crescentLevel ?? 1;
    const charged = bullet.charged === true;
    const chargeTier = Math.max(0, bullet.beatChargeComboTier || 0);
    const volleyId = bullet.volleyId;
    const lifestealLevel = Math.max(0, bullet.lifestealLevel || 0);
    bullet.destroy();

    this.createBasicHitSpark(hitX, hitY, hitAngle, crescentLevel, charged);
    if (charged && chargeTier > 0) this.spawnHighComboBeatParticles(hitX, hitY, chargeTier, { hit: true });
    this.createBasicHitFlash(enemy, charged);
    this.applyBasicHitFeel(enemy, hitAngle, charged);
    if (charged) this.cameras.main.shake(55, 0.00115, false);
    this.sound.play('hitLight', {
      volume: charged ? 0.24 : 0.17,
      rate: charged
        ? Phaser.Math.FloatBetween(1.04, 1.10)
        : Phaser.Math.FloatBetween(0.96, 1.04)
    });

    const killed = enemy.receiveDamage(damage);
    this.applyCrescentLifesteal(volleyId, damage, lifestealLevel);
    if (killed) this.killEnemy(enemy);
  }

  applyCrescentLifesteal(volleyId, damage, lifestealLevel = this.player?.lifestealLevel ?? 0) {
    const level = Phaser.Math.Clamp(Math.trunc(Number(lifestealLevel) || 0), 0, 3);
    if (level <= 0 || !this.player?.active || !Number.isFinite(volleyId)) return 0;
    if (this.crescentLifestealProcessedVolleys.has(volleyId)) return 0;
    this.crescentLifestealProcessedVolleys.add(volleyId);
    this.time.delayedCall(2200, () => this.crescentLifestealProcessedVolleys?.delete?.(volleyId));

    const rate = [0, 0.05, 0.10, 0.15][level] ?? 0;
    const targetHeal = Math.max(0, Number(damage) || 0) * rate;
    if (targetHeal <= 0 || this.player.hp >= this.player.maxHp) return 0;

    const before = this.player.hp;
    this.player.heal(targetHeal);
    const actual = Math.max(0, this.player.hp - before);
    if (actual > 0) {
      const value = actual >= 10 ? Math.round(actual) : Math.round(actual * 10) / 10;
      this.showWorldText(
        this.player.x,
        this.player.y - 64,
        `红气养人 +${value}`,
        '#ff8b9c',
        14,
        520,
        { strokeColor: '#57141f', strokeThickness: 3 }
      );
    }
    return actual;
  }

  spawnCrescentLifestealTrail(bullet, time = this.time.now) {
    const level = Phaser.Math.Clamp(Math.trunc(Number(bullet?.lifestealLevel) || 0), 0, 3);
    if (level <= 0 || !bullet?.active) return;
    const count = level === 1 ? 1 : level === 2 ? 2 : 4;
    for (let i = 0; i < count; i += 1) {
      const phase = time * 0.012 + i * (Math.PI * 2 / count) + (bullet.volleyId || 0) * 0.7;
      const radius = 8 + level * 1.8 + i * 0.6;
      const px = bullet.x + Math.cos(phase) * radius;
      const py = bullet.y + Math.sin(phase) * radius * 0.62;
      const particle = this.add.circle(
        px,
        py,
        level >= 3 && i % 2 === 0 ? 2.2 : 1.5,
        i % 3 === 0 ? LIFESTEAL_RED_HOT : LIFESTEAL_RED,
        level >= 3 ? 0.90 : 0.72
      ).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: particle,
        x: px - (bullet.body?.velocity?.x || 0) * 0.020 + Phaser.Math.Between(-3, 3),
        y: py - (bullet.body?.velocity?.y || 0) * 0.020 + Phaser.Math.Between(-3, 3),
        alpha: 0,
        scaleX: 0.45,
        scaleY: 0.45,
        duration: 150 + level * 22,
        ease: 'Quad.Out',
        onComplete: () => particle?.active && particle.destroy()
      });
    }
  }


  createBasicHitSpark(x, y, angle, crescentLevel = 1, charged = false) {
    const crescentVfx = getCrescentVfxLevel(crescentLevel);
    const impact = this.vfx.spawnImage(crescentVfx.hitKey, x, y, {
      depth: 30,
      rotation: angle,
      alpha: 0.98,
      scale: crescentVfx.hitStartScale * (charged ? 1.16 : 1),
      blendMode: Phaser.BlendModes.NORMAL
    });

    if (!impact) return;

    this.vfx.tweenAndDestroy(impact, {
      scaleX: crescentVfx.hitEndScale * (charged ? 1.18 : 1),
      scaleY: crescentVfx.hitEndScale * (charged ? 1.18 : 1),
      alpha: 0,
      duration: crescentVfx.hitDurationMs + (charged ? 20 : 0),
      ease: 'Quad.Out'
    });

    const spark = this.vfx.spawnImage(charged ? VFX_KEYS.SPARK_02 : VFX_KEYS.SPARK_01, x, y, {
      displayWidth: charged ? 24 : 14,
      displayHeight: charged ? 24 : 14,
      depth: 31,
      alpha: charged ? 0.96 : 0.72,
      blendMode: 'ADD'
    });
    if (spark) {
      const sx = spark.scaleX;
      const sy = spark.scaleY;
      this.tweens.add({
        targets: spark,
        scaleX: sx * (charged ? 1.65 : 1.35),
        scaleY: sy * (charged ? 1.65 : 1.35),
        angle: Phaser.Math.Between(-35, 35),
        alpha: 0,
        duration: charged ? 150 : 105,
        ease: 'Quad.Out',
        onComplete: () => spark.active && spark.destroy()
      });
    }
  }

  createBasicHitFlash(enemy, charged = false) {
    if (!enemy?.active || enemy.isDead) return;
    const textureKey = enemy.texture?.key;
    if (!textureKey || !this.textures.exists(textureKey)) return;

    const flash = this.add.image(enemy.x, enemy.y, textureKey)
      .setOrigin(enemy.originX, enemy.originY)
      .setFlipX(Boolean(enemy.flipX))
      .setFlipY(Boolean(enemy.flipY))
      .setAngle(Number(enemy.angle) || 0)
      .setDisplaySize(
        Math.abs(Number(enemy.displayWidth) || 48),
        Math.abs(Number(enemy.displayHeight) || 48)
      )
      .setDepth((enemy.depth ?? 10) + 0.45)
      .setTintFill(charged ? 0xffffff : 0xdff8ff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(charged ? 0.82 : 0.52);

    const sx = flash.scaleX;
    const sy = flash.scaleY;
    this.tweens.add({
      targets: flash,
      scaleX: sx * (charged ? 1.105 : 1.055),
      scaleY: sy * (charged ? 1.105 : 1.055),
      alpha: 0,
      duration: charged ? 95 : 72,
      ease: 'Quad.Out',
      onComplete: () => flash.active && flash.destroy()
    });
  }

  applyBasicHitFeel(enemy, angle, charged = false) {
    if (!enemy?.active || enemy.isDead) return;

    const isBoss = ['duckQueen', 'potatoCommander'].includes(enemy.enemyType);
    const stopMs = isBoss ? 18 : 30;
    const pushDistance = isBoss
      ? 2 + (charged ? PLAYER.BEAT_CHARGE_BOSS_EXTRA_KNOCKBACK : 0)
      : (15 + (charged ? PLAYER.BEAT_CHARGE_EXTRA_KNOCKBACK : 0)) * (enemy.knockbackScale ?? 1);

    const body = enemy.body;
    if (body) {
      body.enable = false;
      enemy.setVelocity(0, 0);
    }

    if (!isBoss) {
      enemy.setTintFill(0xe9fbff);
    }

    this.tweens.add({
      targets: enemy,
      x: enemy.x + Math.cos(angle) * pushDistance,
      y: enemy.y + Math.sin(angle) * pushDistance,
      duration: stopMs + 34,
      ease: 'Quad.Out',
      onComplete: () => {
        if (!enemy?.active || enemy.isDead) return;
        if (body) {
          body.enable = true;
          body.reset(enemy.x, enemy.y);
        }
        if (!isBoss) {
          if (enemy.refreshStatusPresentation) {
            enemy.refreshStatusPresentation();
          } else {
            enemy.clearTint();
          }
        }
      }
    });
  }

  showLockedEnemyDeathArt(x, y, type) {
    const config = {
      potato: { texture: 'potatoDeadArt', size: 62, life: 7000 },
      duck: { texture: 'duckDeadArt', size: 60, life: 4200 },
      roach: { texture: 'roachDeadArt', size: 50, life: 3600 },
      ball: { texture: 'ballDeadArt', size: 54, life: 3400 }
    }[type];

    if (!config || !this.textures.exists(config.texture)) return;

    const corpse = this.add.image(x, y, config.texture)
      .setDisplaySize(config.size, config.size)
      .setDepth(2)
      .setAlpha(0.96);

    this.tweens.add({
      targets: corpse,
      alpha: 0,
      duration: 900,
      delay: Math.max(0, config.life - 900),
      onComplete: () => corpse.destroy()
    });
  }

  spawnXpGem(x, y, xpValue, tier = 'normal') {
    const textureKey = tier === 'boss'
      ? 'xpBoss'
      : tier === 'elite'
        ? 'xpElite'
        : 'xp';

    const gem = this.xpGems.create(x, y, textureKey);
    gem.xpValue = Math.max(1, Math.round(Number(xpValue) || 1));
    gem.xpTier = tier;
    gem.setDepth(tier === 'boss' ? 5 : tier === 'elite' ? 4 : 3);
    gem.setVelocity(
      Phaser.Math.Between(tier === 'boss' ? -46 : -30, tier === 'boss' ? 46 : 30),
      Phaser.Math.Between(tier === 'boss' ? -46 : -30, tier === 'boss' ? 46 : 30)
    );
    gem.setDrag(120, 120);
    return gem;
  }

  killEnemy(enemy) {
    const x = enemy.x;
    const y = enemy.y;
    const xpValue = enemy.xpValue;
    const type = enemy.enemyType;
    const diedWithPlague = enemy.statusSystem?.has('plague') ?? false;
    const diedWithPoop = enemy.statusSystem?.has('poop_buff') ?? false;

    if (diedWithPlague && enemy.canReceiveSupportStatus?.()) {
      this.createPlagueZone(x, y);
    }
    if (diedWithPoop && enemy.canReceiveSupportStatus?.()) {
      this.createPoopZone(x, y, { radius: 84, lifetimeMs: 5200, alpha: 0.72 });
    }

    const wasDuckQueen = type === 'duckQueen';
    const wasPotatoCommander = type === 'potatoCommander';
    const xpTier = wasDuckQueen || wasPotatoCommander
      ? 'boss'
      : enemy.isElite
        ? 'elite'
        : 'normal';

    if (enemy.isElite || wasDuckQueen || wasPotatoCommander) {
      this.importantText?.clearSource(enemy);
    }

    if (wasPotatoCommander) {
      this.registerKill('potatoCommander');

      this.spawnXpGem(x, y, xpValue, 'boss');
      this.startPotatoCommanderEnding(enemy);
      return;
    }

    if (['duck', 'roach', 'potato', 'ball'].includes(type)) {
      this.createEnemyBloodSplatter(x, y, type);
      this.showLockedEnemyDeathArt(x, y, type);
    }

    if (type === 'potato') {
    }

    const supportHeartDropChance = Math.max(
      0,
      Number(this.difficultyProfile?.supportHeartKillDropChance) || 0
    );
    if (
      supportHeartDropChance > 0
      && !wasDuckQueen
      && !wasPotatoCommander
      && this.supportHearts.countActive(true) < 2
    ) {
      const eliteBoost = enemy.isElite ? 1.75 : 1;
      if (Math.random() < Math.min(0.25, supportHeartDropChance * eliteBoost)) {
        this.spawnSupportHeart({ x, y });
      }
    }

    enemy.destroy();

    this.registerKill(type);

    if (wasDuckQueen) {
      this.onDuckQueenDefeated(x, y);
    }

    this.spawnXpGem(x, y, xpValue, xpTier);
  }

  onEnemyTouchesPlayer(player, enemy) {
    if (!enemy.active || enemy.isDead) return;
    if (enemy.beingAbsorbed === true) return;

    if (this.duckQueenUltimateCutsceneActive && this.isDuckQueenDafamaiEvacuationEnemy(enemy)) return;

    if (enemy.enemyType === 'duckQueen') return;

    if (
      this.potatoPityActive
      && enemy.enemyType === 'duck'
      && ['avoid', 'worship'].includes(enemy.pityResponse)
    ) {
      return;
    }

    const now = this.time.now;
    if (now < enemy.nextContactAt) return;

    enemy.nextContactAt = now + enemy.contactCooldown;

    if (player.canPerfectDodge(now)) {
      player.markPerfectDodge();
      this.triggerPerfectDodge(enemy);
      return;
    }

    if (player.isDashing) return;

    if (
      enemy.enemyType === 'potato'
      && enemy.holySelfDestructActive === true
    ) {
      this.triggerCommanderPotatoSelfDestruct?.(enemy);
      return;
    }

    if (
      enemy.enemyType === 'potato'
      && enemy.isBlessedToxicPotato
      && !enemy.toxicContactSpent
    ) {
      enemy.toxicContactSpent = true;
      this.applyPlayerPoison({ kind: 'blessed' });
      this.spawnBlessedToxicContactBurst(enemy.x, enemy.y);

      enemy.isDead = true;
      enemy.setVelocity(0, 0);
      if (enemy.body) enemy.body.enable = false;

      this.tweens.add({
        targets: enemy,
        alpha: 0,
        scaleX: enemy.scaleX * 1.12,
        scaleY: enemy.scaleY * 1.12,
        duration: 150,
        ease: 'Quad.Out',
        onComplete: () => enemy.destroy()
      });
      return;
    }

    const contactRange = ENEMIES[enemy.enemyType]?.contactDamageRange;
    const contactDamage = Array.isArray(contactRange) && contactRange.length >= 2
      ? player.takeDamageRange(contactRange[0], contactRange[1], now)
      : player.takeDamage(enemy.contactDamage, now);
    if (contactDamage > 0) {
      this.combo = Math.floor(this.combo / 2);
      this.rearmComboStageSpinMilestones();
      this.showHpDamageText(enemy.enemyType, player.x, player.y - 56, contactDamage, {
        durationMs: enemy.isBoss ? 1300 : 1050,
        depth: enemy.isBoss ? 220 : 120
      });
    }

    if (enemy.enemyType !== 'ball') {
      const angle = Phaser.Math.Angle.Between(
        player.x,
        player.y,
        enemy.x,
        enemy.y
      );
      const contactKnockback =
        190 * (enemy.knockbackScale ?? 1);

      enemy.setVelocity(
        Math.cos(angle) * contactKnockback,
        Math.sin(angle) * contactKnockback
      );
    }
  }

  triggerPerfectDodge(sourceEnemy) {
    const cameFromFlashStep = Math.abs(
      this.player.dashStartedAt - this.lastFlashStepDashStartedAt
    ) < 1;

    if (!cameFromFlashStep) {
      this.showWorldText(
        this.player.x,
        this.player.y - 45,
        '「完美闪身」',
        '#d7f5ff',
        16,
        650
      );
    }

    const ring = this.add.circle(this.player.x, this.player.y, 14, 0x8ee8ff, 0.18).setDepth(4);
    this.tweens.add({
      targets: ring,
      radius: PLAYER.PERFECT_SHOCKWAVE_RADIUS,
      alpha: 0,
      duration: 230,
      onComplete: () => ring.destroy()
    });

    this.spawnDashPerfectAccent(this.player);

    const victims = [];
    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.isDead) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d <= PLAYER.PERFECT_SHOCKWAVE_RADIUS) victims.push(enemy);
    });

    victims.forEach((enemy) => {
      if (enemy.receiveDamage(PLAYER.PERFECT_SHOCKWAVE_DAMAGE)) {
        this.killEnemy(enemy);
      } else if (enemy.enemyType !== 'ball') {
        const angle = Phaser.Math.Angle.Between(
          this.player.x,
          this.player.y,
          enemy.x,
          enemy.y
        );
        const perfectKnockback =
          280 * (enemy.knockbackScale ?? 1);

        enemy.setVelocity(
          Math.cos(angle) * perfectKnockback,
          Math.sin(angle) * perfectKnockback
        );
      }
    });
  }

  isImportantTextFree(source, sourceKey = null) {
    return this.importantText?.isSourceFree(source, sourceKey) ?? true;
  }

  isBossImportantTextFree(source = this.potatoCommander) {
    return this.isImportantTextFree(source);
  }

  showImportantWorldText(
    source,
    text,
    color = '#ffffff',
    fontSize = 20,
    durationMs = 2600,
    options = {}
  ) {
    if (!source?.active) return false;

    const isSkillPrompt = options.kind === 'skill';
    const effectiveDurationMs = isSkillPrompt
      ? Phaser.Math.Clamp(durationMs, 1000, 1800)
      : Phaser.Math.Clamp(durationMs, 2500, 3000);

    return this.importantText?.enqueueWorld({
      source,
      text,
      color,
      fontSize,
      durationMs: effectiveDurationMs,
      priority: options.priority ?? 70,
      gapMs: options.gapMs ?? 320,
      yOffset: options.yOffset ?? 68,
      driftY: options.driftY ?? 24,
      shake: options.shake ?? false,
      replaceLowerPriority: options.replaceLowerPriority ?? false,
      coalesceLowPriority: options.coalesceLowPriority ?? false,
      followSource: options.followSource ?? true,
      followLagMs: options.followLagMs ?? 150,
      beatSynced: options.beatSynced ?? isSkillPrompt,
      beatMs: options.beatMs ?? 500
    }) ?? false;
  }

  showSkillImportantWorldText(
    source,
    text,
    color = '#ffffff',
    fontSize = 19,
    options = {}
  ) {
    if (!source?.active) return false;


    const isBoss = source.isBoss === true
      || ['duckQueen', 'potatoCommander'].includes(source.enemyType);

    if (isBoss) {
      return this.showBossSkillHudText(
        source,
        text,
        color,
        fontSize,
        options.durationMs ?? 1500,
        options
      );
    }

    const originY = Number.isFinite(source.originY) ? source.originY : 0.5;
    const displayHeight = Math.max(0, Math.abs(Number(source.displayHeight) || Number(source.height) || 0));
    const visualTopOffset = displayHeight * originY + 16;

    return this.showImportantWorldText(
      source,
      text,
      color,
      fontSize,
      options.durationMs ?? 1500,
      {
        ...options,
        kind: 'skill',
        beatSynced: true,
        yOffset: Math.max(68, visualTopOffset, Number(options.yOffset) || 0),
        gapMs: options.gapMs ?? 220
      }
    );
  }

  showBossSkillHudText(
    source,
    text,
    color = '#ffffff',
    fontSize = 19,
    durationMs = 1500,
    options = {}
  ) {
    if (!source?.active || !text) return false;

    const sourceType = source.enemyType ?? 'boss';
    const safeTop = this.mobileHudSafeTop ?? 0;
    const isCommander = sourceType === 'potatoCommander';

    if (this.bossSkillHudText?.active) {
      this.tweens.killTweensOf(this.bossSkillHudText);
      this.bossSkillHudText.destroy();
    }

    const y = safeTop + (isCommander ? 158 : 66);
    const label = this.add.text(
      this.getResponsiveVisibleRect?.().centerX ?? GAME.WIDTH / 2,
      y,
      text,
      {
        fontSize: `${fontSize}px`,
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        wordWrap: { width: 520, useAdvancedWrap: true }
      }
    )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(188)
      .setAlpha(1);

    this.bossSkillHudText = label;
    this.bossSkillHudSourceType = sourceType;

    const life = Phaser.Math.Clamp(Number(durationMs) || 1500, 900, 2200);
    const fadeMs = Math.min(320, Math.max(180, Math.round(life * 0.22)));
    this.tweens.add({
      targets: label,
      alpha: 0,
      duration: fadeMs,
      delay: Math.max(0, life - fadeMs),
      ease: 'Quad.In',
      onComplete: () => {
        if (label?.active) label.destroy();
        if (this.bossSkillHudText === label) {
          this.bossSkillHudText = null;
          this.bossSkillHudSourceType = null;
        }
      }
    });

    return true;
  }

  showPassiveSkillImportantWorldText(
    source,
    text,
    color = '#ffffff',
    fontSize = 18,
    options = {}
  ) {
    return this.showSkillImportantWorldText(
      source,
      text,
      color,
      fontSize,
      { ...options, durationMs: options.durationMs ?? 1000 }
    );
  }

  showImportantTextAt(
    x,
    y,
    sourceKey,
    text,
    color = '#ffffff',
    fontSize = 20,
    durationMs = 2600,
    options = {}
  ) {
    const effectiveDurationMs = Phaser.Math.Clamp(durationMs, 2500, 3000);

    return this.importantText?.enqueueWorld({
      source: null,
      sourceKey,
      x,
      y,
      text,
      color,
      fontSize,
      durationMs: effectiveDurationMs,
      priority: options.priority ?? 70,
      gapMs: options.gapMs ?? 320,
      yOffset: 0,
      driftY: options.driftY ?? 24,
      shake: options.shake ?? false,
      replaceLowerPriority: options.replaceLowerPriority ?? false,
      coalesceLowPriority: options.coalesceLowPriority ?? false,
      followSource: false
    }) ?? false;
  }

  showBossImportantWorldText(
    source,
    text,
    color,
    fontSize = 20,
    durationMs = 2600,
    gapMs = 360
  ) {
    const effectiveDurationMs = Phaser.Math.Clamp(durationMs, 2500, 3000);

    return this.showImportantWorldText(
      source,
      text,
      color,
      fontSize,
      effectiveDurationMs,
      {
        priority: 80,
        gapMs,
        yOffset: 72,
        replaceLowerPriority: true
      }
    );
  }

  queueBossPhaseText(
    source,
    text,
    color,
    fontSize = 21,
    durationMs = 2900
  ) {
    if (!source?.active) return false;

    const effectiveDurationMs = Phaser.Math.Clamp(durationMs, 2500, 3000);

    return this.showImportantWorldText(
      source,
      text,
      color,
      fontSize,
      effectiveDurationMs,
      {
        priority: 100,
        gapMs: 420,
        yOffset: 72,
        replaceLowerPriority: true,
        followSource: false
      }
    );
  }

  onPotatoCommanderSpawned(commander) {
    this.potatoCommander = commander;
    this.potatoCommanderDefeated = false;
    this.adaptiveMusic?.triggerCue('boss_appear');
    this.potatoPityActive = false;
    this.commanderSkySmashActive = false;
    this.commanderLikeAttackActive = false;
    this.commanderLikePlayerHitUntil = -Infinity;
    this.commanderJudgmentActive = false;
    this.bossActive = true;

    {
      this.showBossImportantWorldText(
        commander,
        '「🥔 土豆指挥官出现！」',
        '#f0d083',
        24,
        2200
      );

      this.showScreenNotice(
        '「Final Boss：土豆指挥官」',
        '#f0d083'
      );

      this.queueBossPhaseText(
        commander,
        '「童年回忆」',
        '#f5dca5',
        20,
        2300
      );

      this.createPotatoCommanderHud(
        '「土豆指挥官 · 童年回忆」'
      );
    }
  }

  onPotatoCommanderPhaseChanged(commander, phase) {
    if (!commander?.active) return;

    const data = {
      hands_on: {
        label: '「事必躬亲」',
        color: '#efc37a'
      },
      holy: {
        label: '「圣光普照」',
        color: '#fff0a6'
      },
      calculate: {
        label: '「神恩归一」',
        color: '#e7c889'
      }
    }[phase];

    if (data) {
      this.queueBossPhaseText(
        commander,
        data.label,
        data.color,
        21,
        2400
      );
    }

    if (phase === 'calculate') {
      this.createCommanderJudgmentHud(commander);
    }
  }

  showPotatoCommanderNarrative(commander, text, phase) {
    if (!commander?.active) return false;

    const colors = {
      memory: '#f5dfad',
      hands_on: '#efc88a',
      holy: '#fff1ad',
      calculate: '#e6d0a7'
    };

    return this.showImportantWorldText(
      commander,
      text,
      colors[phase] ?? '#f5dfad',
      17,
      2800,
      {
        priority: 50,
        gapMs: 360,
        yOffset: 82,
        coalesceLowPriority: true,
        followSource: true,
        followLagMs: 150
      }
    );
  }

  createCommanderGroupSummonCircle(commander, durationMs) {
    if (!commander?.active) return null;

    const circle = this.add.graphics();
    circle.setDepth(Math.max(1, (commander.depth ?? 13) - 2));
    circle.setPosition(commander.x, commander.y + 48);

    const draw = (intensity = 1) => {
      circle.clear();

      const isFinalStage = commander.currentPhase === 'calculate';
      const fillColor = isFinalStage ? 0xffb39f : 0xffeab0;
      const outerColor = isFinalStage ? 0xff9a72 : 0xffd56a;

      circle.fillStyle(fillColor, 0.12 * intensity);
      circle.fillEllipse(0, 0, 184, 48);

      circle.lineStyle(5, outerColor, 0.52 * intensity);
      circle.strokeEllipse(0, 0, 178, 44);

      if (isFinalStage) {
        circle.lineStyle(2, 0xff6558, 0.38 * intensity);
        circle.strokeEllipse(0, 0, 166, 39);
      }

      circle.lineStyle(2, 0xffffe8, 0.76 * intensity);
      circle.strokeEllipse(0, 0, 142, 32);

      const stars = [
        [-54, -4], [52, 5], [-25, 9], [28, -8]
      ];
      circle.fillStyle(0xfffff2, 0.82 * intensity);
      stars.forEach(([x, y], index) => {
        const r = index < 2 ? 3 : 2;
        circle.fillRect(x - r, y - 1, r * 2, 2);
        circle.fillRect(x - 1, y - r, 2, r * 2);
      });
    };

    draw(1);
    circle.setAlpha(0);
    circle.setScale(0.82, 0.82);

    this.tweens.add({
      targets: circle,
      alpha: 0.9,
      scaleX: 1,
      scaleY: 1,
      duration: ENEMIES.potatoCommander.groupCircleIntroMs,
      ease: 'Quad.Out'
    });

    const pulse = this.tweens.add({
      targets: circle,
      alpha: { from: 0.72, to: 0.95 },
      scaleX: { from: 0.98, to: 1.035 },
      scaleY: { from: 0.98, to: 1.035 },
      duration: 360,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.time.delayedCall(Math.max(120, durationMs - 220), () => {
      if (!circle.active) return;
      pulse?.stop?.();

      this.tweens.add({
        targets: circle,
        alpha: 0,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 220,
        ease: 'Quad.In',
        onComplete: () => circle.destroy()
      });
    });

    return circle;
  }

  createCommanderGroupGroundMound(x, y, durationMs) {
    const mound = this.add.graphics();
    mound.setDepth(4);
    mound.setPosition(x, y + 25);
    mound.fillStyle(0x5f4934, 0.54);
    mound.fillEllipse(0, 0, 54, 17);
    mound.fillStyle(0x84684a, 0.36);
    mound.fillEllipse(-6, -2, 31, 9);
    mound.setAlpha(0);

    this.tweens.add({
      targets: mound,
      alpha: 0.82,
      scaleX: { from: 0.72, to: 1 },
      scaleY: { from: 0.72, to: 1 },
      duration: 120,
      ease: 'Quad.Out'
    });

    this.time.delayedCall(Math.max(140, durationMs - 130), () => {
      if (!mound.active) return;
      this.tweens.add({
        targets: mound,
        alpha: 0,
        scaleX: 0.75,
        scaleY: 0.75,
        duration: 130,
        onComplete: () => mound.destroy()
      });
    });

    return mound;
  }

  getCommanderGroupSummonPoint(commander, index, total) {
    const phaseOffset = -Math.PI / 2;
    const angle = phaseOffset + (Math.PI * 2 * index / Math.max(1, total));
    const radiusX = ENEMIES.potatoCommander.groupSpawnRadiusX;
    const radiusY = ENEMIES.potatoCommander.groupSpawnRadiusY;

    return {
      x: Phaser.Math.Clamp(
        commander.x + Math.cos(angle) * radiusX + Phaser.Math.Between(-10, 10),
        44,
        GAME.WORLD_WIDTH - 44
      ),
      y: Phaser.Math.Clamp(
        commander.y + 18 + Math.sin(angle) * radiusY + Phaser.Math.Between(-6, 6),
        44,
        GAME.WORLD_HEIGHT - 44
      )
    };
  }

  summonCommanderGroupPotato(commander, index, total) {
    if (!commander?.active || commander.isDead) return null;
    if (this.enemies.countActive(true) >= SPAWN.MAX_ALIVE) return null;

    const point = this.getCommanderGroupSummonPoint(
      commander,
      index,
      total
    );

    const riseMs = ENEMIES.potatoCommander.groupRiseMs;
    const hopMs = ENEMIES.potatoCommander.groupHopMs;
    const potato = this.spawnSystem.spawnPotatoAt(
      point.x,
      point.y + 26
    );

    if (!potato?.active) return null;

    const groundY = point.y;
    const baseScale = potato.baseArtScale ?? potato.scaleX ?? 1;
    const releaseAt = this.time.now + riseMs + hopMs + 80;

    potato.lockForSummonArrival?.(releaseAt);
    potato.setVelocity(0, 0);
    potato.setAlpha(0.15);
    potato.setScale(baseScale * 0.90, baseScale * 0.46);
    potato.setAngle(0);

    if (potato.body) potato.body.enable = false;

    this.createCommanderGroupGroundMound(
      groundY === point.y ? point.x : potato.x,
      groundY,
      riseMs + hopMs + 120
    );

    this.tweens.add({
      targets: potato,
      y: groundY,
      alpha: 1,
      scaleX: baseScale,
      scaleY: baseScale,
      duration: riseMs,
      ease: 'Back.Out',
      onComplete: () => {
        if (!potato.active || potato.isDead) return;

        this.tweens.add({
          targets: potato,
          y: groundY - 13,
          duration: Math.round(hopMs * 0.45),
          yoyo: true,
          ease: 'Quad.Out',
          onComplete: () => {
            if (!potato.active || potato.isDead) return;

            potato.y = groundY;
            potato.setScale(baseScale);
            potato.releaseSummonArrival?.();
            potato.applyGuidance?.(
              ENEMIES.potatoCommander.groupBuffMs
            );

            if (commander.phaseIndex >= 3) {
              this.maintainCommanderFollowerRing?.(commander);
            }

            if (potato.body) potato.body.enable = true;

            const direction = new Phaser.Math.Vector2(
              this.player.x - potato.x,
              this.player.y - potato.y
            );

            if (direction.lengthSq() > 1) {
              direction
                .normalize()
                .scale(potato.moveSpeed * 1.28);
              potato.setVelocity(direction.x, direction.y);
            }
          }
        });
      }
    });

    return potato;
  }

  commanderEveryoneTogether(commander) {
    if (!commander?.active) return;

    const currentPotatoes = this.getActiveCommanderPotatoCount();
    const populationDeficit = Math.max(
      0,
      ENEMIES.potatoCommander.commanderTargetPotatoPopulation - currentPotatoes
    );
    const desiredTotal = Math.max(
      ENEMIES.potatoCommander.groupTargets,
      populationDeficit
    );
    const total = Math.max(
      0,
      Math.min(
        desiredTotal,
        SPAWN.MAX_ALIVE - this.enemies.countActive(true)
      )
    );

    const totalSequenceMs = Math.max(
      ENEMIES.potatoCommander.groupCastArtMs,
      ENEMIES.potatoCommander.groupCircleIntroMs
        + Math.max(0, total - 1)
          * ENEMIES.potatoCommander.groupSpawnStaggerMs
        + ENEMIES.potatoCommander.groupRiseMs
        + ENEMIES.potatoCommander.groupHopMs
        + 180
    );

    commander.showGroupSkillArt?.(totalSequenceMs);
    commander.setVelocity?.(0, 0);

    this.createCommanderGroupSummonCircle(
      commander,
      totalSequenceMs
    );

    this.showSkillImportantWorldText(
      commander,
      '「怎么会人不喜欢你...」',
      '#f0d18b',
      20,
      { priority: 82, yOffset: 72, replaceLowerPriority: true }
    );

    for (let i = 0; i < total; i += 1) {
      this.time.delayedCall(
        ENEMIES.potatoCommander.groupCircleIntroMs
          + i * ENEMIES.potatoCommander.groupSpawnStaggerMs,
        () => this.summonCommanderGroupPotato(
          commander,
          i,
          total
        )
      );
    }
  }

  spawnCommanderSkySmashImpact(x, y, phaseIndex = 1) {
    if (!this.textures.exists('potatoCommanderSmashImpactArt')) return;

    const clampedPhase = Phaser.Math.Clamp(Math.trunc(phaseIndex), 1, 3);
    const widthByPhase = [0, 250, 275, 305];
    const impactWidth = widthByPhase[clampedPhase] ?? 275;

    let crimsonGlow = null;
    if (clampedPhase === 3) {
      crimsonGlow = this.add.ellipse(
        x,
        y + 20,
        impactWidth * 0.78,
        42,
        0xc74d42,
        0.16
      )
        .setStrokeStyle(2, 0xef7768, 0.28)
        .setDepth(11);

      this.tweens.add({
        targets: crimsonGlow,
        scaleX: 1.18,
        scaleY: 1.12,
        alpha: 0,
        duration: 360,
        ease: 'Quad.Out',
        onComplete: () => crimsonGlow?.destroy()
      });
    }

    const impact = this.add.image(
      x,
      y + 14,
      'potatoCommanderSmashImpactArt'
    )
      .setDepth(12)
      .setAlpha(0.96);

    const frame = this.textures.getFrame('potatoCommanderSmashImpactArt');
    const sourceWidth = Math.max(1, frame?.realWidth ?? frame?.width ?? 1);
    const sourceHeight = Math.max(1, frame?.realHeight ?? frame?.height ?? 1);
    const impactHeight = impactWidth * (sourceHeight / sourceWidth);
    impact.setDisplaySize(impactWidth, impactHeight);
    impact.setScale(impact.scaleX * 0.86, impact.scaleY * 0.86);

    this.tweens.add({
      targets: impact,
      scaleX: impact.scaleX * 1.18,
      scaleY: impact.scaleY * 1.18,
      alpha: 0,
      duration: 360,
      ease: 'Quad.Out',
      onComplete: () => impact.destroy()
    });
  }

  spawnCommanderSkySmashDust(x, y, phaseIndex = 1) {
    const clampedPhase = Phaser.Math.Clamp(Math.trunc(phaseIndex), 1, 3);
    const dustCountByPhase = [0, 14, 17, 22];
    const dustCount = dustCountByPhase[clampedPhase] ?? 17;

    const earthPalette = [
      0xcbb99c,
      0xb89f7f,
      0xd9c9aa,
      0xa98d70
    ];
    const crimsonPalette = [
      0xb44b43,
      0xcf6757,
      0x973a36
    ];

    for (let i = 0; i < dustCount; i += 1) {
      const useCrimson = clampedPhase === 3 && i % 4 === 0;
      const palette = useCrimson ? crimsonPalette : earthPalette;
      const color = Phaser.Utils.Array.GetRandom(palette);

      const startX = x + Phaser.Math.Between(-24, 24);
      const startY = y + Phaser.Math.Between(12, 24);
      const width = Phaser.Math.Between(7, 17);
      const height = Phaser.Math.Between(4, 9);
      const side = Phaser.Math.RND.sign();
      const travelX = side * Phaser.Math.Between(36, 108);
      const liftY = Phaser.Math.Between(18, 58);

      const mote = this.add.ellipse(
        startX,
        startY,
        width,
        height,
        color,
        useCrimson ? 0.62 : 0.54
      )
        .setDepth(13)
        .setRotation(Phaser.Math.FloatBetween(-0.35, 0.35));

      this.tweens.add({
        targets: mote,
        x: startX + travelX,
        y: startY - liftY,
        scaleX: Phaser.Math.FloatBetween(1.2, 1.65),
        scaleY: Phaser.Math.FloatBetween(1.05, 1.35),
        alpha: 0,
        duration: Phaser.Math.Between(270, 440),
        ease: 'Quad.Out',
        onComplete: () => mote.destroy()
      });
    }

    const skimCount = clampedPhase === 3 ? 5 : 4;
    for (let i = 0; i < skimCount; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const useCrimson = clampedPhase === 3 && i === skimCount - 1;
      const puff = this.add.ellipse(
        x + side * Phaser.Math.Between(8, 20),
        y + Phaser.Math.Between(16, 22),
        Phaser.Math.Between(18, 30),
        Phaser.Math.Between(5, 9),
        useCrimson ? 0xb94a42 : 0xc5b08f,
        useCrimson ? 0.34 : 0.30
      )
        .setDepth(12);

      this.tweens.add({
        targets: puff,
        x: puff.x + side * Phaser.Math.Between(58, 105),
        scaleX: Phaser.Math.FloatBetween(1.45, 1.85),
        scaleY: Phaser.Math.FloatBetween(1.1, 1.35),
        alpha: 0,
        duration: Phaser.Math.Between(300, 430),
        ease: 'Quad.Out',
        onComplete: () => puff.destroy()
      });
    }
  }

  startCommanderLikeAttack(commander) {
    if (
      !commander?.active
      || commander.isDead
      || commander.phaseIndex !== 2
      || this.commanderLikeAttackActive
    ) return false;

    const config = ENEMIES.potatoCommander;
    this.commanderLikeAttackActive = true;
    commander.setVelocity(0, 0);
    commander.showLikeSkillArt?.();

    this.showSkillImportantWorldText(
      commander,
      '「给你点赞」',
      '#ffe18a',
      23,
      { priority: 83, yOffset: 74, replaceLowerPriority: true }
    );

    const count = Math.max(1, config.likeThumbCount ?? 3);
    const gap = Math.max(80, config.likeThumbGapMs ?? 185);

    for (let index = 0; index < count; index += 1) {
      this.time.delayedCall(index * gap, () => {
        if (!commander?.active || commander.isDead || !this.commanderLikeAttackActive) return;
        this.spawnCommanderLikeThumb(commander, index);
      });
    }

    this.time.delayedCall(config.likeCastArtMs ?? 1320, () => {
      this.commanderLikeAttackActive = false;
      if (!commander?.active || commander.isDead) return;
      commander.restoreNormalAfterLike?.();
    });

    return true;
  }

  spawnCommanderLikeThumb(commander, index = 0) {
    if (!this.player?.active || this.player.hp <= 0) return false;
    const config = ENEMIES.potatoCommander;
    const world = this.physics.world.bounds;
    const velocity = this.player.body?.velocity;
    const predictScale = (config.likePredictMs ?? 110) / 1000;
    const laneOffset = [-22, 18, 0][index % 3] ?? 0;

    const x = Phaser.Math.Clamp(
      this.player.x + (velocity?.x ?? 0) * predictScale + laneOffset,
      world.left + 44,
      world.right - 44
    );
    const strikeY = Phaser.Math.Clamp(
      this.player.y + (velocity?.y ?? 0) * predictScale,
      world.top + 52,
      world.bottom - 52
    );

    const warningMs = config.likeThumbWarningMs ?? 105;
    const riseMs = config.likeThumbRiseMs ?? 170;
    const holdMs = config.likeThumbHoldMs ?? 90;
    const fadeMs = config.likeThumbFadeMs ?? 170;

    const warning = this.add.ellipse(x, strikeY + 25, 62, 19, 0xffd85d, 0.16)
      .setStrokeStyle(3, 0xffef9a, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(8.5);
    warning.setScale(0.55, 0.55);
    this.tweens.add({
      targets: warning,
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 0.42,
      duration: warningMs,
      ease: 'Quad.Out'
    });

    this.time.delayedCall(warningMs, () => {
      if (warning?.active) warning.destroy();
      if (!this.player?.active || this.player.hp <= 0) return;

      const thumb = this.add.text(x, strikeY + 82, '👍', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '78px'
      })
        .setOrigin(0.5, 1)
        .setDepth(17)
        .setAlpha(0.12)
        .setScale(0.54);

      const groundFlash = this.add.ellipse(x, strikeY + 25, 78, 24, 0xffc847, 0.28)
        .setStrokeStyle(4, 0xffffff, 0.54)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(8.7);

      this.tweens.add({
        targets: groundFlash,
        scaleX: 1.45,
        scaleY: 1.25,
        alpha: 0,
        duration: riseMs + 80,
        ease: 'Quad.Out',
        onComplete: () => groundFlash?.active && groundFlash.destroy()
      });

      this.tweens.add({
        targets: thumb,
        y: strikeY - 22,
        scaleX: 1.02,
        scaleY: 1.02,
        alpha: 1,
        duration: riseMs,
        ease: 'Back.Out',
        onComplete: () => {
          if (!thumb?.active) return;
          this.time.delayedCall(holdMs, () => {
            if (!thumb?.active) return;
            this.tweens.add({
              targets: thumb,
              y: thumb.y + 18,
              alpha: 0,
              scaleX: 0.86,
              scaleY: 0.86,
              duration: fadeMs,
              ease: 'Quad.In',
              onComplete: () => thumb?.active && thumb.destroy()
            });
          });
        }
      });

      this.time.delayedCall(Math.round(riseMs * 0.72), () => {
        if (!this.player?.active || this.player.hp <= 0) return;
        const distance = Phaser.Math.Distance.Between(
          x,
          strikeY,
          this.player.x,
          this.player.y
        );
        if (distance > (config.likeHitRadius ?? 44)) return;
        if (this.time.now < this.commanderLikePlayerHitUntil) return;

        this.commanderLikePlayerHitUntil = this.time.now
          + (config.likeLaunchRiseMs ?? 165)
          + (config.likeLaunchFallMs ?? 205)
          + (config.likeLandingStunMs ?? 280);

        const damage = this.player.takeUnavoidableFlatDamage(config.likeDamage ?? 7);
        if (damage > 0) {
          this.showHpDamageText(
            'potatoCommander',
            this.player.x,
            this.player.y - 56,
            damage,
            { durationMs: 980, rise: 38, depth: 128 }
          );
        }

        this.player.playLikeLaunchReaction?.({
          launchHeight: config.likeLaunchHeight ?? 78,
          riseMs: config.likeLaunchRiseMs ?? 165,
          fallMs: config.likeLaunchFallMs ?? 205,
          landingStunMs: config.likeLandingStunMs ?? 280,
          sourceX: x
        });
        this.cameras.main.shake(105, 0.0024, false);
      });
    });

    return true;
  }

  startCommanderSkySmash(commander) {
    if (
      !commander?.active
      || commander.isDead
      || this.commanderSkySmashActive
      || commander.phaseIndex < 1
    ) return;

    this.commanderSkySmashActive = true;
    const castPhaseIndex = Phaser.Math.Clamp(commander.phaseIndex, 1, 3);

    commander.showSmashSkillArt?.();

    const skySmashLine = Phaser.Utils.Array.GetRandom([
      '「谢谢你小侦探」',
      '「麦好干...」'
    ]);

    this.showSkillImportantWorldText(
      commander,
      skySmashLine,
      castPhaseIndex === 3 ? '#ffd0bb' : '#efc57f',
      21,
      { priority: 86, yOffset: 72, replaceLowerPriority: true }
    );

    const targetX = this.player.x;
    const targetY = this.player.y;
    const warningWidth = ENEMIES.potatoCommander.skySmashRadius * 2.08;
    const warningHeight = ENEMIES.potatoCommander.skySmashRadius * 0.78;
    const warningStroke = castPhaseIndex === 3 ? 0xe86a59 : 0xf2cc79;
    const warningFill = castPhaseIndex === 3 ? 0xb94a40 : 0xe7bd63;

    const warning = this.add.ellipse(
      targetX,
      targetY + 14,
      warningWidth,
      warningHeight,
      warningFill,
      0.10
    )
      .setStrokeStyle(4, warningStroke, 0.72)
      .setDepth(3);

    const warningCore = this.add.ellipse(
      targetX,
      targetY + 14,
      warningWidth * 0.46,
      warningHeight * 0.46,
      0xffffff,
      0.025
    )
      .setStrokeStyle(2, 0xfff0bf, 0.48)
      .setDepth(3);

    this.tweens.add({
      targets: [warning, warningCore],
      scaleX: 0.72,
      scaleY: 0.72,
      alpha: 0.34,
      duration: ENEMIES.potatoCommander.skySmashWarningMs,
      ease: 'Quad.In'
    });

    commander.setVelocity(0, 0);
    if (commander.body) commander.body.enable = false;
    const smashStartX = commander.x;
    const smashStartY = commander.y;

    const finishSmash = () => {
      warning?.destroy();
      warningCore?.destroy();

      if (commander?.active && !commander.isDead) {
        commander.setAlpha(1);
        if (commander.body) {
          commander.body.enable = true;
          commander.body.reset(commander.x, commander.y);
        }
        commander.restoreNormalAfterSmash?.();
      }

      this.commanderSkySmashActive = false;
    };

    this.tweens.add({
      targets: commander,
      y: commander.y - 190,
      alpha: 0,
      duration: 220,
      ease: 'Quad.In',
      onComplete: () => {
        this.time.delayedCall(
          Math.max(0, ENEMIES.potatoCommander.skySmashWarningMs - 220),
          () => {
            if (!commander?.active || commander.isDead) {
              finishSmash();
              return;
            }

            commander.setPosition(targetX, targetY - 170);
            commander.setAlpha(1);

            this.tweens.add({
              targets: commander,
              y: targetY,
              duration: 210,
              ease: 'Cubic.In',
              onComplete: () => {
                if (!commander?.active || commander.isDead) {
                  finishSmash();
                  return;
                }

                if (commander.body) {
                  commander.body.enable = true;
                  commander.body.reset(targetX, targetY);
                }

                warning.destroy();
                warningCore.destroy();

                this.spawnCommanderSkySmashImpact(
                  targetX,
                  targetY,
                  castPhaseIndex
                );
                this.spawnCommanderSkySmashDust(
                  targetX,
                  targetY,
                  castPhaseIndex
                );

                this.cameras.main.flash(
                  90,
                  castPhaseIndex === 3 ? 255 : 255,
                  castPhaseIndex === 3 ? 225 : 242,
                  castPhaseIndex === 3 ? 214 : 203,
                  false
                );
                this.cameras.main.shake(
                  150,
                  castPhaseIndex === 3 ? 0.008 : 0.0065
                );

                const distance = Phaser.Math.Distance.Between(
                  targetX,
                  targetY,
                  this.player.x,
                  this.player.y
                );

                if (distance <= ENEMIES.potatoCommander.skySmashRadius) {
                  const skySmashDamage = this.player.takeDamage(
                    ENEMIES.potatoCommander.skySmashDamage,
                    this.time.now
                  );
                  if (skySmashDamage > 0) {
                    this.showHpDamageText(
                      'potatoCommander',
                      this.player.x,
                      this.player.y - 72,
                      skySmashDamage,
                      { durationMs: 1350, rise: 48, depth: 240 }
                    );
                  }

                  const phaseSlot = Phaser.Math.Clamp(castPhaseIndex - 1, 0, 2);
                  const stunFrameMs = ENEMIES.potatoCommander.skySmashStunFrameMsByPhase?.[phaseSlot] ?? 350;
                  const recoveryFrameMs = ENEMIES.potatoCommander.skySmashRecoveryFrameMsByPhase?.[phaseSlot] ?? 200;
                  const slideDistance = ENEMIES.potatoCommander.skySmashSlideDistanceByPhase?.[phaseSlot] ?? 56;
                  const slideDurationMs = ENEMIES.potatoCommander.skySmashSlideDurationMsByPhase?.[phaseSlot] ?? 120;
                  const hitFlashDurationMs = ENEMIES.potatoCommander.skySmashHitFlashMsByPhase?.[phaseSlot] ?? 120;
                  const totalStunMs = stunFrameMs + recoveryFrameMs;

                  const approachDirection = new Phaser.Math.Vector2(
                    targetX - smashStartX,
                    targetY - smashStartY
                  );
                  if (approachDirection.lengthSq() <= 1) {
                    approachDirection.set(this.player.x - targetX, this.player.y - targetY);
                  }
                  if (approachDirection.lengthSq() <= 1) {
                    approachDirection.set(1, 0);
                  }

                  const knockbackDirection = approachDirection.clone().negate().normalize();

                  const relativePlayer = new Phaser.Math.Vector2(
                    this.player.x - targetX,
                    this.player.y - targetY
                  );
                  const projectedAway = relativePlayer.dot(knockbackDirection);
                  const commanderRadius = Math.max(
                    Math.abs(Number(commander.displayWidth) || 0),
                    Math.abs(Number(commander.displayHeight) || 0)
                  ) * 0.50;
                  const playerRadius = Math.max(
                    Math.abs(Number(this.player.displayWidth) || 60),
                    Math.abs(Number(this.player.displayHeight) || 60)
                  ) * 0.50;
                  const clearance = commanderRadius
                    + playerRadius
                    + (ENEMIES.potatoCommander.skySmashClearanceMargin ?? 16);
                  const requiredToClear = Math.max(0, clearance - projectedAway);
                  const resolvedSlideDistance = Math.max(slideDistance, requiredToClear);

                  this.player.playSkySmashStunVisual(
                    stunFrameMs,
                    recoveryFrameMs,
                    {
                      slideDirection: knockbackDirection,
                      bossDirectionX: -knockbackDirection.x,
                      slideDistance: resolvedSlideDistance,
                      slideDurationMs,
                      flashDurationMs: hitFlashDurationMs
                    },
                    this.time.now
                  );

                  this.showPlayerStatusNotice(
                    'sky_smash_stun',
                    '「砸晕了！」',
                    '#ffb18f',
                    700
                  );
                }

                const landingPhaseSlot = Phaser.Math.Clamp(castPhaseIndex - 1, 0, 2);
                const landingHoldMs = ENEMIES.potatoCommander.skySmashLandingHoldMsByPhase?.[landingPhaseSlot] ?? 650;
                this.time.delayedCall(landingHoldMs, () => finishSmash());
              }
            });
          }
        );
      }
    });
  }

  beginCommanderHolySelfDestructCycle(potatoes = []) {
    this.commanderHolySelfDestructCycleCounter = (this.commanderHolySelfDestructCycleCounter ?? 0) + 1;
    const cycleId = this.commanderHolySelfDestructCycleCounter;
    potatoes.forEach((potato) => {
      if (!potato?.active || potato.isDead) return;
      potato.pendingHolySelfDestructCycleId = cycleId;
    });
    return cycleId;
  }

  hasCommanderHolySelfDestructCycle(cycleId) {
    if (!Number.isFinite(cycleId) || !this.enemies) return false;
    let active = false;
    this.enemies.children.iterate((enemy) => {
      if (active || !enemy?.active || enemy.isDead || enemy.enemyType !== 'potato') return;
      if (
        enemy.pendingHolySelfDestructCycleId === cycleId
        || (enemy.holySelfDestructActive === true && enemy.holySelfDestructCycleId === cycleId)
      ) active = true;
    });
    return active;
  }

  triggerCommanderPotatoSelfDestruct(potato) {
    if (
      !potato?.active
      || potato.isDead
      || potato.holySelfDestructExploded === true
    ) return false;

    const config = ENEMIES.potatoCommander;
    const x = potato.x;
    const y = potato.y;
    const blastRadius = config.holySelfDestructBlastRadius ?? 108;
    const baseDamage = config.holySelfDestructDamage ?? 10;

    potato.holySelfDestructExploded = true;
    potato.holySelfDestructActive = false;
    potato.pendingHolySelfDestructCycleId = null;
    potato.isDead = true;
    potato.setVelocity(0, 0);
    potato.clearTint?.();
    potato.setAlpha(0);
    if (potato.body) potato.body.enable = false;

    const flash = this.add.circle(x, y - 2, 18, 0xffffff, 0.96)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(45);
    const core = this.add.circle(x, y, 28, 0xffd24a, 0.84)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(44);
    const blast = this.add.circle(x, y, 34, 0xff6a2f, 0.62)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(43);
    const shock = this.add.circle(x, y, 42, 0xffffff, 0)
      .setStrokeStyle(5, 0xffdf8a, 0.86)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(42);
    const floor = this.add.ellipse(x, y + 18, 72, 24, 0x6d2a17, 0.24)
      .setStrokeStyle(3, 0xff9a48, 0.72)
      .setDepth(4.5);

    this.tweens.add({
      targets: flash,
      scaleX: 2.9, scaleY: 2.9, alpha: 0,
      duration: 125, ease: 'Quad.Out',
      onComplete: () => flash.destroy()
    });
    this.tweens.add({
      targets: [core, blast],
      scaleX: 3.2, scaleY: 3.2, alpha: 0,
      duration: 250, ease: 'Cubic.Out',
      onComplete: () => { core.destroy(); blast.destroy(); }
    });
    this.tweens.add({
      targets: shock,
      scaleX: 2.85, scaleY: 2.85, alpha: 0,
      duration: 310, ease: 'Quad.Out',
      onComplete: () => shock.destroy()
    });
    this.tweens.add({
      targets: floor,
      scaleX: 1.75, scaleY: 1.55, alpha: 0,
      duration: 360, ease: 'Quad.Out',
      onComplete: () => floor.destroy()
    });

    for (let i = 0; i < 14; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(44, 112);
      const debris = this.add.circle(
        x + Phaser.Math.Between(-8, 8),
        y + Phaser.Math.Between(-5, 8),
        Phaser.Math.FloatBetween(2, 4.5),
        i % 3 === 0 ? 0xffd76a : (i % 2 === 0 ? 0x6dd84f : 0x8b542e),
        0.92
      ).setDepth(44);
      this.tweens.add({
        targets: debris,
        x: debris.x + Math.cos(angle) * speed,
        y: debris.y + Math.sin(angle) * speed * 0.55 + Phaser.Math.Between(-20, 12),
        alpha: 0,
        scaleX: 0.35,
        scaleY: 0.35,
        duration: Phaser.Math.Between(260, 460),
        ease: 'Cubic.Out',
        onComplete: () => debris.destroy()
      });
    }

    this.cameras.main.shake(
      config.holySelfDestructShakeMs ?? 145,
      config.holySelfDestructShakeIntensity ?? 0.0135
    );
    this.sound?.play?.('blackwaterCrossImpactSfx', { volume: 0.34, rate: 0.76 });

    const player = this.player;
    if (player?.active && player.hp > 0) {
      const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
      if (distance <= blastRadius) {
        const closeness = 1 - Phaser.Math.Clamp(distance / Math.max(1, blastRadius), 0, 1);
        const rawDamage = Math.max(1, Math.round(baseDamage * Phaser.Math.Linear(0.55, 1, closeness)));
        const damage = player.takeDamage(rawDamage, this.time.now);
        if (damage > 0) {
          this.combo = Math.floor(this.combo / 2);
          this.rearmComboStageSpinMilestones();
          this.showHpDamageText('potato', player.x, player.y - 56, damage, {
            durationMs: 1150, rise: 36, depth: 180
          });
          this.updateHud?.();
        }
      }
    }

    this.time.delayedCall(24, () => {
      if (potato?.active) potato.destroy();
    });
    return true;
  }

  startCommanderWish(commander) {
    if (
      !commander?.active
      || commander.isDead
      || commander.phaseIndex < 2
    ) return false;

    const config = ENEMIES.potatoCommander;
    const pulseTimes = config.holyPulseTimesMs ?? [360, 820, 1280];
    const releaseMs = config.holyReleaseMs ?? 1600;
    const beamFadeMs = config.holyBeamFadeMs ?? 260;

    const potatoes = this.getNearestEnemiesOfType(
      commander,
      'potato',
      config.holyRadius,
      999
    )
      .filter((potato) => (potato.holyGrowthLevel ?? 0) < 3)
      .sort((a, b) => (
        Number(b.commanderFollower === true) - Number(a.commanderFollower === true)
        || Phaser.Math.Distance.Squared(commander.x, commander.y, a.x, a.y)
          - Phaser.Math.Distance.Squared(commander.x, commander.y, b.x, b.y)
      ))
      .slice(0, config.holyTargets);

    const selfDestructCycleId = this.beginCommanderHolySelfDestructCycle(potatoes);

    commander.showBlessSkillArt?.();
    const blessingLine = Phaser.Utils.Array.GetRandom([
      '「真的可以吗」',
      '「被你发现了」'
    ]);

    this.showSkillImportantWorldText(
      commander,
      blessingLine,
      '#fff0a6',
      21,
      { priority: 86, yOffset: 72, replaceLowerPriority: true }
    );

    if (potatoes.length === 0) {
      this.time.delayedCall(520, () => commander.restoreNormalAfterBless?.());
      return false;
    }

    const evolveWithFlash = (potato) => {
      if (!potato?.active || potato.isDead) return;

      const ghost = this.add.image(
        potato.x,
        potato.y,
        potato.texture?.key ?? 'potatoNormalArt'
      )
        .setDisplaySize(
          Math.max(1, potato.displayWidth * 1.08),
          Math.max(1, potato.displayHeight * 1.08)
        )
        .setAlpha(0.34)
        .setTintFill(0xfff6c7)
        .setDepth((potato.depth ?? 8) + 1);

      const ghostScaleX = ghost.scaleX;
      const ghostScaleY = ghost.scaleY;
      this.tweens.add({
        targets: ghost,
        scaleX: ghostScaleX * 1.18,
        scaleY: ghostScaleY * 1.18,
        alpha: 0,
        duration: 170,
        ease: 'Quad.Out',
        onComplete: () => ghost.destroy()
      });

      const ring = this.add.ellipse(
        potato.x,
        potato.y + 10,
        52,
        19,
        0xffef9b,
        0.08
      )
        .setStrokeStyle(3, 0xfff5bd, 0.74)
        .setDepth(4);

      this.tweens.add({
        targets: ring,
        scaleX: 1.48,
        scaleY: 1.48,
        alpha: 0,
        duration: 210,
        ease: 'Quad.Out',
        onComplete: () => ring.destroy()
      });

      potato.setTintFill(0xffffff);
      potato.setAlpha(0.52);

      this.time.delayedCall(72, () => {
        if (!potato?.active || potato.isDead) return;
        potato.applyHolyGrowth?.();
        potato.clearTint();
        potato.setAlpha(1);
      });
    };

    potatoes.forEach((potato, index) => {
      const staggerMs = index * 55;
      const lockUntil = this.time.now + staggerMs + releaseMs;
      potato.lockForBlessing?.(lockUntil);

      this.time.delayedCall(staggerMs, () => {
        if (!potato?.active || potato.isDead) return;

        const beam = this.add.rectangle(
          potato.x,
          potato.y - 216,
          30,
          224,
          0xffe88f,
          0.18
        )
          .setOrigin(0.5, 0)
          .setScale(1, 0)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(3);

        const beamCore = this.add.rectangle(
          potato.x,
          potato.y - 216,
          10,
          224,
          0xffffff,
          0.30
        )
          .setOrigin(0.5, 0)
          .setScale(1, 0)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(4);

        const groundGlow = this.add.ellipse(
          potato.x,
          potato.y + 11,
          58,
          22,
          0xffe88f,
          0
        )
          .setStrokeStyle(2, 0xfff5bd, 0.50)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(3);

        this.tweens.add({
          targets: [beam, beamCore],
          scaleY: 1,
          duration: 180,
          ease: 'Quad.Out',
          onComplete: () => {
            if (!beam.active || !beamCore.active || !groundGlow.active) return;
            this.tweens.add({
              targets: [beam, beamCore, groundGlow],
              alpha: { from: 0.14, to: 0.34 },
              duration: 170,
              yoyo: true,
              repeat: 4,
              ease: 'Sine.InOut'
            });
          }
        });

        this.tweens.add({
          targets: groundGlow,
          alpha: 0.18,
          duration: 180,
          ease: 'Quad.Out'
        });

        pulseTimes.forEach((pulseMs) => {
          this.time.delayedCall(pulseMs, () => evolveWithFlash(potato));
        });

        this.time.delayedCall(releaseMs, () => {
          if (potato?.active && !potato.isDead) {
            potato.releaseBlessing?.();
            if ((potato.holyGrowthLevel ?? 0) >= 3) {
              potato.beginHolySelfDestruct?.(selfDestructCycleId, this.time.now);
            } else {
              potato.pendingHolySelfDestructCycleId = null;
            }
          }

          this.tweens.killTweensOf(beam);
          this.tweens.killTweensOf(beamCore);
          this.tweens.killTweensOf(groundGlow);

          this.tweens.add({
            targets: [beam, beamCore, groundGlow],
            alpha: 0,
            duration: beamFadeMs,
            ease: 'Quad.Out',
            onComplete: () => {
              beam.destroy();
              beamCore.destroy();
              groundGlow.destroy();
            }
          });
        });
      });
    });

    this.time.delayedCall(config.holyCastMs, () => {
      if (!commander?.active || commander.isDead) return;
      commander.restoreNormalAfterBless?.();
    });

    return selfDestructCycleId;
  }

  startCommanderNothingWrong(commander) {
    if (this.potatoPityActive) return;

    this.potatoPityActive = true;

    this.showScreenNotice(
      '「场面开始失控」',
      '#e4d8ff'
    );

    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.isDead) return;

      if (enemy.enemyType === 'duck') {
        enemy.pityResponse = Math.random() < 0.18
          ? 'worship'
          : 'avoid';
      }
    });
  }

  commanderStopSpending(commander) {
    if (!commander?.active || commander.isDead || commander.phaseIndex < 3) return false;

    const config = ENEMIES.potatoCommander;
    const potatoes = this.getCommanderGraceCandidates(
      commander,
      config.absorbCount
    );
    if (potatoes.length === 0) return false;

    commander.setVelocity(0, 0);
    commander.showGraceSkillArt?.();

    const judgmentCount = commander.addJudgmentGraceCast?.() ?? 0;
    const judgmentRequired = config.judgmentGraceCastsRequired ?? 3;
    const judgmentArmed = judgmentCount >= judgmentRequired;

    this.showSkillImportantWorldText(
      commander,
      '「别再破费啦」',
      '#f1dda6',
      22,
      { priority: 88, yOffset: 72, replaceLowerPriority: true }
    );

    const pulseTimes = config.absorbPulseTimesMs ?? [420, 900, 1380, 1860];
    const firstJudgmentHudPulseAt = Math.max(0, pulseTimes[0] ?? 420);
    this.time.delayedCall(firstJudgmentHudPulseAt, () => {
      if (!commander?.active || commander.isDead) return;
      this.updateCommanderJudgmentHud(commander, true, { createIfMissing: true });
    });
    const finishMs = config.absorbFinishMs ?? 2260;
    const durationMs = config.absorbDurationMs ?? 2400;
    const faithValues = config.absorbFaithValueByGrowth ?? [1, 1.5, 2, 3];
    const layerMaxHp = Math.max(1, commander.getActiveLayerMaxHp?.() ?? commander.maxHp ?? 1);
    const healCap = layerMaxHp * config.absorbHealCapRatioPerCast;
    const castState = { healed: 0 };

    const auraY = commander.y + (config.absorbAuraYOffset ?? 48);
    const bossAuraRed = this.add.ellipse(
      commander.x,
      auraY,
      120,
      46,
      0xb83242,
      0.10
    )
      .setStrokeStyle(4, 0xff5360, 0.44)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(11.72);

    const bossAura = this.add.ellipse(
      commander.x,
      auraY,
      108,
      42,
      0xffdf84,
      0.10
    )
      .setStrokeStyle(3, 0xffefb0, 0.66)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(11.78);

    this.tweens.add({
      targets: [bossAuraRed, bossAura],
      scaleX: 1.28,
      scaleY: 1.24,
      alpha: 0.30,
      duration: 230,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    const spawnGraceDrainPulse = () => {
      if (!commander?.active || commander.isDead) return;
      const redRing = this.add.ellipse(
        commander.x,
        auraY,
        86,
        31,
        0xc73544,
        0.08
      )
        .setStrokeStyle(4, 0xff4f5d, 0.74)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(12.18);
      const goldRing = this.add.ellipse(
        commander.x,
        auraY,
        68,
        25,
        0xffe58a,
        0.06
      )
        .setStrokeStyle(3, 0xfff0ae, 0.84)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(12.2);

      this.tweens.add({
        targets: [redRing, goldRing],
        scaleX: 1.85,
        scaleY: 1.65,
        alpha: 0,
        duration: 310,
        ease: 'Quad.Out',
        onComplete: () => {
          redRing.destroy();
          goldRing.destroy();
        }
      });
    };

    const streamColors = [0xffd96d, 0xff5a5f, 0xff8068, 0xffffff];
    const spawnFaithFlow = (potato, count = config.absorbStreamMotesPerTick ?? 3, strong = false) => {
      if (!potato?.active || !commander?.active) return;
      const moteCount = Math.max(1, Math.trunc(count));
      for (let i = 0; i < moteCount; i += 1) {
        const color = strong
          ? (i % 2 === 0 ? 0xff4d59 : 0xffdc72)
          : Phaser.Utils.Array.GetRandom(streamColors);
        const mote = this.add.circle(
          potato.x + Phaser.Math.Between(-10, 10),
          potato.y + Phaser.Math.Between(-9, 9),
          strong ? Phaser.Math.Between(3, 5) : Phaser.Math.Between(2, 4),
          color,
          strong ? 0.96 : 0.82
        )
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(12.4);

        this.tweens.add({
          targets: mote,
          x: commander.x + Phaser.Math.Between(-10, 10),
          y: commander.y + 8 + Phaser.Math.Between(-10, 10),
          alpha: 0,
          scaleX: strong ? 0.28 : 0.42,
          scaleY: strong ? 0.28 : 0.42,
          duration: Phaser.Math.Between(strong ? 250 : 310, strong ? 380 : 460),
          delay: Phaser.Math.Between(0, strong ? 85 : 55),
          ease: 'Cubic.In',
          onComplete: () => mote.destroy()
        });
      }
    };

    const spawnGraceRewardPulse = () => {
      if (!commander?.active || commander.isDead) return;
      const ring = this.add.ellipse(
        commander.x,
        auraY,
        76,
        32,
        0xffed9f,
        0.05
      )
        .setStrokeStyle(3, 0xfff3c2, 0.68)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(12.2);

      this.tweens.add({
        targets: ring,
        scaleX: 1.65,
        scaleY: 1.65,
        alpha: 0,
        duration: 260,
        ease: 'Quad.Out',
        onComplete: () => ring.destroy()
      });
    };

    potatoes.forEach((potato, index) => {
      if (!potato?.active || potato.isDead) return;

      potato.beingAbsorbed = true;
      potato.lockForBlessing?.(this.time.now + durationMs + 260);
      potato.setVelocity(0, 0);

      const baseScaleX = potato.scaleX;
      const baseScaleY = potato.scaleY;
      const growth = Phaser.Math.Clamp(Math.trunc(potato.holyGrowthLevel ?? 0), 0, 3);
      const faithValue = Number(faithValues[growth] ?? 1);

      const link = this.add.graphics().setDepth(11.7);
      link.lineStyle(11, 0xa92537, 0.20);
      link.lineBetween(potato.x, potato.y - 2, commander.x, commander.y + 8);
      link.lineStyle(7, 0xff4f59, 0.28);
      link.lineBetween(potato.x, potato.y - 2, commander.x, commander.y + 8);
      link.lineStyle(3, 0xffdf7a, 0.82);
      link.lineBetween(potato.x, potato.y - 2, commander.x, commander.y + 8);
      link.lineStyle(1, 0xffffff, 0.90);
      link.lineBetween(potato.x, potato.y - 2, commander.x, commander.y + 8);

      const floorGlow = this.add.ellipse(
        potato.x,
        potato.y + 15,
        48,
        17,
        0xc73544,
        0.10
      )
        .setStrokeStyle(2, 0xffcf72, 0.62)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(4.2);

      this.tweens.add({
        targets: [link, floorGlow],
        alpha: { from: 0.48, to: 0.96 },
        duration: 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });

      let cleaned = false;
      let streamEvent = null;
      const cleanup = (restorePotato = true) => {
        if (cleaned) return;
        cleaned = true;
        streamEvent?.remove(false);
        streamEvent = null;
        this.tweens.killTweensOf(link);
        this.tweens.killTweensOf(floorGlow);
        link.destroy();
        floorGlow.destroy();

        if (restorePotato && potato?.active && !potato.isDead) {
          this.tweens.killTweensOf(potato);
          potato.setScale(baseScaleX, baseScaleY);
          potato.clearTint();
          potato.setAlpha(1);
          potato.beingAbsorbed = false;
          potato.releaseBlessing?.();
        }
      };

      potato.once('destroy', () => cleanup(false));

      streamEvent = this.time.addEvent({
        delay: config.absorbStreamIntervalMs ?? 90,
        repeat: Math.max(1, Math.ceil(durationMs / (config.absorbStreamIntervalMs ?? 90)) - 1),
        callback: () => {
          if (!potato?.active || potato.isDead || !commander?.active || commander.isDead) {
            cleanup(false);
            return;
          }
          spawnFaithFlow(potato, config.absorbStreamMotesPerTick ?? 3, false);
        }
      });

      pulseTimes.forEach((pulseTime, pulseIndex) => {
        this.time.delayedCall(pulseTime + index * 35, () => {
          if (!potato?.active || potato.isDead || !commander?.active || commander.isDead) {
            cleanup(false);
            return;
          }

          spawnFaithFlow(potato, config.absorbPulseBurstMotes ?? 10, true);
          spawnGraceDrainPulse();
          link.setAlpha(1);
          floorGlow.setAlpha(0.94);

          const drainDamage = Math.max(1, Math.round(potato.maxHp * (0.12 + pulseIndex * 0.015)));
          potato.hp = Math.max(1, potato.hp - drainDamage);

          const scaleFactors = [0.94, 0.87, 0.78, 0.68];
          const grayTints = [0xeee4c8, 0xd5cfbf, 0xb6b3ab, 0x8d8c87];
          const factor = scaleFactors[pulseIndex] ?? 0.68;
          potato.setTint(grayTints[pulseIndex] ?? 0x8d8c87);

          this.tweens.add({
            targets: potato,
            scaleX: baseScaleX * factor,
            scaleY: baseScaleY * factor,
            duration: 150,
            ease: 'Quad.Out'
          });
        });
      });

      this.time.delayedCall(finishMs + index * 35, () => {
        if (!potato?.active || potato.isDead || !commander?.active || commander.isDead) {
          cleanup(false);
          return;
        }

        const desiredHeal = layerMaxHp * config.absorbHealRatioPerFaith * faithValue;
        const healRoom = Math.max(0, healCap - castState.healed);
        const healed = commander.healActiveLayer(Math.min(desiredHeal, healRoom));
        castState.healed += healed;

        const shieldGain = commander.addGraceShield?.(
          layerMaxHp * config.absorbShieldRatioPerFaith * faithValue
        ) ?? 0;
        commander.addJudgmentFaithCharge?.(faithValue);

        if (healed > 0 || shieldGain > 0) spawnGraceRewardPulse();

        potato.isDead = true;
        potato.beingAbsorbed = false;
        potato.setVelocity(0, 0);
        if (potato.body) potato.body.enable = false;

        this.tweens.killTweensOf(potato);
        this.tweens.add({
          targets: potato,
          scaleX: baseScaleX * 0.42,
          scaleY: baseScaleY * 0.42,
          alpha: 0,
          duration: 180,
          ease: 'Quad.In',
          onComplete: () => {
            cleanup(false);
            if (potato?.active) potato.destroy();
          }
        });
      });
    });

    this.time.delayedCall(durationMs, () => {
      [bossAuraRed, bossAura].forEach((aura) => {
        if (!aura?.active) return;
        this.tweens.killTweensOf(aura);
        this.tweens.add({
          targets: aura,
          alpha: 0,
          duration: 180,
          onComplete: () => aura.destroy()
        });
      });

      if (!commander?.active || commander.isDead) return;
      commander.restoreNormalAfterGrace?.();

      if (judgmentArmed && commander.judgmentPending === true) {
        commander.nextActionAt = Math.min(commander.nextActionAt ?? Infinity, this.time.now + 240);
      }
    });

    return true;
  }

  onCommanderGraceShieldHit(commander, absorbed) {
    if (!commander?.active || commander.isDead || absorbed <= 0) return;
    const shield = this.add.ellipse(
      commander.x,
      commander.y,
      Math.max(86, commander.displayWidth * 0.72),
      Math.max(118, commander.displayHeight * 0.82),
      0xffec9b,
      0.035
    )
      .setStrokeStyle(3, 0xffefae, 0.58)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(12.3);

    this.tweens.add({
      targets: shield,
      alpha: 0,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 150,
      ease: 'Quad.Out',
      onComplete: () => shield.destroy()
    });
  }

  spawnCommanderJudgmentCastAura(commander, durationMs = 2400, { intensity = 1 } = {}) {
    if (!commander?.active) return;
    const totalMs = Math.max(600, durationMs);
    const auraIntensity = Phaser.Math.Clamp(intensity, 0.18, 1);
    const pulse = this.add.ellipse(commander.x, commander.y + 14, 112, 34, 0xb31224, 0.34 * auraIntensity)
      .setDepth(19944)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.ellipse(commander.x, commander.y + 10, 76, 24, 0xffd27a, 0.36 * auraIntensity)
      .setDepth(19945)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: pulse,
      scaleX: 1.42,
      scaleY: 1.30,
      alpha: 0,
      duration: 340,
      repeat: Math.max(1, Math.floor(totalMs / 300)) - 1,
      onRepeat: () => {
        if (!pulse?.active || !commander?.active) return;
        pulse.setPosition(commander.x, commander.y + 14).setScale(1).setAlpha(0.30 * auraIntensity);
      },
      onComplete: () => pulse.destroy()
    });
    this.tweens.add({
      targets: core,
      scaleX: 1.30,
      scaleY: 1.18,
      alpha: 0,
      duration: 280,
      repeat: Math.max(1, Math.floor(totalMs / 250)) - 1,
      onRepeat: () => {
        if (!core?.active || !commander?.active) return;
        core.setPosition(commander.x, commander.y + 10).setScale(1).setAlpha(0.34 * auraIntensity);
      },
      onComplete: () => core.destroy()
    });

    const burstEvery = 28;
    const burstCount = Math.max(18, Math.floor((totalMs / burstEvery) * auraIntensity));
    for (let i = 0; i < burstCount; i += 1) {
      this.time.delayedCall(i * burstEvery, () => {
        if (!commander?.active || commander.isDead || this.commanderJudgmentActive !== true) return;
        const beam = this.add.rectangle(
          commander.x + Phaser.Math.Between(-42, 42),
          commander.y + Phaser.Math.Between(6, 22),
          Phaser.Math.Between(6, 13),
          Phaser.Math.Between(40, 62),
          Phaser.Math.RND.pick([0x8d0817, 0xb60f23, 0xffb24a]),
          Phaser.Math.FloatBetween(0.48, 0.82) * auraIntensity
        )
          .setDepth(19946)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAngle(Phaser.Math.Between(-10, 10));
        this.tweens.add({
          targets: beam,
          y: beam.y - Phaser.Math.Between(92, 150),
          alpha: 0,
          scaleY: Phaser.Math.FloatBetween(2.7, 3.8),
          scaleX: Phaser.Math.FloatBetween(1.05, 1.32),
          duration: Phaser.Math.Between(320, 500),
          ease: 'Cubic.Out',
          onComplete: () => beam.destroy()
        });
        for (let j = 0; j < 4; j += 1) {
          const spark = this.add.rectangle(
            commander.x + Phaser.Math.Between(-40, 40),
            commander.y + Phaser.Math.Between(8, 24),
            Phaser.Math.Between(3, 6),
            Phaser.Math.Between(16, 28),
            Phaser.Math.RND.pick([0xc41228, 0xe43b1a, 0xffcf72]),
            Phaser.Math.FloatBetween(0.28, 0.52)
          )
            .setDepth(19947)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setAngle(Phaser.Math.Between(-16, 16));
          this.tweens.add({
            targets: spark,
            y: spark.y - Phaser.Math.Between(56, 104),
            alpha: 0,
            scaleY: Phaser.Math.FloatBetween(1.6, 2.5),
            duration: Phaser.Math.Between(220, 360),
            ease: 'Cubic.Out',
            onComplete: () => spark.destroy()
          });
        }
      });
    }
  }

  getHpDamageStyle(sourceType = 'default') {
    const styles = {
      potatoCommander: { fontFamily: 'Georgia, serif', color: '#ffd66b', stroke: '#8b1020', shadowColor: '#3a050b' },
      duckQueen: { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff7fc', stroke: '#d44f8c', shadowColor: '#611c42' },
      duck: { fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif', color: '#ffe46b', stroke: '#d95491', shadowColor: '#6a2145' },
      potato: { fontFamily: 'Georgia, serif', color: '#fff7e9', stroke: '#7a4d2b', shadowColor: '#3f2817' },
      toxicPotato: { fontFamily: 'Georgia, serif', color: '#ff6f6f', stroke: '#4e9f45', shadowColor: '#173b1b' },
      roach: { fontFamily: 'Verdana, sans-serif', color: '#ff9acb', stroke: '#7131a4', shadowColor: '#35134f' },
      ball: { fontFamily: 'Arial Black, Arial, sans-serif', color: '#ffffff', stroke: '#111111', shadowColor: '#000000' },
      twinPig: { fontFamily: 'Trebuchet MS, sans-serif', color: '#fff4dc', stroke: '#7b431f', shadowColor: '#32170a' },
      plagueCat: { fontFamily: 'Verdana, sans-serif', color: '#dfff91', stroke: '#496b25', shadowColor: '#1b2b0d' },
      default: { fontFamily: 'Arial, sans-serif', color: '#ffffff', stroke: '#7a2020', shadowColor: '#260000' }
    };
    return styles[sourceType] ?? styles.default;
  }

  showHpDamageText(sourceType, x, y, damage, options = {}) {
    const amount = Math.max(0, Math.round(Number(damage) || 0));
    if (amount <= 0) return null;
    const style = this.getHpDamageStyle(sourceType);
    const tierFontSize = amount <= 3 ? 12 : amount <= 8 ? 20 : 42;
    const tierRise = amount <= 3 ? 20 : amount <= 8 ? 38 : 68;
    const tierDurationMs = amount <= 3 ? 760 : amount <= 8 ? 1080 : 1620;
    const tierStartScale = amount <= 3 ? 0.42 : amount <= 8 ? 0.56 : 0.78;
    const tierPopScale = amount <= 3 ? 0.92 : amount <= 8 ? 1.10 : 1.48;
    const tierStrokeThickness = amount <= 3 ? 4 : amount <= 8 ? 5 : 8;
    return this.showBossDamageText(x, y, `HP-${amount}`, options.durationMs ?? tierDurationMs, {
      fontFamily: style.fontFamily,
      fontSize: options.fontSize ?? tierFontSize,
      color: style.color,
      stroke: style.stroke,
      shadowColor: style.shadowColor,
      strokeThickness: options.strokeThickness ?? tierStrokeThickness,
      startScale: options.startScale ?? tierStartScale,
      popScale: options.popScale ?? tierPopScale,
      popDuration: options.popDuration ?? (amount <= 3 ? 90 : amount <= 8 ? 120 : 150),
      rise: options.rise ?? tierRise,
      depth: options.depth ?? 180,
      avoidCollisions: false
    });
  }

  showBossDamageText(x, y, text, durationMs = 1500, options = {}) {
    if (this.finished) return null;

    const fontFamily = options.fontFamily ?? 'Georgia, serif';
    const fontSize = options.fontSize ?? 24;
    const color = options.color ?? '#fff2de';
    const stroke = options.stroke ?? '#78101d';
    const shadowColor = options.shadowColor ?? '#2b0000';
    const rise = options.rise ?? 44;
    const depth = options.depth ?? 320;
    const avoidCollisions = options.avoidCollisions === true;
    const strokeThickness = options.strokeThickness ?? 6;
    const startScale = options.startScale ?? 0.68;
    const popScale = options.popScale ?? 1.18;
    const popDuration = options.popDuration ?? 120;
    const label = this.add.text(x, y, text, {
      fontFamily,
      fontSize: `${fontSize}px`,
      fontStyle: '900 italic',
      color,
      stroke,
      strokeThickness,
      shadow: {
        offsetX: 0,
        offsetY: 3,
        color: shadowColor,
        blur: 4,
        fill: true,
        stroke: true
      }
    }).setOrigin(0.5).setDepth(depth).setScale(startScale).setScrollFactor(1);

    const startY = avoidCollisions
      ? this.placeWorldTextLabel(label, x, y)
      : (label.setPosition(x, y), y);

    this.tweens.add({
      targets: label,
      scaleX: popScale,
      scaleY: popScale,
      duration: popDuration,
      ease: 'Back.Out'
    });
    this.tweens.add({
      targets: label,
      y: startY - rise,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.Out',
      onComplete: () => {
        if (avoidCollisions) this.unregisterWorldTextLabel(label);
        if (label.active) label.destroy();
      }
    });

    return label;
  }

  checkCommanderJudgmentHeadHit(x, targetY, stageIndex = 0) {
    const player = this.player;
    if (!player?.active || player.hp <= 0) return 0;

    const config = ENEMIES.potatoCommander;
    const headX = player.x;
    const headY = player.y - Math.max(24, (player.displayHeight ?? 72) * 0.42);
    const horizontalThreshold = [30, 34, 40][stageIndex] ?? 34;
    const verticalThreshold = [42, 46, 52][stageIndex] ?? 46;
    const hit = Math.abs(x - headX) <= horizontalThreshold && Math.abs(targetY - headY) <= verticalThreshold;
    if (!hit) return 0;

    const rawDamage = Phaser.Math.Between(
      config.judgmentHeadHitDamageMin ?? 2,
      config.judgmentHeadHitDamageMax ?? 8
    );
    const damage = player.takeUnavoidableFlatDamage?.(rawDamage) ?? 0;
    if (damage <= 0) return 0;

    this.showHpDamageText(
      'potatoCommander',
      player.x,
      player.y - 84,
      damage,
      { durationMs: 1400, rise: 54, depth: 360 }
    );

    const recoilDir = (player.x >= x) ? 1 : -1;
    const baseX = player.x;
    const baseY = player.y;
    const baseAngle = Number(player.angle) || 0;
    player.setTintFill?.(0xfff6ef);
    this.tweens.add({
      targets: player,
      x: baseX + recoilDir * 18,
      y: baseY + 8,
      angle: baseAngle + recoilDir * 17,
      alpha: 0.72,
      duration: 76,
      ease: 'Quad.Out',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        if (!player?.active) return;
        player.setPosition(baseX, baseY);
        player.setAngle(baseAngle);
        player.setAlpha(1);
        player.clearTint?.();
      }
    });
    const now = this.time.now;
    if ((now - (this.judgmentLastHeadHitAt ?? -Infinity)) <= 620) {
      this.judgmentHeadHitStreak = Math.min(6, (this.judgmentHeadHitStreak ?? 1) + 1);
    } else {
      this.judgmentHeadHitStreak = 1;
    }
    this.judgmentLastHeadHitAt = now;
    const streak = this.judgmentHeadHitStreak;
    const shakeDuration = 95 + (streak - 1) * 38;
    const shakeStrength = 0.0046 + (streak - 1) * 0.0022;
    this.cameras.main.shake(shakeDuration, Math.min(0.0156, shakeStrength));
    return damage;
  }

  spawnCommanderJudgmentGroundImpact(x, y, stageIndex = 0) {
    const impactScale = [0.90, 1.02, 1.16][stageIndex] ?? 1;
    const impactY = y + 12;
    const ringW = [78, 96, 116][stageIndex] ?? 88;
    const ringH = [28, 34, 42][stageIndex] ?? 30;
    const lineCount = [5, 6, 8][stageIndex] ?? 6;

    const core = this.add.circle(x, impactY, 11 * impactScale, 0xfff9dd, 0.98)
            .setDepth(19958)
      .setBlendMode(Phaser.BlendModes.ADD);
    const bloom = this.add.circle(x, impactY, 24 * impactScale, 0xffd15f, stageIndex === 2 ? 0.62 : 0.48)
            .setDepth(19957)
      .setBlendMode(Phaser.BlendModes.ADD);
    const redBloom = this.add.circle(x, impactY + 1, 32 * impactScale, 0x9d1022, stageIndex === 2 ? 0.34 : 0.24)
            .setDepth(19956)
      .setBlendMode(Phaser.BlendModes.ADD);

    const ring = this.add.ellipse(x, impactY + 2, ringW, ringH, 0x000000, 0)
            .setDepth(19955)
      .setStrokeStyle(Math.max(2, Math.round(4 * impactScale)), 0xffd878, 0.92)
      .setBlendMode(Phaser.BlendModes.ADD);
    const ringRed = this.add.ellipse(x, impactY + 3, ringW * 1.18, ringH * 1.10, 0x000000, 0)
            .setDepth(19954)
      .setStrokeStyle(Math.max(2, Math.round(6 * impactScale)), 0x9d1022, 0.48)
      .setBlendMode(Phaser.BlendModes.ADD);

    for (let i = 0; i < lineCount; i += 1) {
      const ray = this.add.rectangle(x, impactY - 2, Phaser.Math.Between(3, 5), Phaser.Math.Between(18, 32) * impactScale, 0xffecb3, 0.86)
                .setDepth(19959)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAngle(Phaser.Math.Between(-78, 78));
      const distance = Phaser.Math.Between(20, 48) * impactScale;
      const theta = Phaser.Math.FloatBetween(-Math.PI * 0.92, -Math.PI * 0.08);
      this.tweens.add({
        targets: ray,
        x: x + Math.cos(theta) * distance,
        y: impactY + Math.sin(theta) * distance * 0.42,
        alpha: 0,
        scaleY: 1.35,
        duration: Phaser.Math.Between(130, 185),
        ease: 'Quad.Out',
        onComplete: () => ray.destroy()
      });
    }

    const scarAlpha = stageIndex === 2 ? 0.30 : 0.20;
    const scarH = Math.max(3, Math.round(5 * impactScale));
    const scarV = Math.max(10, Math.round(18 * impactScale));
    const scarHoriz = this.add.rectangle(x, impactY + 5, 32 * impactScale, scarH, 0xffdf94, scarAlpha)
            .setDepth(19953)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAngle(Phaser.Math.Between(-6, 6));
    const scarVert = this.add.rectangle(x, impactY + 5, scarH, scarV, 0xffdf94, scarAlpha * 0.92)
            .setDepth(19953)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAngle(Phaser.Math.Between(-6, 6));
    this.tweens.add({
      targets: [scarHoriz, scarVert],
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.10,
      duration: stageIndex === 2 ? 260 : 220,
      ease: 'Quad.Out',
      onComplete: () => {
        scarHoriz.destroy();
        scarVert.destroy();
      }
    });

    this.tweens.add({
      targets: [core, bloom, redBloom],
      alpha: 0,
      scaleX: 2.9,
      scaleY: 2.3,
      duration: stageIndex === 2 ? 165 : 145,
      ease: 'Quad.Out',
      onComplete: () => {
        [core, bloom, redBloom].forEach((obj) => obj?.destroy());
      }
    });
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 1.55,
      scaleY: 1.28,
      duration: stageIndex === 2 ? 230 : 200,
      ease: 'Quad.Out',
      onComplete: () => ring.destroy()
    });
    this.tweens.add({
      targets: ringRed,
      alpha: 0,
      scaleX: 1.72,
      scaleY: 1.34,
      duration: stageIndex === 2 ? 250 : 210,
      ease: 'Quad.Out',
      onComplete: () => ringRed.destroy()
    });
  }

  isCommanderBlackwaterKillableMinor(enemy) {
    if (!enemy?.active || enemy.isDead) return false;
    if (enemy === this.potatoCommander || enemy === this.duckQueen) return false;
    const type = enemy.enemyType;
    if (type === 'potatoCommander' || type === 'duckQueen') return false;
    return true;
  }

  killCommanderBlackwaterMinionsNearImpact(x, y, stageIndex = 0, scripted = false) {
    if (!this.enemies) return 0;
    const radius = ([42, 54, 68][stageIndex] ?? 48) + (scripted ? 18 : 0);
    const radiusSq = radius * radius;
    const victims = [];
    this.enemies.children.iterate((enemy) => {
      if (!this.isCommanderBlackwaterKillableMinor(enemy)) return;
      const dx = (enemy.x ?? 0) - x;
      const dy = (enemy.y ?? 0) - y;
      if (dx * dx + dy * dy <= radiusSq) victims.push(enemy);
    });
    victims.forEach((enemy) => {
      if (enemy?.active && !enemy.isDead) this.killEnemy(enemy);
    });
    return victims.length;
  }

  killAllCommanderBlackwaterMinions() {
    if (!this.enemies) return 0;
    const victims = [];
    this.enemies.children.iterate((enemy) => {
      if (this.isCommanderBlackwaterKillableMinor(enemy)) victims.push(enemy);
    });
    victims.forEach((enemy) => {
      if (enemy?.active && !enemy.isDead) this.killEnemy(enemy);
    });
    return victims.length;
  }

  getCommanderJudgmentRainTiming(stageIndex = 0, frenzy = 0) {
    const config = ENEMIES.potatoCommander;
    const baseFallMs = config.judgmentRainFallMs?.[stageIndex] ?? 360;
    const baseTelegraphMs = config.judgmentRainTelegraphMs?.[stageIndex] ?? [180, 220, 260][stageIndex] ?? 200;
    const frenzyClamped = Phaser.Math.Clamp(frenzy, 0, 1);
    const fallMs = stageIndex === 2
      ? Math.max(155, Math.round(Phaser.Math.Linear(baseFallMs, 170, frenzyClamped)))
      : baseFallMs;
    const telegraphMs = stageIndex === 2
      ? Math.max(95, Math.round(Phaser.Math.Linear(baseTelegraphMs, 105, frenzyClamped)))
      : baseTelegraphMs;
    return { fallMs, telegraphMs, totalMs: fallMs + telegraphMs, frenzyClamped };
  }

  spawnCommanderJudgmentRainCross(stageIndex = 0, frenzy = 0, forceMode = null, options = {}) {
    const config = ENEMIES.potatoCommander;
    const { fallMs, telegraphMs, frenzyClamped } = this.getCommanderJudgmentRainTiming(stageIndex, frenzy);

    const player = this.player;
    const view = this.cameras.main.worldView;
    const viewTop = view.y;
    const globalDrop = this.getCommanderJudgmentGlobalDropPoint(view, stageIndex);
    let x = globalDrop.x;
    let targetY = globalDrop.y;

    const forcedX = Number(options?.targetX);
    const forcedY = Number(options?.targetY);
    if (Number.isFinite(forcedX) && Number.isFinite(forcedY)) {
      x = Phaser.Math.Clamp(forcedX, view.x + 34, view.right - 34);
      targetY = Phaser.Math.Clamp(forcedY, view.y + 116, view.bottom - 42);
    } else {
      const anchorX = Number(this.judgmentRainAnchorX);
      const anchorY = Number(this.judgmentRainAnchorY);
      const hasAnchor = Number.isFinite(anchorX) && Number.isFinite(anchorY);
      if (hasAnchor && forceMode === 'anchorFeet') {
        x = Phaser.Math.Clamp(anchorX + Phaser.Math.Between(-18, 18), view.x + 34, view.right - 34);
        targetY = Phaser.Math.Clamp(anchorY + 18 + Phaser.Math.Between(-8, 10), view.y + 116, view.bottom - 42);
      } else if (hasAnchor && forceMode === 'anchorNear') {
        const theta = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const radius = Phaser.Math.Between(38, 62);
        x = Phaser.Math.Clamp(anchorX + Math.cos(theta) * radius, view.x + 34, view.right - 34);
        targetY = Phaser.Math.Clamp(anchorY + Math.sin(theta) * radius * 0.72, view.y + 116, view.bottom - 42);
      } else if (hasAnchor && forceMode === 'anchorHead') {
        const headY = anchorY - Math.max(24, (player?.displayHeight ?? 72) * 0.42);
        x = Phaser.Math.Clamp(anchorX + Phaser.Math.Between(-12, 12), view.x + 34, view.right - 34);
        targetY = Phaser.Math.Clamp(headY + Phaser.Math.Between(-12, 12), view.y + 116, view.bottom - 42);
      }
    }

    const spawnY = viewTop - 128;
    const scriptedCross = options?.scripted === true;
    if (scriptedCross) {
      this.sound?.play?.('blackwaterCrossWarningSfx', {
        volume: 0.16,
        rate: 1.0
      });
    }
    const scale = ([0.92, 1.02, 1.14][stageIndex] ?? 1) * (scriptedCross ? 1.18 : 1);
    const angle = Phaser.Math.Between(-5, 5);
    const telegraph = this.add.ellipse(
      x,
      targetY + 6,
      (scriptedCross ? 30 : 20) * scale,
      (scriptedCross ? 10 : 7) * scale,
      0x8e1222,
      scriptedCross ? 0.16 : 0.10
    )
      .setDepth(19918)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.72);
    const trailGlow = this.add.rectangle(x, spawnY - 12, 22 * scale, 118 * scale, 0xa20f21, 0.14)
      .setDepth(19976)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    const trailCore = this.add.rectangle(x, spawnY - 20, 8 * scale, 136 * scale, 0xffd986, 0.20)
      .setDepth(19977)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    const cross = this.add.image(x, spawnY, 'potatoCommanderJudgmentRainArt')
      .setDepth(scriptedCross ? 19992 : 19978)
      .setDisplaySize(72 * scale, 144 * scale)
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setAlpha(0.92)
      .setAngle(angle)
      .setScale(0.94);

    this.tweens.add({
      targets: telegraph,
      alpha: stageIndex === 2 ? Phaser.Math.Linear(0.30, 0.44, frenzyClamped) : 0.28,
      scaleX: stageIndex === 2 ? Phaser.Math.Linear(1.5, 1.9, frenzyClamped) : 1.6,
      scaleY: stageIndex === 2 ? Phaser.Math.Linear(1.24, 1.42, frenzyClamped) : 1.28,
      duration: telegraphMs,
      ease: 'Sine.InOut',
      yoyo: false
    });
    this.tweens.add({
      targets: cross,
      alpha: 1,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: telegraphMs,
      ease: 'Sine.Out'
    });
    this.tweens.add({
      targets: [trailGlow, trailCore],
      alpha: { from: 0, to: stageIndex === 2 ? Phaser.Math.Linear(0.30, 0.44, frenzyClamped) : 0.26 },
      duration: telegraphMs,
      ease: 'Sine.Out'
    });

    this.time.delayedCall(telegraphMs, () => {
      if (!cross?.active) return;
      this.tweens.add({
        targets: telegraph,
        alpha: 0,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: Math.max(90, Math.round(fallMs * 0.55)),
        ease: 'Quad.In',
        onComplete: () => telegraph.destroy()
      });
      this.tweens.add({
        targets: [trailGlow, trailCore],
        y: targetY - 42,
        alpha: { from: stageIndex === 2 ? 0.34 : 0.26, to: 0 },
        scaleY: 1.22,
        duration: fallMs,
        ease: 'Cubic.In',
        onComplete: () => {
          trailGlow.destroy();
          trailCore.destroy();
        }
      });
      this.tweens.add({
        targets: cross,
        y: targetY - 10,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: fallMs,
        ease: 'Cubic.In',
        onComplete: () => {
          if (cross?.active) cross.destroy();
          this.spawnCommanderJudgmentGroundImpact(x, targetY, stageIndex);
          if (this.commanderBlackwaterPreviewActive) {
            this.spawnCommanderBlackwaterInkImpactAccent(x, targetY + 10, stageIndex);
            this.playCommanderBlackwaterImpactSfx(stageIndex, frenzyClamped, scriptedCross);
            this.killCommanderBlackwaterMinionsNearImpact(x, targetY, stageIndex, scriptedCross);
          }

          if (this.commanderBlackwaterPreviewActive) {
            let craterSize = options?.craterSize;
            if (!['small', 'medium'].includes(craterSize)) {
              const mediumChance = [0.04, 0.18, 0.38][stageIndex] ?? 0.14;
              craterSize = Math.random() < mediumChance ? 'medium' : 'small';
            }
            this.spawnCommanderBlackwaterCrater(x, targetY + 13, craterSize, {
              rotation: Phaser.Math.Between(-12, 12),
              scaleJitter: Phaser.Math.FloatBetween(0.92, 1.14),
              persistentMs: config.blackwaterCraterPersistMs ?? 11000,
              depth: 19890
            });
            if (stageIndex === 2 && (this.commanderBlackwaterCraters?.length ?? 0) < 180) {
              const satelliteChance = Phaser.Math.Linear(0.38, 0.72, frenzyClamped);
              if (Math.random() < satelliteChance) {
                const satelliteCount = frenzyClamped > 0.86 && Math.random() < 0.38 ? 2 : 1;
                for (let s = 0; s < satelliteCount; s += 1) {
                  const theta = Phaser.Math.FloatBetween(0, Math.PI * 2);
                  const radius = Phaser.Math.Between(24, 58);
                  const sx = Phaser.Math.Clamp(x + Math.cos(theta) * radius, view.x + 24, view.right - 24);
                  const sy = Phaser.Math.Clamp(targetY + 13 + Math.sin(theta) * radius * 0.56, view.y + 124, view.bottom - 24);
                  this.spawnCommanderBlackwaterCrater(sx, sy, 'small', {
                    rotation: Phaser.Math.Between(-18, 18),
                    scaleJitter: Phaser.Math.FloatBetween(0.58, 0.82),
                    persistentMs: config.blackwaterCraterPersistMs ?? 11000,
                    depth: 19889,
                    revealFrom: 0.74,
                    revealTo: 1.02,
                    revealMs: 80
                  });
                }
              }
            }
          }

          const headDamage = this.checkCommanderJudgmentHeadHit(x, targetY, stageIndex);
          if (headDamage <= 0) {
            const blackwater = this.commanderBlackwaterPreviewActive === true;
            const shakeDuration = blackwater
              ? ([84, 118, 170][stageIndex] ?? 96)
              : ([32, 44, 58][stageIndex] ?? 40);
            const shakeStrength = blackwater
              ? (stageIndex === 2
                ? Phaser.Math.Linear(0.0088, 0.0155, frenzyClamped)
                : ([0.0028, 0.0048, 0.0072][stageIndex] ?? 0.0034))
              : (stageIndex === 2
                ? Phaser.Math.Linear(0.0022, 0.0036, frenzyClamped)
                : ([0.0010, 0.0018, 0.0029][stageIndex] ?? 0.0012));
            this.cameras.main.shake(shakeDuration, shakeStrength);
          }
          options?.onImpact?.({ x, y: targetY, stageIndex, frenzy: frenzyClamped });
        }
      });
    });
    return cross;
  }

  startCommanderJudgmentPanic(durationMs = 760) {
    const duration = Math.max(260, durationMs);
    const view = this.cameras.main.worldView;

    const player = this.player;
    if (player?.active && player.hp > 0) {
      player.judgmentPanicTween?.stop();
      const baseAngle = Number(player.angle) || 0;
      player.judgmentPanicTween = this.tweens.add({
        targets: player,
        angle: { from: baseAngle - 4.5, to: baseAngle + 4.5 },
        alpha: { from: 1, to: 0.72 },
        duration: 72,
        yoyo: true,
        repeat: Math.max(3, Math.floor(duration / 144) - 1),
        ease: 'Sine.InOut',
        onComplete: () => {
          if (!player?.active) return;
          player.setAngle(baseAngle);
          player.setAlpha(1);
          player.clearTint?.();
          player.judgmentPanicTween = null;
        }
      });

      const playerFlash = this.time.addEvent({
        delay: 145,
        repeat: Math.max(1, Math.floor(duration / 145) - 1),
        callback: () => {
          if (!player?.active || player.hp <= 0) return;
          player.setTintFill?.(0xfff4d8);
          this.time.delayedCall(52, () => {
            if (player?.active) player.clearTint?.();
          });
        }
      });
      this.time.delayedCall(duration + 80, () => playerFlash?.remove(false));
    }

    const visible = [];
    this.enemies.children.iterate((enemy) => {
      if (
        !enemy?.active
        || enemy.isDead
        || enemy.isBoss === true
        || ['potatoCommander', 'duckQueen'].includes(enemy.enemyType)
      ) return;
      if (
        enemy.x < view.x - 26
        || enemy.x > view.right + 26
        || enemy.y < view.y - 26
        || enemy.y > view.bottom + 26
      ) return;
      visible.push(enemy);
    });

    visible.forEach((enemy, index) => {
      enemy.applyStun?.(duration, this.time.now);
      if (enemy.enemyType === 'ball') enemy.setVelocity?.(0, 0);

      const baseX = enemy.x;
      const baseY = enemy.y;
      const baseAngle = Number(enemy.angle) || 0;
      const jitterX = Phaser.Math.Between(index % 2 === 0 ? -8 : -5, index % 2 === 0 ? 5 : 8);
      const jitterY = Phaser.Math.Between(-5, 5);
      const jitterAngle = Phaser.Math.Between(-9, 9);

      enemy.judgmentPanicTween?.stop();
      enemy.judgmentPanicTween = this.tweens.add({
        targets: enemy,
        x: baseX + jitterX,
        y: baseY + jitterY,
        angle: baseAngle + jitterAngle,
        alpha: 0.76,
        duration: Phaser.Math.Between(62, 90),
        yoyo: true,
        repeat: Math.max(3, Math.floor(duration / 150) - 1),
        ease: 'Sine.InOut',
        onComplete: () => {
          if (!enemy?.active || enemy.isDead) return;
          enemy.setPosition(baseX, baseY);
          enemy.setAngle(baseAngle);
          enemy.setAlpha(1);
          enemy.clearTint?.();
          enemy.judgmentPanicTween = null;
        }
      });
    });

    this.cameras.main.shake(duration, 0.0022);
  }

  spawnCommanderJudgmentAfterimage() {
    const config = ENEMIES.potatoCommander;
    const afterimageMs = config.judgmentAfterimageMs ?? 680;

    const burn = this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0xfffdf2, 0.28)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(19986)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: burn,
      alpha: 0,
      duration: afterimageMs,
      ease: 'Quad.Out',
      onComplete: () => burn.destroy()
    });

    const count = 7;
    for (let i = 0; i < count; i += 1) {
      const gx = Phaser.Math.Between(70, GAME.WIDTH - 70);
      const gy = Phaser.Math.Between(105, GAME.HEIGHT - 60);
      const ghostW = Phaser.Math.Between(78, 128);
      const ghostH = Phaser.Math.Between(120, 205);
      const line = Math.max(8, Math.round(ghostW * 0.16));
      const tint = i % 3 === 0 ? 0xff8a76 : 0xfff0bc;
      const alpha = i % 2 === 0 ? 0.28 : 0.20;
      const angle = Phaser.Math.Between(-14, 14);
      const ghostV = this.add.rectangle(gx, gy, line, ghostH, tint, alpha)
        .setScrollFactor(0)
        .setDepth(19984)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAngle(angle);
      const ghostHBar = this.add.rectangle(gx, gy, ghostW, line, tint, alpha)
        .setScrollFactor(0)
        .setDepth(19984)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAngle(angle);
      this.tweens.add({
        targets: [ghostV, ghostHBar],
        alpha: 0,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: Phaser.Math.Between(260, 340),
        ease: 'Quad.Out',
        onComplete: () => {
          ghostV.destroy();
          ghostHBar.destroy();
        }
      });
    }
  }

  eraseJudgmentVictimsInCamera() {
    const camera = this.cameras.main;
    const view = camera.worldView;
    const victims = [];

    this.enemies.children.iterate((enemy) => {
      if (
        !enemy?.active
        || enemy.isDead
        || enemy.isBoss === true
        || ['potatoCommander', 'duckQueen'].includes(enemy.enemyType)
      ) return;

      if (
        enemy.x < view.x - 20
        || enemy.x > view.right + 20
        || enemy.y < view.y - 20
        || enemy.y > view.bottom + 20
      ) return;

      victims.push(enemy);
    });

    victims.forEach((enemy, index) => {
      if (!enemy?.active) return;

      enemy.isDead = true;
      enemy.setVelocity?.(0, 0);
      if (enemy.body) enemy.body.enable = false;
      this.tweens.killTweensOf(enemy);
      this.importantText?.clearSource(enemy);

      const flash = this.add.circle(
        enemy.x,
        enemy.y,
        Math.max(8, Math.min(18, Math.max(enemy.displayWidth, enemy.displayHeight) * 0.22)),
        index % 2 === 0 ? 0xffd96f : 0xff4f59,
        0.86
      )
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(Math.max(24, (enemy.depth ?? 8) + 3));

      enemy.setTintFill?.(0xffffff);
      this.tweens.add({
        targets: enemy,
        alpha: 0,
        scaleX: enemy.scaleX * 0.72,
        scaleY: enemy.scaleY * 0.72,
        duration: Phaser.Math.Between(150, 240),
        delay: Phaser.Math.Between(0, 110),
        ease: 'Cubic.In',
        onComplete: () => {
          if (enemy?.active) enemy.destroy();
        }
      });

      this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 3.2,
        scaleY: 3.2,
        duration: 260,
        delay: Phaser.Math.Between(0, 80),
        ease: 'Quad.Out',
        onComplete: () => flash.destroy()
      });
    });

    return victims.length;
  }

  resolveCommanderJudgment(commander, shade) {
    if (!commander?.active || commander.isDead) return;
    const config = ENEMIES.potatoCommander;

    const explosionWidth = Math.min(GAME.WIDTH * 0.96, 910);
    const explosionHeight = explosionWidth / 1.79;
    const explosion = this.textures.exists('potatoCommanderJudgmentExplosionArt')
      ? this.add.image(
        GAME.WIDTH / 2,
        GAME.HEIGHT / 2 + 38,
        'potatoCommanderJudgmentExplosionArt'
      )
        .setScrollFactor(0)
        .setDepth(19970)
        .setDisplaySize(explosionWidth, explosionHeight)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setScale(0.82)
      : null;

    if (explosion) {
      this.tweens.add({
        targets: explosion,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 95,
        ease: 'Cubic.Out'
      });
      this.time.delayedCall(500, () => {
        if (!explosion?.active) return;
        this.tweens.add({
          targets: explosion,
          alpha: 0,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 380,
          ease: 'Quad.Out',
          onComplete: () => explosion.destroy()
        });
      });
    }

    const whiteout = this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0xffffff, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(19990)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.cameras.main.flash(85, 255, 58, 72, false);
    this.time.delayedCall(78, () => {
      if (!whiteout?.active) return;
      whiteout.setAlpha(1);
      this.cameras.main.flash(250, 255, 255, 255, false);
      this.time.delayedCall(90, () => {
        if (!whiteout?.active) return;
        this.tweens.add({
          targets: whiteout,
          alpha: 0,
          duration: 360,
          ease: 'Quad.Out',
          onComplete: () => whiteout.destroy()
        });
      });
    });
    this.time.delayedCall(260, () => {
      this.cameras.main.flash(180, 255, 226, 168, false);
    });
    this.cameras.main.shake(820, 0.026);
    this.time.delayedCall(155, () => this.spawnCommanderJudgmentAfterimage());

    const actualDamage = this.player.takeUnavoidableCurrentHpRatioDamage?.(
      config.judgmentDamageCurrentHpRatio ?? config.judgmentDamageMaxHpRatio ?? 0.60
    ) ?? 0;

    if (this.player?.active && this.player.hp > 0) {
      this.player.judgmentPanicTween?.stop();
      this.player.judgmentPanicTween = null;
      this.player.setAlpha(1);
      this.player.clearTint?.();
      const judgmentKnockdownDelayMs = 105;
      const judgmentKnockdownHoldMs = 620;
      const judgmentKnockdownFlickerMs = 430;
      const judgmentUpgradeGraceMs = 1000;
      this.upgradeBlockedUntil = Math.max(
        this.upgradeBlockedUntil ?? -Infinity,
        this.time.now
          + judgmentKnockdownDelayMs
          + judgmentKnockdownHoldMs
          + judgmentKnockdownFlickerMs
          + judgmentUpgradeGraceMs
      );
      const blastDirection = new Phaser.Math.Vector2(
        this.player.x - commander.x,
        this.player.y - commander.y
      );
      if (blastDirection.lengthSq() <= 1) blastDirection.set(1, 0);
      this.time.delayedCall(judgmentKnockdownDelayMs, () => {
        if (!this.player?.active || this.player.hp <= 0) return;
        this.player.playJudgmentKnockdownVisual?.(
          judgmentKnockdownHoldMs,
          judgmentKnockdownFlickerMs,
          {
            slideDirection: blastDirection,
            slideDistance: 30,
            slideDurationMs: 210,
            bossDirectionX: commander.x - this.player.x
          },
          this.time.now
        );
      });
    }

    if (actualDamage > 0) {
      this.showHpDamageText(
        'potatoCommander',
        this.player.x,
        this.player.y - 48,
        actualDamage,
        { durationMs: 1700, rise: 52, depth: 360 }
      );
    }

    const erased = this.eraseJudgmentVictimsInCamera();
    this.spawnSuppressedUntil = Math.max(
      this.spawnSuppressedUntil ?? -Infinity,
      this.time.now + (config.judgmentSpawnBreatherMs ?? 1500)
    );

    if ((this.judgmentHudCrosses ?? []).some((cross) => cross?.active)) {
      this.tweens.add({
        targets: this.judgmentHudCrosses,
        alpha: 0.35,
        duration: 80,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.InOut'
      });
    }

    this.time.delayedCall(420, () => {
      if (!commander?.active || commander.isDead) return;
      commander.resetJudgmentCycle?.();
      this.updateCommanderJudgmentHud(commander, false, { createIfMissing: false });
      if (erased > 0) {
        this.showScreenNotice(`「清除 ${erased} 只场内怪物」`, '#ffd36b');
      }
    });

    if (shade?.active) {
      this.tweens.add({
        targets: shade,
        alpha: 0,
        duration: 420,
        ease: 'Quad.Out',
        onComplete: () => shade.destroy()
      });
    }
  }

  startCommanderJudgment(commander) {
    if (
      !commander?.active
      || commander.isDead
      || commander.phaseIndex < 3
      || commander.judgmentPending !== true
      || this.commanderJudgmentActive === true
      || this.commanderBlackwaterPreviewActive === true
    ) return false;

    return this.startCommanderBlackwaterCutscene(commander);
  }

  startCommanderJudgmentLegacy(commander) {
    if (
      !commander?.active
      || commander.isDead
      || commander.phaseIndex < 3
      || commander.judgmentPending !== true
      || this.commanderJudgmentActive === true
    ) return false;

    const config = ENEMIES.potatoCommander;
    this.commanderJudgmentActive = true;
    this.judgmentHeadHitStreak = 0;
    this.judgmentLastHeadHitAt = -Infinity;
    this.judgmentRainAnchorX = this.player?.x ?? null;
    this.judgmentRainAnchorY = this.player?.y ?? null;
    this.judgmentRainCellOrder = Phaser.Utils.Array.Shuffle(Array.from({ length: 12 }, (_, index) => index));
    this.judgmentRainCellCursor = 0;
    commander.setVelocity(0, 0);
    commander.cancelBasicAttackBurst?.();
    commander.showJudgmentSkillArt?.();

    this.updateCommanderJudgmentHud(commander, false);

    const introMs = config.judgmentIntroMs ?? 760;
    const counts = config.judgmentRainCounts ?? [5, 8, 14];
    const intervals = config.judgmentRainIntervalsMs ?? [260, 150, 80];
    const falls = config.judgmentRainFallMs ?? [470, 380, 290];
    let cursorMs = introMs;

    const forcedOpenerPattern = [
      { delay: 0, mode: 'anchorFeet' },
      { delay: 320, mode: 'anchorNear' },
      { delay: 670, mode: 'anchorHead' },
      { delay: 1020, mode: 'anchorFeet' }
    ];
    forcedOpenerPattern.forEach(({ delay, mode }) => {
      this.time.delayedCall(introMs + delay, () => {
        if (!commander?.active || commander.isDead || this.commanderJudgmentActive !== true) return;
        this.spawnCommanderJudgmentRainCross(0, 0.18, mode);
      });
    });

    counts.forEach((count, stageIndex) => {
      const baseInterval = intervals[stageIndex] ?? 120;
      let stageElapsed = 0;
      for (let i = 0; i < count; i += 1) {
        const progress = count <= 1 ? 1 : (i / (count - 1));
        let phaseInterval = baseInterval;
        if (stageIndex === 1) {
          phaseInterval = Math.max(96, Math.round(Phaser.Math.Linear(baseInterval * 1.16, baseInterval * 0.72, progress)));
        } else if (stageIndex === 2) {
          const cubicProgress = progress * progress * progress;
          phaseInterval = Math.max(7, Math.round(
            Phaser.Math.Linear(baseInterval * 1.36, 7, cubicProgress)
          ));
        }
        this.time.delayedCall(cursorMs + stageElapsed, () => {
          if (!commander?.active || commander.isDead || this.commanderJudgmentActive !== true) return;
          this.spawnCommanderJudgmentRainCross(stageIndex, progress);
          if (stageIndex === 2 && progress > 0.46 && Math.random() < Phaser.Math.Linear(0.30, 0.78, progress)) {
            this.time.delayedCall(Math.max(4, Math.round(phaseInterval * 0.18)), () => {
              if (!commander?.active || commander.isDead || this.commanderJudgmentActive !== true) return;
              this.spawnCommanderJudgmentRainCross(stageIndex, Math.min(1, progress + 0.10));
            });
          }
          if (stageIndex === 2 && progress > 0.70 && Math.random() < Phaser.Math.Linear(0.52, 0.90, progress)) {
            this.time.delayedCall(Math.max(5, Math.round(phaseInterval * 0.08)), () => {
              if (!commander?.active || commander.isDead || this.commanderJudgmentActive !== true) return;
              this.spawnCommanderJudgmentRainCross(stageIndex, 1);
            });
          }
        });
        stageElapsed += phaseInterval;
      }
      cursorMs += stageElapsed;
    });

    const finalAt = cursorMs + Math.max(...falls) + (config.judgmentRainFinalDelayMs ?? 240);
    const endingBurst = [
      { offset: -380, count: 2 },
      { offset: -275, count: 3 },
      { offset: -185, count: 4 },
      { offset: -105, count: 5 },
      { offset: -45, count: 6 }
    ];
    endingBurst.forEach(({ offset, count }) => {
      const fireAt = finalAt + offset;
      if (fireAt <= introMs) return;
      this.time.delayedCall(fireAt, () => {
        if (!commander?.active || commander.isDead || this.commanderJudgmentActive !== true) return;
        for (let i = 0; i < count; i += 1) {
          this.time.delayedCall(i * 10, () => {
            if (!commander?.active || commander.isDead || this.commanderJudgmentActive !== true) return;
            this.spawnCommanderJudgmentRainCross(2, 1);
          });
        }
      });
    });
    const panicLeadMs = config.judgmentPanicLeadMs ?? 760;
    const panicAt = Math.max(introMs, finalAt - panicLeadMs);
    this.time.delayedCall(panicAt, () => {
      if (!commander?.active || commander.isDead || this.commanderJudgmentActive !== true) return;
      this.startCommanderJudgmentPanic(panicLeadMs);
    });
    const totalLockMs = finalAt + (config.judgmentPostHoldMs ?? 900);
    this.spawnCommanderJudgmentCastAura(commander, totalLockMs - 180);
    commander.actionLockedUntil = Math.max(
      commander.actionLockedUntil,
      this.time.now + totalLockMs
    );

    const shade = this.add.rectangle(
      0,
      0,
      GAME.WIDTH,
      GAME.HEIGHT,
      0x160307,
      0
    )
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(19940);

    this.tweens.add({
      targets: shade,
      alpha: 0.30,
      duration: introMs,
      ease: 'Sine.Out'
    });


    this.time.delayedCall(finalAt, () => {
      if (!commander?.active || commander.isDead || this.commanderJudgmentActive !== true) {
        if (shade?.active) shade.destroy();
        return;
      }
      this.resolveCommanderJudgment(commander, shade);
    });

    this.time.delayedCall(totalLockMs, () => {
      if (!commander?.active || commander.isDead) {
        this.commanderJudgmentActive = false;
        return;
      }

      commander.restoreNormalAfterJudgment?.();
      commander.nextActionAt = this.time.now + 2800;
      commander.nextPopulationCheckAt = this.time.now + (config.judgmentSpawnBreatherMs ?? 1500);
      commander.nextEmergencyGroupAt = this.time.now + (config.judgmentSpawnBreatherMs ?? 1500) + 650;
      this.commanderJudgmentActive = false;
      this.judgmentRainAnchorX = null;
      this.judgmentRainAnchorY = null;
    });

    return true;
  }

  stopPotatoPityMode() {
    this.potatoPityActive = false;

    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active) return;

      if (enemy.enemyType === 'duck') {
        enemy.pityResponse = null;
        enemy.setScale(1);
        enemy.clearTint();
        enemy.refreshStatusPresentation?.();
      }

      if (enemy.enemyType === 'potato') {
        enemy.berserk = false;
      }
    });
  }

  trackPotatoCommanderEndingFx(obj) {
    if (obj) this.potatoCommanderEndingFx.push(obj);
    return obj;
  }

  schedulePotatoCommanderEnding(delay, fn) {
    const event = this.time.delayedCall(Math.max(0, delay), () => {
      if (!this.potatoCommanderEndingActive) return;
      fn?.();
    });
    this.potatoCommanderEndingEvents.push(event);
    return event;
  }

  stopPotatoCommanderEndingAudio() {
    const state = this.potatoCommanderEndingAudio;
    this.potatoCommanderEndingAudio = null;
    if (!state) return;
    [state.sendoff, state.victory, state.frog].forEach((sound) => {
      try {
        sound?.stop?.();
        sound?.destroy?.();
      } catch (_) {}
    });
  }

  startPotatoCommanderSendoffMusic() {
    if (!this.cache?.audio?.exists?.('potatoEndingSendoffMusic')) return null;
    const sound = this.sound.add('potatoEndingSendoffMusic', {
      volume: 0.76,
      rate: 1,
      loop: false
    });
    this.potatoCommanderEndingAudio ??= { sendoff: null, victory: null, frog: null };
    this.potatoCommanderEndingAudio.sendoff = sound;
    sound.play();
    return sound;
  }

  startPotatoCommanderVictoryMusic() {
    if (!this.cache?.audio?.exists?.('duckQueenVictoryMusic')) return null;
    const sound = this.sound.add('duckQueenVictoryMusic', {
      volume: 0.78,
      rate: 1,
      loop: false
    });
    this.potatoCommanderEndingAudio ??= { sendoff: null, victory: null, frog: null };
    this.potatoCommanderEndingAudio.victory = sound;
    sound.play();
    return sound;
  }

  startPotatoCommanderFrogMusic() {
    if (!this.cache?.audio?.exists?.('potatoEndingFrogMusic')) return null;
    const sound = this.sound.add('potatoEndingFrogMusic', {
      volume: 0.80,
      rate: 1,
      loop: true
    });
    this.potatoCommanderEndingAudio ??= { sendoff: null, victory: null, frog: null };
    this.potatoCommanderEndingAudio.frog = sound;
    sound.play();
    return sound;
  }

  ensurePotatoDuckStewEndingTexture() {
    const key = 'potatoDuckStewEndingArt';
    if (this.textures.exists(key)) return key;

    const tex = this.textures.createCanvas(key, 520, 300);
    const ctx = tex?.context;
    if (!ctx) return key;

    ctx.clearRect(0, 0, 520, 300);
    const bg = ctx.createLinearGradient(0, 0, 0, 300);
    bg.addColorStop(0, '#f8ead1');
    bg.addColorStop(1, '#d8af78');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 520, 300);

    ctx.fillStyle = '#69462f';
    ctx.fillRect(0, 235, 520, 65);
    ctx.fillStyle = '#2a3038';
    ctx.beginPath();
    ctx.ellipse(260, 176, 178, 88, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4c5963';
    ctx.beginPath();
    ctx.ellipse(260, 160, 168, 78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8e3f23';
    ctx.beginPath();
    ctx.ellipse(260, 158, 151, 64, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c96632';
    ctx.beginPath();
    ctx.ellipse(260, 151, 143, 54, 0, 0, Math.PI * 2);
    ctx.fill();

    const potatoPieces = [
      [176, 145, 33, 22, -0.18], [231, 176, 35, 23, 0.20], [315, 144, 37, 23, -0.12],
      [350, 173, 29, 20, 0.28], [270, 131, 32, 21, 0.10], [205, 119, 28, 18, -0.30]
    ];
    ctx.fillStyle = '#e8bd63';
    ctx.strokeStyle = '#9c6f2d';
    ctx.lineWidth = 3;
    potatoPieces.forEach(([x, y, w, h, r]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 7);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    ctx.fillStyle = '#f2d65f';
    ctx.strokeStyle = '#855e24';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(292, 104, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath(); ctx.arc(280, 97, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(303, 97, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#df7f2c';
    ctx.beginPath();
    ctx.ellipse(293, 115, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    [[185, 92], [250, 70], [335, 82]].forEach(([x, y], idx) => {
      ctx.beginPath();
      ctx.moveTo(x, y + 15);
      ctx.bezierCurveTo(x - 14, y, x + 15, y - 10, x + (idx - 1) * 5, y - 28);
      ctx.stroke();
    });

    ctx.fillStyle = 'rgba(25, 18, 14, 0.78)';
    ctx.beginPath();
    ctx.roundRect(168, 241, 184, 46, 14);
    ctx.fill();
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#120b08';
    ctx.lineWidth = 8;
    ctx.strokeText('土豆炖鸭', 260, 264);
    ctx.fillStyle = '#fff3a6';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 8;
    ctx.fillText('土豆炖鸭', 260, 264);
    ctx.shadowBlur = 0;
    tex.refresh();
    return key;
  }

  createPotatoCommanderEndingFlag() {
    const flagX = GAME.WIDTH / 2;
    const topY = 155;
    const bottomY = 404;

    const pole = this.trackPotatoCommanderEndingFx(
      this.add.rectangle(flagX, 278, 8, 258, 0xc8c6b7, 1)
        .setScrollFactor(0)
        .setDepth(32010)
        .setStrokeStyle(2, 0x555b62, 1)
    );
    const base = this.trackPotatoCommanderEndingFx(
      this.add.ellipse(flagX, 410, 72, 18, 0x3d4248, 1)
        .setScrollFactor(0)
        .setDepth(32011)
    );
    const finial = this.trackPotatoCommanderEndingFx(
      this.add.circle(flagX, 145, 8, 0xd7cf8b, 1)
        .setScrollFactor(0)
        .setDepth(32012)
    );

    const cloth = this.add.graphics();
    cloth.fillStyle(0xc7192f, 1);
    cloth.fillRect(0, 0, 112, 54);
    cloth.fillTriangle(112, 0, 142, 27, 112, 54);
    cloth.lineStyle(2, 0x7f0b1b, 0.9);
    cloth.strokeRect(0, 0, 112, 54);
    const flag = this.trackPotatoCommanderEndingFx(
      this.add.container(flagX + 5, bottomY, [cloth])
        .setScrollFactor(0)
        .setDepth(32013)
        .setAlpha(1)
    );
    flag.setData('endingFlagTopY', topY);
    flag.setData('endingFlagBottomY', bottomY);
    this.potatoCommanderEndingFlag = flag;
    return { pole, base, finial, flag, topY, bottomY };
  }

  spawnPotatoCommanderEndingGoldDissolve(x, y) {
    for (let i = 0; i < 48; i += 1) {
      const particle = this.trackPotatoCommanderEndingFx(
        this.add.circle(
          x + Phaser.Math.Between(-62, 62),
          y + Phaser.Math.Between(-42, 42),
          Phaser.Math.Between(2, 5),
          Phaser.Math.RND.pick([0xffd45a, 0xffef9b, 0xffc64b, 0xffffff]),
          Phaser.Math.FloatBetween(0.55, 0.95)
        ).setScrollFactor(0).setDepth(32033).setBlendMode(Phaser.BlendModes.ADD)
      );
      const delay = Phaser.Math.Between(0, 240);
      this.tweens.add({
        targets: particle,
        x: particle.x + Phaser.Math.Between(-30, 30),
        y: particle.y - Phaser.Math.Between(55, 120),
        alpha: 0,
        scaleX: Phaser.Math.FloatBetween(0.15, 0.45),
        scaleY: Phaser.Math.FloatBetween(0.15, 0.45),
        delay,
        duration: Phaser.Math.Between(480, 720),
        ease: 'Sine.Out',
        onComplete: () => particle?.active && particle.destroy()
      });
    }
  }


  getPotatoCommanderEndingTitles() {
    const kills = this.kills ?? {};
    const titles = [
      {
        text: '最强野心家',
        color: '#94d5f3',
        stroke: '#163d58',
        glow: true
      }
    ];

    if ((Number(kills.roach) || 0) >= 500) {
      titles.push({ text: '灭虫高手', color: '#a447bf', stroke: '#32103f' });
    }
    if ((Number(kills.duck) || 0) >= 500) {
      titles.push({ text: '老鸭屠夫', color: '#f3d85b', stroke: '#5c4a10' });
    }
    if ((Number(kills.potato) || 0) >= 500) {
      titles.push({ text: '淀粉制造机', color: '#c8895f', stroke: '#4a2618' });
    }
    if ((Number(kills.ball) || 0) >= 50) {
      titles.push({ text: '踢球达人', color: '#f2f2f2', stroke: '#111111' });
    }

    return titles;
  }

  getDifficultySummaryStyle() {
    if (this.difficultyProfile?.key === 'easy') {
      return { color: '#63D879', stroke: '#173a23', glow: '#63D879' };
    }
    if (this.difficultyProfile?.key === 'hard') {
      return { color: '#FFD15A', stroke: '#5d4208', glow: '#FFD15A' };
    }
    return { color: '#5FB8FF', stroke: '#123d63', glow: '#5FB8FF' };
  }

  createPotatoCommanderBattleSummaryCard() {
    const elapsedSeconds = this.victoryElapsedSeconds ?? this.getGameplayElapsedSeconds();
    const seconds = Math.max(0, Math.floor(elapsedSeconds));
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    const totalKills = this.getKillStatEntries().reduce((sum, entry) => sum + entry.count, 0);
    const difficultyLabel = this.difficultyProfile?.label ?? '普通';
    const difficultyStyle = this.getDifficultySummaryStyle();
    const hp = Math.max(0, Math.round(Number(this.player?.hp) || 0));
    const maxHp = Math.max(1, Math.round(Number(this.player?.maxHp) || 1));
    const bossKills = Math.max(0, Number(this.kills?.duckQueen) || 0)
      + Math.max(0, Number(this.kills?.potatoCommander) || 0);
    const roachKills = Math.max(0, Number(this.kills?.roach) || 0);
    const duckKills = Math.max(0, Number(this.kills?.duck) || 0);
    const potatoKills = Math.max(0, Number(this.kills?.potato) || 0);
    const ballKills = Math.max(0, Number(this.kills?.ball) || 0);
    const titleBadges = this.getPotatoCommanderEndingTitles();

    const objects = [];
    const track = (obj) => {
      objects.push(this.trackPotatoCommanderEndingFx(obj));
      return obj;
    };

    const panel = track(
      this.add.rectangle(GAME.WIDTH / 2, 241, 760, 390, 0x07111e, 0.94)
        .setScrollFactor(0)
        .setDepth(70024)
        .setStrokeStyle(2, 0x6f8da5, 0.82)
        .setAlpha(0)
    );
    track(
      this.add.text(GAME.WIDTH / 2, 70, '战斗总结', {
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#f4fbff',
        stroke: '#10283a',
        strokeThickness: 6
      }).setOrigin(0.5).setScrollFactor(0).setDepth(70026).setAlpha(0).setPadding(4, 5, 4, 5)
    );

    const summaryRows = [
      [`本局难度`, difficultyLabel, `存活时间`, `${mm}:${ss}`],
      [`最终等级`, `Lv.${Math.max(1, Number(this.level) || 1)}`, `最终 HP`, `${hp} / ${maxHp}`],
      [`总击杀`, `${totalKills}`, `最高 Combo`, `x${Math.max(0, Number(this.highestCombo) || 0)}`],
      [`击败 Boss`, `${bossKills}`, `章节`, '土豆指挥官']
    ];

    summaryRows.forEach((row, index) => {
      const y = 118 + index * 36;
      track(
        this.add.text(165, y, row[0], {
          fontSize: '14px', color: '#89a8bf', fontStyle: 'bold'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(70026).setAlpha(0).setPadding(2, 3, 2, 3)
      );
      const isDifficultyValue = row[0] === '本局难度';
      track(
        this.add.text(272, y, row[1], {
          fontSize: '17px',
          color: isDifficultyValue ? difficultyStyle.color : '#ffffff',
          fontStyle: 'bold',
          stroke: isDifficultyValue ? difficultyStyle.stroke : undefined,
          strokeThickness: isDifficultyValue ? 4 : 0,
          shadow: isDifficultyValue
            ? { offsetX: 0, offsetY: 0, color: difficultyStyle.glow, blur: 6, fill: true }
            : undefined
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(70026).setAlpha(0).setPadding(2, 3, 2, 3)
      );
      track(
        this.add.text(514, y, row[2], {
          fontSize: '14px', color: '#89a8bf', fontStyle: 'bold'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(70026).setAlpha(0).setPadding(2, 3, 2, 3)
      );
      track(
        this.add.text(628, y, row[3], {
          fontSize: '17px', color: row[2] === '最终 HP' ? '#b9f2c8' : '#ffffff', fontStyle: 'bold'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(70026).setAlpha(0).setPadding(2, 3, 2, 3)
      );
    });

    const killRows = [
      [`紫蟑螂`, roachKills, '#a447bf', `鸭子`, duckKills, '#f3d85b'],
      [`土豆`, potatoKills, '#c8895f', `足球`, ballKills, '#f2f2f2']
    ];
    killRows.forEach((row, index) => {
      const y = 272 + index * 34;
      track(
        this.add.text(225, y, `${row[0]}  ${row[1]}`, {
          fontSize: '16px', fontStyle: 'bold', color: row[2], stroke: '#0b1118', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(70027).setAlpha(0).setPadding(3, 3, 3, 3)
      );
      track(
        this.add.text(590, y, `${row[3]}  ${row[4]}`, {
          fontSize: '16px', fontStyle: 'bold', color: row[5], stroke: '#0b1118', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(70027).setAlpha(0).setPadding(3, 3, 3, 3)
      );
    });

    track(
      this.add.text(GAME.WIDTH / 2, 342, '获得称号', {
        fontSize: '15px', fontStyle: 'bold', color: '#8daec7'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(70027).setAlpha(0).setPadding(3, 3, 3, 3)
    );

    const badgeSpacing = Math.min(122, titleBadges.length > 1 ? 560 / (titleBadges.length - 1) : 0);
    titleBadges.forEach((badge, index) => {
      const x = titleBadges.length === 1
        ? GAME.WIDTH / 2
        : GAME.WIDTH / 2 - (badgeSpacing * (titleBadges.length - 1)) / 2 + badgeSpacing * index;
      const text = track(
        this.add.text(x, 382, badge.text, {
          fontSize: badge.text === '最强野心家' ? '18px' : '16px',
          fontStyle: 'bold',
          color: badge.color,
          stroke: badge.stroke,
          strokeThickness: badge.text === '最强野心家' ? 6 : 5,
          shadow: badge.glow ? { offsetX: 0, offsetY: 0, color: '#94d5f3', blur: 9, fill: true } : undefined
        }).setOrigin(0.5).setScrollFactor(0).setDepth(70028).setAlpha(0).setPadding(5, 5, 5, 5)
      );
      void text;
    });

    objects.forEach((obj, index) => {
      if (!obj?.active) return;
      this.tweens.add({
        targets: obj,
        alpha: obj === panel ? 0.94 : 1,
        y: obj.y - (obj === panel ? 0 : 4),
        delay: index * 26,
        duration: 440,
        ease: 'Sine.Out'
      });
    });

    this.potatoCommanderBattleSummaryFx = objects;
    return objects;
  }

  hidePotatoCommanderBattleSummaryCard(duration = 460) {
    const objects = this.potatoCommanderBattleSummaryFx ?? [];
    this.potatoCommanderBattleSummaryFx = [];
    objects.forEach((obj) => {
      if (!obj?.active) return;
      this.tweens.killTweensOf(obj);
      this.tweens.add({
        targets: obj,
        alpha: 0,
        y: obj.y - 5,
        duration,
        ease: 'Sine.In',
        onComplete: () => obj?.active && obj.destroy()
      });
    });
  }

  showPotatoCommanderCreditsOnBlack(curtain) {
    if (!this.potatoCommanderEndingActive) return;
    if (curtain?.active) curtain.setAlpha(1);

    const credits = [];
    const addCredit = (text, y, style = {}) => {
      const item = this.trackPotatoCommanderEndingFx(
        this.add.text(GAME.WIDTH / 2, y, text, {
          fontSize: style.fontSize ?? '21px',
          fontStyle: style.fontStyle ?? 'bold',
          color: style.color ?? '#f5f5f5',
          stroke: '#000000',
          strokeThickness: 5,
          align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(70030).setAlpha(0)
      );
      credits.push(item);
      return item;
    };

    addCredit('鸣谢', 104, { fontSize: '32px', color: '#f2d58a' });
    addCredit('制作人：SQLF_', 158);
    addCredit('策划：SQLF_', 198);
    addCredit('代码：SQLF_', 238);
    addCredit('剧本：SQLF_', 278);
    addCredit('特别鸣谢：乘风破浪的东宫', 342, { color: '#94d5f3' });
    addCredit('灵感来源：土豆炖鸭', 386, { color: '#ffd7a0' });

    this.schedulePotatoCommanderEnding(650, () => {
      credits.forEach((item, index) => {
        this.tweens.add({
          targets: item,
          alpha: 1,
          y: item.y - 6,
          delay: index * 180,
          duration: 520,
          ease: 'Sine.Out'
        });
      });
    });

    this.schedulePotatoCommanderEnding(9300, () => {
      credits.forEach((item) => {
        if (!item?.active) return;
        this.tweens.add({ targets: item, alpha: 0, duration: 620, ease: 'Sine.In' });
      });
    });

    let finalFrame = null;
    let finalPicture = null;
    this.schedulePotatoCommanderEnding(10100, () => {
      const stewKey = this.ensurePotatoDuckStewEndingTexture();
      finalFrame = this.trackPotatoCommanderEndingFx(
        this.add.rectangle(GAME.WIDTH / 2, GAME.HEIGHT / 2, 594, 374, 0xf1dfbe, 1)
          .setScrollFactor(0)
          .setDepth(70039)
          .setStrokeStyle(6, 0x5d3c27, 1)
          .setAlpha(0)
      );
      finalPicture = this.trackPotatoCommanderEndingFx(
        this.add.image(GAME.WIDTH / 2, GAME.HEIGHT / 2, stewKey)
          .setScrollFactor(0)
          .setDepth(70040)
          .setDisplaySize(540, 312)
          .setAlpha(0)
      );
      this.tweens.add({ targets: [finalFrame, finalPicture], alpha: 1, duration: 600, ease: 'Sine.Out' });
    });

    this.schedulePotatoCommanderEnding(16600, () => {
      [finalFrame, finalPicture].forEach((obj) => {
        if (!obj?.active) return;
        this.tweens.add({ targets: obj, alpha: 0, duration: 720, ease: 'Sine.In' });
      });
    });

    this.schedulePotatoCommanderEnding(17550, () => {
      this.finishPotatoCommanderEndingToTitle();
    });
  }

  showPotatoCommanderFrogCredits() {
    if (!this.potatoCommanderEndingActive) return;

    this.hideDuckQueenVictoryEndingCutin({ slideRight: false, duration: 160 });
    if (this.player?.active) this.player.setAlpha(0);

    const curtain = this.trackPotatoCommanderEndingFx(
      this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.10)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(70000)
    );
    this.potatoCommanderEndingCurtain = curtain;

    const body = this.add.graphics();
    body.fillStyle(0x41b96c, 1);
    body.fillEllipse(0, 16, 68, 58);
    body.fillEllipse(-29, 42, 40, 18);
    body.fillEllipse(29, 42, 40, 18);
    body.fillStyle(0x70d889, 1);
    body.fillEllipse(-35, 15, 28, 15);
    body.fillEllipse(35, 15, 28, 15);

    const head = this.add.text(0, -34, '🐸', { fontSize: '66px' }).setOrigin(0.5);
    const frog = this.trackPotatoCommanderEndingFx(
      this.add.container(GAME.WIDTH / 2, 345, [body, head])
        .setScrollFactor(0)
        .setDepth(70020)
        .setAlpha(0)
    );
    this.potatoCommanderEndingFrog = frog;
    this.tweens.add({
      targets: frog,
      alpha: 1,
      y: 300,
      duration: 420,
      ease: 'Back.Out'
    });
    this.tweens.add({
      targets: frog,
      y: 252,
      angle: { from: -3, to: 3 },
      duration: 360,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.Out'
    });

    this.startPotatoCommanderFrogMusic();

    this.schedulePotatoCommanderEnding(620, () => {
      if (!frog?.active) return;
      this.tweens.killTweensOf(frog);
      this.tweens.add({
        targets: frog,
        y: 468,
        scaleX: 0.70,
        scaleY: 0.70,
        duration: 520,
        ease: 'Sine.InOut',
        onComplete: () => {
          if (!frog?.active) return;
          this.tweens.add({
            targets: frog,
            y: 438,
            angle: { from: -4, to: 4 },
            duration: 330,
            yoyo: true,
            repeat: -1,
            ease: 'Quad.Out'
          });
        }
      });
      this.createPotatoCommanderBattleSummaryCard();
    });

    this.schedulePotatoCommanderEnding(10200, () => {
      this.hidePotatoCommanderBattleSummaryCard(620);
    });
    this.schedulePotatoCommanderEnding(10900, () => {
      if (frog?.active) {
        this.tweens.killTweensOf(frog);
        this.tweens.add({ targets: frog, alpha: 0, y: frog.y - 26, duration: 720, ease: 'Sine.In' });
      }
      if (curtain?.active) {
        this.tweens.add({
          targets: curtain,
          alpha: 1,
          duration: 1250,
          ease: 'Sine.InOut',
          onComplete: () => {
            if (frog?.active) frog.destroy();
            this.potatoCommanderEndingFrog = null;
            const flagParts = this.potatoCommanderEndingFlagParts ?? {};
            Object.values(flagParts).forEach((part) => {
              if (part?.active) part.setVisible(false).setAlpha(0);
            });
            if (this.potatoCommanderEndingBossActor?.active) {
              this.potatoCommanderEndingBossActor.setVisible(false).setAlpha(0);
            }
            this.showPotatoCommanderCreditsOnBlack(curtain);
          }
        });
      } else {
        this.showPotatoCommanderCreditsOnBlack(curtain);
      }
    });
  }

  finishPotatoCommanderEndingToTitle() {
    if (!this.potatoCommanderEndingActive) return;

    this.stopPotatoCommanderEndingAudio();
    this.stopDuckQueenVictoryMusic();
    this.stopDuckQueenVictoryEndingAudio();
    this.adaptiveMusic?.stop?.();

    this.potatoCommanderEndingEvents.forEach((event) => event?.remove?.(false));
    this.potatoCommanderEndingEvents = [];
    this.potatoCommanderEndingFx.forEach((obj) => obj?.active && obj.destroy());
    this.potatoCommanderEndingFx = [];

    this.duckQueenVictoryEndingCutinActor = null;
    this.duckQueenVictoryEndingCutinShade = null;
    this.duckQueenVictoryEndingDefeatActor = null;
    this.potatoCommanderEndingFlag = null;
    this.potatoCommanderEndingBossActor = null;
    this.potatoCommanderEndingFrog = null;
    this.potatoCommanderEndingCurtain = null;
    this.potatoCommanderBattleSummaryFx = [];
    this.potatoCommanderEndingActive = false;
    this.endingSequenceActive = false;
    this.finished = true;

    this.scene.start('StartScene');
  }

  startPotatoCommanderEnding(commander) {
    if (
      this.endingSequenceActive
      || !commander?.active
    ) return false;

    this.endingSequenceActive = true;
    this.potatoCommanderEndingActive = true;
    this.potatoCommanderEndingEvents = [];
    this.potatoCommanderEndingFx = [];
    this.potatoCommanderEndingAudio = { sendoff: null, victory: null, frog: null };
    this.victoryElapsedSeconds = this.getGameplayElapsedSeconds();
    this.adaptiveMusic?.pause?.();

    this.bossActive = false;
    this.potatoCommanderDefeated = true;
    this.stopPotatoPityMode();
    this.commanderSkySmashActive = false;
    this.commanderLikeAttackActive = false;
    this.commanderLikePlayerHitUntil = -Infinity;
    this.commanderJudgmentActive = false;
    this.clearBossHud();

    this.captureDuckQueenVictoryEndingHud();
    this.captureDuckQueenVictoryEndingPlayerVisual();
    this.captureDuckQueenVictoryEndingCombatLayer();
    this.hideDuckQueenVictoryEndingBeatIndicators();

    this.physics.world.pause();
    this.player?.setVelocity?.(0, 0);
    this.cameras.main.stopFollow();
    if (commander.body) commander.body.enable = false;
    commander.setVelocity(0, 0);

    const originX = commander.x;
    const originY = commander.y;
    const endingCamera = this.cameras.main;
    endingCamera.resetFX?.();

    const blackoutMs = 1500;
    const brightenMs = 1600;
    const sendoffStartAt = blackoutMs;
    const sendoffDurationMs = 13140;
    const flagRiseStartAt = sendoffStartAt + 850;
    const flagRiseMs = 3330;
    const lineAt = sendoffStartAt + 5790;
    const lineFadeAt = sendoffStartAt + 11920;
    const victoryMusicStartAt = sendoffStartAt + sendoffDurationMs + 120;
    const frogStartAt = victoryMusicStartAt + 8850;
    const victoryCueAt = (musicTimeMs) => victoryMusicStartAt + musicTimeMs;

    let prepared = false;
    const prepareInBlack = () => {
      if (prepared || !this.potatoCommanderEndingActive) return;
      prepared = true;

      const backdrop = this.trackPotatoCommanderEndingFx(
        this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0x111820, 1)
          .setOrigin(0)
          .setScrollFactor(0)
          .setDepth(32000)
      );
      this.trackPotatoCommanderEndingFx(
        this.add.ellipse(GAME.WIDTH / 2, 425, 700, 130, 0x202b35, 0.86)
          .setScrollFactor(0)
          .setDepth(32001)
      );

      const flagParts = this.createPotatoCommanderEndingFlag();
      this.potatoCommanderEndingFlagParts = flagParts;
      flagParts.flag.setY(flagParts.bottomY);

      this.startPotatoCommanderSendoffMusic();

      const actor = this.trackPotatoCommanderEndingFx(
        this.add.image(GAME.WIDTH / 2 - 112, 390, 'potatoCommanderEndingDefeatedArt')
          .setScrollFactor(0)
          .setDepth(32025)
          .setDisplaySize(205, 205)
          .setAngle(0)
          .setAlpha(1)
      );
      this.potatoCommanderEndingBossActor = actor;
      this.duckQueenVictoryEndingDefeatActor = actor;
      this.tweens.add({
        targets: actor,
        y: actor.y + 5,
        angle: { from: -1.1, to: 1.1 },
        duration: 310,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });

      if (this.player?.active) {
        this.player.setAlpha(0);
        this.duckQueenVictoryEndingPlayerGroundY = originY + 128;
        this.player.setPosition(originX + 160, originY + 64);
      }

      endingCamera.centerOn(originX, originY);
      endingCamera.setZoom(1);
      endingCamera.fadeIn(brightenMs, 0, 0, 0);
      void backdrop;
    };

    endingCamera.fadeOut(
      blackoutMs,
      0, 0, 0,
      (_camera, progress) => {
        if (progress >= 0.999) prepareInBlack();
      },
      this
    );
    this.schedulePotatoCommanderEnding(blackoutMs + 40, prepareInBlack);

    this.schedulePotatoCommanderEnding(flagRiseStartAt, () => {
      const flag = this.potatoCommanderEndingFlag;
      if (!flag?.active) return;
      this.tweens.killTweensOf(flag);
      this.tweens.add({
        targets: flag,
        y: Number(flag.getData('endingFlagTopY')) || 155,
        duration: flagRiseMs,
        ease: 'Sine.InOut'
      });
    });


    const line = this.trackPotatoCommanderEndingFx(
      this.add.text(GAME.WIDTH / 2, 108, '「幸好...幸好我是演员...」', {
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#f6e0aa',
        stroke: '#321b11',
        strokeThickness: 5,
        align: 'center'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(32040).setAlpha(0)
    );
    this.schedulePotatoCommanderEnding(lineAt, () => {
      this.tweens.add({ targets: line, alpha: 1, y: 101, duration: 260, ease: 'Sine.Out' });
    });
    this.schedulePotatoCommanderEnding(lineFadeAt, () => {
      if (line?.active) this.tweens.add({ targets: line, alpha: 0, duration: 220, ease: 'Sine.In' });
    });

    this.schedulePotatoCommanderEnding(victoryMusicStartAt, () => {
      const sendoff = this.potatoCommanderEndingAudio?.sendoff;
      try { sendoff?.stop?.(); } catch (_) {}
      this.startPotatoCommanderVictoryMusic();
    });
    this.schedulePotatoCommanderEnding(victoryCueAt(58), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding01', { enter: true });
    });
    this.schedulePotatoCommanderEnding(victoryCueAt(2038), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding02');
    });
    this.schedulePotatoCommanderEnding(victoryCueAt(2955), () => {
      const actor = this.duckQueenVictoryEndingCutinActor;
      if (!actor?.active) return;
      const sx = actor.scaleX;
      const sy = actor.scaleY;
      this.tweens.killTweensOf(actor);
      this.tweens.add({
        targets: actor,
        scaleX: sx * 1.018,
        scaleY: sy * 1.018,
        duration: 260,
        yoyo: true,
        ease: 'Sine.InOut'
      });
    });
    this.schedulePotatoCommanderEnding(victoryCueAt(3587), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding03');
      this.sound?.play?.('hitLight', { volume: 0.16 });
      this.cameras.main.flash(55, 255, 240, 184, false);
    });
    this.schedulePotatoCommanderEnding(victoryCueAt(4946), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding04');
    });
    this.schedulePotatoCommanderEnding(victoryCueAt(6037), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding05');
    });
    this.schedulePotatoCommanderEnding(victoryCueAt(7558), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding06');
      this.cameras.main.flash(55, 255, 238, 178, false);
    });
    this.schedulePotatoCommanderEnding(victoryCueAt(8000), () => {
      this.hideDuckQueenVictoryEndingCutin({ slideRight: true, duration: 220 });
    });

    this.schedulePotatoCommanderEnding(victoryCueAt(8120), () => {
      const actor = this.potatoCommanderEndingBossActor;
      if (!actor?.active) return;
      this.tweens.killTweensOf(actor);
      this.spawnPotatoCommanderEndingGoldDissolve(actor.x, actor.y);
      const glow = this.trackPotatoCommanderEndingFx(
        this.add.image(actor.x, actor.y, actor.texture.key)
          .setScrollFactor(0)
          .setDepth(32024)
          .setDisplaySize(actor.displayWidth, actor.displayHeight)
          .setAngle(actor.angle)
          .setTint(0xffd768)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.20)
      );
      this.tweens.add({
        targets: [actor, glow],
        y: '-=12',
        scaleX: 1.05,
        scaleY: 1.05,
        alpha: 0,
        duration: 620,
        ease: 'Sine.InOut',
        onComplete: () => {
          if (actor?.active) actor.destroy();
          if (glow?.active) glow.destroy();
        }
      });
    });

    this.schedulePotatoCommanderEnding(frogStartAt, () => {
      this.showPotatoCommanderFrogCredits();
    });

    this.schedulePotatoCommanderEnding(blackoutMs + 80, () => {
      if (commander?.active) commander.destroy();
      this.potatoCommander = null;
    });
    return true;
  }

  explodeAllEndingMinions() {
    const victims = [];

    this.enemies.children.iterate((enemy) => {
      if (
        !enemy?.active
        || enemy.enemyType === 'potatoCommander'
      ) return;

      if (
        ['potato', 'duck', 'roach', 'ball']
          .includes(enemy.enemyType)
      ) {
        victims.push(enemy);
      } else {
        this.tweens.add({
          targets: enemy,
          alpha: 0,
          duration: 260,
          onComplete: () => {
            if (enemy?.active) enemy.destroy();
          }
        });
      }
    });

    victims.forEach((enemy) => {
      const x = enemy.x;
      const y = enemy.y;
      const type = enemy.enemyType;

      this.registerKill(type);

      this.createEndingExplosion(x, y, type);
      this.createEnemyBloodSplatter(x, y, type);

      enemy.destroy();
    });

    this.cameras.main.shake(
      260,
      Math.min(0.012, 0.005 + victims.length * 0.00004)
    );
  }

  createEndingExplosion(x, y, type) {
    const colors = {
      duck: 0xf0d44e,
      roach: 0xa13ac6,
      potato: 0x7b4b2d,
      ball: 0xe8e8e8
    };

    const flash = this.add.circle(
      x,
      y,
      8,
      colors[type] ?? 0xffffff,
      0.92
    ).setDepth(60);

    this.tweens.add({
      targets: flash,
      radius: Phaser.Math.Between(24, 38),
      alpha: 0,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy()
    });
  }

  createEnemyBloodSplatter(x, y, type) {
    const theme = {
      duck: { main: 0xd9be32, alt: 0xf3d85b },
      roach: { main: 0x72258d, alt: 0xa447bf },
      potato: { main: 0x6d4129, alt: 0x9a6040 },
      ball: { main: 0x151515, alt: 0xf2f2f2 }
    }[type];

    const splatKeys = {
      duck: ['duckBlood01Art', 'duckBlood02Art', 'duckBlood03Art'],
      roach: ['roachBlood01Art', 'roachBlood02Art', 'roachBlood03Art'],
      potato: ['potatoBlood01Art', 'potatoBlood02Art', 'potatoBlood03Art'],
      ball: ['ballBlood01Art']
    }[type];

    if (!theme || !splatKeys?.length) return;

    const droplets = Phaser.Math.Between(5, 8);
    for (let i = 0; i < droplets; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(18, 42);
      const color =
        type === 'ball'
          ? (i % 2 === 0 ? theme.main : theme.alt)
          : (Math.random() < 0.72 ? theme.main : theme.alt);

      const drop = this.add.circle(
        x + Phaser.Math.Between(-3, 3),
        y + Phaser.Math.Between(-3, 3),
        Phaser.Math.Between(2, 5),
        color,
        0.82
      ).setDepth(3);

      this.tweens.add({
        targets: drop,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        scaleX: Phaser.Math.FloatBetween(0.7, 1.35),
        scaleY: Phaser.Math.FloatBetween(0.7, 1.35),
        alpha: 0,
        duration: Phaser.Math.Between(300, 520),
        ease: 'Quad.Out',
        onComplete: () => drop.destroy()
      });
    }

    const usableKeys = splatKeys.filter((key) => this.textures.exists(key));
    if (usableKeys.length === 0) return;

    const textureKey = Phaser.Utils.Array.GetRandom(usableKeys);
    const lifetime = Phaser.Math.Between(9000, 14000);
    const width = type === 'ball'
      ? Phaser.Math.Between(58, 70)
      : Phaser.Math.Between(54, 74);
    const height = type === 'ball'
      ? Phaser.Math.Between(26, 32)
      : Phaser.Math.Between(24, 33);
    const alpha = type === 'ball' ? 0.78 : 0.74;

    const puddle = this.add.image(
      x + Phaser.Math.Between(-4, 4),
      y + Phaser.Math.Between(-2, 3),
      textureKey
    )
      .setDepth(1)
      .setAlpha(alpha)
      .setDisplaySize(width, height)
      .setAngle(Phaser.Math.FloatBetween(-7, 7));

    puddle.expiresAt = this.time.now + lifetime;
    puddle.baseBloodAlpha = alpha;
    puddle.bloodSplatType = type;
    this.enemyBloodPuddles.push(puddle);
  }

  getNearestEnemiesOfType(
    source,
    type,
    radius,
    limit = 999
  ) {
    const candidates = [];

    this.enemies.children.iterate((enemy) => {
      if (
        !enemy?.active
        || enemy.isDead
        || enemy === source
        || enemy.enemyType !== type
        || enemy.beingAbsorbed
      ) return;

      const distance = Phaser.Math.Distance.Between(
        source.x,
        source.y,
        enemy.x,
        enemy.y
      );

      if (distance <= radius) {
        candidates.push({ enemy, distance });
      }
    });

    candidates.sort((a, b) => a.distance - b.distance);

    return candidates
      .slice(0, limit)
      .map((item) => item.enemy);
  }

  findNearestFactionTarget(
    source,
    types,
    radius,
    predicate = null
  ) {
    let best = null;
    let bestDistanceSq = radius * radius;

    this.enemies.children.iterate((enemy) => {
      if (
        !enemy?.active
        || enemy.isDead
        || enemy === source
        || !types.includes(enemy.enemyType)
      ) return;

      if (predicate && !predicate(enemy)) return;

      const dx = enemy.x - source.x;
      const dy = enemy.y - source.y;
      const d2 = dx * dx + dy * dy;

      if (d2 < bestDistanceSq) {
        best = enemy;
        bestDistanceSq = d2;
      }
    });

    return best;
  }

  resolveFactionMelee(attacker, target, damage, time) {
    if (
      !attacker?.active
      || attacker.isDead
      || !target?.active
      || target.isDead
    ) return;

    if (time < (attacker.nextFactionAttackAt ?? 0)) return;

    attacker.nextFactionAttackAt =
      time + Math.max(300, attacker.contactCooldown);

    if (target.receiveDamage(damage)) {
      this.removeEnemyWithoutPlayerCredit(target);
    }
  }

  removeEnemyWithoutPlayerCredit(enemy) {
    if (!enemy?.active) return;

    const x = enemy.x;
    const y = enemy.y;
    const diedWithPlague =
      enemy.statusSystem?.has('plague') ?? false;
    if (
      diedWithPlague
      && enemy.canReceiveSupportStatus?.()
    ) {
      this.createPlagueZone(x, y);
    }

    enemy.destroy();
  }

  getWorshipDuckCount() {
    if (!this.potatoPityActive) return 0;

    let count = 0;

    this.enemies.children.iterate((enemy) => {
      if (
        enemy?.active
        && enemy.enemyType === 'duck'
        && enemy.pityResponse === 'worship'
      ) {
        count += 1;
      }
    });

    return count;
  }

  createPotatoToxicZone(x, y) {
    const display = this.add.circle(
      x,
      y,
      STATUS_EFFECTS.toxicPotatoZoneRadius,
      0x58c96b,
      0.16
    )
      .setStrokeStyle(2, 0x7ee889, 0.40)
      .setDepth(1);

    this.potatoToxicZones.push({
      display,
      x,
      y,
      expiresAt:
        this.time.now
        + STATUS_EFFECTS.toxicPotatoZoneDurationMs,
      nextPulseAt: this.time.now
    });
  }

  updatePotatoToxicZones(time) {
    for (
      let i = this.potatoToxicZones.length - 1;
      i >= 0;
      i -= 1
    ) {
      const zone = this.potatoToxicZones[i];

      if (time >= zone.expiresAt) {
        zone.display.destroy();
        this.potatoToxicZones.splice(i, 1);
        continue;
      }

      if (time < zone.nextPulseAt) continue;

      zone.nextPulseAt =
        time + STATUS_EFFECTS.toxicPotatoZonePulseMs;

      const distance = Phaser.Math.Distance.Between(
        zone.x,
        zone.y,
        this.player.x,
        this.player.y
      );

      if (distance <= STATUS_EFFECTS.toxicPotatoZoneRadius) {
        const toxicDamage = this.player.takeDamage(
          STATUS_EFFECTS.toxicPotatoZoneDamage,
          time
        );
        if (toxicDamage > 0) {
          this.showHpDamageText(
            'potato',
            this.player.x,
            this.player.y - 52,
            toxicDamage,
            { durationMs: 1050, rise: 36, depth: 120 }
          );
        }
      }
    }
  }

  createPotatoCommanderHud(label) {
    this.clearBossHud();

    const x = GAME.WIDTH / 2 - 190;
    const y = 38 + (this.mobileHudSafeTop ?? 0);
    const width = 380;

    this.bossBarBg = this.add.rectangle(
      x,
      y,
      width,
      18,
      0x17120f,
      0.90
    )
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xffffff, 0.28)
      .setScrollFactor(0)
      .setDepth(150);

    this.bossBarRedFill = this.add.rectangle(
      x,
      y,
      width,
      13,
      0xc94343,
      0.98
    )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(151)
      .setVisible(true);

    this.bossBarYellowFill = this.add.rectangle(
      x,
      y,
      width,
      13,
      0xe8c645,
      0.99
    )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(152)
      .setVisible(true);

    this.bossBarGreenFill = this.add.rectangle(
      x,
      y,
      width,
      13,
      0x5fc96b,
      0.99
    )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(153)
      .setVisible(true);

    this.bossBarSkyBlueFill = this.add.rectangle(
      x,
      y,
      width,
      13,
      0x94d5f3,
      0.99
    )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(154)
      .setVisible(true);

    this.lastBossHudLabel = label;

    this.bossBarText = this.add.text(
      GAME.WIDTH / 2,
      17 + (this.mobileHudSafeTop ?? 0),
      label,
      {
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#f4dc9b',
        stroke: '#000000',
        strokeThickness: 3
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(155);
  }

  createCommanderJudgmentHud(commander = this.potatoCommander, options = {}) {
    this.clearCommanderJudgmentHud();
    if (!commander?.active || commander.phaseIndex < 3) return;

    const hidden = options.hidden !== false;
    const safeTop = this.mobileHudSafeTop ?? 0;
    const crossY = 116 + safeTop;
    this.judgmentHudTitle = null;
    this.judgmentHudCrosses = [-54, 0, 54].map((offsetX) => (
      this.add.image(
        GAME.WIDTH / 2 + offsetX,
        crossY,
        'potatoCommanderJudgmentPipUnlitArt'
      )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(176)
        .setDisplaySize(hidden ? 34 : 40, hidden ? 34 : 40)
        .setAlpha(hidden ? 0 : 0.72)
    ));
    this.judgmentHudCrosses.forEach((cross) => {
      cross.judgmentBaseYOffset = 116;
    });

    this.judgmentHudVisible = !hidden;
    this.updateCommanderJudgmentHud(commander, false, { createIfMissing: false });
  }

  updateCommanderJudgmentHud(commander = this.potatoCommander, animateNew = false, options = {}) {
    if (!commander?.active || commander.phaseIndex < 3) return;
    const required = ENEMIES.potatoCommander.judgmentGraceCastsRequired ?? 3;
    const count = Phaser.Math.Clamp(Math.trunc(commander.judgmentGraceCount ?? 0), 0, required);
    const createIfMissing = options.createIfMissing !== false;
    const hasCrossHud = this.judgmentHudCrosses?.length === 3
      && this.judgmentHudCrosses.every((cross) => cross?.active);

    if (!hasCrossHud) {
      if (!createIfMissing || count <= 0) return;
      this.createCommanderJudgmentHud(commander, { hidden: true });
    }
    if (this.judgmentHudCrosses?.length !== 3) return;

    const revealNow = !this.judgmentHudVisible && count > 0;
    const ready = count >= required;

    this.judgmentHudCrosses.forEach((cross, index) => {
      if (!cross?.active) return;
      const lit = index < count;
      const textureKey = lit
        ? 'potatoCommanderJudgmentPipLitArt'
        : 'potatoCommanderJudgmentPipUnlitArt';
      if (cross.texture?.key !== textureKey) cross.setTexture(textureKey);
      cross.clearTint();
      cross.setDisplaySize(40, 40);
      if (!revealNow) cross.setAlpha(lit ? 1 : 0.72);
    });

    if (revealNow) {
      this.judgmentHudVisible = true;
      this.judgmentHudCrosses.forEach((cross, index) => {
        if (!cross?.active) return;
        const lit = index < count;
        cross.setAlpha(0).setDisplaySize(34, 34);
        this.tweens.add({
          targets: cross,
          alpha: lit ? 1 : 0.72,
          displayWidth: 40,
          displayHeight: 40,
          duration: 300,
          delay: index * 45,
          ease: 'Back.Out'
        });
      });
    }

    if (animateNew && count > 0) {
      const cross = this.judgmentHudCrosses[count - 1];
      if (cross?.active) {
        cross.setDisplaySize(revealNow ? 46 : 50, revealNow ? 46 : 50);
        this.tweens.add({
          targets: cross,
          displayWidth: 40,
          displayHeight: 40,
          duration: 250,
          ease: 'Back.Out'
        });
      }
      if (ready) {
        this.tweens.add({
          targets: this.judgmentHudCrosses,
          displayWidth: 46,
          displayHeight: 46,
          duration: 145,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.InOut'
        });
        this.cameras.main.flash(120, 255, 236, 190, false);
      }
    }
  }

  clearCommanderJudgmentHud() {
    [this.judgmentHudTitle, ...(this.judgmentHudCrosses ?? [])].forEach((item) => {
      if (item?.active) item.destroy();
    });
    this.judgmentHudTitle = null;
    this.judgmentHudCrosses = [];
    this.judgmentHudVisible = false;
  }

  trackCommanderBlackwaterFx(obj) {
    if (!obj) return obj;
    this.commanderBlackwaterFx ??= [];
    this.commanderBlackwaterFx.push(obj);
    return obj;
  }

  stopCommanderBlackwaterAudio() {
    [this.commanderBlackwaterFrenzySound, this.commanderBlackwaterBlindSound].forEach((sound) => {
      if (!sound) return;
      try { sound.stop?.(); } catch (_) {}
      try { sound.destroy?.(); } catch (_) {}
    });
    this.commanderBlackwaterFrenzySound = null;
    this.commanderBlackwaterBlindSound = null;
  }

  playCommanderBlackwaterImpactSfx(stageIndex = 0, frenzy = 0, scripted = false) {
    const now = this.time.now;
    const gap = scripted ? 0 : ([180, 135, 105][stageIndex] ?? 140);
    if (!scripted && now - (this.commanderBlackwaterLastImpactSfxAt ?? -Infinity) < gap) return;
    this.commanderBlackwaterLastImpactSfxAt = now;
    const f = Phaser.Math.Clamp(frenzy, 0, 1);
    const volume = scripted ? 0.48 : ([0.16, 0.22, Phaser.Math.Linear(0.24, 0.34, f)][stageIndex] ?? 0.20);
    const rate = stageIndex === 2 ? Phaser.Math.Linear(0.92, 0.80, f) : 1.0;
    this.sound?.play?.('blackwaterCrossImpactSfx', { volume, rate });
  }

  clearCommanderBlackwaterCraters({ immediate = true } = {}) {
    const craters = this.commanderBlackwaterCraters ?? [];
    this.commanderBlackwaterCraters = [];
    craters.forEach((crater) => {
      if (!crater?.active) return;
      this.tweens.killTweensOf(crater);
      if (immediate) {
        crater.destroy();
        return;
      }
      this.tweens.add({
        targets: crater,
        alpha: 0,
        duration: 180,
        ease: 'Quad.Out',
        onComplete: () => crater?.active && crater.destroy()
      });
    });
  }

  restoreCommanderBlackwaterPlayerVisualUnderWhite() {
    const player = this.player;
    const restore = this.commanderBlackwaterPlayerRestore;
    if (!player?.active || !restore) return false;
    this.tweens.killTweensOf(player);
    player.cancelVisualAction?.({ restore: false, forceRestore: false });
    if (restore.textureKey && this.textures.exists(restore.textureKey)) player.setTexture(restore.textureKey);
    if (Number.isFinite(restore.displayWidth) && Number.isFinite(restore.displayHeight)) {
      player.setDisplaySize(restore.displayWidth, restore.displayHeight);
    }
    if (Number.isFinite(restore.originX) && Number.isFinite(restore.originY)) {
      player.setOrigin(restore.originX, restore.originY);
    }
    if (Number.isFinite(restore.x) && Number.isFinite(restore.y)) player.setPosition(restore.x, restore.y);
    player.setAngle(Number.isFinite(restore.angle) ? restore.angle : 0);
    player.setFlipX(restore.flipX ?? false);
    player.setAlpha(1);
    player.clearTint?.();
    player.setVelocity(0, 0);
    player.setDepth(19960);
    if (player.body) {
      const sx = Math.max(0.001, Math.abs(player.scaleX));
      const sy = Math.max(0.001, Math.abs(player.scaleY));
      player.body.setSize(35.625 / sx, 44.0625 / sy, true);
    }
    return true;
  }

  resetCommanderJudgmentCycleAfterBlackwater(commander = this.potatoCommander) {
    if (!commander?.active || commander.isDead) return false;
    commander.resetJudgmentCycle?.();

    (this.judgmentHudCrosses ?? []).forEach((cross) => {
      if (!cross?.active) return;
      this.tweens.killTweensOf(cross);
      if (this.textures.exists('potatoCommanderJudgmentPipUnlitArt')) {
        cross.setTexture('potatoCommanderJudgmentPipUnlitArt');
      }
      cross.clearTint?.();
      cross.setDisplaySize(40, 40);
      cross.setAlpha(0.72);
    });
    if ((this.judgmentHudCrosses ?? []).some((cross) => cross?.active)) {
      this.judgmentHudVisible = true;
    }
    this.updateCommanderJudgmentHud?.(commander, false, { createIfMissing: false });
    return true;
  }

  clearCommanderBlackwaterPreview({ resetJudgmentCycle = false } = {}) {
    (this.commanderBlackwaterEvents ?? []).forEach((event) => event?.remove?.(false));
    this.commanderBlackwaterEvents = [];
    this.stopCommanderBlackwaterAudio();
    this.commanderBlackwaterLastImpactSfxAt = -Infinity;

    this.clearCommanderBlackwaterCraters({ immediate: true });

    (this.commanderBlackwaterFx ?? []).forEach((obj) => {
      if (!obj) return;
      this.tweens.killTweensOf(obj);
      if (obj.active) obj.destroy();
    });
    this.commanderBlackwaterFx = [];
    this.commanderBlackwaterCraters = [];
    this.commanderBlackwaterPlayerActor = null;
    this.commanderBlackwaterCloseupActor = null;
    this.commanderBlackwaterCloseupGlow = null;
    this.commanderBlackwaterCloseupShade = null;

    const player = this.player;
    const restore = this.commanderBlackwaterPlayerRestore;
    if (player?.active) {
      this.tweens.killTweensOf(player);
      player.cancelVisualAction?.({ restore: false, forceRestore: false });
      if (restore?.textureKey && this.textures.exists(restore.textureKey)) {
        player.setTexture(restore.textureKey);
      }
      if (Number.isFinite(restore?.displayWidth) && Number.isFinite(restore?.displayHeight)) {
        player.setDisplaySize(restore.displayWidth, restore.displayHeight);
      }
      if (Number.isFinite(restore?.originX) && Number.isFinite(restore?.originY)) {
        player.setOrigin(restore.originX, restore.originY);
      }
      if (Number.isFinite(restore?.x) && Number.isFinite(restore?.y)) {
        player.setPosition(restore.x, restore.y);
      }
      player.setAngle(Number.isFinite(restore?.angle) ? restore.angle : 0);
      player.setVelocity(0, 0);
      player.setAlpha(restore?.alpha ?? 1);
      player.setDepth(restore?.depth ?? 10);
      player.setFlipX(restore?.flipX ?? false);
      player.upgradeInvincible = Boolean(restore?.upgradeInvincible);
      player.stunnedUntil = Number.isFinite(restore?.stunnedUntil) ? restore.stunnedUntil : -Infinity;
      player.clearTint?.();
      if (player.body) {
        const sx = Math.max(0.001, Math.abs(player.scaleX));
        const sy = Math.max(0.001, Math.abs(player.scaleY));
        player.body.setSize(35.625 / sx, 44.0625 / sy, true);
      }
    }
    this.commanderBlackwaterPlayerRestore = null;

    const commander = this.potatoCommander;
    if (commander?.active && !commander.isDead) {
      commander.restoreNormalAfterJudgment?.();
      commander.setVelocity(0, 0);
      if (resetJudgmentCycle) {
        this.resetCommanderJudgmentCycleAfterBlackwater(commander);
      }
      commander.actionLockedUntil = Math.max(commander.actionLockedUntil ?? -Infinity, this.time.now + 450);
      commander.nextActionAt = Math.max(commander.nextActionAt ?? -Infinity, this.time.now + 900);
      commander.nextPopulationCheckAt = Math.max(commander.nextPopulationCheckAt ?? -Infinity, this.time.now + 1500);
    }

    if (!this.commanderBlackwaterPhysicsWasPaused) this.physics.world.resume();
    this.commanderBlackwaterPhysicsWasPaused = false;
    this.commanderBlackwaterPreviewActive = false;
    this.commanderJudgmentActive = false;
    this.judgmentRainAnchorX = null;
    this.judgmentRainAnchorY = null;
    this.updateCommanderJudgmentHud?.(commander, false, { createIfMissing: false });
    this.updateHud?.();

  }

  ensureCommanderBlackwaterCloseupPresentation() {
    const maskKey = 'commanderBlackwaterCloseupFeatherMask';
    const shadeKey = 'commanderBlackwaterCloseupShadeGradient';
    const maskW = ENEMIES.potatoCommander.blackwaterCloseupFeatherWidth ?? 540;
    const maskH = GAME.HEIGHT;

    if (!this.textures.exists(maskKey)) {
      const texture = this.textures.createCanvas(maskKey, maskW, maskH);
      const ctx = texture.context;
      const gradient = ctx.createLinearGradient(0, 0, maskW, 0);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.68, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.84, 'rgba(255,255,255,0.72)');
      gradient.addColorStop(0.94, 'rgba(255,255,255,0.26)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.clearRect(0, 0, maskW, maskH);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, maskW, maskH);
      texture.refresh();
    }

    if (!this.textures.exists(shadeKey)) {
      const texture = this.textures.createCanvas(shadeKey, maskW, maskH);
      const ctx = texture.context;
      const gradient = ctx.createLinearGradient(0, 0, maskW, 0);
      gradient.addColorStop(0, 'rgba(0,10,24,0.34)');
      gradient.addColorStop(0.58, 'rgba(0,10,24,0.24)');
      gradient.addColorStop(0.82, 'rgba(0,10,24,0.10)');
      gradient.addColorStop(1, 'rgba(0,10,24,0)');
      ctx.clearRect(0, 0, maskW, maskH);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, maskW, maskH);
      texture.refresh();
    }

    if (!this.commanderBlackwaterCloseupMaskSource) {
      this.commanderBlackwaterCloseupMaskSource = this.make.image({
        x: maskW / 2,
        y: GAME.HEIGHT / 2,
        key: maskKey,
        add: false
      });
      this.commanderBlackwaterCloseupMaskSource.setScrollFactor?.(0);
      this.commanderBlackwaterCloseupBitmapMask =
        this.commanderBlackwaterCloseupMaskSource.createBitmapMask();
    }

    if (!this.commanderBlackwaterCloseupShade?.active) {
      this.commanderBlackwaterCloseupShade = this.trackCommanderBlackwaterFx(
        this.add.image(maskW / 2, GAME.HEIGHT / 2, shadeKey)
          .setScrollFactor(0)
          .setDepth(20020)
          .setAlpha(1)
      );
    }

    return this.commanderBlackwaterCloseupBitmapMask ?? null;
  }

  setCommanderBlackwaterCloseupFrame(textureKey, intensity = 0.45, flipX = false) {
    if (!this.textures.exists(textureKey)) return null;
    const clamped = Phaser.Math.Clamp(intensity, 0, 1);
    const mask = this.ensureCommanderBlackwaterCloseupPresentation();
    const maskW = ENEMIES.potatoCommander.blackwaterCloseupFeatherWidth ?? 540;
    const bottomY = GAME.HEIGHT - 4;
    const baseH = 505;
    const displayH = Math.min(GAME.HEIGHT - 8, baseH + clamped * 28);

    const profile = {
      playerArt:                        { dx: -20, dy: 0,  h: 0 },
      playerBlackwaterAlertArt:         { dx: -16, dy: 0,  h: 0 },
      playerBlackwaterDodgeRightArt:    { dx: -6,  dy: 0,  h: 4 },
      playerBlackwaterGlanceBackArt:    { dx: 0,   dy: 0,  h: -4 },
      playerBlackwaterDodgeLeftArt:     { dx: -10, dy: 0,  h: 2 },
      playerBlackwaterExtremeDodgeArt:  { dx: -6,  dy: 0,  h: 4 },
      playerBlackwaterWoundedDodgeAArt: { dx: -4,  dy: 0,  h: 4 },
      playerBlackwaterWoundedDodgeBArt: { dx: -6,  dy: 0,  h: 4 },
      playerBlackwaterDownArt:          { dx: 4,   dy: 8,  h: -12 },
      playerBlackwaterEndingArt:        { dx: 6,   dy: 10, h: -16 }
    }[textureKey] ?? { dx: 0, dy: 0, h: 0 };
    const visibleBounds = {
      playerArt:                        { left: 0.133, right: 0.867 },
      playerBlackwaterAlertArt:         { left: 0.023, right: 0.961 },
      playerBlackwaterDodgeRightArt:    { left: 0.000, right: 0.960 },
      playerBlackwaterGlanceBackArt:    { left: 0.000, right: 0.989 },
      playerBlackwaterDodgeLeftArt:     { left: 0.000, right: 0.986 },
      playerBlackwaterExtremeDodgeArt:  { left: 0.000, right: 0.979 },
      playerBlackwaterWoundedDodgeAArt: { left: 0.015, right: 0.983 },
      playerBlackwaterWoundedDodgeBArt: { left: 0.000, right: 0.980 },
      playerBlackwaterDownArt:          { left: 0.012, right: 0.999 },
      playerBlackwaterEndingArt:        { left: 0.000, right: 1.000 }
    }[textureKey] ?? { left: 0, right: 1 };

    const setup = (img, alpha, depth, glowOffset = 0, extraScale = 1) => {
      img.setTexture(textureKey)
        .setOrigin(0.5, 1)
        .setScrollFactor(0)
        .setDepth(depth)
        .setAlpha(alpha)
        .setFlipX(Boolean(flipX))
        .setCrop();
      const sourceW = Math.max(1, img.frame?.realWidth ?? img.width ?? 1);
      const sourceH = Math.max(1, img.frame?.realHeight ?? img.height ?? 1);
      const aspect = sourceW / sourceH;
      const h = Math.max(420, displayH + profile.h) * extraScale;
      const w = h * aspect;
      const visibleLeftInset = Boolean(flipX)
        ? Math.max(0, 1 - visibleBounds.right) * w
        : Math.max(0, visibleBounds.left) * w;
      const visibleSafeCenterX = (w * 0.5) - visibleLeftInset + 1;
      const desiredCenterX = Math.min(maskW * 0.44, 244) + profile.dx + glowOffset + clamped;
      const safeCenterX = Math.max(visibleSafeCenterX, desiredCenterX);
      img.setDisplaySize(w, h)
        .setPosition(safeCenterX, bottomY + profile.dy);
      if (mask) img.setMask(mask);
      return img;
    };

    if (!this.commanderBlackwaterCloseupGlow?.active) {
      this.commanderBlackwaterCloseupGlow = this.trackCommanderBlackwaterFx(
        this.add.image(280, bottomY, textureKey)
      );
      this.commanderBlackwaterCloseupGlow
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0x94d5f3);
    }
    if (!this.commanderBlackwaterCloseupActor?.active) {
      this.commanderBlackwaterCloseupActor = this.trackCommanderBlackwaterFx(
        this.add.image(286, bottomY, textureKey)
      );
    }

    setup(this.commanderBlackwaterCloseupGlow, 0.035 + clamped * 0.055, 20021, -5, 1.018);
    setup(this.commanderBlackwaterCloseupActor, 0.72 + clamped * 0.20, 20022, 0, 1);
    return this.commanderBlackwaterCloseupActor;
  }

  hideCommanderBlackwaterCloseup(duration = 120) {
    const targets = [
      this.commanderBlackwaterCloseupActor,
      this.commanderBlackwaterCloseupGlow,
      this.commanderBlackwaterCloseupShade
    ].filter((obj) => obj?.active);
    if (!targets.length) return;
    this.tweens.add({
      targets,
      alpha: 0,
      duration: Math.max(40, duration),
      ease: 'Quad.In',
      onComplete: () => {
        targets.forEach((obj) => obj?.active && obj.destroy());
        this.commanderBlackwaterCloseupActor = null;
        this.commanderBlackwaterCloseupGlow = null;
        this.commanderBlackwaterCloseupShade = null;
      }
    });
  }

  setCommanderBlackwaterPlayerFrame(textureKey, {
    x = null,
    y = null,
    moveMs = 0,
    closeupIntensity = 0.45,
    closeup = false,
    flipX = null
  } = {}) {
    const actor = this.player;
    if (!actor?.active || !this.textures.exists(textureKey)) return null;

    const restore = this.commanderBlackwaterPlayerRestore;
    const targetW = Math.max(1, Math.abs(Number(restore?.displayWidth) || Number(actor.displayWidth) || 60));
    const targetH = Math.max(1, Math.abs(Number(restore?.displayHeight) || Number(actor.displayHeight) || 60));
    actor.applyPlayerVisualTexture?.(textureKey);
    actor.setDisplaySize(targetW, targetH);
    actor.setOrigin(
      Number.isFinite(restore?.originX) ? restore.originX : 0.5,
      Number.isFinite(restore?.originY) ? restore.originY : 0.5
    );
    const effectiveFlipX = typeof flipX === 'boolean' ? flipX : Boolean(actor.flipX);
    actor.setFlipX(effectiveFlipX);
    if (actor.body) {
      const sx = Math.max(0.001, Math.abs(actor.scaleX));
      const sy = Math.max(0.001, Math.abs(actor.scaleY));
      actor.body.setSize(35.625 / sx, 44.0625 / sy, true);
    }
    actor.setDepth(19960).setAlpha(1);

    if (Number.isFinite(x) && Number.isFinite(y)) {
      this.tweens.killTweensOf(actor);
      if (moveMs > 0) {
        this.tweens.add({
          targets: actor,
          x,
          y,
          duration: moveMs,
          ease: 'Cubic.Out'
        });
      } else {
        actor.setPosition(x, y);
      }
    }

    this.commanderBlackwaterPlayerActor = actor;
    if (closeup) this.setCommanderBlackwaterCloseupFrame(textureKey, closeupIntensity, effectiveFlipX);
    return actor;
  }

  spawnCommanderBlackwaterCrater(x, y, size = 'small', {
    rotation = Phaser.Math.Between(-11, 11),
    scaleJitter = Phaser.Math.FloatBetween(0.94, 1.08),
    screenSpace = false,
    persistentMs = 30000,
    depth = 19890,
    revealFrom = 0.84,
    revealTo = 1.04,
    revealMs = 95
  } = {}) {
    const key = size === 'medium'
      ? 'potatoCommanderBlackwaterCraterMediumArt'
      : 'potatoCommanderBlackwaterCraterSmallArt';
    if (!this.textures.exists(key)) return null;

    const baseSize = size === 'medium' ? 108 : 70;
    const crater = this.add.image(x, y, key)
      .setDepth(depth)
      .setAngle(rotation)
      .setAlpha(0);
    this.commanderBlackwaterCraters ??= [];
    this.commanderBlackwaterCraters.push(crater);
    if (screenSpace) crater.setScrollFactor(0);

    const sourceW = Math.max(1, crater.width);
    const sourceH = Math.max(1, crater.height);
    const aspect = sourceW / sourceH;
    crater.setDisplaySize(baseSize * aspect * scaleJitter, baseSize * scaleJitter);
    const targetScaleX = crater.scaleX;
    const targetScaleY = crater.scaleY;
    crater.setScale(targetScaleX * revealFrom, targetScaleY * revealFrom);
    if (this.commanderBlackwaterPlayerActor?.active) {
      this.commanderBlackwaterPlayerActor.setDepth(Math.max(19960, (this.commanderBlackwaterPlayerActor.depth ?? 0), depth + 70));
    }
    this.tweens.add({
      targets: crater,
      alpha: 0.97,
      scaleX: targetScaleX * revealTo,
      scaleY: targetScaleY * revealTo,
      duration: Math.max(60, revealMs),
      ease: 'Back.Out'
    });

    if (persistentMs > 0) {
      this.time.delayedCall(persistentMs, () => {
        if (!crater?.active) return;
        this.tweens.add({
          targets: crater,
          alpha: 0,
          duration: 900,
          ease: 'Quad.Out',
          onComplete: () => crater?.active && crater.destroy()
        });
      });
    } else {
      this.trackCommanderBlackwaterFx(crater);
    }
    return crater;
  }

  spawnCommanderBlackwaterCrossImpact(x, y, {
    crater = 'small',
    fallMs = 205,
    scale = 1,
    onImpact = null
  } = {}) {
    const crossKey = 'potatoCommanderJudgmentRainArt';
    if (!this.textures.exists(crossKey)) return null;
    const startY = -140;
    const cross = this.trackCommanderBlackwaterFx(
      this.add.image(x, startY, crossKey)
        .setScrollFactor(0)
        .setDepth(20009)
        .setDisplaySize(70 * scale, 140 * scale)
        .setAngle(Phaser.Math.Between(-4, 4))
    );
    const shadow = this.trackCommanderBlackwaterFx(
      this.add.ellipse(x, y + 8, 54 * scale, 18 * scale, 0x05040a, 0.42)
        .setScrollFactor(0)
        .setDepth(20003)
        .setScale(0.45)
    );
    this.tweens.add({
      targets: shadow,
      scaleX: 1,
      scaleY: 1,
      alpha: 0.68,
      duration: fallMs,
      ease: 'Quad.In'
    });
    this.tweens.add({
      targets: cross,
      y,
      duration: fallMs,
      ease: 'Cubic.In',
      onComplete: () => {
        if (!this.commanderBlackwaterPreviewActive) return;
        this.spawnCommanderBlackwaterCrater(x, y + 10, crater);
        this.cameras.main.shake(crater === 'medium' ? 210 : 125, crater === 'medium' ? 0.010 : 0.0054);
        this.sound?.play?.('hitLight', { volume: crater === 'medium' ? 0.38 : 0.24 });
        onImpact?.();
        if (cross?.active) cross.destroy();
        if (shadow?.active) shadow.destroy();
      }
    });
    return cross;
  }

  showCommanderBlackwaterTitle(holdMs = 720) {
    if (!this.textures.exists('potatoCommanderBlackwaterTitleArt')) return null;
    const title = this.trackCommanderBlackwaterFx(
      this.add.image(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'potatoCommanderBlackwaterTitleArt')
        .setScrollFactor(0)
        .setDepth(20040)
        .setAlpha(0)
    );
    const fitScale = Math.min(1, (GAME.WIDTH * 0.76) / Math.max(1, title.width));
    title.setScale(fitScale * 1.70);
    this.cameras.main.shake(120, 0.006);
    this.tweens.add({
      targets: title,
      alpha: 1,
      scaleX: fitScale,
      scaleY: fitScale,
      duration: 180,
      ease: 'Back.Out'
    });
    const fade = this.time.delayedCall(Math.max(300, holdMs - 180), () => {
      if (!title?.active) return;
      this.tweens.add({
        targets: title,
        alpha: 0,
        scaleX: fitScale * 0.95,
        scaleY: fitScale * 0.95,
        duration: 180,
        ease: 'Quad.In',
        onComplete: () => title?.active && title.destroy()
      });
    });
    this.commanderBlackwaterEvents.push(fade);
    return title;
  }

  spawnCommanderBlackwaterStageOrnament(stageIndex = 0) {
    if (!this.commanderBlackwaterPreviewActive) return;
    const intensity = [0.34, 0.58, 0.92][stageIndex] ?? 0.45;
    const edgeDepth = 19939;
    const thickness = 18 + stageIndex * 10;
    const alpha = 0.035 + stageIndex * 0.026;
    const pieces = [
      this.add.rectangle(GAME.WIDTH / 2, thickness / 2, GAME.WIDTH, thickness, 0x8d0b20, alpha),
      this.add.rectangle(GAME.WIDTH / 2, GAME.HEIGHT - thickness / 2, GAME.WIDTH, thickness, 0x8d0b20, alpha),
      this.add.rectangle(thickness / 2, GAME.HEIGHT / 2, thickness, GAME.HEIGHT, 0x3b0611, alpha * 0.92),
      this.add.rectangle(GAME.WIDTH - thickness / 2, GAME.HEIGHT / 2, thickness, GAME.HEIGHT, 0x3b0611, alpha * 0.92)
    ].map((obj) => this.trackCommanderBlackwaterFx(
      obj.setScrollFactor(0).setDepth(edgeDepth).setBlendMode(Phaser.BlendModes.ADD)
    ));
    pieces.forEach((obj, index) => {
      this.tweens.add({
        targets: obj,
        alpha: alpha * (1.8 + intensity * 0.55),
        duration: 150 + stageIndex * 45 + index * 12,
        yoyo: true,
        repeat: stageIndex === 2 ? 2 : 0,
        hold: 60 + stageIndex * 35,
        ease: 'Sine.InOut',
        onComplete: () => obj?.active && obj.destroy()
      });
    });

    const sparkCount = [5, 9, 14][stageIndex] ?? 6;
    for (let i = 0; i < sparkCount; i += 1) {
      const spark = this.trackCommanderBlackwaterFx(
        this.add.circle(
          Phaser.Math.Between(24, GAME.WIDTH - 24),
          Phaser.Math.Between(70, GAME.HEIGHT - 28),
          Phaser.Math.Between(1, 3 + stageIndex),
          Phaser.Math.RND.pick([0xffd36a, 0xff7a4a, 0xb51b37]),
          Phaser.Math.FloatBetween(0.24, 0.52)
        )
          .setScrollFactor(0)
          .setDepth(19970)
          .setBlendMode(Phaser.BlendModes.ADD)
      );
      this.tweens.add({
        targets: spark,
        y: spark.y - Phaser.Math.Between(18, 48 + stageIndex * 15),
        x: spark.x + Phaser.Math.Between(-18, 18),
        alpha: 0,
        scaleX: 0.35,
        scaleY: 1.8,
        duration: Phaser.Math.Between(320, 620),
        ease: 'Quad.Out',
        onComplete: () => spark?.active && spark.destroy()
      });
    }
  }

  spawnCommanderBlackwaterStagePulse({ color = 0x8f1020, alpha = 0.14, duration = 360 } = {}) {
    const pulse = this.trackCommanderBlackwaterFx(
      this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, color, 0)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(19941)
        .setBlendMode(Phaser.BlendModes.ADD)
    );
    this.tweens.add({
      targets: pulse,
      alpha,
      duration: Math.max(60, Math.round(duration * 0.30)),
      yoyo: true,
      hold: Math.max(0, Math.round(duration * 0.10)),
      ease: 'Sine.Out',
      onComplete: () => pulse?.active && pulse.destroy()
    });
    return pulse;
  }

  spawnCommanderBlackwaterDodgeAfterimage({ x = null, y = null, alpha = 0.34 } = {}) {
    const actor = this.player;
    if (!actor?.active || !actor.texture?.key || !this.textures.exists(actor.texture.key)) return null;
    const ghost = this.trackCommanderBlackwaterFx(
      this.add.image(
        Number.isFinite(x) ? x : actor.x,
        Number.isFinite(y) ? y : actor.y,
        actor.texture.key
      )
        .setOrigin(actor.originX ?? 0.5, actor.originY ?? 0.5)
        .setDisplaySize(Math.abs(actor.displayWidth ?? 60), Math.abs(actor.displayHeight ?? 60))
        .setFlipX(actor.flipX ?? false)
        .setDepth(19948)
        .setAlpha(alpha)
        .setTint(0x94d5f3)
        .setBlendMode(Phaser.BlendModes.ADD)
    );
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: ghost.scaleX * 1.08,
      scaleY: ghost.scaleY * 1.08,
      duration: 150,
      ease: 'Quad.Out',
      onComplete: () => ghost?.active && ghost.destroy()
    });
    return ghost;
  }

  spawnCommanderBlackwaterNearMissAccent(x, y, stageIndex = 0) {
    if (!this.commanderBlackwaterPreviewActive) return;
    const strength = [0.009, 0.013, 0.018][stageIndex] ?? 0.012;
    const duration = [115, 145, 185][stageIndex] ?? 140;
    this.cameras.main.shake(duration, strength);

    const flash = this.trackCommanderBlackwaterFx(
      this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0xffe4b0, 0)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(20088)
        .setBlendMode(Phaser.BlendModes.ADD)
    );
    this.tweens.add({
      targets: flash,
      alpha: stageIndex === 2 ? 0.18 : 0.11,
      duration: 34,
      yoyo: true,
      hold: 22,
      ease: 'Quad.Out',
      onComplete: () => flash?.active && flash.destroy()
    });

    const baseZoom = Number(this.cameras.main.zoom) || 1;
    this.tweens.add({
      targets: this.cameras.main,
      zoom: baseZoom * (stageIndex === 2 ? 1.016 : 1.010),
      duration: 42,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: () => this.cameras.main.setZoom(baseZoom)
    });
  }

  spawnCommanderBlackwaterInkImpactAccent(x, y, stageIndex = 0) {
    if (!this.commanderBlackwaterPreviewActive) return;
    const counts = [3, 6, 10];
    const count = counts[stageIndex] ?? 3;
    for (let i = 0; i < count; i += 1) {
      const theta = Phaser.Math.FloatBetween(-Math.PI * 0.92, -Math.PI * 0.08);
      const dist = Phaser.Math.Between(18, 52 + stageIndex * 16);
      const size = Phaser.Math.Between(3, 6 + stageIndex * 2);
      const drop = this.trackCommanderBlackwaterFx(
        this.add.circle(
          x + Phaser.Math.Between(-6, 6),
          y + Phaser.Math.Between(-2, 7),
          size,
          Phaser.Math.RND.pick([0x03040a, 0x09101c, 0x11172b, 0x3a0a16]),
          Phaser.Math.FloatBetween(0.48, 0.82)
        )
          .setDepth(19966)
      );
      this.tweens.add({
        targets: drop,
        x: x + Math.cos(theta) * dist,
        y: y + Math.sin(theta) * dist * 0.52,
        alpha: 0,
        scaleX: 0.45,
        scaleY: 1.55,
        duration: Phaser.Math.Between(150, 260),
        ease: 'Quad.Out',
        onComplete: () => drop?.active && drop.destroy()
      });
    }
  }

  playCommanderBlackwaterFinalImpact(commander) {
    if (!this.commanderBlackwaterPreviewActive || !this.player?.active) return false;
    const player = this.player;
    const x = player.x;
    const playerH = Math.max(1, Math.abs(player.displayHeight ?? 60));
    const y = player.y + Math.max(8, playerH * 0.10);
    const config = ENEMIES.potatoCommander;

    const endingRevealDelayMs = config.blackwaterFinalEndingRevealDelayMsV123 ?? 0;
    const endingHoldMs = config.blackwaterFinalEndingHoldMsV123 ?? 0;
    const finaleFx = [];

    const clearedMinions = this.killAllCommanderBlackwaterMinions();
    if (clearedMinions > 0) {
      this.spawnCommanderBlackwaterStagePulse({ color: 0xffe5b3, alpha: 0.26, duration: 260 });
    }

    const finalCrater = this.spawnCommanderBlackwaterCrater(x, y + 4, 'medium', {
      rotation: Phaser.Math.Between(-4, 4),
      scaleJitter: 2.42,
      persistentMs: 30000,
      depth: 19916,
      revealFrom: 0.34,
      revealTo: 1.12,
      revealMs: 175
    });

    if (this.textures.exists('potatoCommanderJudgmentExplosionArt')) {
      const holyBurst = this.trackCommanderBlackwaterFx(
        this.add.image(x, y + 2, 'potatoCommanderJudgmentExplosionArt')
          .setDepth(19982)
          .setAlpha(0)
          .setBlendMode(Phaser.BlendModes.ADD)
      );
      const sourceW = Math.max(1, holyBurst.width);
      const sourceH = Math.max(1, holyBurst.height);
      const aspect = sourceW / sourceH;
      holyBurst.setDisplaySize(410 * aspect, 410);
      finaleFx.push(holyBurst);
      const sx = holyBurst.scaleX;
      const sy = holyBurst.scaleY;
      holyBurst.setScale(sx * 0.34, sy * 0.34);
      this.tweens.add({
        targets: holyBurst,
        alpha: 1,
        scaleX: sx,
        scaleY: sy,
        duration: 95,
        ease: 'Back.Out',
        onComplete: () => {
          if (!holyBurst?.active) return;
          this.tweens.add({
            targets: holyBurst,
            alpha: 0.10,
            scaleX: sx * 1.48,
            scaleY: sy * 1.48,
            duration: 330,
            ease: 'Quad.Out'
          });
        }
      });
    }

    if (this.textures.exists('potatoCommanderBlackwaterFinalImpactArt')) {
      const impact = this.trackCommanderBlackwaterFx(
        this.add.image(x, y + 12, 'potatoCommanderBlackwaterFinalImpactArt')
          .setDepth(19983)
          .setAlpha(0)
      );
      finaleFx.push(impact);
      const sourceW = Math.max(1, impact.width);
      const sourceH = Math.max(1, impact.height);
      const aspect = sourceW / sourceH;
      impact.setDisplaySize(540 * aspect, 540);
      const targetScaleX = impact.scaleX;
      const targetScaleY = impact.scaleY;
      impact.setScale(targetScaleX * 0.34, targetScaleY * 0.34);
      this.tweens.add({
        targets: impact,
        alpha: 1,
        scaleX: targetScaleX,
        scaleY: targetScaleY,
        duration: 145,
        ease: 'Cubic.Out',
        onComplete: () => {
          if (!impact?.active) return;
          this.tweens.add({
            targets: impact,
            scaleX: targetScaleX * 1.18,
            scaleY: targetScaleY * 1.18,
            alpha: 0.80,
            duration: 290,
            ease: 'Sine.Out'
          });
        }
      });
    }

    for (let i = 0; i < 24; i += 1) {
      const theta = Phaser.Math.FloatBetween(-Math.PI * 0.96, -Math.PI * 0.04);
      const dist = Phaser.Math.Between(90, 220);
      const shard = this.trackCommanderBlackwaterFx(
        this.add.rectangle(
          x + Phaser.Math.Between(-18, 18),
          y + Phaser.Math.Between(-4, 18),
          Phaser.Math.Between(5, 12),
          Phaser.Math.Between(14, 34),
          Phaser.Math.RND.pick([0x10070a, 0x2d1118, 0x5d1a25, 0xd8a45b]),
          Phaser.Math.FloatBetween(0.68, 0.96)
        )
          .setDepth(19984)
          .setAngle(Phaser.Math.Between(-70, 70))
      );
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(theta) * dist,
        y: y + Math.sin(theta) * dist * 0.58,
        angle: shard.angle + Phaser.Math.Between(-220, 220),
        alpha: 0,
        duration: Phaser.Math.Between(360, 620),
        ease: 'Quad.Out',
        onComplete: () => shard?.active && shard.destroy()
      });
    }

    for (let i = 0; i < 16; i += 1) {
      const angle = (Math.PI * 2 * i) / 16 + Phaser.Math.FloatBetween(-0.08, 0.08);
      const ray = this.trackCommanderBlackwaterFx(
        this.add.rectangle(x, y + 8, Phaser.Math.Between(3, 7), Phaser.Math.Between(42, 88), 0xffd56e, 0.72)
          .setDepth(19986)
          .setAngle(Phaser.Math.RadToDeg(angle) + 90)
          .setBlendMode(Phaser.BlendModes.ADD)
      );
      ray.setScale(0.35, 0.45);
      this.tweens.add({
        targets: ray,
        x: x + Math.cos(angle) * Phaser.Math.Between(95, 180),
        y: y + Math.sin(angle) * Phaser.Math.Between(58, 118),
        scaleX: 0.18,
        scaleY: Phaser.Math.FloatBetween(1.8, 2.8),
        alpha: 0,
        duration: Phaser.Math.Between(260, 460),
        ease: 'Quad.Out',
        onComplete: () => ray?.active && ray.destroy()
      });
    }

    const ringA = this.trackCommanderBlackwaterFx(
      this.add.ellipse(x, y + 12, 98, 34, 0xffffff, 0)
        .setStrokeStyle(7, 0xffe6a6, 1)
        .setDepth(19985)
    );
    const ringB = this.trackCommanderBlackwaterFx(
      this.add.ellipse(x, y + 12, 82, 28, 0xffffff, 0)
        .setStrokeStyle(5, 0xff273d, 0.92)
        .setDepth(19984)
    );
    [ringA, ringB].forEach((ring, index) => {
      ring.setScale(0.30);
      this.tweens.add({
        targets: ring,
        scaleX: index === 0 ? 6.2 : 5.1,
        scaleY: index === 0 ? 4.1 : 3.3,
        alpha: 0,
        duration: index === 0 ? 470 : 390,
        ease: 'Quad.Out'
      });
    });

    const impactPulse = this.trackCommanderBlackwaterFx(
      this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0xffd6a0, 0)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(20090)
        .setBlendMode(Phaser.BlendModes.ADD)
    );
    this.tweens.add({
      targets: impactPulse,
      alpha: 0.62,
      duration: 52,
      yoyo: true,
      hold: 58,
      ease: 'Quad.Out',
      onComplete: () => impactPulse?.active && impactPulse.destroy()
    });

    const bombardmentVisibleMs = config.blackwaterFinalBombardmentVisibleMsV127 ?? 700;
    const whiteInMs = config.blackwaterFinalWhiteInMsV127 ?? 45;
    const whiteHoldMs = config.blackwaterFinalWhiteHoldMsV127 ?? 650;
    const whiteOutMs = config.blackwaterFinalWhiteOutMsV127 ?? 550;
    const blindShakeMs = bombardmentVisibleMs + whiteInMs + whiteHoldMs;
    this.cameras.main.shake(blindShakeMs, config.blackwaterFinalShakeStrengthV126 ?? 0.050, true);
    this.commanderBlackwaterFrenzySound?.stop?.();
    this.commanderBlackwaterFrenzySound?.destroy?.();
    this.commanderBlackwaterFrenzySound = null;
    this.sound?.play?.('blackwaterFinalBlastSfx', { volume: 0.94, rate: 1.0 });

    const baseZoom = Number(this.cameras.main.zoom) || 1;
    this.tweens.add({
      targets: this.cameras.main,
      zoom: baseZoom * 1.028,
      duration: 100,
      yoyo: true,
      hold: 30,
      ease: 'Cubic.Out',
      onComplete: () => this.cameras.main.setZoom(baseZoom)
    });

    if (finalCrater?.active) {
      this.tweens.add({
        targets: finalCrater,
        scaleX: finalCrater.scaleX * 1.045,
        scaleY: finalCrater.scaleY * 1.045,
        duration: 160,
        yoyo: true,
        ease: 'Sine.Out'
      });
    }

    const whiteStartDelayMs = Math.max(60, bombardmentVisibleMs);
    const whiteout = this.trackCommanderBlackwaterFx(
      this.add.rectangle(GAME.WIDTH / 2, GAME.HEIGHT / 2, GAME.WIDTH * 4, GAME.HEIGHT * 4, 0xffffff, 1)
        .setOrigin(0.5)
        .setAlpha(0)
        .setScrollFactor(0)
        .setDepth(9999999)
        .setBlendMode(Phaser.BlendModes.NORMAL)
    );
    const whiteStart = this.time.delayedCall(whiteStartDelayMs, () => {
      if (!whiteout?.active || !this.commanderBlackwaterPreviewActive) return;
      this.cameras.main.flash?.(110, 255, 255, 255, true);
      whiteout.setAlpha(0);
      this.commanderBlackwaterBlindSound?.stop?.();
      this.commanderBlackwaterBlindSound?.destroy?.();
      this.commanderBlackwaterBlindSound = this.sound?.add?.('blackwaterBlindRingSfx', { volume: 0.10, loop: false }) ?? null;
      this.commanderBlackwaterBlindSound?.play?.();
      this.tweens.add({
        targets: whiteout,
        alpha: 1,
        duration: whiteInMs,
        ease: 'Quad.Out',
        onComplete: () => {
          if (!this.commanderBlackwaterPreviewActive) return;
          this.clearCommanderBlackwaterCraters({ immediate: true });
          [
            this.commanderBlackwaterCloseupActor,
            this.commanderBlackwaterCloseupGlow,
            this.commanderBlackwaterCloseupShade
          ].forEach((obj) => {
            if (!obj?.active) return;
            this.tweens.killTweensOf(obj);
            obj.destroy();
          });
          this.commanderBlackwaterCloseupActor = null;
          this.commanderBlackwaterCloseupGlow = null;
          this.commanderBlackwaterCloseupShade = null;
          (this.commanderBlackwaterFx ?? []).forEach((obj) => {
            if (!obj?.active || obj === whiteout) return;
            this.tweens.killTweensOf(obj);
            obj.destroy();
          });
          this.commanderBlackwaterFx = [whiteout];
          this.restoreCommanderBlackwaterPlayerVisualUnderWhite();

          const holdEvent = this.time.delayedCall(whiteHoldMs, () => {
            if (!whiteout?.active || !this.commanderBlackwaterPreviewActive) return;
            this.cameras.main.shakeEffect?.reset?.();
            this.cameras.main.setZoom?.(baseZoom);
            this.tweens.add({
              targets: whiteout,
              alpha: 0,
              duration: whiteOutMs,
              ease: 'Sine.InOut',
              onComplete: () => {
                if (!this.commanderBlackwaterPreviewActive) return;
                this.clearCommanderBlackwaterPreview({
                  resetJudgmentCycle: true
                });
              }
            });
          });
          this.commanderBlackwaterEvents.push(holdEvent);
        }
      });
    });
    this.commanderBlackwaterEvents.push(whiteStart);

    const savedUpgradeInvincible = player.upgradeInvincible;
    player.upgradeInvincible = false;
    const damage = player.takeUnavoidableMaxHpRatioDamage?.(
      ENEMIES.potatoCommander.blackwaterFinalDamageMaxHpRatio ?? 0.60
    ) ?? 0;
    player.upgradeInvincible = savedUpgradeInvincible;
    if (damage > 0) {
      this.showHpDamageText(
        'potatoCommander',
        player.x,
        player.y - 58,
        damage,
        { durationMs: 1500, rise: 28, depth: 20095, fontSize: 40 }
      );
    }
    this.updateHud?.();
    return true;
  }

  startCommanderBlackwaterCutscene(commander) {
    if (
      !commander?.active
      || commander.isDead
      || !this.player?.active
      || this.commanderBlackwaterPreviewActive
      || this.commanderJudgmentActive
    ) return false;

    this.clearCommanderBlackwaterPreview();
    this.commanderBlackwaterPreviewActive = true;
    this.commanderJudgmentActive = true;
    this.commanderBlackwaterEvents = [];
    this.commanderBlackwaterFx = [];
    this.commanderBlackwaterPhysicsWasPaused = Boolean(this.physics.world.isPaused);
    if (!this.commanderBlackwaterPhysicsWasPaused) this.physics.world.pause();

    const config = ENEMIES.potatoCommander;
    const player = this.player;

    player.cancelVisualAction?.({ restore: true, forceRestore: true });
    this.commanderBlackwaterPlayerRestore = {
      x: player.x,
      y: player.y,
      textureKey: player.texture?.key ?? 'playerArt',
      displayWidth: Math.abs(Number(player.displayWidth) || 60),
      displayHeight: Math.abs(Number(player.displayHeight) || 60),
      originX: player.originX,
      originY: player.originY,
      angle: Number(player.angle) || 0,
      alpha: player.alpha,
      depth: player.depth,
      flipX: player.flipX,
      visible: player.visible !== false,
      upgradeInvincible: player.upgradeInvincible,
      stunnedUntil: player.stunnedUntil
    };
    player.setVelocity(0, 0);
    player.isDashing = false;
    player.upgradeInvincible = true;

    const preludePauseMs = config.blackwaterPreludePauseMs ?? 520;
    const titleHoldMs = config.blackwaterTitleHoldMsV124 ?? config.blackwaterTitleHoldMsV123 ?? 850;
    const performanceStartAt = preludePauseMs + titleHoldMs + 60;
    const rainStartAt = Math.max(config.blackwaterRainStartMs ?? 1450, performanceStartAt + 340);
    const postHoldMs = config.blackwaterPostHoldMs ?? 1450;
    player.stunnedUntil = Math.max(player.stunnedUntil ?? -Infinity, this.time.now + 18000);
    player.setAlpha(1).setDepth(19960);

    const view = this.cameras.main.worldView;
    const anchorX = Phaser.Math.Clamp(
      player.x,
      view.x + Math.max(170, view.width * 0.42),
      view.right - 92
    );
    const anchorY = Phaser.Math.Clamp(
      player.y,
      view.y + 165,
      view.bottom - 90
    );

    this.judgmentHeadHitStreak = 0;
    this.judgmentLastHeadHitAt = -Infinity;
    this.judgmentRainAnchorX = anchorX;
    this.judgmentRainAnchorY = anchorY;
    this.judgmentRainCellOrder = Phaser.Utils.Array.Shuffle(Array.from({ length: 12 }, (_, index) => index));
    this.judgmentRainCellCursor = 0;

    commander.setVelocity(0, 0);
    commander.cancelBasicAttackBurst?.();
    commander.showJudgmentSkillArt?.();

    const later = (delay, fn) => {
      const event = this.time.delayedCall(Math.max(0, delay), () => {
        if (!this.commanderBlackwaterPreviewActive || !commander?.active || commander.isDead) return;
        fn?.();
      });
      this.commanderBlackwaterEvents.push(event);
      return event;
    };

    const shade = this.trackCommanderBlackwaterFx(
      this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0x08040a, 0)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(19940)
    );
    this.tweens.add({
      targets: shade,
      alpha: 0.16,
      duration: preludePauseMs,
      ease: 'Sine.Out'
    });
    later(preludePauseMs, () => {
      this.sound?.play?.('blackwaterTitleOmenSfx', { volume: 0.34, rate: 1.0 });
      this.showCommanderBlackwaterTitle(titleHoldMs);
      this.spawnCommanderBlackwaterStagePulse({ color: 0x6f0717, alpha: 0.13, duration: 420 });
    });

    later(performanceStartAt, () => {
      this.setCommanderBlackwaterPlayerFrame('playerArt', {
        x: anchorX,
        y: anchorY,
        moveMs: 120,
        closeupIntensity: 0.08,
        closeup: true,
        flipX: false
      });
    });
    later(performanceStartAt + 220, () => {
      this.setCommanderBlackwaterPlayerFrame('playerBlackwaterAlertArt', {
        x: anchorX,
        y: anchorY,
        moveMs: 80,
        closeupIntensity: 0.16,
        closeup: true,
        flipX: false
      });
    });

    later(rainStartAt + 260, () => commander.restoreNormalAfterJudgment?.());

    const counts = config.judgmentRainCounts ?? [8, 18, 42];
    const intervals = config.judgmentRainIntervalsMs ?? [280, 115, 62];
    const falls = config.judgmentRainFallMs ?? [440, 325, 245];
    let cursorMs = rainStartAt;
    const stageStarts = [];
    const stageEnds = [];

    counts.forEach((count, stageIndex) => {
      stageStarts[stageIndex] = cursorMs;
      const baseInterval = intervals[stageIndex] ?? 120;
      let stageElapsed = 0;
      for (let i = 0; i < count; i += 1) {
        const progress = count <= 1 ? 1 : (i / (count - 1));
        let phaseInterval = baseInterval;
        if (stageIndex === 0) {
          phaseInterval = Math.max(174, Math.round(
            Phaser.Math.Linear(baseInterval * 0.82, baseInterval * 0.62, progress)
          ));
        } else if (stageIndex === 1) {
          phaseInterval = Math.max(80, Math.round(
            Phaser.Math.Linear(baseInterval * 1.05, baseInterval * 0.70, progress)
          ));
        } else if (stageIndex === 2) {
          const cubicProgress = progress * progress * progress;
          phaseInterval = Math.max(7, Math.round(
            Phaser.Math.Linear(baseInterval * 1.36, 7, cubicProgress)
          ));
        }
        later(cursorMs + stageElapsed, () => {
          this.spawnCommanderJudgmentRainCross(stageIndex, progress);
          if (stageIndex === 2 && progress > 0.46 && Math.random() < Phaser.Math.Linear(0.30, 0.78, progress)) {
            later(Math.max(4, Math.round(phaseInterval * 0.18)), () => {
              this.spawnCommanderJudgmentRainCross(stageIndex, Math.min(1, progress + 0.10));
            });
          }
          if (stageIndex === 2 && progress > 0.70 && Math.random() < Phaser.Math.Linear(0.52, 0.90, progress)) {
            later(Math.max(5, Math.round(phaseInterval * 0.08)), () => {
              this.spawnCommanderJudgmentRainCross(stageIndex, 1);
            });
          }
        });
        stageElapsed += phaseInterval;
      }
      cursorMs += stageElapsed;
      stageEnds[stageIndex] = cursorMs;
    });

    const rainFinalAt = performanceStartAt + 7220;
    [
      { offset: -860, count: 4 },
      { offset: -730, count: 5 },
      { offset: -610, count: 6 },
      { offset: -500, count: 7 },
      { offset: -390, count: 8 },
      { offset: -285, count: 9 },
      { offset: -195, count: 10 },
      { offset: -115, count: 10 },
      { offset: -50, count: 11 },
      { offset: 15, count: 10 },
      { offset: 90, count: 8 }
    ].forEach(({ offset, count }) => {
      later(rainFinalAt + offset, () => {
        for (let i = 0; i < count; i += 1) {
          later(i * 10, () => this.spawnCommanderJudgmentRainCross(2, 1));
        }
      });
    });

    later(stageStarts[0], () => {
      this.spawnCommanderBlackwaterStagePulse({ color: 0x6f0717, alpha: 0.12, duration: 360 });
      this.spawnCommanderBlackwaterStageOrnament(0);
    });
    later(stageStarts[1], () => {
      this.spawnCommanderBlackwaterStagePulse({ color: 0xa20f21, alpha: 0.18, duration: 430 });
      this.spawnCommanderBlackwaterStageOrnament(1);
      this.tweens.add({ targets: shade, alpha: 0.21, duration: 420, ease: 'Sine.InOut' });
    });
    later(stageStarts[2], () => {
      this.spawnCommanderBlackwaterStagePulse({ color: 0xc41228, alpha: 0.24, duration: 520 });
      this.spawnCommanderBlackwaterStageOrnament(2);
      this.tweens.add({ targets: shade, alpha: 0.26, duration: 420, ease: 'Sine.InOut' });
      this.cameras.main.shake(1680, 0.0135);
      this.commanderBlackwaterFrenzySound?.stop?.();
      this.commanderBlackwaterFrenzySound?.destroy?.();
      this.commanderBlackwaterFrenzySound = this.sound?.add?.('blackwaterFrenzyRumbleSfx', { volume: 0.34, loop: false }) ?? null;
      this.commanderBlackwaterFrenzySound?.play?.();
    });

    const scripted = {
      master: performanceStartAt,
      alert: performanceStartAt + 220,
      dodge1Impact: performanceStartAt + 990,
      glance1: performanceStartAt + 1200,
      dodge2Impact: performanceStartAt + 1740,
      glanceMirror: performanceStartAt + 1920,
      dodge3Impact: performanceStartAt + 2410,
      glanceQuick: performanceStartAt + 2560,
      dodge4Impact: performanceStartAt + 3000,
      extremeImpact: performanceStartAt + 3270,
      woundedAImpact: performanceStartAt + 3510,
      woundedB: performanceStartAt + 4000,
      down: performanceStartAt + 5150,
      ending: performanceStartAt + 6300,
      final: performanceStartAt + 7400
    };

    const scheduleScriptedCross = ({
      impactAt,
      stageIndex,
      frenzy,
      targetX,
      targetY,
      craterSize,
      dodgeLeadMs = 120,
      onDodge = null,
      onImpact = null
    }) => {
      const timing = this.getCommanderJudgmentRainTiming(stageIndex, frenzy);
      const fireAt = Math.max(rainStartAt, impactAt - timing.totalMs);
      const dodgeAt = Math.max(fireAt + timing.telegraphMs, impactAt - dodgeLeadMs);
      later(fireAt, () => {
        this.spawnCommanderJudgmentRainCross(stageIndex, frenzy, null, {
          targetX,
          targetY,
          craterSize,
          scripted: true,
          onImpact: () => {
            this.spawnCommanderBlackwaterNearMissAccent(targetX, targetY, stageIndex);
            onImpact?.();
          }
        });
      });
      later(dodgeAt, () => onDodge?.());
      return { fireAt, dodgeAt, impactAt };
    };

    scheduleScriptedCross({
      impactAt: scripted.dodge1Impact,
      stageIndex: 0,
      frenzy: 0.20,
      targetX: anchorX,
      targetY: anchorY + 24,
      craterSize: 'small',
      dodgeLeadMs: 210,
      onDodge: () => {
        this.spawnCommanderBlackwaterDodgeAfterimage({ x: player.x, y: player.y, alpha: 0.30 });
        this.setCommanderBlackwaterPlayerFrame('playerBlackwaterDodgeRightArt', {
          x: anchorX + 46,
          y: anchorY + 2,
          moveMs: 210,
          closeupIntensity: 0.30,
          closeup: true,
          flipX: false
        });
      }
    });

    later(scripted.glance1, () => {
      this.setCommanderBlackwaterPlayerFrame('playerBlackwaterGlanceBackArt', {
        x: anchorX + 28,
        y: anchorY,
        moveMs: 110,
        closeupIntensity: 0.37,
        closeup: true,
        flipX: false
      });
    });

    scheduleScriptedCross({
      impactAt: scripted.dodge2Impact,
      stageIndex: 0,
      frenzy: 0.34,
      targetX: anchorX + 28,
      targetY: anchorY + 24,
      craterSize: 'small',
      dodgeLeadMs: 200,
      onDodge: () => {
        this.spawnCommanderBlackwaterDodgeAfterimage({ x: player.x, y: player.y, alpha: 0.32 });
        this.setCommanderBlackwaterPlayerFrame('playerBlackwaterDodgeLeftArt', {
          x: anchorX - 46,
          y: anchorY + 3,
          moveMs: 195,
          closeupIntensity: 0.44,
          closeup: true,
          flipX: false
        });
      }
    });

    later(scripted.glanceMirror, () => {
      this.setCommanderBlackwaterPlayerFrame('playerBlackwaterGlanceBackArt', {
        x: anchorX - 28,
        y: anchorY + 1,
        moveMs: 90,
        closeupIntensity: 0.48,
        closeup: true,
        flipX: true
      });
    });

    scheduleScriptedCross({
      impactAt: scripted.dodge3Impact,
      stageIndex: 1,
      frenzy: 0.46,
      targetX: anchorX - 28,
      targetY: anchorY + 24,
      craterSize: 'small',
      dodgeLeadMs: 190,
      onDodge: () => {
        this.spawnCommanderBlackwaterDodgeAfterimage({ x: player.x, y: player.y, alpha: 0.34 });
        this.setCommanderBlackwaterPlayerFrame('playerBlackwaterDodgeRightArt', {
          x: anchorX + 46,
          y: anchorY + 2,
          moveMs: 180,
          closeupIntensity: 0.54,
          closeup: true,
          flipX: true
        });
      }
    });

    later(scripted.glanceQuick, () => {
      this.setCommanderBlackwaterPlayerFrame('playerBlackwaterGlanceBackArt', {
        x: anchorX + 28,
        y: anchorY + 1,
        moveMs: 80,
        closeupIntensity: 0.58,
        closeup: true,
        flipX: false
      });
    });

    scheduleScriptedCross({
      impactAt: scripted.dodge4Impact,
      stageIndex: 1,
      frenzy: 0.62,
      targetX: anchorX + 28,
      targetY: anchorY + 24,
      craterSize: 'small',
      dodgeLeadMs: 180,
      onDodge: () => {
        this.spawnCommanderBlackwaterDodgeAfterimage({ x: player.x, y: player.y, alpha: 0.36 });
        this.setCommanderBlackwaterPlayerFrame('playerBlackwaterDodgeLeftArt', {
          x: anchorX - 46,
          y: anchorY + 3,
          moveMs: 165,
          closeupIntensity: 0.62,
          closeup: true,
          flipX: true
        });
      }
    });

    scheduleScriptedCross({
      impactAt: scripted.extremeImpact,
      stageIndex: 1,
      frenzy: 0.82,
      targetX: anchorX - 46,
      targetY: anchorY + 24,
      craterSize: 'medium',
      dodgeLeadMs: 150,
      onDodge: () => {
        this.spawnCommanderBlackwaterDodgeAfterimage({ x: player.x, y: player.y, alpha: 0.38 });
        this.setCommanderBlackwaterPlayerFrame('playerBlackwaterExtremeDodgeArt', {
          x: anchorX + 48,
          y: anchorY + 4,
          moveMs: 145,
          closeupIntensity: 0.68,
          closeup: true,
          flipX: false
        });
      }
    });

    scheduleScriptedCross({
      impactAt: scripted.woundedAImpact,
      stageIndex: 1,
      frenzy: 0.94,
      targetX: anchorX + 48,
      targetY: anchorY + 26,
      craterSize: 'medium',
      dodgeLeadMs: 170,
      onDodge: () => {
        this.spawnCommanderBlackwaterDodgeAfterimage({ x: player.x, y: player.y, alpha: 0.28 });
        this.setCommanderBlackwaterPlayerFrame('playerBlackwaterWoundedDodgeAArt', {
          x: anchorX - 34,
          y: anchorY + 6,
          moveMs: 230,
          closeupIntensity: 0.76,
          closeup: true,
          flipX: false
        });
        this.cameras.main.shake(180, 0.0145);
      }
    });

    later(scripted.woundedB, () => {
      this.setCommanderBlackwaterPlayerFrame('playerBlackwaterWoundedDodgeBArt', {
        x: anchorX + 14,
        y: anchorY + 9,
        moveMs: 260,
        closeupIntensity: 0.86,
        closeup: true,
        flipX: true
      });
      this.cameras.main.shake(360, 0.018);
    });

    later(scripted.down, () => {
      this.setCommanderBlackwaterPlayerFrame('playerBlackwaterDownArt', {
        x: anchorX + 6,
        y: anchorY + 14,
        moveMs: 320,
        closeupIntensity: 0.96,
        closeup: true,
        flipX: false
      });
      this.cameras.main.shake(520, 0.021);
    });

    later(scripted.ending, () => {
      this.setCommanderBlackwaterPlayerFrame('playerBlackwaterEndingArt', {
        x: anchorX + 5,
        y: anchorY + 16,
        moveMs: 340,
        closeupIntensity: 1.0,
        closeup: true,
        flipX: false
      });
      player.setDepth(19960);
      this.cameras.main.shake(560, 0.020);
    });

    const frenzyStartAt = scripted.woundedB;
    const frenzyEndAt = scripted.final;
    let frenzyCursor = frenzyStartAt;
    let frenzyTick = 0;
    while (frenzyCursor < frenzyEndAt) {
      const elapsed = frenzyCursor - frenzyStartAt;
      let intervalMs = 90;
      let burstCount = (frenzyTick % 4 === 0) ? 2 : 1;
      if (elapsed >= 1000 && elapsed < 2000) {
        intervalMs = 64;
        burstCount = (frenzyTick % 2 === 0) ? 2 : 1;
      } else if (elapsed >= 2000) {
        intervalMs = 42;
        burstCount = 2 + ((frenzyTick % 3 === 0) ? 1 : 0);
      }
      const eventAt = frenzyCursor;
      const progress = Phaser.Math.Clamp(elapsed / Math.max(1, frenzyEndAt - frenzyStartAt), 0, 1);
      later(eventAt, () => {
        for (let j = 0; j < burstCount; j += 1) {
          later(j * 11, () => this.spawnCommanderJudgmentRainCross(2, Phaser.Math.Linear(0.70, 1, progress)));
        }
      });
      frenzyCursor += intervalMs;
      frenzyTick += 1;
    }

    const frenzyPulseStepMs = 170;
    const frenzyPulseCount = Math.ceil((frenzyEndAt - frenzyStartAt) / frenzyPulseStepMs);
    for (let i = 0; i < frenzyPulseCount; i += 1) {
      const t = frenzyStartAt + i * frenzyPulseStepMs;
      const p = frenzyPulseCount <= 1 ? 1 : i / (frenzyPulseCount - 1);
      later(t, () => {
        this.cameras.main.shake(185, Phaser.Math.Linear(0.0105, 0.0205, p));
      });
    }

    later(scripted.final - 520, () => {
      if (!player?.active || player.texture?.key !== 'playerBlackwaterEndingArt') return;
      this.cameras.main.shake(540, 0.062, true);
      this.spawnCommanderBlackwaterStagePulse({ color: 0xffd9ad, alpha: 0.20, duration: 300 });
    });

    const finalTiming = this.getCommanderJudgmentRainTiming(2, 1);
    later(Math.max(rainStartAt, scripted.final - finalTiming.totalMs), () => {
      this.spawnCommanderJudgmentRainCross(2, 1, null, {
        targetX: anchorX + 5,
        targetY: anchorY + 30,
        craterSize: 'medium',
        scripted: true,
        onImpact: () => this.playCommanderBlackwaterFinalImpact(commander)
      });
    });

    const whiteoutMs = (config.blackwaterFinalBombardmentVisibleMsV127 ?? 700)
      + (config.blackwaterFinalWhiteInMsV127 ?? 45)
      + (config.blackwaterFinalWhiteHoldMsV127 ?? 650)
      + (config.blackwaterFinalWhiteOutMsV127 ?? 550);
    const totalLockMs = scripted.final + Math.max(postHoldMs, whiteoutMs + 260);
    commander.actionLockedUntil = Math.max(
      commander.actionLockedUntil ?? -Infinity,
      this.time.now + totalLockMs
    );
    this.spawnCommanderJudgmentCastAura(commander, Math.max(800, totalLockMs - 260), { intensity: 0.48 });

    later(totalLockMs, () => {
      if (!this.commanderBlackwaterPreviewActive) return;
      this.clearCommanderBlackwaterPreview({
        resetJudgmentCycle: true
      });
    });

    return true;
  }

  trackDuckQueenUltimateFx(obj) {
    if (!obj) return obj;
    this.duckQueenUltimateFx ??= [];
    this.duckQueenUltimateFx.push(obj);
    return obj;
  }

  destroyDuckQueenUltimateFx() {
    (this.duckQueenUltimateFx ?? []).forEach((obj) => {
      if (!obj) return;
      this.tweens.killTweensOf(obj);
      if (obj.active) obj.destroy();
    });
    this.duckQueenUltimateFx = [];
    this.duckQueenUltimateSafeZone = null;
    this.duckQueenUltimateGroundActor = null;
    this.duckQueenUltimateCloseupActor = null;
    this.duckQueenUltimateCloseupGlow = null;
    this.duckQueenUltimateCloseupShade = null;
  }

  restoreDuckQueenUltimatePlayer() {
    const player = this.player;
    const restore = this.duckQueenUltimatePlayerRestore;

    const legacyActor = this.duckQueenUltimatePlayerActor;
    if (legacyActor?.active && legacyActor !== player) {
      this.tweens.killTweensOf(legacyActor);
      legacyActor.destroy();
    }
    this.duckQueenUltimatePlayerActor = null;

    if (player?.active) {
      this.tweens.killTweensOf(player);
      player.cancelVisualAction?.({ restore: false, forceRestore: false });
      player.setVelocity(0, 0);

      if (restore?.textureKey && this.textures.exists(restore.textureKey)) {
        player.setTexture(restore.textureKey);
      }
      if (Number.isFinite(restore?.displayWidth) && Number.isFinite(restore?.displayHeight)) {
        player.setDisplaySize(restore.displayWidth, restore.displayHeight);
      }
      if (Number.isFinite(restore?.originX) && Number.isFinite(restore?.originY)) {
        player.setOrigin(restore.originX, restore.originY);
      }
      if (Number.isFinite(restore?.x) && Number.isFinite(restore?.y)) {
        player.setPosition(restore.x, restore.y);
      }
      player.setAngle(Number.isFinite(restore?.angle) ? restore.angle : 0);
      player.setVisible(restore?.visible ?? true);
      player.setAlpha(restore?.alpha ?? 1);
      player.setDepth(restore?.depth ?? 10);
      player.setFlipX(restore?.flipX ?? false);
      player.upgradeInvincible = Boolean(restore?.upgradeInvincible);
      player.stunnedUntil = Number.isFinite(restore?.stunnedUntil)
        ? restore.stunnedUntil
        : -Infinity;
      player.slowUntil = -Infinity;
      player.slowMultiplier = 1;
      player.clearTint?.();

      if (player.body) {
        const sx = Math.max(0.001, Math.abs(player.scaleX));
        const sy = Math.max(0.001, Math.abs(player.scaleY));
        player.body.setSize(35.625 / sx, 44.0625 / sy, true);
      }
    }

    this.duckQueenUltimatePlayerRestore = null;
    this.duckQueenUltimateAnchorX = null;
    this.duckQueenUltimateAnchorY = null;
    this.duckQueenUltimateCutsceneActive = false;
  }

  clearDuckQueenUltimateBlackframes({ immediate = true } = {}) {
    const frames = this.duckQueenUltimateBlackframes ?? [];
    this.duckQueenUltimateBlackframes = [];

    frames.forEach((frame) => {
      if (!frame?.active) return;
      this.tweens.killTweensOf(frame);
      if (immediate) {
        frame.destroy();
        return;
      }
      this.tweens.add({
        targets: frame,
        alpha: 0,
        scaleX: frame.scaleX * 0.90,
        scaleY: frame.scaleY * 0.90,
        duration: 120,
        ease: 'Quad.In',
        onComplete: () => frame?.active && frame.destroy()
      });
    });
  }

  clearDuckQueenUltimate({ restoreQueen = true, applyCooldown = false } = {}) {
    (this.duckQueenUltimateEvents ?? []).forEach((event) => event?.remove?.(false));
    this.duckQueenUltimateEvents = [];

    if (this.duckQueenUltimateTitle?.active) {
      this.tweens.killTweensOf(this.duckQueenUltimateTitle);
      this.duckQueenUltimateTitle.destroy();
    }
    this.duckQueenUltimateTitle = null;

    this.clearDuckQueenUltimateBlackframes({ immediate: true });
    this.stopDuckQueenDafamaiMinionEvacuation();
    this.restoreDuckQueenUltimatePlayer();
    this.destroyDuckQueenUltimateFx();

    const queen = this.duckQueen;
    this.duckQueenUltimateActive = false;
    this.duckQueenUltimateStage = 'idle';

    if (queen?.active && !queen.isDead) {
      if (applyCooldown) queen.registerUltimateCompleted?.(this.time.now);
      if (restoreQueen) {
        queen.frenzyMoodState = 's3_mood_normal';
        queen.applyVisualState?.(queen.getPhase?.() === 'frenzy' ? 's3_mood_normal' : queen.getPhaseVisualState?.());
        queen.resumeRoamingState?.(this.time.now);
      }
    }
  }

  updateDuckQueenUltimate(time = this.time.now) {
    if (!this.duckQueenUltimateActive) return;

    const player = this.player;
    const stage = String(this.duckQueenUltimateStage ?? '');
    if (player?.active && (stage.startsWith('blackframe') || stage === 'title')) {
      (this.duckQueenUltimateBlackframes ?? []).forEach((frame) => {
        if (!frame?.active || !frame.dqFollowPlayer) return;
        frame.x = player.x + (frame.dqOffsetX ?? 0);
        frame.y = player.y + (frame.dqOffsetY ?? 0);
      });
    }

    if (this.duckQueenUltimateCutsceneActive && player?.active) {
      const x = this.duckQueenUltimateAnchorX ?? player.x;
      const y = this.duckQueenUltimateAnchorY ?? player.y;
      player.setPosition(x, y);
      player.setVelocity(0, 0);
      player.isDashing = false;

      if (stage === 'explosion') {
        player.setVisible(false);
        player.setAlpha(0);
      } else {
        player.setVisible(true);
        player.setAlpha(1);
        player.setDepth(40);
      }
    }
  }

  isDuckQueenDafamaiEvacuationEnemy(enemy) {
    if (!enemy?.active || enemy.isDead || enemy.isBoss) return false;
    return ['duck', 'roach', 'potato', 'ball', 'twinPig', 'plagueCat'].includes(enemy.enemyType);
  }

  startDuckQueenDafamaiMinionEvacuation() {
    if (!this.duckQueenUltimateCutsceneActive) return false;
    const cfg = ENEMIES.duckQueen;
    this.duckQueenDafamaiEvacuationActive = true;
    this.duckQueenDafamaiEvacuationCenterX = this.duckQueenUltimateAnchorX ?? this.player?.x ?? 0;
    this.duckQueenDafamaiEvacuationCenterY = (
      this.duckQueenUltimateAnchorY ?? this.player?.y ?? 0
    ) + (cfg.ultimateGroundOffsetY ?? 48) * 0.35;

    const evacuees = [];
    this.enemies.children.iterate((enemy) => {
      if (!this.isDuckQueenDafamaiEvacuationEnemy(enemy)) return;
      evacuees.push(enemy);
    });

    evacuees.forEach((enemy, index) => {
      enemy.dafamaiEvadeSeed ??= Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dx = enemy.x - this.duckQueenDafamaiEvacuationCenterX;
      const dy = enemy.y - this.duckQueenDafamaiEvacuationCenterY;
      const baseAngle = Math.abs(dx) + Math.abs(dy) > 4
        ? Math.atan2(dy, dx)
        : enemy.dafamaiEvadeSeed;
      const alternating = ((index % 5) - 2) * (cfg.ultimateEvacFanStepRad ?? 0.18);
      const jitter = Phaser.Math.FloatBetween(
        -(cfg.ultimateEvacAngleJitterRad ?? 0.88),
        cfg.ultimateEvacAngleJitterRad ?? 0.88
      );
      enemy.dafamaiEvadeAngle = baseAngle + alternating + jitter;
      const radialJitter = Phaser.Math.FloatBetween(0, cfg.ultimateEvacTargetJitterPx ?? 52);
      const safeX = (cfg.ultimateEvacRadiusX ?? 282) + (cfg.ultimateEvacSafePadding ?? 72) + radialJitter;
      const safeY = (cfg.ultimateEvacRadiusY ?? 184) + (cfg.ultimateEvacSafePadding ?? 72) * 0.72 + radialJitter * 0.55;
      enemy.dafamaiEvadeTargetX = this.duckQueenDafamaiEvacuationCenterX
        + Math.cos(enemy.dafamaiEvadeAngle) * safeX;
      enemy.dafamaiEvadeTargetY = this.duckQueenDafamaiEvacuationCenterY
        + Math.sin(enemy.dafamaiEvadeAngle) * safeY;
      enemy.dafamaiEvadeSafeX = null;
      enemy.dafamaiEvadeSafeY = null;
      enemy.dafamaiEvadeTargetX = null;
      enemy.dafamaiEvadeTargetY = null;
      enemy.dafamaiEvadeAngle = null;
      enemy.dafamaiPendingExplosion = false;
      if (enemy.enemyType === 'roach') {
        enemy.queenCandyLure = null;
        enemy.queenCandyLuredUntil = -Infinity;
      }
    });
    return true;
  }

  stopDuckQueenDafamaiMinionEvacuation() {
    this.duckQueenDafamaiEvacuationActive = false;
    this.duckQueenDafamaiRoachFinaleActive = false;
    this.enemies?.children?.iterate?.((enemy) => {
      if (!enemy?.active || enemy.isDead) return;
      enemy.dafamaiEvadeSafeX = null;
      enemy.dafamaiEvadeSafeY = null;
      enemy.dafamaiPendingExplosion = false;
      if (enemy.body?.enable !== false) enemy.setVelocity?.(0, 0);
      if (enemy.enemyType === 'roach') {
        enemy.refreshStatusPresentation?.();
        if (Number.isFinite(enemy.baseArtScale)) enemy.setScale(enemy.baseArtScale);
      }
    });
    this.duckQueenDafamaiEvacuationCenterX = null;
    this.duckQueenDafamaiEvacuationCenterY = null;
  }

  updateDuckQueenDafamaiMinionEvacuation(enemy, time = this.time.now) {
    if (
      !this.duckQueenDafamaiEvacuationActive
      || !this.duckQueenUltimateCutsceneActive
      || !this.isDuckQueenDafamaiEvacuationEnemy(enemy)
    ) return false;

    if (enemy.dafamaiPendingExplosion) {
      enemy.setVelocity?.(0, 0);
      return true;
    }

    const cfg = ENEMIES.duckQueen;
    const cx = this.duckQueenDafamaiEvacuationCenterX ?? this.duckQueenUltimateAnchorX ?? 0;
    const cy = this.duckQueenDafamaiEvacuationCenterY ?? this.duckQueenUltimateAnchorY ?? 0;
    const radiusX = cfg.ultimateEvacRadiusX ?? 282;
    const radiusY = cfg.ultimateEvacRadiusY ?? 184;
    const safePadding = cfg.ultimateEvacSafePadding ?? 72;
    const safeX = radiusX + safePadding;
    const safeY = radiusY + safePadding * 0.72;

    let dx = enemy.x - cx;
    let dy = enemy.y - cy;
    let metric = Math.sqrt(
      (dx * dx) / Math.max(1, safeX * safeX)
      + (dy * dy) / Math.max(1, safeY * safeY)
    );

    enemy.dafamaiEvadeSeed ??= Phaser.Math.FloatBetween(0, Math.PI * 2);

    if (metric < 1) {
      let targetX = enemy.dafamaiEvadeTargetX;
      let targetY = enemy.dafamaiEvadeTargetY;
      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
        const angle = Number.isFinite(enemy.dafamaiEvadeAngle)
          ? enemy.dafamaiEvadeAngle
          : Math.atan2(dy || Math.sin(enemy.dafamaiEvadeSeed), dx || Math.cos(enemy.dafamaiEvadeSeed));
        targetX = cx + Math.cos(angle) * safeX;
        targetY = cy + Math.sin(angle) * safeY;
        enemy.dafamaiEvadeTargetX = targetX;
        enemy.dafamaiEvadeTargetY = targetY;
      }

      const escape = new Phaser.Math.Vector2(targetX - enemy.x, targetY - enemy.y);
      if (escape.lengthSq() < 4) {
        escape.set(dx || Math.cos(enemy.dafamaiEvadeSeed), dy || Math.sin(enemy.dafamaiEvadeSeed));
      }
      escape.normalize();

      const separation = new Phaser.Math.Vector2(0, 0);
      const separationRadius = cfg.ultimateEvacSeparationRadius ?? 54;
      const separationRadiusSq = separationRadius * separationRadius;
      let separationCount = 0;
      this.enemies.children.iterate((other) => {
        if (separationCount >= 8 || other === enemy || !this.isDuckQueenDafamaiEvacuationEnemy(other)) return;
        const sx = enemy.x - other.x;
        const sy = enemy.y - other.y;
        const distSq = sx * sx + sy * sy;
        if (distSq <= 1 || distSq > separationRadiusSq) return;
        const dist = Math.sqrt(distSq);
        const weight = 1 - dist / separationRadius;
        separation.x += (sx / dist) * weight;
        separation.y += (sy / dist) * weight;
        separationCount += 1;
      });
      if (separation.lengthSq() > 0) {
        separation.normalize().scale(cfg.ultimateEvacSeparationWeight ?? 0.72);
        escape.add(separation).normalize();
      }

      const tangent = new Phaser.Math.Vector2(-escape.y, escape.x)
        .scale(Math.sin(time * 0.007 + enemy.dafamaiEvadeSeed) * 0.12);
      escape.add(tangent).normalize();

      const speedMultiplier = enemy.enemyType === 'roach'
        ? (cfg.ultimateEvacRoachSpeedMultiplier ?? 1.62)
        : (cfg.ultimateEvacSpeedMultiplier ?? 1.18);
      const speed = Math.max(72, (enemy.moveSpeed ?? enemy.baseMoveSpeed ?? 100) * speedMultiplier);
      enemy.setVelocity?.(escape.x * speed, escape.y * speed);
      enemy.dafamaiEvadeSafeX = null;
      enemy.dafamaiEvadeSafeY = null;

      if (enemy.enemyType === 'roach') {
        const facing = Math.atan2(escape.y, escape.x) + Math.PI / 2;
        const panicWiggle = Math.sin(time * 0.030 + enemy.dafamaiEvadeSeed) * 0.13;
        enemy.setRotation?.(facing + panicWiggle);
      }
      return true;
    }

    if (!Number.isFinite(enemy.dafamaiEvadeSafeX) || !Number.isFinite(enemy.dafamaiEvadeSafeY)) {
      enemy.dafamaiEvadeSafeX = enemy.x;
      enemy.dafamaiEvadeSafeY = enemy.y;
    }

    const wanderRadius = cfg.ultimateEvacWanderRadius ?? 24;
    const wanderAngle = time * 0.00135 + enemy.dafamaiEvadeSeed;
    const targetX = enemy.dafamaiEvadeSafeX + Math.cos(wanderAngle) * wanderRadius;
    const targetY = enemy.dafamaiEvadeSafeY + Math.sin(wanderAngle * 0.92) * wanderRadius * 0.72;
    const drift = new Phaser.Math.Vector2(targetX - enemy.x, targetY - enemy.y);
    if (drift.lengthSq() > 9) {
      const holdMultiplier = cfg.ultimateEvacHoldSpeedMultiplier ?? 0.18;
      const speed = Math.max(18, (enemy.moveSpeed ?? enemy.baseMoveSpeed ?? 100) * holdMultiplier);
      drift.normalize().scale(speed);
      enemy.setVelocity?.(drift.x, drift.y);
      if (enemy.enemyType === 'roach') {
        enemy.setRotation?.(Math.atan2(drift.y, drift.x) + Math.PI / 2);
      }
    } else {
      enemy.setVelocity?.(0, 0);
    }
    return true;
  }

  startDuckQueenDafamaiRoachChainExplosion(queen, { triggerCentralExplosion = true } = {}) {
    if (!this.duckQueenUltimateActive || !this.duckQueenUltimateCutsceneActive) return false;
    if (this.duckQueenDafamaiRoachFinaleActive) return true;
    this.duckQueenDafamaiRoachFinaleActive = true;
    this.duckQueenUltimateStage = 'roach_chain';

    const roaches = [];
    this.enemies.children.iterate((enemy) => {
      if (enemy?.active && !enemy.isDead && enemy.enemyType === 'roach') roaches.push(enemy);
    });

    const cfg = ENEMIES.duckQueen;
    const cx = this.duckQueenUltimateAnchorX ?? this.player?.x ?? 0;
    const cy = this.duckQueenUltimateAnchorY ?? this.player?.y ?? 0;
    roaches.sort((a, b) => (
      Phaser.Math.Angle.Between(cx, cy, a.x, a.y)
      - Phaser.Math.Angle.Between(cx, cy, b.x, b.y)
    ));

    const chainMs = cfg.ultimateRoachChainExplosionMs ?? 380;
    const armMs = cfg.ultimateRoachExplosionArmMs ?? 105;
    const schedule = (delay, fn) => {
      const event = this.time.delayedCall(delay, () => {
        if (!this.duckQueenUltimateActive || !this.duckQueenUltimateCutsceneActive) return;
        fn?.();
      });
      this.duckQueenUltimateEvents.push(event);
      return event;
    };

    if (!roaches.length) {
      if (triggerCentralExplosion) {
        schedule(cfg.ultimateRoachEmptyBeatMs ?? 140, () => this.playDuckQueenDafamaiExplosion(queen));
      }
      return true;
    }

    roaches.forEach((roach, index) => {
      roach.dafamaiPendingExplosion = true;
      roach.setVelocity?.(0, 0);
      const progress = roaches.length <= 1 ? 0 : index / (roaches.length - 1);
      const flashAt = Math.round(progress * Math.max(0, chainMs - armMs - 35));

      schedule(flashAt, () => {
        if (!roach?.active || roach.isDead) return;
        roach.setTint?.(0xff8df0);
        const pulse = this.trackDuckQueenUltimateFx(
          this.add.circle(roach.x, roach.y, 8, 0xf27cff, 0.18)
            .setStrokeStyle(2, 0xffc4ff, 0.9)
            .setDepth(34)
        );
        this.tweens.add({
          targets: pulse,
          radius: 24,
          alpha: 0,
          duration: armMs,
          ease: 'Quad.Out',
          onComplete: () => pulse?.active && pulse.destroy()
        });
        this.tweens.add({
          targets: roach,
          scaleX: (roach.scaleX ?? 1) * 1.16,
          scaleY: (roach.scaleY ?? 1) * 1.16,
          duration: Math.max(60, armMs - 18),
          yoyo: true,
          ease: 'Sine.InOut'
        });
      });

      schedule(flashAt + armMs, () => {
        if (!roach?.active || roach.isDead) return;
        const x = roach.x;
        const y = roach.y;
        roach.isDead = true;
        roach.setVelocity?.(0, 0);
        roach.destroy();
        this.registerKill('roach');
        this.createPurpleRoachExplosion(x, y);
        this.createEnemyBloodSplatter(x, y, 'roach');
        if (index % 3 === 0) this.sound?.play?.('hitLight', { volume: 0.16 });
      });
    });

    schedule(chainMs, () => {
      if (triggerCentralExplosion) {
        this.cameras.main.shake(180, Math.min(0.010, 0.003 + roaches.length * 0.00018));
        this.playDuckQueenDafamaiExplosion(queen);
      }
    });
    return true;
  }

  spawnDuckQueenBlackframeHit(hitIndex = 0) {
    const player = this.player;
    if (!player?.active || !this.textures.exists('queenDuckBlackframeStandardArt')) return null;

    const cfg = ENEMIES.duckQueen;
    const impactMs = cfg.ultimateBlackframeImpactMs ?? 170;
    const launchOffsets = [
      { x: -175, y: -105, angle: -7, oy: -25 },
      { x: 175, y: -92, angle: 7, oy: 0 },
      { x: 0, y: -180, angle: 0, oy: 25 }
    ];
    const spec = launchOffsets[hitIndex] ?? launchOffsets[launchOffsets.length - 1];
    const frame = this.trackDuckQueenUltimateFx(
      this.add.image(player.x + spec.x, player.y + spec.y, 'queenDuckBlackframeStandardArt')
        .setDepth(47 + hitIndex * 0.01)
        .setAlpha(0)
        .setAngle(spec.angle * 1.8)
    );

    const width = 148;
    const ratio = Math.max(0.001, frame.height / Math.max(1, frame.width));
    frame.setDisplaySize(width, width * ratio);
    frame.dqOffsetX = 0;
    frame.dqOffsetY = spec.oy;
    frame.dqFollowPlayer = false;
    this.duckQueenUltimateBlackframes.push(frame);

    this.tweens.add({
      targets: frame,
      x: player.x,
      y: player.y + spec.oy,
      angle: spec.angle,
      alpha: 0.98,
      duration: impactMs,
      ease: 'Back.Out',
      onComplete: () => {
        if (!frame?.active || !this.duckQueenUltimateActive) return;
        frame.dqFollowPlayer = true;
        const slowPerHit = cfg.ultimateBlackframeSlowPerHit ?? 0.20;
        const multiplier = Phaser.Math.Clamp(1 - slowPerHit * (hitIndex + 1), 0.2, 1);
        player.applySlow?.(multiplier, 5000, this.time.now);
        this.cameras.main.shake(110 + hitIndex * 35, 0.005 + hitIndex * 0.002);
        this.sound?.play?.('hitLight', { volume: 0.28 + hitIndex * 0.04 });
      }
    });
    return frame;
  }

  convergeDuckQueenBlackframes() {
    (this.duckQueenUltimateBlackframes ?? []).forEach((frame, index) => {
      if (!frame?.active) return;
      frame.dqFollowPlayer = true;
      const targetY = (index - 1) * 10;
      this.tweens.add({
        targets: frame,
        dqOffsetX: 0,
        dqOffsetY: targetY,
        angle: (index - 1) * 2,
        duration: 170,
        ease: 'Quad.InOut'
      });
    });
  }

  showDuckQueenDafamaiTitle() {
    if (!this.textures.exists('queenDuckDafamaiTitleArt')) return null;
    const title = this.add.image(GAME.WIDTH / 2, GAME.HEIGHT / 2, 'queenDuckDafamaiTitleArt')
      .setScrollFactor(0)
      .setDepth(520)
      .setAlpha(0);
    const fitScale = Math.min(1, (GAME.WIDTH * 0.76) / Math.max(1, title.width));
    title.setScale(fitScale * 1.70);
    this.duckQueenUltimateTitle = title;
    this.cameras.main.shake(120, 0.006);
    this.tweens.add({
      targets: title,
      alpha: 1,
      scaleX: fitScale,
      scaleY: fitScale,
      duration: 180,
      ease: 'Back.Out'
    });

    const holdMs = ENEMIES.duckQueen.ultimateTitleMs ?? 800;
    const fadeEvent = this.time.delayedCall(Math.max(300, holdMs - 180), () => {
      if (!title?.active) return;
      this.tweens.add({
        targets: title,
        alpha: 0,
        scaleX: fitScale * 0.95,
        scaleY: fitScale * 0.95,
        duration: 180,
        ease: 'Quad.In',
        onComplete: () => {
          if (title.active) title.destroy();
          if (this.duckQueenUltimateTitle === title) this.duckQueenUltimateTitle = null;
        }
      });
    });
    this.duckQueenUltimateEvents.push(fadeEvent);
    return title;
  }

  setDuckQueenDafamaiPlayerFrame(textureKey, { displayScale = 1 } = {}) {
    const player = this.player;
    if (!player?.active || !this.textures.exists(textureKey)) return null;

    const cfg = ENEMIES.duckQueen;
    const baseSize = cfg.ultimateCutsceneDisplaySize ?? 180;
    const size = baseSize * Math.max(0.1, displayScale);
    const x = this.duckQueenUltimateAnchorX ?? player.x;
    const y = this.duckQueenUltimateAnchorY ?? player.y;

    const legacyActor = this.duckQueenUltimatePlayerActor;
    if (legacyActor?.active && legacyActor !== player) {
      this.tweens.killTweensOf(legacyActor);
      legacyActor.destroy();
    }

    player.cancelVisualAction?.({ restore: true, forceRestore: true });
    player.setTexture(textureKey);
    player.setOrigin(0.5, 0.5);
    player.setDisplaySize(size, size);
    player.setPosition(x, y);
    player.setAngle(0);
    player.setFlipX(false);
    player.setFlipY(false);
    player.setVisible(true);
    player.setAlpha(1);
    player.setDepth(40);
    player.setVelocity(0, 0);

    if (player.body) {
      const sx = Math.max(0.001, Math.abs(player.scaleX));
      const sy = Math.max(0.001, Math.abs(player.scaleY));
      player.body.setSize(35.625 / sx, 44.0625 / sy, true);
    }

    this.duckQueenUltimatePlayerActor = player;
    return player;
  }

  setDuckQueenDafamaiGroundStage(textureKey, { fadeMs = null, impale = false } = {}) {
    if (!this.duckQueenUltimateCutsceneActive || !this.textures.exists(textureKey)) return null;
    const cfg = ENEMIES.duckQueen;
    const x = this.duckQueenUltimateAnchorX ?? this.player?.x ?? 0;
    const y = (this.duckQueenUltimateAnchorY ?? this.player?.y ?? 0) + (cfg.ultimateGroundOffsetY ?? 48);
    const size = impale
      ? (cfg.ultimateImpaleGroundDisplaySize ?? 550)
      : (cfg.ultimateGroundDisplaySize ?? 520);
    const duration = fadeMs ?? (cfg.ultimateGroundFadeMs ?? 210);

    const previous = this.duckQueenUltimateGroundActor;
    const ground = this.trackDuckQueenUltimateFx(
      this.add.image(x, y, textureKey)
        .setOrigin(0.5)
        .setDepth(18)
        .setAlpha(0)
        .setDisplaySize(size, size)
    );
    this.duckQueenUltimateGroundActor = ground;

    this.tweens.add({
      targets: ground,
      alpha: 1,
      duration,
      ease: 'Sine.Out'
    });
    if (previous?.active && previous !== ground) {
      this.tweens.add({
        targets: previous,
        alpha: 0,
        duration: Math.max(100, Math.round(duration * 0.78)),
        ease: 'Sine.In',
        onComplete: () => previous?.active && previous.destroy()
      });
    }

    const glow = this.trackDuckQueenUltimateFx(
      this.add.image(x, y, textureKey)
        .setOrigin(0.5)
        .setDepth(17)
        .setDisplaySize(size, size)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(impale ? 0.28 : 0.12)
    );
    this.tweens.add({
      targets: glow,
      alpha: impale ? 0.42 : 0.20,
      duration: Math.max(180, duration + 100),
      yoyo: true,
      repeat: 0,
      ease: 'Sine.InOut',
      onComplete: () => glow?.active && glow.destroy()
    });
    return ground;
  }

  ensureDuckQueenDafamaiCloseupPresentation() {
    const maskKey = 'duckQueenDafamaiCloseupFeatherMask';
    const shadeKey = 'duckQueenDafamaiCloseupShadeGradient';
    const maskW = ENEMIES.potatoCommander.blackwaterCloseupFeatherWidth ?? 470;
    const maskH = GAME.HEIGHT;

    if (!this.textures.exists(maskKey)) {
      const texture = this.textures.createCanvas(maskKey, maskW, maskH);
      const ctx = texture.context;
      const gradient = ctx.createLinearGradient(0, 0, maskW, 0);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.68, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.84, 'rgba(255,255,255,0.72)');
      gradient.addColorStop(0.94, 'rgba(255,255,255,0.26)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.clearRect(0, 0, maskW, maskH);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, maskW, maskH);
      texture.refresh();
    }

    if (!this.textures.exists(shadeKey)) {
      const texture = this.textures.createCanvas(shadeKey, maskW, maskH);
      const ctx = texture.context;
      const gradient = ctx.createLinearGradient(0, 0, maskW, 0);
      gradient.addColorStop(0, 'rgba(25,0,15,0.34)');
      gradient.addColorStop(0.58, 'rgba(25,0,15,0.24)');
      gradient.addColorStop(0.82, 'rgba(25,0,15,0.10)');
      gradient.addColorStop(1, 'rgba(25,0,15,0)');
      ctx.clearRect(0, 0, maskW, maskH);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, maskW, maskH);
      texture.refresh();
    }

    if (!this.duckQueenUltimateCloseupMaskSource) {
      this.duckQueenUltimateCloseupMaskSource = this.make.image({
        x: maskW / 2,
        y: GAME.HEIGHT / 2,
        key: maskKey,
        add: false
      });
      this.duckQueenUltimateCloseupMaskSource.setScrollFactor?.(0);
      this.duckQueenUltimateCloseupBitmapMask = this.duckQueenUltimateCloseupMaskSource.createBitmapMask();
    }

    if (!this.duckQueenUltimateCloseupShade?.active) {
      this.duckQueenUltimateCloseupShade = this.trackDuckQueenUltimateFx(
        this.add.image(maskW / 2, GAME.HEIGHT / 2, shadeKey)
          .setScrollFactor(0)
          .setDepth(145)
          .setAlpha(1)
      );
    }

    return this.duckQueenUltimateCloseupBitmapMask ?? null;
  }

  setDuckQueenDafamaiCloseupFrame(textureKey, intensity = 0.45, { displayScale = 1 } = {}) {
    if (!this.textures.exists(textureKey)) return null;
    const cfg = ENEMIES.duckQueen;
    const clamped = Phaser.Math.Clamp(intensity, 0, 1);
    const screenX = cfg.ultimateCloseupScreenX ?? 150;
    const bottomY = cfg.ultimateCloseupBottomY ?? GAME.HEIGHT;
    const baseH = cfg.ultimateCloseupDisplayH ?? 690;
    const pushInH = baseH + clamped * (cfg.ultimateCloseupPushInPx ?? 100);
    const displayH = pushInH * Math.max(0.1, Number(displayScale) || 1);
    const mask = this.ensureDuckQueenDafamaiCloseupPresentation();

    const setupActor = (img, alpha, depth, xOffset = 0, extraScale = 1) => {
      img.setTexture(textureKey)
        .setOrigin(0.5, 1)
        .setScrollFactor(0)
        .setDepth(depth)
        .setPosition(screenX + xOffset, bottomY)
        .setAlpha(alpha);

      const sourceW = Math.max(1, img.frame?.realWidth ?? img.width ?? 1);
      const sourceH = Math.max(1, img.frame?.realHeight ?? img.height ?? 1);
      const aspect = sourceW / sourceH;
      img.setDisplaySize(displayH * aspect * extraScale, displayH * extraScale);
      if (mask) img.setMask(mask);
      return img;
    };

    if (!this.duckQueenUltimateCloseupActor?.active) {
      this.duckQueenUltimateCloseupActor = this.trackDuckQueenUltimateFx(
        this.add.image(screenX, bottomY, textureKey)
      );
    }

    setupActor(this.duckQueenUltimateCloseupActor, 0.52 + clamped * 0.34, 147, 0, 1);

    if (!this.duckQueenUltimateCloseupGlow?.active || !this.duckQueenUltimateCloseupGlow.setTexture) {
      if (this.duckQueenUltimateCloseupGlow?.active) this.duckQueenUltimateCloseupGlow.destroy();
      this.duckQueenUltimateCloseupGlow = this.trackDuckQueenUltimateFx(
        this.add.image(screenX - 6, bottomY, textureKey)
      );
    }
    this.duckQueenUltimateCloseupGlow
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff4f99);
    setupActor(this.duckQueenUltimateCloseupGlow, 0.08 + clamped * 0.13, 146, -6, 1.035);

    this.tweens.killTweensOf(this.duckQueenUltimateCloseupGlow);
    this.tweens.add({
      targets: this.duckQueenUltimateCloseupGlow,
      x: screenX - 8 + clamped * 14,
      duration: 500,
      ease: 'Sine.Out'
    });

    this.tweens.killTweensOf(this.duckQueenUltimateCloseupActor);
    this.tweens.add({
      targets: this.duckQueenUltimateCloseupActor,
      x: screenX + clamped * 10,
      duration: 460,
      ease: 'Sine.Out'
    });

    return this.duckQueenUltimateCloseupActor;
  }

  hideDuckQueenDafamaiCloseup(duration = 120) {
    const targets = [
      this.duckQueenUltimateCloseupActor,
      this.duckQueenUltimateCloseupGlow,
      this.duckQueenUltimateCloseupShade
    ].filter((obj) => obj?.active);
    if (!targets.length) return;
    this.tweens.add({
      targets,
      alpha: 0,
      duration,
      ease: 'Quad.In',
      onComplete: () => {
        targets.forEach((obj) => obj?.active && obj.destroy());
        this.duckQueenUltimateCloseupActor = null;
        this.duckQueenUltimateCloseupGlow = null;
        this.duckQueenUltimateCloseupShade = null;
      }
    });
  }

  beginDuckQueenDafamaiCutscene(queen) {
    if (!this.duckQueenUltimateActive || !this.player?.active) return false;
    const player = this.player;
    const cfg = ENEMIES.duckQueen;

    this.duckQueenUltimateStage = 'cutscene_relief';
    this.duckQueenUltimateCutsceneActive = true;
    this.duckQueenUltimateAnchorX = player.x;
    this.duckQueenUltimateAnchorY = player.y;
    player.cancelVisualAction?.({ restore: true, forceRestore: true });
    this.duckQueenUltimatePlayerRestore = {
      x: player.x,
      y: player.y,
      textureKey: player.texture?.key ?? 'playerArt',
      displayWidth: Math.abs(Number(player.displayWidth) || 60),
      displayHeight: Math.abs(Number(player.displayHeight) || 60),
      originX: player.originX,
      originY: player.originY,
      angle: Number(player.angle) || 0,
      visible: player.visible !== false,
      alpha: player.alpha,
      depth: player.depth,
      flipX: player.flipX,
      upgradeInvincible: player.upgradeInvincible,
      stunnedUntil: player.stunnedUntil
    };
    this.startDuckQueenDafamaiMinionEvacuation();

    this.clearDuckQueenUltimateBlackframes({ immediate: false });
    player.slowUntil = -Infinity;
    player.slowMultiplier = 1;
    player.setVelocity(0, 0);
    player.isDashing = false;
    player.upgradeInvincible = true;

    const frameDurations = [
      cfg.ultimateFrameReliefMs ?? 420,
      cfg.ultimateFrameNoticeMs ?? 460,
      cfg.ultimateFramePanic1Ms ?? 500,
      cfg.ultimateFramePanic2Ms ?? 540,
      cfg.ultimateFrameTrappedMs ?? 620,
      cfg.ultimateFrameImpaledMs ?? 220,
      cfg.ultimateFrameHangingMs ?? 1000
    ];
    const totalCutsceneMs = frameDurations.reduce((sum, value) => sum + value, 0);
    player.stunnedUntil = Math.max(player.stunnedUntil ?? -Infinity, this.time.now + totalCutsceneMs + 2100);
    player.setVisible(true);
    player.setAlpha(1);

    queen?.setVelocity?.(0, 0);
    queen?.applyVisualState?.('s3_dafamai');
    this.setDuckQueenDafamaiPlayerFrame('playerDafamaiReliefArt');
    this.setDuckQueenDafamaiGroundStage('queenDuckDafamaiGroundReliefArt');
    this.setDuckQueenDafamaiCloseupFrame('playerDafamaiReliefArt', 0.08, { displayScale: 0.96 });

    const later = (delay, fn) => {
      const event = this.time.delayedCall(delay, () => {
        if (!this.duckQueenUltimateActive || !this.duckQueenUltimateCutsceneActive) return;
        fn?.();
      });
      this.duckQueenUltimateEvents.push(event);
      return event;
    };

    let at = frameDurations[0];
    later(at, () => {
      this.duckQueenUltimateStage = 'cutscene_notice';
      this.setDuckQueenDafamaiPlayerFrame('playerDafamaiNoticeArt');
      this.setDuckQueenDafamaiGroundStage('queenDuckDafamaiGroundNoticeArt');
      this.setDuckQueenDafamaiCloseupFrame('playerDafamaiNoticeArt', 0.28, { displayScale: 1.00 });
      this.cameras.main.shake(110, 0.0016);
    });

    at += frameDurations[1];
    later(at, () => {
      this.duckQueenUltimateStage = 'cutscene_panic_1';
      this.setDuckQueenDafamaiPlayerFrame('playerDafamaiPanic1Art');
      this.setDuckQueenDafamaiGroundStage('queenDuckDafamaiGroundPanic1Art');
      this.setDuckQueenDafamaiCloseupFrame('playerDafamaiPanic1Art', 0.52, { displayScale: 1.02 });
      this.cameras.main.shake(150, 0.0024);
    });

    at += frameDurations[2];
    later(at, () => {
      this.duckQueenUltimateStage = 'cutscene_panic_2';
      this.setDuckQueenDafamaiPlayerFrame('playerDafamaiPanic2Art');
      this.setDuckQueenDafamaiGroundStage('queenDuckDafamaiGroundPanic2Art');
      this.setDuckQueenDafamaiCloseupFrame('playerDafamaiPanic2Art', 0.73, { displayScale: 1.04 });
      this.cameras.main.shake(180, 0.0032);
    });

    at += frameDurations[3];
    later(at, () => {
      this.duckQueenUltimateStage = 'cutscene_trapped';
      this.setDuckQueenDafamaiPlayerFrame('playerDafamaiTrappedArt');
      this.setDuckQueenDafamaiGroundStage('queenDuckDafamaiGroundTrappedArt');
      this.setDuckQueenDafamaiCloseupFrame('playerDafamaiTrappedArt', 0.92, { displayScale: 1.06 });
      this.cameras.main.shake(220, 0.0046);
    });

    at += frameDurations[4];
    later(at, () => {
      this.duckQueenUltimateStage = 'cutscene_impaled';
      this.setDuckQueenDafamaiGroundStage('queenDuckDafamaiImpaleBaseArt', { impale: true, fadeMs: 105 });
      this.setDuckQueenDafamaiPlayerFrame('playerDafamaiImpaledArt');
      this.setDuckQueenDafamaiCloseupFrame('playerDafamaiImpaledArt', 1.00, { displayScale: 1.08 });
      this.showDuckQueenSkillLine(queen, 'dafa', { yOffset: 112, priority: 100, fontSize: 19 });
      this.cameras.main.shake(300, 0.018);
      this.cameras.main.flash(85, 255, 58, 145, false);
      this.sound?.play?.('hitLight', { volume: 0.52 });
    });

    at += frameDurations[5];
    const hangingStartAt = at;
    const hangingMs = frameDurations[6];
    later(hangingStartAt, () => {
      this.duckQueenUltimateStage = 'cutscene_hanging';
      this.setDuckQueenDafamaiPlayerFrame('playerDafamaiHangingArt', {
        displayScale: cfg.ultimateHangingDisplayScale ?? 1.15
      });
      this.setDuckQueenDafamaiCloseupFrame('playerDafamaiHangingArt', 1.00, { displayScale: 1.20 });
    });

    const closeupExitLeadMs = 160;
    const closeupFadeMs = 120;
    later(hangingStartAt + Math.max(0, hangingMs - closeupExitLeadMs), () => {
      this.hideDuckQueenDafamaiCloseup(closeupFadeMs);
    });

    const roachChainMs = cfg.ultimateRoachChainExplosionMs ?? 380;
    const roachLeadMs = Phaser.Math.Clamp(roachChainMs, 0, Math.max(0, hangingMs));
    const roachChainAt = hangingStartAt + Math.max(0, hangingMs - roachLeadMs);
    later(roachChainAt, () => {
      this.startDuckQueenDafamaiRoachChainExplosion(queen, { triggerCentralExplosion: false });
    });

    at = hangingStartAt + hangingMs;
    later(at, () => this.playDuckQueenDafamaiExplosion(queen));
    return true;
  }

  spawnDuckQueenDafamaiRedParticles(x, y) {
    const count = 34;
    for (let i = 0; i < count; i += 1) {
      const radius = Phaser.Math.Between(6, 15);
      const particle = this.trackDuckQueenUltimateFx(
        this.add.circle(
          x + Phaser.Math.Between(-16, 16),
          y + Phaser.Math.Between(-18, 18),
          radius,
          Phaser.Utils.Array.GetRandom([0xff355e, 0xff4d6d, 0xff6b7d, 0xff1f4d])
        )
          .setDepth(92 + (i % 3))
          .setAlpha(Phaser.Math.FloatBetween(0.45, 0.9))
      );
      const angle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);
      const distance = Phaser.Math.Between(86, 220);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance * 0.72 - Phaser.Math.Between(10, 38);
      this.tweens.add({
        targets: particle,
        x: particle.x + dx,
        y: particle.y + dy,
        alpha: 0,
        scaleX: Phaser.Math.FloatBetween(0.25, 0.65),
        scaleY: Phaser.Math.FloatBetween(0.25, 0.65),
        duration: Phaser.Math.Between(340, 620),
        ease: 'Quad.Out',
        onComplete: () => particle?.active && particle.destroy()
      });
    }

    const haze = this.trackDuckQueenUltimateFx(
      this.add.rectangle(x, y + 10, 300, 220, 0xff3355, 0.18)
        .setDepth(89)
        .setBlendMode(Phaser.BlendModes.ADD)
    );
    this.tweens.add({
      targets: haze,
      alpha: 0,
      scaleX: 1.55,
      scaleY: 1.30,
      duration: 340,
      ease: 'Quad.Out',
      onComplete: () => haze?.active && haze.destroy()
    });
  }

  playDuckQueenDafamaiExplosion(queen) {
    if (!this.duckQueenUltimateActive || !this.player?.active) return false;
    this.duckQueenUltimateStage = 'explosion';
    const cfg = ENEMIES.duckQueen;
    const player = this.player;
    const x = this.duckQueenUltimateAnchorX ?? player.x;
    const y = this.duckQueenUltimateAnchorY ?? player.y;

    this.hideDuckQueenDafamaiCloseup(90);
    if (this.duckQueenUltimateGroundActor?.active) {
      this.tweens.killTweensOf(this.duckQueenUltimateGroundActor);
      this.tweens.add({
        targets: this.duckQueenUltimateGroundActor,
        alpha: 0,
        duration: 120,
        ease: 'Quad.Out',
        onComplete: () => {
          if (this.duckQueenUltimateGroundActor?.active) this.duckQueenUltimateGroundActor.destroy();
          this.duckQueenUltimateGroundActor = null;
        }
      });
    }

    const savedUpgradeInvincible = player.upgradeInvincible;
    player.upgradeInvincible = false;
    const damage = player.takeUnavoidableCurrentHpRatioDamage?.(
      cfg.ultimateDamageCurrentHpRatio ?? 0.55
    ) ?? 0;
    player.upgradeInvincible = savedUpgradeInvincible;
    player.setVisible(false);
    player.setAlpha(0);

    this.cameras.main.flash(140, 255, 92, 180, false);
    this.spawnDuckQueenDafamaiRedParticles(x, y + 4);

    if (damage > 0) {
      this.showHpDamageText('duckQueen', x, y - 64, damage, {
        durationMs: 1650,
        rise: 58,
        depth: 600
      });
    }

    const explosion = this.trackDuckQueenUltimateFx(
      this.add.image(x, y + 8, 'queenDuckDafamaiExplosionArt')
        .setDepth(80)
        .setAlpha(0.08)
    );
    const glow = this.trackDuckQueenUltimateFx(
      this.add.image(x, y + 8, 'queenDuckDafamaiExplosionArt')
        .setDepth(79)
        .setAlpha(0.34)
        .setBlendMode(Phaser.BlendModes.ADD)
    );

    const source = Math.max(1, explosion.width);
    const startScale = 46 / source;
    const midScale = 255 / source;
    const endScale = 410 / source;
    explosion.setScale(startScale);
    glow.setScale(startScale * 1.18);

    const growMs = cfg.ultimateExplosionGrowMs ?? 220;
    const bloomMs = cfg.ultimateExplosionBloomMs ?? 330;
    this.cameras.main.shake(growMs + bloomMs + 120, 0.024);
    this.tweens.add({
      targets: explosion,
      scaleX: midScale,
      scaleY: midScale,
      alpha: 1,
      duration: growMs,
      ease: 'Cubic.Out',
      onComplete: () => {
        if (!explosion?.active) return;
        this.tweens.add({
          targets: explosion,
          scaleX: endScale,
          scaleY: endScale,
          alpha: 0.14,
          duration: bloomMs,
          ease: 'Quad.Out'
        });
      }
    });
    this.tweens.add({
      targets: glow,
      scaleX: endScale * 1.14,
      scaleY: endScale * 1.14,
      alpha: 0,
      duration: growMs + bloomMs,
      ease: 'Quad.Out'
    });

    const flash = this.trackDuckQueenUltimateFx(
      this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0xffffff, 0)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(30000)
    );
    const flashIn = cfg.ultimateFlashInMs ?? 80;
    const flashHold = cfg.ultimateFlashHoldMs ?? 60;
    const flashOut = cfg.ultimateFlashOutMs ?? 320;
    const flashAt = Math.max(120, growMs + Math.round(bloomMs * 0.36));

    const event = this.time.delayedCall(flashAt, () => {
      if (!flash?.active || !this.duckQueenUltimateActive) return;
      this.tweens.add({
        targets: flash,
        alpha: 0.98,
        duration: flashIn,
        ease: 'Quad.Out',
        onComplete: () => {
          if (!flash?.active) return;
          const hold = this.time.delayedCall(flashHold, () => {
            if (!flash?.active) return;
            if (this.duckQueenUltimatePlayerActor?.active) {
              this.duckQueenUltimatePlayerActor.setAlpha(0);
            }
            this.tweens.add({
              targets: flash,
              alpha: 0,
              duration: flashOut,
              ease: 'Quad.InOut',
              onComplete: () => this.finishDuckQueenUltimate(queen)
            });
          });
          this.duckQueenUltimateEvents.push(hold);
        }
      });
    });
    this.duckQueenUltimateEvents.push(event);
    return true;
  }

  finishDuckQueenUltimate(queen) {
    if (!this.duckQueenUltimateActive) return;
    this.clearDuckQueenUltimate({ restoreQueen: false, applyCooldown: false });
    if (queen?.active && !queen.isDead) {
      queen.registerUltimateCompleted?.(this.time.now);
      queen.frenzyMoodState = 's3_mood_normal';
      queen.applyVisualState?.('s3_mood_normal');
      queen.nextFrenzyMoodSwapAt = this.time.now + Phaser.Math.Between(520, 780);
      queen.resumeRoamingState?.(this.time.now);
    }
  }

  startDuckQueenUltimate(queen) {
    if (
      !queen?.active
      || queen.isDead
      || queen.getPhase?.() !== 'frenzy'
      || this.duckQueenUltimateActive
    ) return false;

    if (this.duckQueenFishNetActive) this.endDuckQueenFishNet(false);
    if (this.duckQueenGrappleActive) this.endDuckQueenGrapple(false);
    this.clearDuckQueenCharmSpell?.();
    this.clearDuckQueenCharmMark?.();
    this.clearDuckQueenCharmControlHint?.();
    this.duckQueenCharmUntil = -Infinity;
    this.duckQueenDazeUntil = -Infinity;

    this.clearDuckQueenUltimate({ restoreQueen: false, applyCooldown: false });
    this.duckQueenUltimateActive = true;
    this.duckQueenUltimateStage = 'blackframe_1';
    this.duckQueenUltimateEvents = [];
    this.duckQueenUltimateBlackframes = [];
    queen.resetMajorActionScheduler?.(this.time.now, ENEMIES.duckQueen.ultimatePostRecoveryMs ?? 4500);
    queen.setVelocity(0, 0);
    queen.applyVisualState?.('s3_blackframe');
    this.showDuckQueenSkillLine(queen, 'blackframe', { yOffset: 112, priority: 99 });

    const cfg = ENEMIES.duckQueen;
    const hitCount = cfg.ultimateBlackframeHitCount ?? 3;
    const hitGap = cfg.ultimateBlackframeHitIntervalMs ?? 540;
    const impactMs = cfg.ultimateBlackframeImpactMs ?? 170;
    const afterThird = cfg.ultimateBlackframeAfterThirdMs ?? 360;
    const titleMs = cfg.ultimateTitleMs ?? 800;

    const later = (delay, fn) => {
      const event = this.time.delayedCall(delay, () => {
        if (!this.duckQueenUltimateActive || !queen?.active || queen.isDead) return;
        fn?.();
      });
      this.duckQueenUltimateEvents.push(event);
      return event;
    };

    for (let i = 0; i < hitCount; i += 1) {
      later(i * hitGap, () => {
        this.duckQueenUltimateStage = `blackframe_${i + 1}`;
        this.spawnDuckQueenBlackframeHit(i);
      });
    }

    const titleAt = (hitCount - 1) * hitGap + impactMs + afterThird;
    later(titleAt, () => {
      this.duckQueenUltimateStage = 'title';
      this.convergeDuckQueenBlackframes();
      queen.applyVisualState?.('s3_dafamai');
      queen.setVelocity(0, 0);
      this.showDuckQueenDafamaiTitle();
    });

    later(titleAt + titleMs, () => this.beginDuckQueenDafamaiCutscene(queen));
    return true;
  }

  onDuckQueenSpawned(queen) {
    this.duckQueen = queen;
    this.playerOccludedByDuckQueen = false;
    this.duckQueenMinionOverlapCached = false;
    this.duckQueenMinionOcclusionNextCheckAt = -Infinity;
    this.bossActive = true;
    this.adaptiveMusic?.triggerCue('boss_appear');
    this.duckQueenAttached = false;
    this.duckQueenGrappleActive = false;
    this.duckQueenFishNetActive = false;
    this.duckQueenFishNetEscapeInputs = 0;
    this.destroyDuckQueenFishNetFx?.();
    this.duckQueenAuraActive = false;
    this.duckQueenEscapeInputs = 0;
    this.duckQueenAttachStartedAt = -Infinity;
    this.nextDuckQueenDrainAt = this.time.now;

    {
      this.showBossImportantWorldText(
        queen,
        '「👑 丹麦鸭出现！」',
        '#ffd0e6',
        24,
        1800
      );

      this.queueBossPhaseText(
        queen,
        '「天降青梅」',
        '#ffd1e5',
        19,
        2300
      );

      this.createBossHud('「丹麦鸭 · 天降青梅」');
    }
  }

  onDuckQueenDefeated(x, y) {
    this.clearDuckQueenUltimate?.({ restoreQueen: false, applyCooldown: false });
    this.bossActive = false;
    this.duckQueenAttached = false;
    this.duckQueenGrappleActive = false;
    if (this.duckQueenFishNetActive) this.endDuckQueenFishNet(false);
    this.duckQueenFishNetActive = false;
    this.destroyDuckQueenFishNetFx?.();
    this.duckQueenAuraActive = false;
    this.duckQueenEscapeInputs = 0;
    this.destroyDuckQueenEscapeHint();
    this.duckQueenAttachStartedAt = -Infinity;
    this.duckQueen = null;
    this.playerOccludedByDuckQueen = false;
    this.duckQueenMinionOverlapCached = false;
    this.duckQueenPinkPuddles.forEach((puddle) => puddle.displays?.forEach((item) => item?.destroy()));
    this.duckQueenPinkPuddles = [];
    this.duckQueenPinkStains.forEach((stain) => stain.display?.destroy());
    this.duckQueenPinkStains = [];
    this.duckQueenDazeUntil = -Infinity;
    this.clearDuckQueenCharmSpell?.();
    this.clearDuckQueenCharmMark?.();
    this.clearDuckQueenCharmControlHint?.();
    this.duckQueenCharmUntil = -Infinity;
    this.duckQueenCandyReactionUntil = -Infinity;
    this.duckQueenTietieReactionUntil = -Infinity;
    this.duckQueenDafaReactionUntil = -Infinity;
    this.clearBossHud();

    if (this.player?.active) this.player.hp = this.player.maxHp;
    this.playerOrbitCrescentPendingUnlock = true;

    this.startDuckQueenVictoryEnding(x, y);
  }

  captureDuckQueenVictoryEndingHud() {
    this.duckQueenVictoryEndingHudSnapshot = [];
    const children = this.children?.list ?? [];
    children.forEach((item) => {
      if (!item?.active || item.visible === false) return;
      if ((item.scrollFactorX ?? 1) !== 0 || (item.scrollFactorY ?? 1) !== 0) return;
      if ((item.depth ?? 0) >= 20000) return;
      const alpha = Number.isFinite(item.alpha) ? item.alpha : 1;
      if (alpha <= 0.001) return;
      this.duckQueenVictoryEndingHudSnapshot.push({ item, alpha, visible: item.visible });
      this.tweens.add({
        targets: item,
        alpha: 0,
        duration: 170,
        ease: 'Sine.In',
        onComplete: () => {
          if (item?.active) item.setVisible(false);
        }
      });
    });
  }

  restoreDuckQueenVictoryEndingHud({ delay = 360, duration = 300 } = {}) {
    const snapshot = this.duckQueenVictoryEndingHudSnapshot ?? [];
    this.duckQueenVictoryEndingHudSnapshot = [];
    snapshot.forEach(({ item, alpha, visible }) => {
      if (!item?.active) return;
      item.setVisible(Boolean(visible)).setAlpha(0);
      if (!visible) return;
      this.tweens.add({
        targets: item,
        alpha,
        delay,
        duration,
        ease: 'Sine.Out'
      });
    });
  }

  captureDuckQueenVictoryEndingCombatLayer() {
    this.duckQueenVictoryEndingCombatSnapshot = [];
    const seen = new Set();
    const capture = (item) => {
      if (!item?.active || seen.has(item)) return;
      seen.add(item);
      const alpha = Number.isFinite(item.alpha) ? item.alpha : 1;
      const visible = item.visible !== false;
      this.duckQueenVictoryEndingCombatSnapshot.push({ item, alpha, visible });
      this.tweens.add({
        targets: item,
        alpha: 0,
        duration: 220,
        ease: 'Sine.In',
        onComplete: () => {
          if (item?.active) item.setVisible(false);
        }
      });
    };

    this.clearPlayerAuraTransientFx();
    capture(this.playerAuraBlueGlow);
    capture(this.playerAuraRedGlow);
    capture(this.playerOutline);
    [
      this.enemies,
      this.bullets,
      this.xpGems,
      this.poopProjectiles,
      this.fishProjectiles,
      this.potatoCommanderCrossProjectiles,
      this.supportHearts,
      this.cassetteDrops
    ].forEach((group) => group?.children?.iterate?.((item) => capture(item)));
  }

  restoreDuckQueenVictoryEndingCombatLayer() {
    const snapshot = this.duckQueenVictoryEndingCombatSnapshot ?? [];
    this.duckQueenVictoryEndingCombatSnapshot = [];
    snapshot.forEach(({ item, alpha, visible }) => {
      if (!item?.active) return;
      item.setVisible(Boolean(visible)).setAlpha(alpha);
    });
  }

  captureDuckQueenVictoryEndingPlayerVisual() {
    const player = this.player;
    if (!player?.active) {
      this.duckQueenVictoryEndingPlayerSnapshot = null;
      return;
    }
    this.duckQueenVictoryEndingPlayerSnapshot = {
      textureKey: player.texture?.key ?? 'playerArt',
      displayWidth: player.displayWidth,
      displayHeight: player.displayHeight,
      alpha: Number.isFinite(player.alpha) ? player.alpha : 1,
      visible: player.visible !== false,
      depth: player.depth,
      angle: player.angle,
      flipX: Boolean(player.flipX),
      flipY: Boolean(player.flipY),
      originX: player.originX,
      originY: player.originY,
      x: player.x,
      y: player.y
    };
  }

  getDuckQueenVictoryEndingPlayerVisualMetrics(textureKey = this.player?.texture?.key) {
    const boundsByTexture = {
      playerArt: { sourceW: 128, sourceH: 128, left: 17, top: 5, right: 111, bottom: 121 },
      playerVictoryEnding01: { sourceW: 1254, sourceH: 1254, left: 223, top: 32, right: 1175, bottom: 1224 },
      playerVictoryEnding02: { sourceW: 1254, sourceH: 1254, left: 111, top: 45, right: 1159, bottom: 1217 },
      playerVictoryEnding03: { sourceW: 1254, sourceH: 1254, left: 113, top: 17, right: 1205, bottom: 1238 },
      playerVictoryEnding04: { sourceW: 1254, sourceH: 1254, left: 91, top: 33, right: 1224, bottom: 1254 },
      playerVictoryEnding05: { sourceW: 1254, sourceH: 1254, left: 111, top: 46, right: 1156, bottom: 1218 },
      playerVictoryEnding06: { sourceW: 1254, sourceH: 1254, left: 0, top: 16, right: 1214, bottom: 1232 }
    };

    const key = boundsByTexture[textureKey] ? textureKey : 'playerVictoryEnding01';
    const bounds = boundsByTexture[key];
    const snap = this.duckQueenVictoryEndingPlayerSnapshot;
    const gameplayCanvasH = Math.max(1, Math.abs(Number(snap?.displayHeight) || 60));

    const gameplayVisibleH = gameplayCanvasH * (116 / 128);
    const visiblePixelH = Math.max(1, bounds.bottom - bounds.top);
    const scale = gameplayVisibleH / visiblePixelH;
    const displayWidth = bounds.sourceW * scale;
    const displayHeight = bounds.sourceH * scale;
    const visibleBottomOffset = (bounds.bottom - bounds.sourceH * 0.5) * scale;

    return {
      displayWidth,
      displayHeight,
      visibleBottomOffset,
      visibleHeight: gameplayVisibleH
    };
  }

  setDuckQueenVictoryEndingPlayerWorldFrame(textureKey) {
    const player = this.player;
    if (!(this.duckQueenVictoryEndingActive || this.potatoCommanderEndingActive) || !player?.active) return;
    const resolvedKey = this.textures.exists(textureKey) ? textureKey : 'playerVictoryEnding01';
    player
      .setTexture(resolvedKey)
      .setVisible(true)
      .setAlpha(1)
      .setDepth(Math.max(12, player.depth ?? 10))
      .clearTint();

    const metrics = this.getDuckQueenVictoryEndingPlayerVisualMetrics(resolvedKey);
    const groundY = this.duckQueenVictoryEndingPlayerGroundY;

    player
      .setOrigin(0.5, 0.5)
      .setDisplaySize(metrics.displayWidth, metrics.displayHeight);

    if (Number.isFinite(groundY)) {
      player.setY(groundY - metrics.visibleBottomOffset);
    }

  }

  hideDuckQueenVictoryEndingBeatIndicators() {
    this.ensureBeatIndicator();
    if (!this.duckQueenVictoryEndingBeatSnapshot) {
      this.duckQueenVictoryEndingBeatSnapshot = {
        strong: this.beatStrongImage?.active ? {
          visible: this.beatStrongImage.visible !== false,
          alpha: Number.isFinite(this.beatStrongImage.alpha) ? this.beatStrongImage.alpha : 0
        } : null,
        weak: this.beatWeakImage?.active ? {
          visible: this.beatWeakImage.visible !== false,
          alpha: Number.isFinite(this.beatWeakImage.alpha) ? this.beatWeakImage.alpha : 0
        } : null
      };
    }
    [this.beatStrongImage, this.beatWeakImage].forEach((image) => {
      if (!image?.active) return;
      image.setAlpha(0).setVisible(false);
    });
  }

  restoreDuckQueenVictoryEndingBeatIndicators() {
    const snapshot = this.duckQueenVictoryEndingBeatSnapshot;
    this.duckQueenVictoryEndingBeatSnapshot = null;
    [this.beatStrongImage, this.beatWeakImage].forEach((image, index) => {
      if (!image?.active) return;
      const saved = index === 0 ? snapshot?.strong : snapshot?.weak;
      image.setVisible(saved?.visible ?? true);
    });
    this.updateBeatIndicator(this.adaptiveMusic?.getClockMs?.());
  }

  getDuckQueenVictoryEndingPlayerFeet() {
    const player = this.player;
    if (!player?.active) return { x: 0, y: 0 };
    const metrics = this.getDuckQueenVictoryEndingPlayerVisualMetrics(player.texture?.key);
    return {
      x: player.x,
      y: player.y + metrics.visibleBottomOffset
    };
  }

  syncDuckQueenVictoryEndingPlayerGroundVfx() {
    if (!this.duckQueenVictoryEndingActive || !this.player?.active) return;

    this.ensureBeatIndicator();
    const feet = this.getDuckQueenVictoryEndingPlayerFeet();
    const rawClock = this.adaptiveMusic?.getClockMs?.();
    const clock = Number.isFinite(rawClock) ? rawClock : this.time.now;
    const quarter = 500;
    const phase = ((clock % quarter) + quarter) % quarter;
    const strongDistance = Math.min(phase, quarter - phase);
    const auxDistance = Math.abs(phase - quarter / 2);

    const strongAmount = Phaser.Math.Clamp(
      1 - strongDistance / BEAT_VFX.strong.visualWindowMs,
      0,
      1
    );
    const auxAmount = Phaser.Math.Clamp(
      1 - auxDistance / BEAT_VFX.weak.visualWindowMs,
      0,
      1
    );
    const strongEase = strongAmount * strongAmount;
    const auxEase = auxAmount * auxAmount;

    const sync = (image, config, ease) => {
      if (!image?.active) return;
      const scale = config.baseScale + ease * config.pulseScale;
      image
        .setPosition(
          feet.x + (config.xOffset ?? 0),
          feet.y + (config.groundGap ?? 0)
        )
        .setDisplaySize(
          config.displayWidth * scale,
          config.displayHeight * scale
        )
        .setAlpha(config.baseAlpha + ease * config.pulseAlpha);
    };

    sync(this.beatStrongImage, BEAT_VFX.strong, strongEase);
    sync(this.beatWeakImage, BEAT_VFX.weak, auxEase);
  }

  startDuckQueenVictoryEndingPlayerGroundVfxSync() {
    this.duckQueenVictoryEndingGroundVfxSyncEvent?.remove?.(false);
    this.duckQueenVictoryEndingGroundVfxSyncEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!this.duckQueenVictoryEndingActive) return;
        this.syncDuckQueenVictoryEndingPlayerGroundVfx();
      }
    });
    this.duckQueenVictoryEndingEvents.push(this.duckQueenVictoryEndingGroundVfxSyncEvent);
    this.syncDuckQueenVictoryEndingPlayerGroundVfx();
  }

  stopDuckQueenVictoryEndingPlayerGroundVfxSync() {
    this.duckQueenVictoryEndingGroundVfxSyncEvent?.remove?.(false);
    this.duckQueenVictoryEndingGroundVfxSyncEvent = null;
  }

  restoreDuckQueenVictoryEndingPlayerVisual() {
    const player = this.player;
    const snap = this.duckQueenVictoryEndingPlayerSnapshot;
    this.duckQueenVictoryEndingPlayerSnapshot = null;
    if (!player?.active || !snap) return;
    const textureKey = this.textures.exists(snap.textureKey) ? snap.textureKey : 'playerArt';
    player
      .setTexture(textureKey)
      .setPosition(snap.x, snap.y)
      .setDisplaySize(snap.displayWidth, snap.displayHeight)
      .setOrigin(snap.originX, snap.originY)
      .setDepth(snap.depth)
      .setAngle(snap.angle)
      .setFlipX(snap.flipX)
      .setFlipY(snap.flipY)
      .setVisible(snap.visible)
      .setAlpha(snap.alpha)
      .clearTint();
  }

  trackDuckQueenVictoryEndingFx(obj) {
    if (!obj) return obj;
    if (this.potatoCommanderEndingActive && !this.duckQueenVictoryEndingActive) {
      this.potatoCommanderEndingFx.push(obj);
    } else {
      this.duckQueenVictoryEndingFx.push(obj);
    }
    return obj;
  }

  scheduleDuckQueenVictoryEnding(delay, fn) {
    const event = this.time.delayedCall(delay, () => {
      if (!this.duckQueenVictoryEndingActive) return;
      fn?.();
    });
    this.duckQueenVictoryEndingEvents.push(event);
    return event;
  }

  setDuckQueenVictoryEndingCutinFrame(textureKey, { enter = false } = {}) {
    if (!(this.duckQueenVictoryEndingActive || this.potatoCommanderEndingActive)) return null;

    let resolvedKey = textureKey;
    if (!this.textures.exists(resolvedKey)) {
      console.warn(`[DuckQueenEnding] missing cut-in texture: ${resolvedKey}`);
      resolvedKey = this.textures.exists('playerVictoryEnding01') ? 'playerVictoryEnding01' : 'playerIdle';
    }

    const displayH = Math.min(455, GAME.HEIGHT - 64);
    const bottomY = GAME.HEIGHT - 14;

    if (!this.duckQueenVictoryEndingCutinShade?.active) {
      this.duckQueenVictoryEndingCutinShade = this.trackDuckQueenVictoryEndingFx(
        this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0x05050a, 0)
          .setOrigin(0)
          .setScrollFactor(0, 0)
          .setDepth(60000)
          .setVisible(true)
      );
    }

    if (!this.duckQueenVictoryEndingCutinActor?.active) {
      this.duckQueenVictoryEndingCutinActor = this.trackDuckQueenVictoryEndingFx(
        this.add.image(0, bottomY, resolvedKey)
          .setOrigin(0.5, 1)
          .setScrollFactor(0, 0)
          .setDepth(60010)
          .setAlpha(1)
          .setVisible(true)
      );
    }

    const actor = this.duckQueenVictoryEndingCutinActor;
    actor
      .setTexture(resolvedKey)
      .setScrollFactor(0, 0)
      .setDepth(60010)
      .setVisible(true)
      .setActive(true)
      .setAlpha(1)
      .clearTint()
      .setBlendMode(Phaser.BlendModes.NORMAL);

    const sourceW = Math.max(1, actor.frame?.realWidth ?? actor.width ?? 1);
    const sourceH = Math.max(1, actor.frame?.realHeight ?? actor.height ?? 1);
    const displayW = displayH * (sourceW / sourceH);
    const targetX = Math.max(displayW / 2 + 32, 245);
    actor.setDisplaySize(displayW, displayH);

    const shade = this.duckQueenVictoryEndingCutinShade;
    shade.setVisible(true).setDepth(60000);
    this.tweens.killTweensOf(actor);
    this.tweens.killTweensOf(shade);
    shade.setAlpha(0);
    this.tweens.add({
      targets: shade,
      alpha: 0.18,
      duration: 130,
      ease: 'Sine.Out'
    });

    if (enter) {
      actor.setPosition(-(displayW / 2 + 40), bottomY).setAlpha(1);
      this.tweens.add({
        targets: actor,
        x: targetX,
        duration: 260,
        ease: 'Cubic.Out'
      });
    } else {
      actor.setPosition(targetX, bottomY).setAlpha(1).setVisible(true);
    }

    if (this.duckQueenVictoryEndingDefeatActor?.active) {
      this.tweens.killTweensOf(this.duckQueenVictoryEndingDefeatActor);
      this.tweens.add({
        targets: this.duckQueenVictoryEndingDefeatActor,
        alpha: 0.26,
        duration: 130,
        ease: 'Sine.Out'
      });
    }

    this.setDuckQueenVictoryEndingPlayerWorldFrame(resolvedKey);
    return actor;
  }

  hideDuckQueenVictoryEndingCutin({ slideRight = true, duration = 320 } = {}) {
    const actor = this.duckQueenVictoryEndingCutinActor;
    const shade = this.duckQueenVictoryEndingCutinShade;
    if (actor?.active) {
      this.tweens.killTweensOf(actor);
      this.tweens.add({
        targets: actor,
        x: slideRight ? GAME.WIDTH + 380 : actor.x,
        alpha: slideRight ? 1 : 0,
        duration,
        ease: slideRight ? 'Cubic.In' : 'Quad.In',
        onComplete: () => {
          if (actor?.active) actor.setAlpha(0);
        }
      });
    }
    if (shade?.active) {
      this.tweens.killTweensOf(shade);
      this.tweens.add({
        targets: shade,
        alpha: 0,
        duration: Math.min(duration, 220),
        ease: 'Sine.In'
      });
    }
  }

  showDuckQueenVictoryEndingQueenBeat({ zoom = 1.22, duration = 260 } = {}) {
    const actor = this.duckQueenVictoryEndingDefeatActor;
    if (!actor?.active) return;
    this.tweens.killTweensOf(actor);
    this.tweens.add({
      targets: actor,
      alpha: 1,
      duration: 150,
      ease: 'Sine.Out'
    });
    this.cameras.main.zoomTo(zoom, duration, 'Sine.easeInOut', false);
  }

  spawnDuckQueenVictoryGoldDissolve(x, y) {
    for (let i = 0; i < 52; i += 1) {
      const particle = this.trackDuckQueenVictoryEndingFx(
        this.add.circle(
          x + Phaser.Math.Between(-94, 94),
          y + Phaser.Math.Between(-54, 64),
          Phaser.Math.Between(2, 5),
          Phaser.Math.RND.pick([0xffd45a, 0xffef9b, 0xffc64b, 0xffffff]),
          Phaser.Math.FloatBetween(0.55, 0.95)
        ).setDepth(72).setBlendMode(Phaser.BlendModes.ADD)
      );
      const delay = Phaser.Math.Between(0, 260);
      this.tweens.add({
        targets: particle,
        x: particle.x + Phaser.Math.Between(-34, 34),
        y: particle.y - Phaser.Math.Between(70, 150),
        alpha: 0,
        scaleX: Phaser.Math.FloatBetween(0.15, 0.45),
        scaleY: Phaser.Math.FloatBetween(0.15, 0.45),
        delay,
        duration: Phaser.Math.Between(520, 760),
        ease: 'Sine.Out',
        onComplete: () => particle?.active && particle.destroy()
      });
    }
  }

  spawnDuckQueenVictoryEndingCrowd(x, y) {
    if (!this.duckQueenVictoryEndingActive) return [];

    this.duckQueenVictoryEndingCrowd.forEach((actor) => {
      if (actor?.active) {
        this.tweens.killTweensOf(actor);
        actor.destroy();
      }
    });
    this.duckQueenVictoryEndingCrowd = [];
    this.duckQueenVictoryEndingCrowdExploded = false;

    const total = 60;
    const halfWidth = Math.min(420, GAME.WIDTH * 0.44);
    const halfHeight = Math.min(205, GAME.HEIGHT * 0.38);
    const minX = Phaser.Math.Clamp(x - halfWidth, 36, GAME.WORLD_WIDTH - 36);
    const maxX = Phaser.Math.Clamp(x + halfWidth, 36, GAME.WORLD_WIDTH - 36);
    const minY = Phaser.Math.Clamp(y - halfHeight, 42, GAME.WORLD_HEIGHT - 42);
    const maxY = Phaser.Math.Clamp(y + halfHeight, 42, GAME.WORLD_HEIGHT - 42);
    const positions = [];

    const crowdTypes = Phaser.Utils.Array.Shuffle([
      ...Array(20).fill('duck'),
      ...Array(40).fill('roach')
    ]);

    const pickGroundedPosition = () => {
      let fallback = { x, y };
      for (let attempt = 0; attempt < 90; attempt += 1) {
        const px = Phaser.Math.Between(Math.round(minX), Math.round(maxX));
        const py = Phaser.Math.Between(Math.round(minY), Math.round(maxY));
        fallback = { x: px, y: py };

        if (Math.abs(px - x) < 104 && Math.abs(py - y) < 76) continue;

        const tooClose = positions.some((pos) => (
          Phaser.Math.Distance.Between(px, py, pos.x, pos.y) < 27
        ));
        if (!tooClose) return fallback;
      }
      return fallback;
    };

    for (let i = 0; i < total; i += 1) {
      const type = crowdTypes[i];
      const isDuck = type === 'duck';
      const textureKey = isDuck ? 'duckArt' : 'roachArt';
      const pos = pickGroundedPosition();
      positions.push(pos);

      const actor = this.trackDuckQueenVictoryEndingFx(
        this.add.image(pos.x, pos.y, textureKey)
          .setDepth(6)
          .setAlpha(1)
          .setScale(isDuck ? (58 / 128) : (46 / 128))
      );
      actor.setData('endingCrowdType', type);
      actor.setData('endingCrowdIndex', i);

      if (isDuck) {
        actor.setAngle(Phaser.Math.FloatBetween(-4.5, 4.5));
        actor.setFlipX(Phaser.Math.Between(0, 1) === 1);
      } else {
        actor.setRotation(Phaser.Math.FloatBetween(-Math.PI, Math.PI));
      }

      this.duckQueenVictoryEndingCrowd.push(actor);
    }

    return this.duckQueenVictoryEndingCrowd;
  }

  explodeDuckQueenVictoryEndingCrowd() {
    if (
      !this.duckQueenVictoryEndingActive
      || this.duckQueenVictoryEndingCrowdExploded
    ) return false;

    const crowd = this.duckQueenVictoryEndingCrowd.filter((actor) => actor?.active);
    if (!crowd.length) return false;
    this.duckQueenVictoryEndingCrowdExploded = true;

    const shuffled = Phaser.Utils.Array.Shuffle([...crowd]);
    let latestDelay = 0;

    shuffled.forEach((actor, index) => {
      const delay = index * Phaser.Math.Between(17, 25) + Phaser.Math.Between(0, 620);
      latestDelay = Math.max(latestDelay, delay);

      this.scheduleDuckQueenVictoryEnding(delay, () => {
        if (!actor?.active || !this.duckQueenVictoryEndingActive) return;
        const actorX = actor.x;
        const actorY = actor.y;
        const type = actor.getData('endingCrowdType') === 'duck' ? 'duck' : 'roach';
        this.tweens.killTweensOf(actor);
        actor.destroy();

        this.createEnemyBloodSplatter(actorX, actorY, type);
        this.showLockedEnemyDeathArt(actorX, actorY, type);
      });
    });

    this.scheduleDuckQueenVictoryEnding(latestDelay + 80, () => {
      this.duckQueenVictoryEndingCrowd = this.duckQueenVictoryEndingCrowd
        .filter((actor) => actor?.active);
    });

    return true;
  }

  showDuckQueenVictoryDanjiCassette(x, y) {
    if (!this.duckQueenVictoryEndingActive) return;

    const tape = this.trackDuckQueenVictoryEndingFx(
      this.add.image(x, y + 18, 'danjiCassette')
        .setDepth(82)
        .setAlpha(0)
        .setScale(0.45)
        .setAngle(-5)
    );
    tape.setDisplaySize(164, 108);
    tape.setScale(tape.scaleX * 0.56, tape.scaleY * 0.56);
    this.duckQueenVictoryEndingCassette = tape;

    const label = this.trackDuckQueenVictoryEndingFx(
      this.add.text(x, y - 1, '《淡季》', {
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#6b2148',
        stroke: '#ffe7f2',
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(83).setAlpha(0)
    );
    this.duckQueenVictoryEndingCassetteLabel = label;

    this.tweens.add({
      targets: tape,
      alpha: 1,
      scaleX: tape.scaleX / 0.56,
      scaleY: tape.scaleY / 0.56,
      angle: 0,
      y: y - 10,
      duration: 250,
      ease: 'Back.Out'
    });
    this.tweens.add({
      targets: label,
      alpha: 1,
      y: y - 29,
      duration: 210,
      ease: 'Sine.Out'
    });

    this.scheduleDuckQueenVictoryEnding(260, () => {
      if (!tape?.active || !label?.active) return;
      this.tweens.add({
        targets: [tape, label],
        y: '-=3',
        duration: 340,
        yoyo: true,
        repeat: 0,
        ease: 'Sine.InOut'
      });
    });

    this.startDuckQueenVictoryDanjiMusic();
  }

  startDuckQueenVictoryMusic() {
    if (!this.cache?.audio?.exists?.('duckQueenVictoryMusic')) return;
    this.stopDuckQueenVictoryMusic();
    const sound = this.sound.add('duckQueenVictoryMusic', {
      volume: 0.78,
      rate: 1,
      loop: false
    });
    this.duckQueenVictoryEndingVictoryAudio = sound;
    sound.once('complete', () => {
      if (this.duckQueenVictoryEndingVictoryAudio !== sound) return;
      try { sound.destroy?.(); } catch (_) {}
      this.duckQueenVictoryEndingVictoryAudio = null;

      if (this.duckQueenVictoryEndingActive && !this.duckQueenVictoryEndingCassette?.active) {
        const anchorX = this.duckQueenVictoryEndingAnchorX ?? 0;
        const anchorY = this.duckQueenVictoryEndingAnchorY ?? 0;
        this.showDuckQueenVictoryDanjiCassette(anchorX, anchorY + 5);
      }
    });
    sound.play();
  }

  stopDuckQueenVictoryMusic() {
    const sound = this.duckQueenVictoryEndingVictoryAudio;
    this.duckQueenVictoryEndingVictoryAudio = null;
    if (!sound) return;
    try {
      sound.stop?.();
      sound.destroy?.();
    } catch (_) {}
  }

  startDuckQueenVictoryDanjiMusic() {
    if (!this.cache?.audio?.exists?.('danjiEndingMusic')) return;
    this.stopDuckQueenVictoryEndingAudio();
    const sound = this.sound.add('danjiEndingMusic', {
      volume: 0.80,
      rate: 1,
      loop: false
    });
    this.duckQueenVictoryEndingAudio = { sound, fadeTween: null };
    sound.play();

    this.scheduleDuckQueenVictoryEnding(2000, () => {
      if (this.duckQueenVictoryEndingAudio?.sound !== sound) return;
      this.explodeDuckQueenVictoryEndingCrowd();
    });
  }

  stopDuckQueenVictoryEndingAudio() {
    const state = this.duckQueenVictoryEndingAudio;
    this.duckQueenVictoryEndingAudio = null;
    if (!state) return;
    try {
      state.fadeTween?.stop?.();
      state.sound?.stop?.();
      state.sound?.destroy?.();
    } catch (_) {}
  }

  restoreDuckQueenVictoryEndingToGameplay(fade) {
    if (!this.duckQueenVictoryEndingActive) return false;

    if (fade?.active) {
      this.tweens.killTweensOf(fade);
      fade.setVisible(true).setAlpha(1);
    }

    this.stopDuckQueenVictoryEndingPlayerGroundVfxSync();
    this.duckQueenVictoryEndingEvents.forEach((event) => event?.remove?.(false));
    this.duckQueenVictoryEndingEvents = [];

    this.stopDuckQueenVictoryMusic();
    this.stopDuckQueenVictoryEndingAudio();

    this.duckQueenVictoryEndingFx
      .filter((obj) => obj !== fade)
      .forEach((obj) => {
        if (!obj?.active) return;
        this.tweens.killTweensOf(obj);
        obj.destroy();
      });
    this.duckQueenVictoryEndingFx = fade?.active ? [fade] : [];

    this.duckQueenVictoryEndingDefeatActor = null;
    this.duckQueenVictoryEndingCutinActor = null;
    this.duckQueenVictoryEndingAnchorX = null;
    this.duckQueenVictoryEndingAnchorY = null;
    this.duckQueenVictoryEndingCutinShade = null;
    this.duckQueenVictoryEndingCassette = null;
    this.duckQueenVictoryEndingCassetteLabel = null;
    this.duckQueenVictoryEndingCrowd = [];
    this.duckQueenVictoryEndingCrowdExploded = false;
    this.duckQueenVictoryEndingPlayerGroundY = null;

    this.restoreDuckQueenVictoryEndingPlayerVisual();
    this.restoreDuckQueenVictoryEndingCombatLayer();
    this.restoreDuckQueenVictoryEndingBeatIndicators();

    const camera = this.cameras.main;
    camera.resetFX?.();
    camera.setZoom(1);
    if (this.player?.active) {
      camera.centerOn(this.player.x, this.player.y);
      camera.startFollow(this.player, true, 0.09, 0.09);
      this.player.setVelocity(0, 0);
    }

    this.physics.world.resume();

    this.adaptiveMusic?.resume?.();
    this.adaptiveMusic?.switchNow?.('combo', { fadeMs: 220 });

    this.duckQueenVictoryEndingActive = false;
    this.endingSequenceActive = false;
    this.victoryElapsedSeconds = null;

    if (this.playerOrbitCrescentPendingUnlock) {
      this.time.delayedCall(360, () => {
        if (this.finished || this.endingSequenceActive) return;
        this.unlockMoonGuardian();
      });
    } else if (this.playerOrbitCrescentUnlocked) {
      this.ensurePlayerOrbitCrescent();
    }

    this.restoreDuckQueenVictoryEndingHud({ delay: 120, duration: 300 });

    if (fade?.active) {
      this.tweens.add({
        targets: fade,
        alpha: 0,
        duration: 720,
        ease: 'Sine.Out',
        onComplete: () => {
          if (fade?.active) fade.destroy();
          this.duckQueenVictoryEndingFx = [];
        }
      });
    } else {
      this.duckQueenVictoryEndingFx = [];
    }

    this.time.delayedCall(520, () => {
      if (this.finished || this.endingSequenceActive) return;
      this.showScreenNotice('「下一章继续：土豆指挥官将在 09:00 登场」', '#f2d58a', 2200);
    });

    return true;
  }

  showToBeContinued(fade) {
    const tbc = this.add.text(
      GAME.WIDTH / 2,
      GAME.HEIGHT / 2,
      'To Be Continued.',
      {
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#dff7ff',
        stroke: '#15334b',
        strokeThickness: 3,
        letterSpacing: 2
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(90002)
      .setAlpha(0);

    this.time.delayedCall(480, () => {
      if (!tbc?.active) return;
      this.tweens.add({ targets: tbc, alpha: 1, duration: 620, ease: 'Sine.Out' });
    });

    this.time.delayedCall(3100, () => {
      if (!tbc?.active) return;
      this.tweens.add({ targets: tbc, alpha: 0, duration: 500, ease: 'Sine.In' });
    });

    this.time.delayedCall(3650, () => {
      if (tbc?.active) tbc.destroy();
      if (fade?.active) fade.destroy();
      this.duckQueenVictoryEndingFx = [];
      this.duckQueenVictoryEndingActive = false;
      this.endingSequenceActive = false;
      this.endRun(true);
    });
  }

  startDuckQueenVictoryEnding(x, y) {
    if (this.duckQueenVictoryEndingActive || this.endingSequenceActive) return false;

    this.duckQueenVictoryEndingActive = true;
    this.endingSequenceActive = true;
    this.duckQueenVictoryEndingEvents = [];
    this.duckQueenVictoryEndingFx = [];
    this.duckQueenVictoryEndingCrowd = [];
    this.duckQueenVictoryEndingCrowdExploded = false;
    this.victoryElapsedSeconds = this.getGameplayElapsedSeconds();
    this.duckQueenVictoryEndingAnchorX = x;
    this.duckQueenVictoryEndingAnchorY = y;

    const endingBlackoutMs = 1500;
    const endingBrightenMs = 2000;
    const victoryMusicStartAt = endingBlackoutMs + endingBrightenMs;
    const victoryMusicDurationMs = 8647;
    const danjiDurationMs = 9064;
    const victoryCueAt = (musicTimeMs) => victoryMusicStartAt + musicTimeMs;
    const endingTailFadeAt = victoryMusicStartAt + victoryMusicDurationMs + danjiDurationMs - 830;
    const endingFinishAt = victoryMusicStartAt + victoryMusicDurationMs + danjiDurationMs + 170;
    this.adaptiveMusic?.pause?.();
    this.scheduleDuckQueenVictoryEnding(victoryMusicStartAt, () => {
      if (!this.duckQueenVictoryEndingActive) return;
      this.startDuckQueenVictoryMusic();
    });

    this.captureDuckQueenVictoryEndingHud();
    this.captureDuckQueenVictoryEndingPlayerVisual();
    this.captureDuckQueenVictoryEndingCombatLayer();
    this.hideDuckQueenVictoryEndingBeatIndicators();

    this.physics.world.pause();
    this.player?.setVelocity?.(0, 0);
    this.cameras.main.stopFollow();

    const endingCamera = this.cameras.main;
    endingCamera.resetFX?.();

    const fade = this.trackDuckQueenVictoryEndingFx(
      this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(90000)
    );

    const defeated = this.trackDuckQueenVictoryEndingFx(
      this.add.image(x, y + 18, 'queenDuckEndingDefeatArt')
        .setOrigin(0.5)
        .setDepth(55)
        .setAlpha(0)
        .setDisplaySize(220, 220)
    );
    this.duckQueenVictoryEndingDefeatActor = defeated;

    const line = this.trackDuckQueenVictoryEndingFx(
      this.add.text(x, y - 112, '「扶……扶我起来，我还能卖」', {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffd0e6',
        stroke: '#321826',
        strokeThickness: 4,
        align: 'center'
      }).setOrigin(0.5).setDepth(86).setAlpha(0)
    );

    let endingBlackScenePrepared = false;
    const prepareEndingSceneInBlack = () => {
      if (endingBlackScenePrepared || !this.duckQueenVictoryEndingActive) return;
      endingBlackScenePrepared = true;

      this.duckQueenVictoryEndingPlayerGroundY = y + 128;
      if (this.player?.active) {
        const snap = this.duckQueenVictoryEndingPlayerSnapshot;
        const gameplayCanvasH = Math.max(1, Math.abs(Number(snap?.displayHeight) || 60));
        const originY = Number.isFinite(snap?.originY) ? snap.originY : 0.5;
        const idleVisibleBottomOffset = (121 / 128 - originY) * gameplayCanvasH;
        this.player.setPosition(
          x + 148,
          this.duckQueenVictoryEndingPlayerGroundY - idleVisibleBottomOffset
        );
      }

      endingCamera.centerOn(x, y);
      endingCamera.setZoom(1.10);
      defeated.setAlpha(1);
      this.tweens.add({
        targets: defeated,
        y: y + 15,
        angle: 0.55,
        duration: 360,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
      this.tweens.add({
        targets: line,
        alpha: 1,
        y: y - 118,
        duration: 160,
        ease: 'Sine.Out'
      });

      this.spawnDuckQueenVictoryEndingCrowd(x, y);

      endingCamera.fadeIn(endingBrightenMs, 0, 0, 0);
    };

    endingCamera.fadeOut(
      endingBlackoutMs,
      0,
      0,
      0,
      (_camera, progress) => {
        if (progress >= 0.999) prepareEndingSceneInBlack();
      },
      this
    );

    this.scheduleDuckQueenVictoryEnding(endingBlackoutMs + 40, () => {
      prepareEndingSceneInBlack();
    });

    this.scheduleDuckQueenVictoryEnding(Math.max(0, victoryMusicStartAt - 220), () => {
      if (!line?.active) return;
      this.tweens.add({ targets: line, alpha: 0, duration: 160, ease: 'Sine.In' });
    });

    this.scheduleDuckQueenVictoryEnding(victoryMusicStartAt, () => {
      this.cameras.main.zoomTo(1, 100, 'Sine.easeInOut', false);
    });

    this.scheduleDuckQueenVictoryEnding(victoryCueAt(58), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding01', { enter: true });
    });
    this.scheduleDuckQueenVictoryEnding(victoryCueAt(2038), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding02');
    });

    this.scheduleDuckQueenVictoryEnding(victoryCueAt(2955), () => {
      const actor = this.duckQueenVictoryEndingCutinActor;
      if (!actor?.active) return;
      this.tweens.killTweensOf(actor);
      const sx = actor.scaleX;
      const sy = actor.scaleY;
      this.tweens.add({
        targets: actor,
        scaleX: sx * 1.018,
        scaleY: sy * 1.018,
        duration: 260,
        yoyo: true,
        ease: 'Sine.InOut'
      });
    });

    this.scheduleDuckQueenVictoryEnding(victoryCueAt(3587), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding03');
      this.sound?.play?.('hitLight', { volume: 0.16 });
      this.cameras.main.flash(55, 255, 240, 184, false);
    });
    this.scheduleDuckQueenVictoryEnding(victoryCueAt(4946), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding04');
    });
    this.scheduleDuckQueenVictoryEnding(victoryCueAt(6037), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding05');
    });
    this.scheduleDuckQueenVictoryEnding(victoryCueAt(7558), () => {
      this.setDuckQueenVictoryEndingCutinFrame('playerVictoryEnding06');
      this.cameras.main.flash(55, 255, 238, 178, false);
    });

    this.scheduleDuckQueenVictoryEnding(victoryCueAt(8000), () => {
      this.hideDuckQueenVictoryEndingCutin({ slideRight: true, duration: 220 });
    });
    this.scheduleDuckQueenVictoryEnding(victoryCueAt(8080), () => {
      this.showDuckQueenVictoryEndingQueenBeat({ zoom: 1.20, duration: 190 });
    });
    this.scheduleDuckQueenVictoryEnding(victoryCueAt(8120), () => {
      if (!defeated?.active) return;
      this.tweens.killTweensOf(defeated);
      this.spawnDuckQueenVictoryGoldDissolve(x, y + 12);
      const glow = this.trackDuckQueenVictoryEndingFx(
        this.add.image(defeated.x, defeated.y, 'queenDuckEndingDefeatArt')
          .setDepth(54)
          .setDisplaySize(220, 220)
          .setTint(0xffd768)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.22)
      );
      this.tweens.add({
        targets: [defeated, glow],
        y: '-=12',
        scaleX: 1.055,
        scaleY: 1.055,
        alpha: 0,
        duration: 560,
        ease: 'Sine.InOut'
      });
    });

    this.scheduleDuckQueenVictoryEnding(victoryCueAt(8429), () => {
      this.cameras.main.flash(75, 255, 220, 120, false);
      this.cameras.main.shake(80, 0.0020, false);
    });


    this.scheduleDuckQueenVictoryEnding(endingTailFadeAt, () => {
      this.tweens.killTweensOf(fade);
      this.tweens.add({
        targets: fade,
        alpha: 1,
        duration: 760,
        ease: 'Sine.InOut'
      });
    });

    this.scheduleDuckQueenVictoryEnding(endingFinishAt, () => {
      if (RELEASE.POTATO_COMMANDER_PUBLISHED) {
        this.restoreDuckQueenVictoryEndingToGameplay(fade);
        return;
      }

      this.stopDuckQueenVictoryEndingPlayerGroundVfxSync();
      this.duckQueenVictoryEndingBeatSnapshot = null;
      this.duckQueenVictoryEndingEvents.forEach((event) => event?.remove?.(false));
      this.duckQueenVictoryEndingEvents = [];

      this.duckQueenVictoryEndingFx
        .filter((obj) => obj !== fade)
        .forEach((obj) => obj?.active && obj.destroy());
      this.duckQueenVictoryEndingFx = [fade];
      this.duckQueenVictoryEndingDefeatActor = null;
      this.duckQueenVictoryEndingCutinActor = null;
      this.duckQueenVictoryEndingAnchorX = null;
      this.duckQueenVictoryEndingAnchorY = null;
      this.duckQueenVictoryEndingCutinShade = null;
      this.duckQueenVictoryEndingCassette = null;
      this.duckQueenVictoryEndingCassetteLabel = null;
      this.duckQueenVictoryEndingCrowd = [];
      this.duckQueenVictoryEndingCrowdExploded = false;

      this.stopDuckQueenVictoryMusic();
      this.stopDuckQueenVictoryEndingAudio();
      this.adaptiveMusic?.stop?.();
      this.cameras.main.setZoom(1);

      if (fade?.active) fade.setAlpha(1);
      this.showToBeContinued(fade);
    });
    return true;
  }

  dropDanjiCassette(x, y) {
    const tape = this.cassetteDrops.create(x, y, 'danjiCassette');
    tape.dropType = 'danji';
    tape.setDepth(9);
    tape.setVelocity(0, 0);
    tape.body.setAllowGravity(false);

    tape.nameLabel = this.add.text(x, y - 30, '「淡季」', {
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#bfeaff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    tape.floatTween = this.tweens.add({
      targets: [tape, tape.nameLabel],
      y: '-=5',
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.showScreenNotice('「丹麦鸭败北，地上掉落了淡季磁带」', '#bfeaff');
  }

  onCollectCassette(player, tape) {
    if (!tape?.active || tape.dropType !== 'danji') return;

    tape.floatTween?.stop();
    if (tape.nameLabel?.active) tape.nameLabel.destroy();
    tape.destroy();

    this.showScreenNotice('「拾取淡季：理智 +10000」', '#bfeaff');
    this.showWorldText(player.x, player.y - 54, '「理智 +10000」', '#bfeaff', 24);

    this.clearDuckQueenNegativeEffects();
    const exploded = this.explodeVisibleRoaches();

    if (exploded > 0) {
      this.showScreenNotice(`「淡季生效：${exploded}只紫色蟑螂原地爆炸」`, '#d99cff');
    }
  }

  clearDuckQueenNegativeEffects() {
    if (this.duckQueenGrappleActive) {
      this.endDuckQueenGrapple(false);
    }
    if (this.duckQueenFishNetActive) {
      this.endDuckQueenFishNet(false);
    }

    this.player.pullTarget = null;
    this.player.pullUntil = -Infinity;
    this.player.pullStrength = 0;
    this.player.slowUntil = -Infinity;
    this.player.slowMultiplier = 1;

    this.fishProjectiles.children.iterate((fish) => {
      if (fish?.active) fish.destroy();
    });

    this.fishStinkZones.forEach((zone) => {
      if (zone?.active) zone.destroy();
    });
    this.fishStinkZones = [];

    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.isDead || !enemy.statusSystem) return;

      if (enemy.enemyType === 'duck') {
        enemy.statusSystem.remove('jealous');
      } else if (enemy.enemyType === 'roach') {
        enemy.statusSystem.remove('sugar_high');
      }
    });

    this.duckQueenAttached = false;
    this.duckQueenAuraActive = false;
    this.duckQueenAttachStartedAt = -Infinity;

    this.showScreenNotice('「淡季清除了丹麦鸭带来的负面状态」', '#bfeaff');
  }

  explodeVisibleRoaches() {
    const view = this.cameras.main.worldView;
    const victims = [];

    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.isDead || enemy.enemyType !== 'roach') return;
      if (view.contains(enemy.x, enemy.y)) victims.push(enemy);
    });

    victims.forEach((roach) => {
      const x = roach.x;
      const y = roach.y;

      roach.isDead = true;
      roach.destroy();
      this.registerKill('roach');

      this.createPurpleRoachExplosion(x, y);
      this.createEnemyBloodSplatter(x, y, 'roach');
    });

    if (victims.length > 0) {
      this.cameras.main.shake(
        160,
        Math.min(0.009, 0.002 + victims.length * 0.00012)
      );
    }

    return victims.length;
  }

  createPurpleRoachExplosion(x, y) {
    const flash = this.add.circle(x, y, 9, 0xd76aff, 0.95).setDepth(17);

    this.tweens.add({
      targets: flash,
      radius: Phaser.Math.Between(25, 38),
      alpha: 0,
      duration: Phaser.Math.Between(170, 250),
      ease: 'Quad.Out',
      onComplete: () => flash.destroy()
    });

    for (let i = 0; i < 5; i += 1) {
      const drop = this.add.circle(
        x + Phaser.Math.Between(-6, 6),
        y + Phaser.Math.Between(-6, 6),
        Phaser.Math.Between(2, 5),
        0x9d39c8,
        0.85
      ).setDepth(16);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(18, 42);

      this.tweens.add({
        targets: drop,
        x: drop.x + Math.cos(angle) * distance,
        y: drop.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: Phaser.Math.Between(260, 420),
        onComplete: () => drop.destroy()
      });
    }
  }

  updateEnemyBloodPuddles(time) {
    this.enemyBloodPuddles = this.enemyBloodPuddles.filter((puddle) => {
      if (!puddle?.active) return false;

      const remaining = puddle.expiresAt - time;
      if (remaining <= 0) {
        puddle.destroy();
        return false;
      }

      if (remaining < 2200) {
        const baseAlpha = puddle.baseBloodAlpha ?? 0.58;
        puddle.setAlpha(
          Math.max(
            0,
            (remaining / 2200) * baseAlpha
          )
        );
      }

      return true;
    });
  }

  getDuckQueenSkillLine(skill) {
    const pools = {
      candy: [
        '「我只为了一个人而来💕」',
        '「我没有办法欺骗自己的心」',
        '「小小失误怕什么...」'
      ],
      charm: [
        '「我太满意了」',
        '「给你的爱一直很安静🎵」'
      ],
      fish: ['「🐟 一起去吃鱼呀」'],
      tietie: ['「我还不太配得上你」'],
      blackframe: [
        '「谢谢二五仔」',
        '「雾好大...」'
      ],
      dafa: ['「融化成季节淡淡的甜...」']
    };

    const pool = pools[skill] ?? [];
    if (pool.length === 0) return null;
    return Phaser.Utils.Array.GetRandom(pool);
  }

  showDuckQueenSkillLine(queen, skill, options = {}) {
    if (!queen?.active) return false;
    const text = this.getDuckQueenSkillLine(skill);
    if (!text) return false;

    const colorBySkill = {
      candy: '#ff9fce',
      charm: '#ff8fc8',
      fish: '#ff9fd7',
      tietie: '#ffd3ea',
      blackframe: '#ff79c6',
      dafa: '#ffd0e8'
    };

    return this.showSkillImportantWorldText?.(
      queen,
      text,
      options.color ?? colorBySkill[skill] ?? '#ffd3ea',
      options.fontSize ?? 18,
      {
        priority: options.priority ?? 88,
        yOffset: options.yOffset ?? 112,
        replaceLowerPriority: true
      }
    );
  }

  markDuckQueenMinionReaction(kind, phase = 'gentle', durationMs = 1200) {
    const until = this.time.now + durationMs;
    if (kind === 'candy') {
      this.duckQueenCandyReactionUntil = Math.max(this.duckQueenCandyReactionUntil ?? -Infinity, until);
      this.duckQueenCandyReactionPhase = phase;
    } else if (kind === 'tietie') {
      this.duckQueenTietieReactionUntil = Math.max(this.duckQueenTietieReactionUntil ?? -Infinity, until);
      this.duckQueenTietieReactionPhase = phase;
    } else if (kind === 'dafa') {
      this.duckQueenDafaReactionUntil = Math.max(this.duckQueenDafaReactionUntil ?? -Infinity, until);
    }
  }

  castDuckQueenCandy(queen, phase = 'gentle', count = 1) {
    if (!queen?.active) return;

    this.showDuckQueenSkillLine(queen, 'candy', { yOffset: 108, priority: 96 });

    this.markDuckQueenMinionReaction('candy', phase, 1450);

    const candyCount = Phaser.Math.Clamp(count, 2, 8);
    const baseAngle = Phaser.Math.FloatBetween(-Math.PI, Math.PI);

    for (let i = 0; i < candyCount; i += 1) {
      const angle = baseAngle + (Math.PI * 2 * i) / candyCount + Phaser.Math.FloatBetween(-0.18, 0.18);
      const distance = Phaser.Math.Between(115, 165);
      const targetX = Phaser.Math.Clamp(queen.x + Math.cos(angle) * distance, 35, GAME.WORLD_WIDTH - 35);
      const targetY = Phaser.Math.Clamp(queen.y + Math.sin(angle) * distance * 0.72, 35, GAME.WORLD_HEIGHT - 35);
      this.spawnDuckQueenCandyPiece(queen.x, queen.y - queen.displayHeight * 0.45, targetX, targetY, i * 90);
    }
  }

  spawnDuckQueenCandyPiece(startX, startY, targetX, targetY, delayMs = 0) {
    this.time.delayedCall(delayMs, () => {
      const candy = this.add.container(startX, startY).setDepth(18);
      const g = this.add.graphics();
      g.fillStyle(0xff6fae, 1);
      g.lineStyle(2, 0x7d2d5c, 0.95);
      g.fillRoundedRect(-8, -5, 16, 10, 4);
      g.strokeRoundedRect(-8, -5, 16, 10, 4);
      g.fillStyle(0xffb7d4, 1);
      g.fillTriangle(-8, 0, -15, -6, -15, 6);
      g.fillTriangle(8, 0, 15, -6, 15, 6);
      g.lineStyle(2, 0x7d2d5c, 0.95);
      g.strokeTriangle(-8, 0, -15, -6, -15, 6);
      g.strokeTriangle(8, 0, 15, -6, 15, 6);
      candy.add(g);

      this.tweens.add({
        targets: candy,
        x: targetX,
        y: targetY,
        angle: Phaser.Math.Between(-120, 120),
        duration: 420,
        ease: 'Cubic.Out',
        onComplete: () => {
          if (!candy.active) return;
          this.spawnDuckQueenCandyLurePulse(targetX, targetY);
          this.attractRoachesToQueenCandy(targetX, targetY, 4);
          this.time.delayedCall(900, () => candy?.active && candy.destroy(true));
        }
      });
    });
  }

  spawnDuckQueenCandyLurePulse(x, y) {
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const dot = this.add.circle(x, y, Phaser.Math.FloatBetween(1.8, 3.2), 0xff8fc0, 0.85).setDepth(17);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * Phaser.Math.Between(24, 42),
        y: y + Math.sin(angle) * Phaser.Math.Between(16, 32),
        alpha: 0,
        duration: Phaser.Math.Between(300, 480),
        ease: 'Quad.Out',
        onComplete: () => dot.destroy()
      });
    }
  }

  attractRoachesToQueenCandy(x, y, wanted = 4) {
    const now = this.time.now;
    const candidates = [];

    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy.isDead || enemy.enemyType !== 'roach') return;
      if ((enemy.queenCandyLuredUntil ?? -Infinity) > now) return;
      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, x, y);
      if (distance <= 620) candidates.push({ enemy, distance });
    });

    candidates.sort((a, b) => a.distance - b.distance);
    const selected = candidates.slice(0, wanted).map((item) => item.enemy);

    while (selected.length < wanted) {
      const spawned = this.spawnSystem.spawnSingleRoachAtViewEdge?.({ forceForQueenCandy: true });
      if (!spawned) break;
      selected.push(spawned);
    }

    selected.slice(0, wanted).forEach((roach, index) => {
      roach.queenCandyLure = { x, y, active: true };
      roach.queenCandyLuredUntil = now + 2200 + index * 80;
      roach.nextReproduceAt = Math.max(roach.nextReproduceAt ?? 0, now + 2600);
    });
  }

  throwDuckQueenTangerine(queen, phase = 'gentle', aimOffsetX = 0, aimOffsetY = 0) {
    if (!queen?.active || queen.isDead || !this.player?.active) return false;
    if (!this.textures.exists('queenTangerine')) return false;

    const startX = queen.x;
    const startY = queen.y - Math.max(30, queen.displayHeight * 0.50);
    const targetX = this.player.x + aimOffsetX + Phaser.Math.Between(-8, 8);
    const targetY = this.player.y + aimOffsetY + Phaser.Math.Between(-7, 7);
    const flightMs = Phaser.Math.Between(560, 680);
    const arcHeight = Phaser.Math.Between(72, 92);

    const shadow = this.add.ellipse(startX, queen.y + 3, 18, 6, 0x2f1b12, 0.20)
      .setDepth(4);
    const fruit = this.add.image(startX, startY, 'queenTangerine')
      .setDepth(18)
      .setDisplaySize(24, 24)
      .setAngle(Phaser.Math.Between(-12, 12));

    const state = { t: 0 };
    this.tweens.add({
      targets: state,
      t: 1,
      duration: flightMs,
      ease: 'Sine.InOut',
      onUpdate: () => {
        if (!fruit.active) return;
        const u = state.t;
        const groundX = Phaser.Math.Linear(startX, targetX, u);
        const groundY = Phaser.Math.Linear(queen.y, targetY, u);
        const lift = Math.sin(Math.PI * u) * arcHeight;
        fruit.setPosition(groundX, Phaser.Math.Linear(startY, targetY, u) - lift);
        fruit.setAngle(fruit.angle + 1.6);
        fruit.setScale(0.92 + 0.08 * u);

        const heightFactor = Math.sin(Math.PI * u);
        shadow.setPosition(groundX, groundY + 5);
        shadow.setScale(1 - heightFactor * 0.42, 1 - heightFactor * 0.34);
        shadow.setAlpha(0.22 - heightFactor * 0.12);
      },
      onComplete: () => {
        if (fruit.active) fruit.destroy();
        if (shadow.active) shadow.destroy();
        this.resolveDuckQueenTangerineLanding(targetX, targetY, phase);
      }
    });

    for (let i = 0; i < 3; i += 1) {
      const mote = this.add.circle(
        startX + Phaser.Math.Between(-5, 5),
        startY + Phaser.Math.Between(-4, 4),
        Phaser.Math.FloatBetween(1.2, 2.2),
        Phaser.Math.RND.pick([0xff9a1f, 0xffbd45, 0xf47b16]),
        0.68
      ).setDepth(17);
      this.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(-14, 14),
        y: mote.y + Phaser.Math.Between(-8, 12),
        alpha: 0,
        duration: Phaser.Math.Between(180, 300),
        onComplete: () => mote.destroy()
      });
    }

    return true;
  }

  throwDuckQueenTangerineVolley(queen, phase = 'gentle', count = 1) {
    const total = Phaser.Math.Clamp(Math.trunc(count), 1, 3);
    const spread = total === 1 ? [0] : total === 2 ? [-24, 24] : [-34, 0, 34];

    spread.forEach((offsetX, index) => {
      const fire = () => {
        if (!queen?.active || queen.isDead || !this.player?.active) return;
        this.throwDuckQueenTangerine(queen, phase, offsetX, (index - (total - 1) / 2) * 5);
      };
      if (index === 0) fire();
      else this.time.delayedCall(index * 85, fire);
    });

    return true;
  }

  resolveDuckQueenTangerineLanding(x, y, phase = 'gentle') {
    const hitRadius = 34;
    const d = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);

    if (d <= hitRadius && !this.player.isDashing) {
      const dealt = this.player.takeDamage(3, this.time.now);
      if (dealt > 0) {
        this.showHpDamageText('duckQueen', this.player.x, this.player.y - 56, dealt, {
          durationMs: 900,
          rise: 30,
          depth: 120
        });
      }
      this.spawnDuckQueenTangerineImpact(x, y, true);
      return;
    }

    this.spawnDuckQueenTangerineImpact(x, y, false);
  }

  spawnDuckQueenTangerineImpact(x, y, hitPlayer = false) {
    const count = hitPlayer ? 8 : 6;
    for (let i = 0; i < count; i += 1) {
      const dot = this.add.circle(
        x,
        y,
        Phaser.Math.FloatBetween(1.5, 3.2),
        Phaser.Math.RND.pick([0xff8a19, 0xffa927, 0xffc34b]),
        0.82
      ).setDepth(9);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(12, 30);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist * 0.48,
        alpha: 0,
        duration: Phaser.Math.Between(180, 320),
        onComplete: () => dot.destroy()
      });
    }

    if (hitPlayer || !this.textures.exists('queenTangerine')) return;

    const landed = this.add.image(x, y - 5, 'queenTangerine')
      .setDepth(6)
      .setDisplaySize(20, 20)
      .setAngle(Phaser.Math.Between(-18, 18));
    const rollX = x + Phaser.Math.Between(-18, 18);
    this.tweens.add({
      targets: landed,
      x: rollX,
      y: y - 10,
      angle: landed.angle + Phaser.Math.RND.pick([-35, 35]),
      duration: 120,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: () => {
        if (!landed.active) return;
        this.tweens.add({
          targets: landed,
          x: rollX + Phaser.Math.Between(-8, 8),
          alpha: 0,
          duration: 260,
          onComplete: () => landed.destroy()
        });
      }
    });
  }

  spawnDuckQueenPinkSplash(x, y) {
    const flash = this.add.circle(x, y, 10, 0xff79b6, 0.78).setDepth(8);
    this.tweens.add({
      targets: flash,
      radius: 28,
      alpha: 0,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy()
    });

    for (let i = 0; i < 9; i += 1) {
      const dot = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0xff74ae, 0.75).setDepth(8);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(16, 42);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist * 0.52,
        alpha: 0,
        duration: Phaser.Math.Between(260, 440),
        onComplete: () => dot.destroy()
      });
    }
  }

  createDuckQueenPinkPuddle(x, y, phase = 'gentle') {
    const radius = phase === 'frenzy' ? 52 : phase === 'obsessed' ? 48 : 44;
    const body = this.add.ellipse(x, y + 5, radius * 1.8, radius * 0.86, 0xff5fa7, 0.48).setDepth(2);
    const shine = this.add.ellipse(x - radius * 0.22, y - 1, radius * 0.65, radius * 0.18, 0xffc0db, 0.36).setDepth(2.1);
    const dropA = this.add.circle(x + radius * 0.76, y + 8, 5, 0xff73b1, 0.48).setDepth(2);
    const dropB = this.add.circle(x - radius * 0.72, y - 3, 3.5, 0xff73b1, 0.42).setDepth(2);

    this.duckQueenPinkPuddles.push({
      x,
      y,
      radius,
      displays: [body, shine, dropA, dropB],
      createdAt: this.time.now,
      expiresAt: this.time.now + 6500,
      nextStainAt: this.time.now,
      nextDazeCheckAt: this.time.now + 800
    });
  }

  updateDuckQueenPinkPuddles(time) {
    let playerInPinkPuddle = false;
    for (let i = this.duckQueenPinkPuddles.length - 1; i >= 0; i -= 1) {
      const puddle = this.duckQueenPinkPuddles[i];
      if (time >= puddle.expiresAt) {
        puddle.displays.forEach((item) => item?.destroy());
        this.duckQueenPinkPuddles.splice(i, 1);
        continue;
      }

      const remaining = puddle.expiresAt - time;
      if (remaining < 1500) {
        const alphaFactor = Phaser.Math.Clamp(remaining / 1500, 0, 1);
        puddle.displays.forEach((item) => {
          if (item?.active) item.setAlpha((item._queenBaseAlpha ?? item.alpha) * alphaFactor);
        });
      } else {
        puddle.displays.forEach((item) => {
          if (item?.active && item._queenBaseAlpha === undefined) item._queenBaseAlpha = item.alpha;
        });
      }

      const d = Phaser.Math.Distance.Between(puddle.x, puddle.y, this.player.x, this.player.y);
      if (d > puddle.radius) continue;
      playerInPinkPuddle = true;

      if (time >= puddle.nextStainAt) {
        puddle.nextStainAt = time + 850;
        this.addDuckQueenPinkStain(1);
      }
    }

    this.playerInDuckQueenPinkPuddle = playerInPinkPuddle;
  }

  addDuckQueenPinkStain(amount = 1) {
    const offsets = [
      [-13, -15, 8, 5],
      [12, -8, 7, 4],
      [-9, 10, 6, 4],
      [11, 13, 5, 3],
      [2, -22, 5, 3]
    ];

    for (let i = 0; i < amount; i += 1) {
      const slot = offsets[(this.duckQueenPinkStains.length + i) % offsets.length];
      const stain = this.add.ellipse(0, 0, slot[2], slot[3], 0xff55a5, 0.62)
        .setDepth((this.player.depth ?? 10) + 1);
      this.duckQueenPinkStains.push({
        display: stain,
        offsetX: slot[0] + Phaser.Math.Between(-2, 2),
        offsetY: slot[1] + Phaser.Math.Between(-2, 2),
        expiresAt: this.time.now + 7000
      });
    }

    while (this.duckQueenPinkStains.length > 5) {
      const old = this.duckQueenPinkStains.shift();
      old?.display?.destroy();
    }
  }

  updateDuckQueenPinkStains(time) {
    this.duckQueenPinkStains = this.duckQueenPinkStains.filter((stain) => {
      if (!stain.display?.active || time >= stain.expiresAt) {
        stain.display?.destroy();
        return false;
      }
      stain.display
        .setPosition(this.player.x + stain.offsetX, this.player.y + stain.offsetY)
        .setDepth((this.player.depth ?? 10) + 1);
      return true;
    });
  }

  getDuckQueenCharmMarkAnchor() {
    if (!this.player?.active) return { x: 0, y: 0 };
    const bounds = this.player.getBounds?.();
    if (bounds && Number.isFinite(bounds.centerX) && Number.isFinite(bounds.top)) {
      return {
        x: bounds.centerX,
        y: bounds.top - 13
      };
    }
    return {
      x: this.player.x,
      y: this.player.y - Math.max(48, Math.abs(this.player.displayHeight ?? 60) * 0.58)
    };
  }

  clearDuckQueenCharmSpell() {
    const state = this.duckQueenCharmSpell;
    [state?.heartFx?.container].forEach((target) => {
      if (target) this.tweens.killTweensOf(target);
    });
    state?.heartFx?.container?.destroy(true);
    this.duckQueenCharmSpell = null;
  }

  clearDuckQueenCharmMark() {
    const mark = this.duckQueenCharmMark;
    if (mark?.container) this.tweens.killTweensOf(mark.container);
    if (mark?.pulse) this.tweens.killTweensOf(mark.pulse);
    if (mark?.glow) this.tweens.killTweensOf(mark.glow);
    mark?.container?.destroy(true);
    this.duckQueenCharmMark = null;
  }


  clearDuckQueenCharmControlHint() {
    const hint = this.duckQueenCharmControlHint;
    if (!hint) return;
    if (hint.container) this.tweens.killTweensOf(hint.container);
    hint.container?.destroy(true);
    this.duckQueenCharmControlHint = null;
  }

  createDuckQueenCharmControlHint(durationMs = 10000) {
    this.clearDuckQueenCharmControlHint();

    const container = this.add.container(GAME.WIDTH / 2, GAME.HEIGHT - 112)
      .setScrollFactor(0)
      .setDepth(218);

    const title = this.add.text(0, 0, `「方向颠倒中 · ${(durationMs / 1000).toFixed(1)}s」`, {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffb1d8',
      stroke: '#000000',
      strokeThickness: 3,
      shadow: {
        offsetX: 0,
        offsetY: 2,
        color: '#000000',
        blur: 3,
        stroke: false,
        fill: true
      }
    }).setOrigin(0.5);

    container.add(title);
    this.duckQueenCharmControlHint = { container, title };
    return this.duckQueenCharmControlHint;
  }

  createPlainCharmHeart(x, y, depth = 24, size = 42) {
    const container = this.add.container(x, y).setDepth(depth);

    const glow = this.add.circle(0, 0, Math.max(18, size * 0.55), 0x2a071f, 0.30)
      .setStrokeStyle(3, 0xff4fae, 0.48);

    const outer = this.add.text(0, 0, '♥', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.round(size * 1.10)}px`,
      fontStyle: 'bold',
      color: '#ff4fae',
      stroke: '#ff9acd',
      strokeThickness: 2,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#ff2f9d',
        blur: 10,
        stroke: true,
        fill: true
      }
    }).setOrigin(0.5);

    const heart = this.add.text(0, 1, '♥', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.round(size * 0.82)}px`,
      fontStyle: 'bold',
      color: '#080508',
      stroke: '#140a12',
      strokeThickness: 1
    }).setOrigin(0.5);

    const pulse = this.add.text(0, 0, '♥', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.round(size * 1.12)}px`,
      fontStyle: 'bold',
      color: '#ff4fae',
      stroke: '#ff8ec8',
      strokeThickness: 2
    }).setOrigin(0.5).setAlpha(0.34);

    container.add([glow, pulse, outer, heart]);
    return { container, heart, outer, pulse, glow };
  }

  startCharmHeartPulse(mark, { status = false } = {}) {
    if (!mark?.container?.active) return;

    this.tweens.add({
      targets: mark.container,
      scaleX: status ? 1.10 : 1.16,
      scaleY: status ? 1.10 : 1.16,
      duration: status ? 260 : 210,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.tweens.add({
      targets: mark.pulse,
      scaleX: status ? 1.55 : 1.75,
      scaleY: status ? 1.55 : 1.75,
      alpha: 0,
      duration: status ? 560 : 440,
      repeat: -1,
      ease: 'Quad.Out',
      onRepeat: () => {
        if (mark.pulse?.active) {
          mark.pulse.setScale(1).setAlpha(status ? 0.26 : 0.38);
        }
      }
    });

    this.tweens.add({
      targets: mark.glow,
      scaleX: status ? 1.20 : 1.35,
      scaleY: status ? 1.20 : 1.35,
      alpha: status ? 0.18 : 0.10,
      duration: status ? 420 : 320,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  spawnDuckQueenCharmImpact() {
    if (!this.player?.active) return;
    const x = this.player.x;
    const y = this.player.y - 10;

    for (let i = 0; i < 3; i += 1) {
      const ring = this.add.circle(x, y, 16 + i * 3, 0x140713, 0)
        .setStrokeStyle(3 - i * 0.5, i === 1 ? 0x9a3a8d : 0x4a1748, 0.72 - i * 0.12)
        .setDepth(23);
      this.tweens.add({
        targets: ring,
        scaleX: 2.2 + i * 0.35,
        scaleY: 2.2 + i * 0.35,
        alpha: 0,
        delay: i * 45,
        duration: 420 + i * 60,
        ease: 'Quad.Out',
        onComplete: () => ring.destroy()
      });
    }
  }

  triggerDuckQueenCharm(queen, time = this.time.now) {
    if (
      !queen?.active
      || queen.isDead
      || !this.player?.active
      || this.duckQueenGrappleActive
      || this.duckQueenFishNetActive
      || this.duckQueenCharmSpell
    ) return false;

    this.showDuckQueenSkillLine(queen, 'charm', { yOffset: 108, priority: 96 });

    const y = queen.y - Math.max(30, queen.displayHeight * 0.40);
    const heartFx = this.createPlainCharmHeart(queen.x, y, 24, 52);
    this.startCharmHeartPulse(heartFx, { status: false });

    this.duckQueenCharmSpell = {
      queen,
      heartFx,
      resolvesAt: time + (ENEMIES.duckQueen.charmCastMs ?? 620)
    };
    return true;
  }

  applyDuckQueenCharmStatus(queen, time = this.time.now) {
    if (!this.player?.active || this.player.hp <= 0) return false;

    const statusMs = ENEMIES.duckQueen.charmStatusDurationMs ?? 10000;
    const initialDazeMs = ENEMIES.duckQueen.charmInitialDazeMs ?? 650;

    this.duckQueenCharmUntil = time + statusMs;
    this.duckQueenDazeUntil = time + initialDazeMs;
    this.player.applyStun(initialDazeMs, time);
    this.player.setAlpha(1);

    this.showPlayerStatusNotice('duck_queen_charm', '「被蛊惑了！」', '#c677c1', 1200);
    this.spawnDuckQueenCharmImpact();

    this.clearDuckQueenCharmMark();
    const charmAnchor = this.getDuckQueenCharmMarkAnchor();
    const mark = this.createPlainCharmHeart(charmAnchor.x, charmAnchor.y, 26, 28);
    this.duckQueenCharmMark = mark;
    this.startCharmHeartPulse(mark, { status: true });
    this.createDuckQueenCharmControlHint(statusMs);

    queen?.resolveMajorSkill?.('charm', time, { chainAllowed: true });

    return true;
  }

  updateDuckQueenCharm(time, delta = 16.67) {
    const state = this.duckQueenCharmSpell;
    if (state) {
      if (!state.queen?.active || state.queen.isDead || !this.player?.active || this.player.hp <= 0) {
        this.clearDuckQueenCharmSpell();
      } else if (time >= state.resolvesAt) {
        const queen = state.queen;
        this.clearDuckQueenCharmSpell();
        this.applyDuckQueenCharmStatus(queen, time);
      } else {
        const y = state.queen.y - Math.max(30, state.queen.displayHeight * 0.40);
        state.heartFx?.container?.setPosition(state.queen.x, y);
      }
    }

    if (this.duckQueenCharmMark) {
      if (!this.player?.active || this.player.hp <= 0 || time >= this.duckQueenCharmUntil) {
        this.clearDuckQueenCharmMark();
        this.clearDuckQueenCharmControlHint();
      } else {
        const remaining = this.duckQueenCharmUntil - time;
        const fade = remaining < 1000 ? Phaser.Math.Clamp(remaining / 1000, 0, 1) : 1;
        const charmAnchor = this.getDuckQueenCharmMarkAnchor();
        this.duckQueenCharmMark.container
          ?.setPosition(charmAnchor.x, charmAnchor.y)
          .setAlpha(fade);

        if (this.duckQueenCharmControlHint?.container?.active) {
          const blockedBottom = this.duckQueenFishNetActive || this.duckQueenGrappleActive;
          this.duckQueenCharmControlHint.container
            .setPosition(GAME.WIDTH / 2, GAME.HEIGHT - (blockedBottom ? 150 : 112))
            .setAlpha(fade);
          this.duckQueenCharmControlHint.title?.setText(
            `「方向颠倒中 · ${(Math.max(0, remaining) / 1000).toFixed(1)}s」`
          );
        }
      }
    } else if (time >= this.duckQueenCharmUntil) {
      this.clearDuckQueenCharmControlHint();
    }
  }

  updateDuckQueenDazeVisual(time) {
    if (time >= this.duckQueenDazeUntil && this.player.active) {
      this.player.setAlpha(1);
    }
  }

  updateDuckQueenEcology(time) {
    const queen = this.duckQueen;

    if (!queen?.active || queen.isDead) {
      this.duckQueenAttached = false;
      this.duckQueenGrappleActive = false;
      this.duckQueenAuraActive = false;
      this.duckQueenEscapeInputs = 0;
      this.destroyDuckQueenEscapeHint();
      return;
    }

    const phase = queen.getPhase();

    this.duckQueenAuraActive = phase !== 'gentle';

    if (this.duckQueenGrappleActive || this.duckQueenFishNetActive) return;

    const distance = Phaser.Math.Distance.Between(
      queen.x,
      queen.y,
      this.player.x,
      this.player.y
    );

    if (
      phase !== 'gentle'
      && distance <= queen.attachDistance
      && queen.canAttachNow(time, distance)
    ) {
      this.startDuckQueenGrapple(queen, time);
    }
  }

  startDuckQueenFishNet(queen, time = this.time.now) {
    if (
      this.duckQueenFishNetActive
      || this.duckQueenGrappleActive
      || !queen?.active
      || queen.isDead
      || !this.player?.active
    ) return false;

    this.duckQueenFishNetActive = true;
    this.duckQueenFishNetEscapeInputs = 0;
    this.duckQueenFishNetPullStartsAt = time + 260;
    this.duckQueenFishNetVisualState = 'caught';

    this.duckQueenFishNetRestoreWidth = Math.abs(Number(this.player.displayWidth) || 60);
    this.duckQueenFishNetRestoreHeight = Math.abs(Number(this.player.displayHeight) || 60);

    this.duckQueenFishNetRestoreFlipX = !!this.player.flipX;

    this.player.isDashing = false;
    this.player.setVelocity(0, 0);
    this.player.setTexture('playerFishNetCaughtArt');
    this.player.setOrigin(0.5, 0.5);
    this.player.setDisplaySize(
      this.duckQueenFishNetRestoreWidth,
      this.duckQueenFishNetRestoreHeight
    );

    this.createDuckQueenFishNetHint();
    this.showScreenNotice('「被鱼网缠住！」', '#ff9fd7');
    return true;
  }

  createDuckQueenFishNetHint() {
    this.destroyDuckQueenFishNetHint();
    const needed = ENEMIES.duckQueen.fishNetBreakInputs ?? 3;
    const text = this.prefersTouchEscape
      ? `「连续点击挣脱鱼网 0/${needed}」`
      : `「连续按空格挣脱鱼网 0/${needed}」`;

    this.duckQueenFishNetHint = this.add.text(
      GAME.WIDTH / 2,
      GAME.HEIGHT - 82,
      text,
      {
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#7a275fdd',
        padding: { x: 14, y: 8 },
        stroke: '#2b0b27',
        strokeThickness: 3
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(220);
  }

  destroyDuckQueenFishNetHint() {
    if (this.duckQueenFishNetHint?.active) this.duckQueenFishNetHint.destroy();
    this.duckQueenFishNetHint = null;
  }

  registerDuckQueenFishNetEscapeInput() {
    if (!this.duckQueenFishNetActive) return;
    this.duckQueenFishNetEscapeInputs += 1;
    const needed = ENEMIES.duckQueen.fishNetBreakInputs ?? 3;

    if (this.duckQueenFishNetHint?.active) {
      const action = this.prefersTouchEscape ? '连续点击挣脱鱼网' : '连续按空格挣脱鱼网';
      this.duckQueenFishNetHint.setText(
        `「${action} ${Math.min(this.duckQueenFishNetEscapeInputs, needed)}/${needed}」`
      );
      this.duckQueenFishNetHint.setScale(0.94);
      this.tweens.add({
        targets: this.duckQueenFishNetHint,
        scaleX: 1,
        scaleY: 1,
        duration: 65
      });
    }

    if (this.duckQueenFishNetEscapeInputs >= needed) {
      this.endDuckQueenFishNet(true);
    }
  }

  setDuckQueenFishNetPlayerVisual(state = 'pull') {
    if (!this.player?.active || this.duckQueenFishNetVisualState === state) return;
    this.duckQueenFishNetVisualState = state;
    const key = state === 'caught' ? 'playerFishNetCaughtArt' : 'playerFishNetPullArt';
    this.player.setTexture(key);
    this.player.setOrigin(0.5, 0.5);
    this.player.setDisplaySize(
      this.duckQueenFishNetRestoreWidth ?? 128,
      this.duckQueenFishNetRestoreHeight ?? 128
    );
  }

  restorePlayerAfterFishNet() {
    if (!this.player?.active) return;
    this.player.setTexture('playerArt');
    this.player.setOrigin(0.5, 0.5);
    this.player.setDisplaySize(
      this.duckQueenFishNetRestoreWidth ?? 60,
      this.duckQueenFishNetRestoreHeight ?? 60
    );
    this.player.setFlipX(this.duckQueenFishNetRestoreFlipX ?? false);
    this.duckQueenFishNetRestoreWidth = null;
    this.duckQueenFishNetRestoreHeight = null;
    this.duckQueenFishNetRestoreFlipX = null;
    if (this.player.body) this.player.body.setSize(76, 94, true);
  }

  getDuckQueenFishNetAnchors() {
    if (!this.player?.active) return [];
    const sourceWidth = 1254;
    const sourceHeight = 1254;
    const sourceAnchors = [
      { x: 0, y: 477 },
      { x: 0, y: 591 },
      { x: 0, y: 789 }
    ];
    const width = this.player.displayWidth;
    const height = this.player.displayHeight;
    const flipped = this.player.flipX;

    return sourceAnchors.map((anchor) => {
      const normalizedX = anchor.x / sourceWidth;
      const normalizedY = anchor.y / sourceHeight;
      let localX = (normalizedX - 0.5) * width;
      const localY = (normalizedY - 0.5) * height;
      if (flipped) localX *= -1;
      return { x: this.player.x + localX, y: this.player.y + localY };
    });
  }

  ensureDuckQueenFishNetGraphics() {
    if (!this.duckQueenFishNetGraphics?.active) {
      this.duckQueenFishNetGraphics = this.add.graphics().setDepth(9);
    }
    return this.duckQueenFishNetGraphics;
  }

  updateDuckQueenFishNetGraphics(time) {
    const queen = this.duckQueen;
    if (
      !this.duckQueenFishNetActive
      || !queen?.active
      || !this.player?.active
      || this.duckQueenFishNetVisualState !== 'pull'
    ) {
      if (this.duckQueenFishNetGraphics?.active) this.duckQueenFishNetGraphics.clear();
      return;
    }

    const graphics = this.ensureDuckQueenFishNetGraphics();
    graphics.clear();
    const anchors = this.getDuckQueenFishNetAnchors();
    const endBase = {
      x: queen.x,
      y: queen.y - Math.max(22, queen.displayHeight * 0.46)
    };

    anchors.forEach((start, index) => {
      const end = {
        x: endBase.x,
        y: endBase.y + (index - 1) * 10
      };
      const wobble = Math.sin(time * 0.012 + index * 1.7) * (7 + index * 2);
      const control = {
        x: Phaser.Math.Linear(start.x, end.x, 0.48),
        y: Phaser.Math.Linear(start.y, end.y, 0.48) + wobble
      };

      const curvePoints = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(start.x, start.y),
        new Phaser.Math.Vector2(control.x, control.y),
        new Phaser.Math.Vector2(end.x, end.y)
      ).getPoints(16);

      graphics.lineStyle(5.2, 0x5e145e, 0.78);
      graphics.strokePoints(curvePoints, false, false);

      graphics.lineStyle(2.6, 0xff5fc5, 0.94);
      graphics.strokePoints(curvePoints, false, false);

      const t = ((time * 0.00065 + index * 0.23) % 1 + 1) % 1;
      const u = 1 - t;
      const px = u * u * start.x + 2 * u * t * control.x + t * t * end.x;
      const py = u * u * start.y + 2 * u * t * control.y + t * t * end.y;
      graphics.fillStyle(index === 1 ? 0xffa0dc : 0xd94bba, 0.86);
      graphics.fillCircle(px, py, 2.4 + index * 0.25);
    });
  }

  spawnDuckQueenFishNetBreakBurst() {
    const anchors = this.getDuckQueenFishNetAnchors();
    anchors.forEach((anchor, index) => {
      for (let i = 0; i < 4; i += 1) {
        const drop = this.add.circle(
          anchor.x,
          anchor.y,
          Phaser.Math.FloatBetween(1.8, 3.6),
          i % 2 === 0 ? 0xff65c9 : 0x9d3fb5,
          0.88
        ).setDepth(16);
        const angle = Math.PI + Phaser.Math.FloatBetween(-0.85, 0.85) + index * 0.08;
        const distance = Phaser.Math.Between(16, 38);
        this.tweens.add({
          targets: drop,
          x: anchor.x + Math.cos(angle) * distance,
          y: anchor.y + Math.sin(angle) * distance,
          alpha: 0,
          scaleX: 0.45,
          scaleY: 0.45,
          duration: Phaser.Math.Between(180, 310),
          ease: 'Quad.Out',
          onComplete: () => drop.destroy()
        });
      }
    });
  }

  destroyDuckQueenFishNetFx() {
    this.destroyDuckQueenFishNetHint();
    if (this.duckQueenFishNetGraphics?.active) this.duckQueenFishNetGraphics.destroy();
    this.duckQueenFishNetGraphics = null;
  }

  endDuckQueenFishNet(success = false, { silentNotice = false } = {}) {
    const queen = this.duckQueen;
    if (!this.duckQueenFishNetActive) return;

    if (success) this.spawnDuckQueenFishNetBreakBurst();

    this.duckQueenFishNetActive = false;
    this.duckQueenFishNetEscapeInputs = 0;
    this.duckQueenFishNetPullStartsAt = -Infinity;
    this.duckQueenFishNetVisualState = null;
    this.destroyDuckQueenFishNetFx();
    this.restorePlayerAfterFishNet();

    if (queen?.active && !queen.isDead) {
      const closeEnoughForCombo = this.player?.active
        ? Phaser.Math.Distance.Between(queen.x, queen.y, this.player.x, this.player.y) <= queen.attachDistance + 18
        : false;

      if (success) {
        queen.grappleCooldownUntil = Math.max(queen.grappleCooldownUntil ?? -Infinity, this.time.now + 1200);
        queen.nextStickDashAt = Math.max(queen.nextStickDashAt ?? 0, this.time.now + 1200);
      }

      queen.resolveMajorSkill?.('fish', this.time.now, {
        chainAllowed: !success && closeEnoughForCombo
      });

    }

    if (success && !silentNotice) this.showScreenNotice('「挣脱鱼网！」', '#a7f2d0');
  }

  updateDuckQueenFishNet(time) {
    if (!this.duckQueenFishNetActive) return;
    const queen = this.duckQueen;

    if (!queen?.active || queen.isDead || !this.player?.active || this.player.hp <= 0) {
      this.endDuckQueenFishNet(false);
      return;
    }

    const queenOnLeft = queen.x < this.player.x;
    this.player.setFlipX(!queenOnLeft);

    if (time < this.duckQueenFishNetPullStartsAt) {
      this.setDuckQueenFishNetPlayerVisual('caught');
      this.player.setVelocity(0, 0);
      return;
    }

    this.setDuckQueenFishNetPlayerVisual('pull');
    this.updateDuckQueenFishNetGraphics(time);

    const distance = Phaser.Math.Distance.Between(
      queen.x,
      queen.y,
      this.player.x,
      this.player.y
    );

    if (distance <= queen.attachDistance + 4) {
      this.endDuckQueenFishNet(false);
    }
  }

  spawnDuckQueenDrainSmoke(player, queen) {
    if (!player?.active || !queen?.active) return;
    const startX = player.x;
    const startY = player.y - 22;
    const endX = queen.x;
    const endY = queen.y - Math.max(28, queen.displayHeight * 0.42);

    for (let i = 0; i < 5; i += 1) {
      const puff = this.add.circle(
        startX + Phaser.Math.Between(-8, 8),
        startY + Phaser.Math.Between(-8, 8),
        Phaser.Math.FloatBetween(3.5, 6.5),
        i % 2 === 0 ? 0xc6283d : 0x8d1831,
        Phaser.Math.FloatBetween(0.34, 0.62)
      ).setDepth(17);
      const delay = i * 28;
      puff.setScale(Phaser.Math.FloatBetween(0.8, 1.25));
      this.tweens.add({
        targets: puff,
        x: endX + Phaser.Math.Between(-5, 5),
        y: endY + Phaser.Math.Between(-5, 5),
        alpha: 0,
        scaleX: 0.22,
        scaleY: 0.22,
        delay,
        duration: Phaser.Math.Between(330, 470),
        ease: 'Sine.In',
        onComplete: () => puff.destroy()
      });
    }

    const absorb = this.add.circle(endX, endY, 8, 0xc52a45, 0.28).setDepth(16);
    this.tweens.add({
      targets: absorb,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 240,
      onComplete: () => absorb.destroy()
    });
  }

  startDuckQueenGrapple(queen, time = this.time.now) {
    if (
      this.duckQueenGrappleActive
      || this.duckQueenFishNetActive
      || !queen?.active
      || queen.isDead
      || !this.player?.active
    ) return;

    this.duckQueenGrappleActive = true;
    this.duckQueenAttached = true;
    this.markDuckQueenMinionReaction?.('tietie', queen.getPhase?.() ?? 'obsessed', 1600);
    this.duckQueenEscapeInputs = 0;
    this.duckQueenAttachStartedAt = time;
    this.nextDuckQueenDrainAt = time + 180;

    this.duckQueenGrappleSide = queen.x < this.player.x ? -1 : 1;

    this.player.setVelocity(0, 0);
    queen.setVelocity(0, 0);
    this.player.lockXiafanVisualDisplaySize?.();
    if (this.textures.exists('playerDuckQueenDrainArt')) {
      this.player.applyPlayerVisualTexture?.('playerDuckQueenDrainArt');
    }
    queen.applyVisualState?.(queen.getTietieVisualState?.() ?? 's2_tietie');

    this.showDuckQueenSkillLine(queen, 'tietie', { priority: 92 });
    this.showScreenNotice('「丹麦鸭贴住了！」', '#ffd3ea');
    this.createDuckQueenEscapeHint();
  }

  createDuckQueenEscapeHint() {
    this.destroyDuckQueenEscapeHint();

    const needed = ENEMIES.duckQueen.grappleBreakInputs;
    const action = this.prefersTouchEscape ? '连续点击空白处挣脱' : '连续按空格挣脱';
    const text = `「${action} 0/${needed}」`;

    this.duckQueenEscapeHint = this.add.text(
      GAME.WIDTH / 2,
      GAME.HEIGHT - 82,
      text,
      {
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#6b254fdd',
        padding: { x: 15, y: 9 },
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(220);
  }

  destroyDuckQueenEscapeHint() {
    if (this.duckQueenEscapeHint?.active) {
      this.duckQueenEscapeHint.destroy();
    }
    this.duckQueenEscapeHint = null;
  }

  registerDuckQueenEscapeInput() {
    if (!this.duckQueenGrappleActive) return;

    const needed = ENEMIES.duckQueen.grappleBreakInputs;
    this.duckQueenEscapeInputs = Math.min(this.duckQueenEscapeInputs + 1, needed);

    if (this.duckQueenEscapeHint?.active) {
      const action = this.prefersTouchEscape ? '连续点击空白处挣脱' : '连续按空格挣脱';
      this.duckQueenEscapeHint.setText(
        `「${action} ${this.duckQueenEscapeInputs}/${needed}」`
      );

      this.tweens.killTweensOf(this.duckQueenEscapeHint);
      this.duckQueenEscapeHint.setScale(1);
      this.tweens.add({
        targets: this.duckQueenEscapeHint,
        scaleX: 1.13,
        scaleY: 1.13,
        duration: 72,
        yoyo: true,
        ease: 'Quad.Out',
        onComplete: () => {
          if (this.duckQueenEscapeHint?.active) {
            this.duckQueenEscapeHint.setScale(1);
          }
        }
      });
    }

    if (this.duckQueenEscapeInputs >= needed) {
      this.endDuckQueenGrapple(true);
    }
  }

  endDuckQueenGrapple(success = false) {
    const queen = this.duckQueen;

    this.duckQueenGrappleActive = false;
    this.duckQueenAttached = false;
    this.duckQueenEscapeInputs = 0;
    this.duckQueenAttachStartedAt = -Infinity;
    this.nextDuckQueenDrainAt = -Infinity;
    this.destroyDuckQueenEscapeHint();

    if (this.player?.active) {
      this.player.setAngle(0);
      if (this.player.texture?.key === 'playerDuckQueenDrainArt') {
        this.player.applyPlayerVisualTexture?.('playerArt');
      }
      if (!this.player.restoreXiafanVisualDisplaySize?.()) {
        this.player.setScale(1);
      }
      this.player.clearXiafanVisualDisplaySizeLock?.();
    }

    if (queen?.active) {
      queen.setAngle(0);
      queen.onGrappleBroken(this.time.now);
      queen.resolveMajorSkill?.('stick', this.time.now, { chainAllowed: true });
      queen.resumeRoamingState?.(this.time.now);

      if (success && this.player?.active) {
        const direction = new Phaser.Math.Vector2(
          queen.x - this.player.x,
          queen.y - this.player.y
        );

        if (direction.lengthSq() === 0) direction.set(1, 0);
        direction.normalize();

        queen.setVelocity(
          direction.x * ENEMIES.duckQueen.grappleBreakKnockback,
          direction.y * ENEMIES.duckQueen.grappleBreakKnockback
        );
      }
    }

    if (success) {
      this.showScreenNotice('「成功挣脱！」', '#9ff3c2');
    }
  }

  updateDuckQueenGrapple(time) {
    const queen = this.duckQueen;

    if (!this.duckQueenGrappleActive) return;

    if (
      !queen?.active
      || queen.isDead
      || !this.player?.active
      || this.player.hp <= 0
    ) {
      this.endDuckQueenGrapple(false);
      return;
    }

    this.player.setVelocity(0, 0);
    queen.setVelocity(0, 0);

    const qx = Phaser.Math.Clamp(
      this.player.x
        + this.duckQueenGrappleSide
        * ENEMIES.duckQueen.grappleQueenOffset,
      30,
      GAME.WORLD_WIDTH - 30
    );
    const qy = Phaser.Math.Clamp(
      this.player.y + (ENEMIES.duckQueen.grappleQueenVerticalOffset ?? 26),
      36,
      GAME.WORLD_HEIGHT - 24
    );

    queen.body.reset(qx, qy);

    if (time >= this.nextDuckQueenDrainAt) {
      this.nextDuckQueenDrainAt =
        time + ENEMIES.duckQueen.grappleDrainIntervalMs;

      const drained = this.player.takeDrainDamage(
        ENEMIES.duckQueen.grappleDrainDamage
      );

      if (drained > 0) {
        this.spawnDuckQueenDrainSmoke?.(this.player, queen);
        const healed = queen.healFromDrain(
          Math.min(
            drained,
            ENEMIES.duckQueen.grappleDrainHeal
          )
        );

        this.showHpDamageText(
          'duckQueen',
          this.player.x - 12,
          this.player.y - 66,
          drained,
          { durationMs: 1150, rise: 40, depth: 180 }
        );

        if (healed > 0) {
          this.showWorldText(
            queen.x + 16,
            queen.y - 52,
            `「HP +${Math.round(healed)}」`,
            '#8ff0a8',
            16
          );
        }
      }
    }

    if (time >= this.nextDuckQueenHeartAt) {
      this.nextDuckQueenHeartAt = time + 480;
      this.showWorldText(
        queen.x + Phaser.Math.Between(-22, 22),
        queen.y - 36 + Phaser.Math.Between(-14, 10),
        '♡',
        '#ff9fcf',
        17
      );
    }
  }

  updateDuckQueenDrainVisual(time) {
    const queen = this.duckQueen;

    if (
      this.duckQueenGrappleActive
      && queen?.active
      && !queen.isDead
      && this.player?.active
    ) {
      const wave = Math.sin(time * 0.070);
      const fastWave = Math.sin(time * 0.110);

      this.player.setAngle(wave * 4.2);
      queen.setAngle(-wave * 4.2);

      const playerBaseW = this.player.xiafanVisualDisplayWidth ?? 128;
      const playerBaseH = this.player.xiafanVisualDisplayHeight ?? 128;
      this.player.setDisplaySize(
        playerBaseW * (1 + fastWave * 0.024),
        playerBaseH * (1 - fastWave * 0.024)
      );
      const queenSize = queen.getCurrentVisualBaseSize?.();
      if (queenSize) {
        queen.setDisplaySize(
          queenSize.width * (1 - fastWave * 0.024),
          queenSize.height * (1 + fastWave * 0.024)
        );
      }
    } else {
      if (this.player?.active) {
        this.player.setAngle(0);
        if (this.duckQueenFishNetActive) {
        } else if (this.commanderBlackwaterPreviewActive) {
        } else if (this.duckQueenUltimateCutsceneActive) {
        } else if (!this.player.restoreXiafanVisualDisplaySize?.()) {
          this.player.setScale(1);
        }
      }
      if (queen?.active) {
        queen.setAngle(0);
        queen.restoreVisualDisplaySize?.();
      }
    }
  }

  onDuckQueenPhaseChanged(queen, phase) {
    if (!queen?.active) return;

    if (phase === 'obsessed') {
      this.queueBossPhaseText(
        queen,
        '「真心相待」',
        '#ffafd3',
        20,
        2900
      );
      this.showScreenNotice('「丹麦鸭进入真心相待」', '#ffafd3');
      this.showScreenNotice('「小鸭进入嫉妒状态」', '#ffd3ea');
    } else if (phase === 'frenzy') {
      this.queueBossPhaseText(
        queen,
        '「听夜入梦」',
        '#bcecff',
        20,
        2900
      );
      this.showScreenNotice('「丹麦鸭进入听夜入梦」', '#bcecff');
    }
  }

  showDuckQueenNarrative(queen, text, phase) {
    if (!queen?.active) return false;

    const color = phase === 'gentle'
      ? '#ffd1e5'
      : phase === 'obsessed'
        ? '#ff9fd0'
        : '#c7e9ff';

    const durationMs = 2800;

    return this.showImportantWorldText(
      queen,
      text,
      color,
      phase === 'frenzy' ? 18 : 17,
      durationMs,
      {
        priority: 50,
        gapMs: 420,
        yOffset: 80,
        shake: phase === 'frenzy',
        coalesceLowPriority: true,
        followSource: true,
        followLagMs: 150
      }
    );
  }

  triggerFishFeast(queen) {
    if (
      !queen?.active
      || queen.isDead
      || !this.player?.active
      || this.duckQueenFishNetActive
      || this.duckQueenGrappleActive
    ) return false;

    this.showDuckQueenSkillLine(queen, 'fish', { fontSize: 20, yOffset: 108, priority: 92 });

    return this.throwFishProjectile(queen, 'homing');
  }

  throwFishProjectile(queen, type = 'homing') {
    if (!queen?.active || !this.player?.active || !this.textures.exists('queenFishProjectileArt')) return false;

    const fish = this.fishProjectiles.create(
      queen.x,
      queen.y - Math.max(18, queen.displayHeight * 0.42),
      'queenFishProjectileArt'
    );

    fish.fishType = 'homing';
    fish.isQueenHomingFish = true;
    fish.createdAt = this.time.now;
    fish.homingSpeed = ENEMIES.duckQueen.fishHomingSpeed ?? 360;
    fish.setDepth(15);
    fish.setDisplaySize(48, 48);
    if (fish.body) fish.body.setCircle(14, 10, 10);

    const dx = this.player.x - fish.x;
    const dy = this.player.y - fish.y;
    const len = Math.max(0.001, Math.hypot(dx, dy));
    fish.setVelocity(dx / len * fish.homingSpeed, dy / len * fish.homingSpeed);
    fish.setFlipX(dx < 0);

    this.tweens.add({
      targets: fish,
      scaleX: fish.scaleX * 1.05,
      scaleY: fish.scaleY * 0.95,
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
    return true;
  }

  firePotatoCommanderCross(commander) {
    if (!commander?.active || commander.isDead || !this.player?.active) return false;

    const projectile = this.potatoCommanderCrossProjectiles.create(
      commander.x,
      commander.y - 8,
      'potatoCommanderCrossProjectile'
    );

    const phaseIndex = Phaser.Math.Clamp(commander.phaseIndex ?? 0, 0, 3);
    projectile.damage = ENEMIES.potatoCommander.crossAttackDamage;
    projectile.phaseIndex = phaseIndex;
    projectile.createdAt = this.time.now;
    projectile.setDepth(14);
    projectile.setDisplaySize(24, 38);

    if (phaseIndex === 3) {
      projectile.setTint(0xffd2b8);
    }

    if (projectile.body) {
      projectile.body.setSize(18, 30, true);
    }

    const angle = Phaser.Math.Angle.Between(
      commander.x,
      commander.y,
      this.player.x,
      this.player.y
    );

    projectile.setVelocity(
      Math.cos(angle) * ENEMIES.potatoCommander.crossAttackSpeed,
      Math.sin(angle) * ENEMIES.potatoCommander.crossAttackSpeed
    );

    this.tweens.add({
      targets: projectile,
      scaleX: projectile.scaleX * 1.08,
      scaleY: projectile.scaleY * 1.08,
      alpha: 0.86,
      duration: 130,
      yoyo: true,
      repeat: -1
    });

    return true;
  }

  spawnPotatoCommanderCrossExplosion(x, y, phaseIndex = 0) {
    const finalPhase = Phaser.Math.Clamp(phaseIndex, 0, 3);
    const fx = this.add.graphics({ x, y });
    fx.setDepth(15);

    const accent = finalPhase === 3 ? 0xff6f55 : 0xd7a93d;
    fx.fillStyle(accent, 0.34);
    fx.fillCircle(0, 0, 16);
    fx.fillStyle(0xffd86a, 0.78);
    fx.fillRoundedRect(-3, -24, 6, 48, 2);
    fx.fillRoundedRect(-17, -3, 34, 6, 2);
    fx.fillStyle(0xfff2bd, 0.95);
    fx.fillRoundedRect(-1.5, -20, 3, 40, 1.5);
    fx.fillRoundedRect(-14, -1.5, 28, 3, 1.5);
    fx.fillStyle(0xffffff, 1);
    fx.fillCircle(0, 0, 5);

    for (const [sx, sy, r] of [[-15, -12, 2], [17, 8, 2], [8, -18, 1.5], [-9, 17, 1.5]]) {
      fx.fillStyle(0xfff5cf, 0.92);
      fx.fillRect(sx - r / 2, sy - r * 2, r, r * 4);
      fx.fillRect(sx - r * 2, sy - r / 2, r * 4, r);
    }

    fx.setScale(0.55);
    this.tweens.add({
      targets: fx,
      scaleX: 1.55,
      scaleY: 1.55,
      alpha: 0,
      duration: ENEMIES.potatoCommander.crossAttackExplosionDurationMs,
      ease: 'Quad.easeOut',
      onComplete: () => fx.destroy()
    });
  }

  onPotatoCommanderCrossHitsPlayer(player, projectile) {
    if (!projectile?.active) return;

    const x = projectile.x;
    const y = projectile.y;
    const phaseIndex = projectile.phaseIndex ?? 0;
    const damage = projectile.damage ?? ENEMIES.potatoCommander.crossAttackDamage;
    projectile.destroy();
    this.spawnPotatoCommanderCrossExplosion(x, y, phaseIndex);

    const crossDamage = player.takeDamage(damage, this.time.now);
    if (crossDamage > 0) {
      this.combo = Math.floor(this.combo / 2);
      this.rearmComboStageSpinMilestones();
      this.showHpDamageText(
        'potatoCommander',
        player.x,
        player.y - 60,
        crossDamage,
        { durationMs: 1150, rise: 40, depth: 180 }
      );
    }
  }

  cleanupPotatoCommanderCrossProjectiles(time) {
    this.potatoCommanderCrossProjectiles.children.iterate((projectile) => {
      if (!projectile?.active) return;
      if (
        time - projectile.createdAt
        > ENEMIES.potatoCommander.crossAttackLifetimeMs
      ) {
        const x = projectile.x;
        const y = projectile.y;
        const phaseIndex = projectile.phaseIndex ?? 0;
        projectile.destroy();
        this.spawnPotatoCommanderCrossExplosion(x, y, phaseIndex);
      }
    });
  }

  onFishHitsPlayer(player, fish) {
    if (!fish?.active) return;

    const isHoming = fish.isQueenHomingFish === true || fish.fishType === 'homing';
    const x = fish.x;
    const y = fish.y;
    fish.destroy();

    if (isHoming) {
      for (let i = 0; i < 8; i += 1) {
        const drop = this.add.circle(
          x + Phaser.Math.Between(-7, 7),
          y + Phaser.Math.Between(-7, 7),
          Phaser.Math.FloatBetween(1.8, 4.0),
          i % 2 === 0 ? 0xff60c7 : 0x8f3caf,
          0.84
        ).setDepth(16);
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = Phaser.Math.Between(12, 30);
        this.tweens.add({
          targets: drop,
          x: drop.x + Math.cos(angle) * distance,
          y: drop.y + Math.sin(angle) * distance,
          alpha: 0,
          duration: Phaser.Math.Between(170, 290),
          onComplete: () => drop.destroy()
        });
      }
      this.startDuckQueenFishNet(this.duckQueen, this.time.now);
      return;
    }
  }

  createFishStinkZone(x, y) {
    const radius = STATUS_EFFECTS.fishStinkZoneRadius;
    const zone = this.add.circle(x, y, radius, 0x8ba46a, 0.18).setDepth(2);

    zone.expiresAt = this.time.now + STATUS_EFFECTS.fishStinkZoneDurationMs;
    this.fishStinkZones.push(zone);

    this.tweens.add({
      targets: zone,
      alpha: 0.08,
      duration: 320,
      yoyo: true,
      repeat: 4
    });
  }

  updateFishStinkZones(time) {
    let affectedByStink = false;
    this.fishStinkZones = this.fishStinkZones.filter((zone) => {
      if (!zone?.active || time >= zone.expiresAt) {
        if (zone?.active) zone.destroy();
        return false;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        zone.x,
        zone.y
      );

      if (distance <= STATUS_EFFECTS.fishStinkZoneRadius) {
        affectedByStink = true;
        this.player.applySlow(
          STATUS_EFFECTS.fishStinkZoneSlowMultiplier,
          180,
          time
        );
      }

      return true;
    });

    if (affectedByStink && !this.playerInFishStink) {
      this.showPlayerStatusNotice('fish_stink', '「熏到了！」', '#b9cf83', 1200);
    }
    this.playerInFishStink = affectedByStink;
  }

  cleanupFishProjectiles(time) {
    this.fishProjectiles.children.iterate((fish) => {
      if (!fish?.active) return;

      if (fish.isQueenHomingFish) {
        if (!this.player?.active || this.player.hp <= 0 || !this.duckQueen?.active) {
          fish.destroy();
          return;
        }

        const dx = this.player.x - fish.x;
        const dy = this.player.y - fish.y;
        const length = Math.max(0.001, Math.hypot(dx, dy));

        if (length <= 34) {
          this.onFishHitsPlayer(this.player, fish);
          return;
        }

        const age = time - fish.createdAt;
        const speed = (fish.homingSpeed ?? 360) * (age > 2400 ? 1.35 : age > 1200 ? 1.16 : 1);
        fish.setVelocity(dx / length * speed, dy / length * speed);
        fish.setFlipX(dx < 0);

        if (age > 6500 && length > 34) {
          fish.setPosition(
            this.player.x - dx / length * 22,
            this.player.y - dy / length * 22
          );
        }
        return;
      }

      if (time - fish.createdAt > STATUS_EFFECTS.fishProjectileLifetimeMs) {
        fish.destroy();
      }
    });
  }

  createBossHud(label) {
    this.clearBossHud();

    const x = GAME.WIDTH / 2 - 190;
    const y = 38 + (this.mobileHudSafeTop ?? 0);
    const width = 380;

    this.bossBarBg = this.add.rectangle(
      x,
      y,
      width,
      18,
      0x15151c,
      0.90
    )
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xffffff, 0.30)
      .setScrollFactor(0)
      .setDepth(150);

    this.bossBarRedFill = this.add.rectangle(
      x,
      y,
      width,
      13,
      0xd8424a,
      0.96
    )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(151);

    this.bossBarYellowFill = this.add.rectangle(
      x,
      y,
      width,
      13,
      0xf2d24f,
      0.98
    )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(152);

    this.lastBossHudLabel = label;
    this.bossBarText = this.add.text(
      GAME.WIDTH / 2,
      17 + (this.mobileHudSafeTop ?? 0),
      label,
      {
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffe1ee',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(153);
  }

  updateBossHud() {
    if (
      this.potatoCommander?.active
      && this.bossBarRedFill?.active
      && this.bossBarYellowFill?.active
      && this.bossBarGreenFill?.active
      && this.bossBarSkyBlueFill?.active
    ) {
      const commander = this.potatoCommander;

      const layerFills = [
        this.bossBarSkyBlueFill,
        this.bossBarGreenFill,
        this.bossBarYellowFill,
        this.bossBarRedFill
      ];

      layerFills.forEach((fill, index) => {
        fill.setVisible(true);
        fill.setScale(commander.getLayerHpRatio(index), 1);
      });

      const phaseLabels = {
        memory: '「土豆指挥官 · 童年回忆」',
        hands_on: '「土豆指挥官 · 事必躬亲」',
        holy: '「土豆指挥官 · 圣光普照」',
        calculate: '「土豆指挥官 · 神恩归一」'
      };

      const nextLabel =
        phaseLabels[commander.getPhase()]
        ?? '「土豆指挥官」';

      if (
        this.bossBarText?.active
        && nextLabel !== this.lastBossHudLabel
      ) {
        this.lastBossHudLabel = nextLabel;
        this.bossBarText.setText(nextLabel);
      }

      const hasJudgmentCrossHud = (this.judgmentHudCrosses ?? []).some((cross) => cross?.active);
      if (commander.phaseIndex >= 3) {
        if (hasJudgmentCrossHud) this.updateCommanderJudgmentHud(commander, false, { createIfMissing: false });
      } else if (hasJudgmentCrossHud) {
        this.clearCommanderJudgmentHud();
      }

      return;
    }

    const queen = this.duckQueen;

    if (
      !queen?.active
      || !this.bossBarRedFill?.active
      || !this.bossBarYellowFill?.active
    ) return;

    const redRatio = Phaser.Math.Clamp(
      queen.hp / queen.maxHp,
      0,
      1
    );

    const yellowRatio = Phaser.Math.Clamp(
      queen.armorHp / queen.maxArmorHp,
      0,
      1
    );

    this.bossBarRedFill.setScale(redRatio, 1);
    this.bossBarYellowFill.setScale(yellowRatio, 1);

    const phase = queen.getPhase();
    let nextLabel = '「丹麦鸭 · 天降青梅」';

    if (phase === 'obsessed') {
      nextLabel = '「丹麦鸭 · 真心相待」';
    } else if (phase === 'frenzy') {
      nextLabel = '「丹麦鸭 · 听夜入梦」';
    }

    if (
      this.bossBarText?.active
      && nextLabel !== this.lastBossHudLabel
    ) {
      this.lastBossHudLabel = nextLabel;
      this.bossBarText.setText(nextLabel);
    }
  }
  clearBossHud() {
    [
      this.bossBarBg,
      this.bossBarRedFill,
      this.bossBarYellowFill,
      this.bossBarGreenFill,
      this.bossBarSkyBlueFill,
      this.bossBarText,
      this.bossSkillHudText
    ].forEach((item) => {
      if (item?.active) item.destroy();
    });

    this.bossBarBg = null;
    this.bossBarRedFill = null;
    this.bossBarYellowFill = null;
    this.bossBarGreenFill = null;
    this.bossBarSkyBlueFill = null;
    this.bossBarText = null;
    this.bossSkillHudText = null;
    this.bossSkillHudSourceType = null;
    this.lastBossHudLabel = null;
    this.clearCommanderJudgmentHud();
  }

  layoutScreenNotices() {
    this.activeScreenNotices = this.activeScreenNotices
      .filter((notice) => notice?.active);

    const baseY = 76 + (this.mobileHudSafeTop ?? 0);
    const gapY = 42;

    this.activeScreenNotices.forEach((notice, index) => {
      notice.setY(baseY + index * gapY);
      if (notice.skillSubtext?.active) {
        notice.skillSubtext.setPosition(
          notice.x,
          notice.y + Math.max(29, notice.displayHeight * 0.5 + 10)
        );
      }
    });
  }

  showPlayerStatusNotice(key, text, color = '#ffffff', cooldownMs = 900) {
    if (!this.playerStatusNoticeTimes) this.playerStatusNoticeTimes = new Map();
    const now = this.time?.now ?? 0;
    const previous = this.playerStatusNoticeTimes.get(key) ?? -Infinity;
    if (now - previous < cooldownMs) return null;
    this.playerStatusNoticeTimes.set(key, now);
    return this.showScreenNotice(text, color, 1450);
  }

  showScreenNotice(text, color = '#ffffff', durationMs = 2000, options = {}) {
    if (this.finished) return null;

    const notice = this.add.text(GAME.WIDTH / 2, 76, text, {
      fontSize: '20px',
      fontStyle: 'bold',
      color,
      backgroundColor: '#00000099',
      padding: { x: 12, y: 7 },
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: 650, useAdvancedWrap: true }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(180);

    this.activeScreenNotices = this.activeScreenNotices
      .filter((item) => item?.active);
    notice.skillBeatSynced = options.beatSynced === true;
    this.activeScreenNotices.push(notice);
    this.layoutScreenNotices();

    const fadeDurationMs = 500;

    this.tweens.add({
      targets: notice,
      alpha: 0,
      duration: fadeDurationMs,
      delay: Math.max(0, durationMs - fadeDurationMs),
      ease: 'Quad.In',
      onComplete: () => {
        if (notice.skillSubtext?.active) notice.skillSubtext.destroy();
        notice.skillSubtext = null;
        if (notice.active) notice.destroy();
        this.activeScreenNotices = this.activeScreenNotices
          .filter((item) => item?.active && item !== notice);
        this.layoutScreenNotices();
      }
    });

    return notice;
  }

  attachSkillNoticeSubtext(notice, text, color = '#9ce8ff', durationMs = 800) {
    if (!notice?.active || this.finished) return null;

    if (notice.skillSubtext?.active) {
      this.tweens.killTweensOf(notice.skillSubtext);
      notice.skillSubtext.destroy();
    }

    const label = this.add.text(notice.x, notice.y + 30, text, {
      fontSize: '16px',
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(181);

    notice.skillSubtext = label;
    this.layoutScreenNotices();

    const fadeMs = Math.min(360, Math.max(220, durationMs * 0.44));
    this.tweens.add({
      targets: label,
      alpha: 0,
      duration: fadeMs,
      delay: Math.max(0, durationMs - fadeMs),
      ease: 'Quad.In',
      onComplete: () => {
        if (notice.skillSubtext === label) notice.skillSubtext = null;
        if (label.active) label.destroy();
      }
    });

    return label;
  }

  showSkillScreenNotice(text, color = '#ffffff') {
    return this.showScreenNotice(text, color, 1500, { beatSynced: true });
  }

  updateScreenNoticeBeatSync() {
    const clock = this.adaptiveMusic?.getClockMs?.();
    if (clock === null || clock === undefined) return;

    const beatMs = 500;
    const phase = ((clock % beatMs) + beatMs) % beatMs;
    const beatDistance = Math.min(phase, beatMs - phase);
    const pulse = Phaser.Math.Clamp(1 - beatDistance / 95, 0, 1);
    const scale = 1 + pulse * pulse * 0.045;

    this.activeScreenNotices.forEach((notice) => {
      if (!notice?.active || !notice.skillBeatSynced) return;
      notice.setScale(scale);
    });
  }

  playPoopInfectBurst(target) {
    if (!target?.active || !this.textures.exists('poopInfectBurstArt')) return;

    const burst = this.add.image(target.x, target.y, 'poopInfectBurstArt')
      .setDepth((target.depth ?? 8) + 2)
      .setAlpha(0.92)
      .setDisplaySize(46, 46);

    this.tweens.add({
      targets: burst,
      scaleX: burst.scaleX * 1.28,
      scaleY: burst.scaleY * 1.28,
      alpha: 0,
      duration: 240,
      ease: 'Quad.Out',
      onComplete: () => burst.destroy()
    });
  }

  playPoopHitVfx(x, y) {
    if (!this.textures.exists('poopHitArt')) return;

    const hit = this.add.image(x, y, 'poopHitArt')
      .setDepth(20)
      .setAlpha(0.95)
      .setDisplaySize(38, 38);

    this.tweens.add({
      targets: hit,
      scaleX: hit.scaleX * 1.20,
      scaleY: hit.scaleY * 1.20,
      alpha: 0,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () => hit.destroy()
    });
  }

  triggerTwinPigDirtySplash(source) {
    if (!source?.active || !this.player?.active) return;

    const originX = source.x;
    const originY = source.y - Math.max(12, source.displayHeight * 0.34);
    const targetAngle = Phaser.Math.Angle.Between(originX, originY, this.player.x, this.player.y);
    const range = 185;
    const halfAngle = Phaser.Math.DegToRad(30);
    const endpointX = originX + Math.cos(targetAngle) * range;
    const endpointY = originY + Math.sin(targetAngle) * range;

    this.showSkillImportantWorldText?.(
      source,
      '「💩 泼脏水！」',
      '#d6a064',
      17,
      { priority: 88, yOffset: 68, replaceLowerPriority: true }
    );

    for (let i = 0; i < 6; i += 1) {
      const a = targetAngle + Phaser.Math.FloatBetween(-0.16, 0.16);
      const d = Phaser.Math.FloatBetween(8, 26);
      const droplet = this.add.circle(
        originX + Math.cos(a) * 5,
        originY + Math.sin(a) * 5,
        Phaser.Math.FloatBetween(1.8, 3.4),
        Phaser.Math.RND.pick([0x6f3b1e, 0x8d562d, 0xad6b35]),
        Phaser.Math.FloatBetween(0.58, 0.82)
      ).setDepth(13);

      this.tweens.add({
        targets: droplet,
        x: originX + Math.cos(a) * d,
        y: originY + Math.sin(a) * d,
        alpha: 0,
        scaleX: 0.55,
        scaleY: 0.55,
        delay: Phaser.Math.Between(0, 180),
        duration: Phaser.Math.Between(160, 260),
        ease: 'Quad.Out',
        onComplete: () => droplet.destroy()
      });
    }

    this.time.delayedCall(360, () => {
      if (!source?.active || !this.player?.active) return;

      for (let i = 0; i < 34; i += 1) {
        const spread = i < 24 ? halfAngle * 0.58 : halfAngle * 0.92;
        const a = targetAngle + Phaser.Math.FloatBetween(-spread, spread);
        const travel = Phaser.Math.FloatBetween(range * 0.50, range);
        const radius = Phaser.Math.FloatBetween(1.9, 4.5);
        const blob = this.add.circle(
          originX + Math.cos(a) * Phaser.Math.FloatBetween(2, 10),
          originY + Math.sin(a) * Phaser.Math.FloatBetween(2, 10),
          radius,
          Phaser.Math.RND.pick([0x64351b, 0x7d4524, 0x98582c, 0xb26a34]),
          Phaser.Math.FloatBetween(0.62, 0.90)
        ).setDepth(13);

        this.tweens.add({
          targets: blob,
          x: originX + Math.cos(a) * travel,
          y: originY + Math.sin(a) * travel,
          alpha: 0,
          scaleX: Phaser.Math.FloatBetween(0.45, 1.15),
          scaleY: Phaser.Math.FloatBetween(0.45, 1.15),
          duration: Phaser.Math.Between(300, 470),
          ease: 'Quad.Out',
          onComplete: () => blob.destroy()
        });
      }

      for (let i = 0; i < 7; i += 1) {
        const a = targetAngle + Phaser.Math.FloatBetween(-halfAngle * 0.5, halfAngle * 0.5);
        const travel = Phaser.Math.FloatBetween(range * 0.56, range * 0.92);
        const chunk = this.add.ellipse(
          originX,
          originY,
          Phaser.Math.FloatBetween(7, 12),
          Phaser.Math.FloatBetween(4, 8),
          Phaser.Math.RND.pick([0x63341a, 0x7b431f, 0x95552a]),
          Phaser.Math.FloatBetween(0.68, 0.88)
        ).setDepth(13).setRotation(a);

        this.tweens.add({
          targets: chunk,
          x: originX + Math.cos(a) * travel,
          y: originY + Math.sin(a) * travel,
          alpha: 0,
          duration: Phaser.Math.Between(330, 470),
          ease: 'Quad.Out',
          onComplete: () => chunk.destroy()
        });
      }

      const dx = this.player.x - originX;
      const dy = this.player.y - originY;
      const distance = Math.hypot(dx, dy);
      const playerAngle = Math.atan2(dy, dx);
      const angleError = Math.abs(Phaser.Math.Angle.Wrap(playerAngle - targetAngle));
      if (!this.player.isDashing && distance <= range && angleError <= halfAngle) {
        this.showPlayerStatusNotice('dirty', '「弄脏了！」', '#d6a064', 1000);
        const dealt = this.player.takeDamage(2, this.time.now);
        if (dealt > 0) {
          this.combo = Math.floor(this.combo / 2);
          this.rearmComboStageSpinMilestones();
          this.showHpDamageText('twinPig', this.player.x, this.player.y - 54, dealt, {
            durationMs: 900,
            rise: 30,
            depth: 145
          });
        }
      }

      this.createPoopZone(endpointX, endpointY + 8, {
        radius: 76,
        lifetimeMs: 4400,
        alpha: 0.64
      });
    });
  }

  triggerPlagueCatSneakGas(source) {
    if (!source?.active || !this.player?.active) return;

    const originX = source.x;
    const originY = source.y - Math.max(14, source.displayHeight * 0.38);
    const angle = Phaser.Math.Angle.Between(originX, originY, this.player.x, this.player.y);
    const length = 255;
    const width = 62;
    const endpointX = originX + Math.cos(angle) * length;
    const endpointY = originY + Math.sin(angle) * length;

    this.showSkillImportantWorldText?.(
      source,
      '「☣️ 散播谣言！」',
      '#9edd72',
      17,
      { priority: 88, yOffset: 66, replaceLowerPriority: true }
    );

    for (let i = 0; i < 14; i += 1) {
      const spread = Phaser.Math.FloatBetween(-0.24, 0.24);
      const preAngle = angle + spread;
      const startOffset = Phaser.Math.FloatBetween(2, 18);
      const travel = Phaser.Math.FloatBetween(26, 72);
      const mote = this.add.circle(
        originX + Math.cos(preAngle) * startOffset,
        originY + Math.sin(preAngle) * startOffset,
        Phaser.Math.FloatBetween(2.2, 5.2),
        Phaser.Math.RND.pick([0x6f9f3f, 0x91c95b, 0xb0d86b, 0xc7e58b]),
        Phaser.Math.FloatBetween(0.28, 0.55)
      ).setDepth(12);
      this.tweens.add({
        targets: mote,
        x: originX + Math.cos(preAngle) * travel,
        y: originY + Math.sin(preAngle) * travel,
        alpha: 0,
        scaleX: Phaser.Math.FloatBetween(1.2, 1.8),
        scaleY: Phaser.Math.FloatBetween(1.2, 1.8),
        duration: Phaser.Math.Between(280, 430),
        ease: 'Sine.Out',
        onComplete: () => mote.destroy()
      });
    }

    this.time.delayedCall(420, () => {
      if (!source?.active || !this.player?.active) return;

      for (let i = 0; i < 36; i += 1) {
        const along = Phaser.Math.FloatBetween(0.12, 1.0);
        const side = Phaser.Math.FloatBetween(-width * 0.38, width * 0.38);
        const perpX = -Math.sin(angle) * side;
        const perpY = Math.cos(angle) * side;
        const startX = originX + Math.cos(angle) * length * Math.max(0, along - 0.18);
        const startY = originY + Math.sin(angle) * length * Math.max(0, along - 0.18);
        const fog = this.add.circle(
          startX,
          startY,
          Phaser.Math.FloatBetween(2.5, 8.5),
          Phaser.Math.RND.pick([0x5e8b36, 0x6f9f3f, 0x91c95b, 0xb0d86b, 0xc7e58b]),
          Phaser.Math.FloatBetween(0.20, 0.52)
        ).setDepth(12);
        this.tweens.add({
          targets: fog,
          x: originX + Math.cos(angle) * length * along + perpX,
          y: originY + Math.sin(angle) * length * along + perpY,
          alpha: 0,
          scaleX: Phaser.Math.FloatBetween(1.3, 2.0),
          scaleY: Phaser.Math.FloatBetween(1.3, 2.0),
          duration: Phaser.Math.Between(420, 620),
          ease: 'Sine.Out',
          onComplete: () => fog.destroy()
        });
      }

      const vx = endpointX - originX;
      const vy = endpointY - originY;
      const wx = this.player.x - originX;
      const wy = this.player.y - originY;
      const vv = vx * vx + vy * vy;
      const projection = Phaser.Math.Clamp((wx * vx + wy * vy) / Math.max(1, vv), 0, 1);
      const closestX = originX + vx * projection;
      const closestY = originY + vy * projection;
      const lineDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, closestX, closestY);

      if (!this.player.isDashing && lineDistance <= width * 0.5) {
        this.showPlayerStatusNotice('gas', '「熏到了！」', '#9edd72', 1000);
        const rolled = Phaser.Math.Between(1, 2);
        const dealt = this.player.takeDamage(rolled, this.time.now);
        if (dealt > 0) {
          this.combo = Math.floor(this.combo / 2);
          this.rearmComboStageSpinMilestones();
          this.showHpDamageText('plagueCat', this.player.x, this.player.y - 54, dealt, {
            durationMs: 900,
            rise: 30,
            depth: 145
          });
        }
      }

      this.createPlagueZone(endpointX, endpointY + 6, {
        radius: 78,
        lifetimeMs: 4600,
        alpha: 0.56,
        displayWidth: 92,
        displayHeight: 60
      });
    });
  }

  firePoopProjectile(source) {
    if (!source?.active || !this.player?.active) return;

    this.showWorldText(
      source.x,
      source.y - 34,
      '「💩 扔屎！」',
      '#c8945c',
      15,
      1350
    );

    const projectile = this.poopProjectiles.create(
      source.x,
      source.y,
      'poopProjectileArt'
    );
    projectile.createdAt = this.time.now;
    projectile.damage = STATUS_EFFECTS.poopProjectileDamage;
    projectile.sourceEnemyType = source.enemyType ?? 'default';
    projectile.setDepth(9);
    projectile.setDisplaySize(22, 22);
    const launchAngle = Phaser.Math.Angle.Between(
      projectile.x,
      projectile.y,
      this.player.x,
      this.player.y
    );
    projectile.setAngle(Phaser.Math.RadToDeg(launchAngle));
    projectile.setAngularVelocity(0);
    this.physics.moveToObject(
      projectile,
      this.player,
      STATUS_EFFECTS.poopProjectileSpeed
    );
  }

  onPoopHitsPlayer(player, projectile) {
    if (!projectile?.active) return;
    const damage = projectile.damage ?? STATUS_EFFECTS.poopProjectileDamage;
    const hitX = projectile.x;
    const hitY = projectile.y;
    projectile.destroy();
    this.playPoopHitVfx(hitX, hitY);
    this.createPoopZone(hitX, hitY, { radius: 82, lifetimeMs: 4600, alpha: 0.68 });

    if (player.isDashing) return;
    this.showPlayerStatusNotice('dirty', '「弄脏了！」', '#d6a064', 1000);
    const poopDamage = player.takeDamage(damage, this.time.now);
    if (poopDamage > 0) {
      this.combo = Math.floor(this.combo / 2);
      this.rearmComboStageSpinMilestones();
      this.showHpDamageText(
        projectile.sourceEnemyType ?? 'default',
        player.x,
        player.y - 54,
        poopDamage,
        { durationMs: 1050, rise: 36, depth: 120 }
      );
    }
  }

  cleanupPoopProjectiles(time) {
    this.poopProjectiles.children.iterate((projectile) => {
      if (projectile?.active && time - projectile.createdAt > STATUS_EFFECTS.poopProjectileLifetimeMs) {
        projectile.destroy();
      }
    });
  }

  trySpreadPlagueFrom(source) {
    if (!source?.active || !source.statusSystem?.has('plague')) return;
    const candidates = [];

    this.enemies.children.iterate((enemy) => {
      if (!enemy?.active || enemy === source || !enemy.canReceiveSupportStatus?.()) return;
      if (enemy.statusSystem?.has('plague')) return;
      const d = Phaser.Math.Distance.Between(source.x, source.y, enemy.x, enemy.y);
      if (d <= STATUS_EFFECTS.plagueSpreadRadius) candidates.push(enemy);
    });

    if (candidates.length === 0 || Math.random() > 0.62) return;
    const target = Phaser.Utils.Array.GetRandom(candidates);
    target.applyStatus('plague', {
      durationMs: STATUS_EFFECTS.plagueDurationMs,
      source
    });
    this.showWorldText(
      target.x,
      target.y - 28,
      '「☣️ 感染」',
      '#82db7a',
      14,
      1300
    );
  }

  createPlagueZone(x, y, options = {}) {
    const radius = options.radius ?? STATUS_EFFECTS.plagueZoneRadius;
    const lifetimeMs = options.lifetimeMs ?? STATUS_EFFECTS.plagueZoneDurationMs;
    const alpha = options.alpha ?? 0.72;
    const displayWidth = options.displayWidth ?? 112;
    const displayHeight = options.displayHeight ?? 74;
    const useArt = this.textures.exists('plagueGroundGasArt');
    const zoneDisplay = useArt
      ? this.add.image(x, y, 'plagueGroundGasArt')
        .setDepth(1)
        .setAlpha(alpha)
        .setDisplaySize(displayWidth, displayHeight)
      : this.add.circle(x, y, radius, 0x56b85e, 0.13)
        .setStrokeStyle(2, 0x83e18c, 0.36)
        .setDepth(1);

    this.plagueZones.push({
      display: zoneDisplay,
      x,
      y,
      radius,
      expiresAt: this.time.now + lifetimeMs,
      nextPulseAt: this.time.now,
      baseAlpha: useArt ? alpha : 0.13,
      useArt
    });
  }

  createPoopZone(x, y, options = {}) {
    const radius = options.radius ?? 90;
    const lifetimeMs = options.lifetimeMs ?? 5600;
    const alpha = options.alpha ?? 0.76;
    const useArt = this.textures.exists('poopGroundPuddleArt');
    const zoneDisplay = useArt
      ? this.add.image(x, y + 8, 'poopGroundPuddleArt')
        .setDepth(1)
        .setAlpha(alpha)
        .setDisplaySize(98, 64)
      : this.add.ellipse(x, y + 8, radius * 1.55, radius, 0x7d4a24, alpha).setDepth(1);

    this.poopZones.push({
      display: zoneDisplay,
      x,
      y,
      radius,
      createdAt: this.time.now,
      expiresAt: this.time.now + lifetimeMs,
      nextPulseAt: this.time.now,
      baseAlpha: alpha,
      useArt
    });
  }

  updatePlagueZones(time) {
    for (let i = this.plagueZones.length - 1; i >= 0; i -= 1) {
      const zone = this.plagueZones[i];
      if (time >= zone.expiresAt) {
        zone.display.destroy();
        this.plagueZones.splice(i, 1);
        continue;
      }

      const remainingMs = zone.expiresAt - time;
      const fade = Phaser.Math.Clamp(remainingMs / 850, 0, 1);
      zone.display.setAlpha((zone.baseAlpha ?? 0.4) * fade);

      if (time < zone.nextPulseAt) continue;
      zone.nextPulseAt = time + 950;

      this.enemies.children.iterate((enemy) => {
        if (!enemy?.active || !enemy.canReceiveSupportStatus?.()) return;
        const d = Phaser.Math.Distance.Between(zone.x, zone.y, enemy.x, enemy.y);
        if (d <= (zone.radius ?? STATUS_EFFECTS.plagueZoneRadius)) {
          enemy.applyStatus('plague', {
            durationMs: STATUS_EFFECTS.plagueDurationMs,
            source: zone
          });
        }
      });
    }
  }

  updatePoopZones(time) {
    for (let i = this.poopZones.length - 1; i >= 0; i -= 1) {
      const zone = this.poopZones[i];
      if (time >= zone.expiresAt) {
        zone.display.destroy();
        this.poopZones.splice(i, 1);
        continue;
      }

      const remainingMs = zone.expiresAt - time;
      const fade = Phaser.Math.Clamp(remainingMs / 850, 0, 1);
      zone.display.setAlpha((zone.baseAlpha ?? 0.75) * fade);

      if (time < zone.nextPulseAt) continue;
      zone.nextPulseAt = time + 1050;

      this.enemies.children.iterate((enemy) => {
        if (!enemy?.active || !enemy.canReceiveSupportStatus?.()) return;
        const d = Phaser.Math.Distance.Between(zone.x, zone.y, enemy.x, enemy.y);
        if (d <= zone.radius) {
          enemy.applyStatus('poop_buff', {
            durationMs: STATUS_EFFECTS.poopDurationMs,
            source: zone
          });
        }
      });
    }
  }

  spawnDashTrailBurst(source = this.player, direction = source?.lastMoveVector, { beatSynced = false, strong = false } = {}) {
    if (!source?.active) return;

    const dx = Number(direction?.x) || 0;
    const dy = Number(direction?.y) || 0;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const px = -ny;
    const py = nx;
    const angle = Math.atan2(ny, nx);
    const textureKey = this.textures.exists(source.texture?.key) ? source.texture.key : 'playerArt';
    const count = beatSynced ? 2 : 1;
    const tint = strong ? 0xf4fdff : (beatSynced ? 0xc9f4ff : 0x9edfff);

    for (let i = 0; i < count; i += 1) {
      const offset = 12 + i * 13;
      const after = this.add.image(
        source.x - nx * offset,
        source.y - ny * offset,
        textureKey
      )
        .setOrigin(source.originX ?? 0.5, source.originY ?? 0.5)
        .setDisplaySize(
          Math.abs(Number(source.displayWidth) || 60),
          Math.abs(Number(source.displayHeight) || 60)
        )
        .setFlip(source.flipX, source.flipY)
        .setAngle(source.angle ?? 0)
        .setAlpha((beatSynced ? 0.26 : 0.18) - i * 0.07)
        .setTint(tint)
        .setDepth((Number(source.depth) || 10) - 0.05 - i * 0.01);

      const startScaleX = after.scaleX;
      const startScaleY = after.scaleY;
      this.tweens.add({
        targets: after,
        x: after.x - nx * (beatSynced ? 8 : 5),
        y: after.y - ny * (beatSynced ? 8 : 5),
        alpha: 0,
        scaleX: startScaleX * 1.08,
        scaleY: startScaleY * 1.08,
        duration: beatSynced ? 205 : 175,
        ease: 'Quad.Out',
        onComplete: () => after.destroy()
      });
    }

    [-1, 1].forEach((side) => {
      const lateral = 5.5 * side;
      const streak = this.add.rectangle(
        source.x - nx * 7 + px * lateral,
        source.y - ny * 7 + py * lateral,
        beatSynced ? 34 : 24,
        strong ? 3 : 2,
        strong ? 0xffffff : 0xbfeeff,
        beatSynced ? 0.60 : 0.38
      )
        .setRotation(angle)
        .setDepth((Number(source.depth) || 10) - 0.08)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: streak,
        x: streak.x - nx * (beatSynced ? 20 : 13),
        y: streak.y - ny * (beatSynced ? 20 : 13),
        scaleX: 1.35,
        alpha: 0,
        duration: beatSynced ? 180 : 145,
        ease: 'Quad.Out',
        onComplete: () => streak.destroy()
      });
    });
  }

  spawnDashPerfectAccent(source = this.player) {
    if (!source?.active) return;

    const flash = this.add.image(source.x, source.y, source.texture?.key || 'playerArt')
      .setOrigin(source.originX ?? 0.5, source.originY ?? 0.5)
      .setDisplaySize(
        Math.abs(Number(source.displayWidth) || 60) * 1.03,
        Math.abs(Number(source.displayHeight) || 60) * 1.03
      )
      .setFlip(source.flipX, source.flipY)
      .setAngle(source.angle ?? 0)
      .setTintFill(0xe9fbff)
      .setAlpha(0.34)
      .setDepth((Number(source.depth) || 10) + 0.03)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: flash.scaleX * 1.10,
      scaleY: flash.scaleY * 1.10,
      duration: 125,
      ease: 'Quad.Out',
      onComplete: () => flash.destroy()
    });
  }

  spawnAfterImage(source = this.player) {
    if (!source?.active) return;

    const after = this.add.image(source.x, source.y, 'playerArt')
      .setOrigin(source.originX ?? 0.5, source.originY ?? 0.5)
      .setScale(Math.abs(source.scaleX), Math.abs(source.scaleY))
      .setFlip(source.flipX, source.flipY)
      .setRotation(source.rotation ?? 0)
      .setAlpha((source.alpha ?? 1) * 0.28)
      .setTint(0xa6dcff)
      .setDepth(3);

    const startScaleX = after.scaleX;
    const startScaleY = after.scaleY;
    this.tweens.add({
      targets: after,
      alpha: 0,
      scaleX: startScaleX * 1.16,
      scaleY: startScaleY * 1.16,
      duration: 240,
      onComplete: () => after.destroy()
    });
  }

  unregisterWorldTextLabel(label) {
    this.activeWorldTextLabels = this.activeWorldTextLabels
      .filter((item) => item?.active && item !== label);
  }

  placeWorldTextLabel(label, x, y) {
    this.activeWorldTextLabels = this.activeWorldTextLabels
      .filter((item) => item?.active);

    let targetY = y;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      label.setPosition(x, targetY);

      const collisionCandidates = [
        ...this.activeWorldTextLabels,
        ...(this.importantText?.getActiveLabels?.() ?? [])
      ];

      const collision = collisionCandidates.find((other) => {
        if (!other?.active) return false;

        const horizontalLimit =
          (label.displayWidth + other.displayWidth) / 2 + 12;
        const verticalLimit =
          (label.displayHeight + other.displayHeight) / 2 + 8;

        return (
          Math.abs(label.x - other.x) < horizontalLimit
          && Math.abs(label.y - other.y) < verticalLimit
        );
      });

      if (!collision) break;

      targetY = collision.y
        - (label.displayHeight + collision.displayHeight) / 2
        - 10;
    }

    label.setPosition(x, targetY);
    this.activeWorldTextLabels.push(label);
    return targetY;
  }

  showWorldText(
    x,
    y,
    text,
    color = '#ffffff',
    fontSize = 16,
    durationMs = 1500,
    options = {}
  ) {
    if (this.finished) return null;

    const label = this.add.text(x, y, text, {
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color,
      stroke: options.strokeColor ?? '#000000',
      strokeThickness: options.strokeThickness ?? 3
    }).setOrigin(0.5).setDepth(options.depth ?? 50);

    const startY = this.placeWorldTextLabel(label, x, y);

    this.tweens.add({
      targets: label,
      y: startY - 28,
      alpha: 0,
      duration: durationMs,
      ease: 'Quad.Out',
      onComplete: () => {
        this.unregisterWorldTextLabel(label);
        if (label.active) label.destroy();
      }
    });

    return label;
  }

  isBossSpecialSkillActive() {
    const now = this.time.now;
    const commander = this.potatoCommander;
    const queen = this.duckQueen;

    if (
      this.commanderJudgmentActive === true
      || this.commanderSkySmashActive === true
      || this.potatoPityActive === true
      || this.duckQueenGrappleActive === true
      || this.duckQueenUltimateActive === true
    ) return true;

    if (
      commander?.active
      && !commander.isDead
      && (
        commander.judgmentPending === true
        || now < (commander.actionLockedUntil ?? -Infinity)
        || commander.isGroupSkillArtActive?.() === true
      )
    ) return true;

    if (
      queen?.active
      && !queen.isDead
      && (
        now < (queen.fishRushUntil ?? -Infinity)
        || now < (queen.stickDashUntil ?? -Infinity)
      )
    ) return true;

    return false;
  }

  getSkillUpgradeMilestonesCrossed(fromLevel, toLevel, interval = 5) {
    const startLevel = Math.max(1, Math.trunc(Number(fromLevel) || 1));
    const endLevel = Math.max(startLevel, Math.trunc(Number(toLevel) || startLevel));
    const step = Math.max(1, Math.trunc(Number(interval) || 5));
    const milestones = [];
    const first = Math.max(step, Math.ceil((startLevel + 1) / step) * step);
    for (let level = first; level <= endLevel; level += step) milestones.push(level);
    return milestones;
  }

  getPlayerEvolutionMilestonesCrossed(fromLevel, toLevel) {
    const startLevel = Math.max(1, Math.trunc(Number(fromLevel) || 1));
    const endLevel = Math.max(startLevel, Math.trunc(Number(toLevel) || startLevel));
    return [20, 40].filter((level) => level > startLevel && level <= endLevel);
  }

  playPlayerAuraEvolutionMilestone(level) {
    if (!this.player?.active || ![20, 40].includes(level)) return;
    const isAwakened = level >= 40;
    const blueBursts = isAwakened ? 13 : 8;
    const redBursts = isAwakened ? 8 : 3;

    for (let i = 0; i < blueBursts; i += 1) {
      this.spawnPlayerAuraParticle('blue', isAwakened ? 1 : 0.72, i * 12);
    }
    for (let i = 0; i < redBursts; i += 1) {
      this.spawnPlayerAuraParticle('red', isAwakened ? 0.95 : 0.48, i * 15);
    }
    const blueArcs = isAwakened ? 5 : 3;
    const redArcs = isAwakened ? 3 : 1;
    for (let i = 0; i < blueArcs; i += 1) this.spawnPlayerAuraArc('blue', 1);
    for (let i = 0; i < redArcs; i += 1) this.spawnPlayerAuraArc('red', isAwakened ? 1 : 0.55);

    const label = level >= 40 ? '「觉醒阶段」' : '「能量进阶」';
    this.showWorldText?.(this.player.x, this.player.y - 74, label, '#dff8ff', level >= 40 ? 23 : 20, 900);
  }

  tryPresentPendingUpgradeChoice() {
    if (
      this.pendingUpgradeChoices <= 0
      || this.isChoosingUpgrade
      || this.finished
      || this.endingSequenceActive
      || this.time.now < (this.upgradeBlockedUntil ?? -Infinity)
      || this.isBossSpecialSkillActive()
    ) return false;

    this.pendingUpgradeChoices -= 1;
    const milestoneLevel = this.pendingUpgradeMilestoneLevels?.shift?.() ?? this.level;
    this.activeUpgradeMilestoneLevel = milestoneLevel;
    this.showUpgradeChoice(milestoneLevel);
    return this.isChoosingUpgrade;
  }

  getCommanderJudgmentGlobalDropPoint(view, stageIndex = 0) {
    const cols = 4;
    const rows = 3;
    const totalCells = cols * rows;

    if (!Array.isArray(this.judgmentRainCellOrder) || this.judgmentRainCellOrder.length !== totalCells) {
      this.judgmentRainCellOrder = Phaser.Utils.Array.Shuffle(
        Array.from({ length: totalCells }, (_, index) => index)
      );
      this.judgmentRainCellCursor = 0;
    }

    if (this.judgmentRainCellCursor >= totalCells) {
      this.judgmentRainCellOrder = Phaser.Utils.Array.Shuffle(this.judgmentRainCellOrder.slice());
      this.judgmentRainCellCursor = 0;
    }

    const cell = this.judgmentRainCellOrder[this.judgmentRainCellCursor++];
    const col = cell % cols;
    const row = Math.floor(cell / cols);
    const marginX = 34;
    const marginTop = 116 + (this.mobileHudSafeTop ?? 0);
    const marginBottom = 42;
    const usableW = Math.max(80, view.width - marginX * 2);
    const usableH = Math.max(100, view.height - marginTop - marginBottom);
    const cellW = usableW / cols;
    const cellH = usableH / rows;
    const jitterScale = [0.72, 0.82, 0.94][stageIndex] ?? 0.82;

    const left = view.x + marginX + col * cellW;
    const top = view.y + marginTop + row * cellH;
    const centerX = left + cellW * 0.5;
    const centerY = top + cellH * 0.5;

    return {
      x: Phaser.Math.Clamp(
        centerX + Phaser.Math.FloatBetween(-cellW * 0.34, cellW * 0.34) * jitterScale,
        view.x + marginX,
        view.right - marginX
      ),
      y: Phaser.Math.Clamp(
        centerY + Phaser.Math.FloatBetween(-cellH * 0.34, cellH * 0.34) * jitterScale,
        view.y + marginTop,
        view.bottom - marginBottom
      )
    };
  }

  findNearestXpGem(x, y, radius = 235) {
    let nearest = null;
    let nearestDistance = Infinity;
    this.xpGems.children.iterate((gem) => {
      if (!gem?.active || gem.beingStolen === true) return;
      const d = Phaser.Math.Distance.Between(x, y, gem.x, gem.y);
      if (d < nearestDistance && d <= radius) {
        nearest = gem;
        nearestDistance = d;
      }
    });
    return nearest;
  }

  stealXpGem(cat, gem) {
    if (!cat?.active || !gem?.active || gem.beingStolen === true) return false;

    gem.beingStolen = true;
    if (gem.body) gem.body.enable = false;
    this.showWorldText(cat.x, cat.y - 38, '「偷流量」', '#a6ff8f', 15, 950);

    this.tweens.add({
      targets: gem,
      x: cat.x + (cat.flipX ? -10 : 10),
      y: cat.y - 18,
      alpha: 0,
      scaleX: 0.45,
      scaleY: 0.45,
      duration: 220,
      ease: 'Quad.In',
      onComplete: () => {
        if (gem?.active) gem.destroy();
        if (cat?.active && !cat.isDead) {
          const heal = Math.min(cat.maxHp - cat.hp, 4);
          cat.hp += heal;
        }
      }
    });
    return true;
  }

  updateXpMagnet() {
    this.xpGems.children.iterate((gem) => {
      if (!gem?.active || gem.beingStolen === true) return;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, gem.x, gem.y);
      if (distance < 135) this.physics.moveToObject(gem, this.player, 270);
    });
  }

  onCollectXp(player, gem) {
    if (!gem.active) return;

    const gain = gem.xpValue ?? 1;
    this.xp += gain;
    gem.destroy();

    this.showXpPickupFeedback(gain);

    const levelBeforeGain = this.level;
    let gainedLevels = 0;
    while (this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded;
      this.level += 1;
      this.xpNeeded = this.getXpNeeded();
      gainedLevels += 1;
    }

    if (gainedLevels > 0) {
      this.player.maxHp += PLAYER.LEVEL_MAX_HP_GAIN * gainedLevels;

      const levelHealTarget = Math.max(1, Math.round(this.player.maxHp * 0.10 * gainedLevels));
      const hpBeforeLevelHeal = this.player.hp;
      this.player.heal(levelHealTarget);
      const actualLevelHeal = Math.max(0, this.player.hp - hpBeforeLevelHeal);
      if (actualLevelHeal > 0) {
        this.showWorldText(
          this.player.x,
          this.player.y - 76,
          `升级 HP+${actualLevelHeal}`,
          '#94d5f3',
          18,
          980,
          { strokeColor: '#59d97a', strokeThickness: 4 }
        );
      }

      const skillMilestones = this.getSkillUpgradeMilestonesCrossed(levelBeforeGain, this.level, 5);
      if (skillMilestones.length > 0) {
        this.pendingUpgradeChoices += skillMilestones.length;
        this.pendingUpgradeMilestoneLevels.push(...skillMilestones);
      }

      this.updatePlayerOutlineVisual();
      this.updatePlayerGrowthAura(this.time.now, { allowSpawn: false });
      this.playPlayerLevelUpAuraPulse(gainedLevels);

      if (levelBeforeGain < 20 && this.level >= 20) {
        this.playAttackCrescentMilestonePreview(2);
        this.showScreenNotice('「月牙强化：双月」', '#94d5f3', 1900);
      }
      if (levelBeforeGain < 40 && this.level >= 40) {
        this.time.delayedCall(levelBeforeGain < 20 ? 520 : 0, () => {
          if (this.finished) return;
          this.playAttackCrescentMilestonePreview(3);
          this.showScreenNotice('「月牙强化：三月齐发」', '#94d5f3', 2100);
        });
      }

      this.getPlayerEvolutionMilestonesCrossed(levelBeforeGain, this.level)
        .forEach((milestone) => this.playPlayerAuraEvolutionMilestone(milestone));

      if (skillMilestones.length > 0) this.tryPresentPendingUpgradeChoice();
    }
  }

  showXpPickupFeedback(gain) {
    const now = this.time.now;

    if (now - this.lastXpPickupAt <= 250) {
      this.xpFeedbackBurst += gain;
    } else {
      this.xpFeedbackBurst = gain;
    }

    this.lastXpPickupAt = now;

    if (this.xpFeedbackText?.active) {
      this.tweens.killTweensOf(this.xpFeedbackText);
      this.unregisterWorldTextLabel(this.xpFeedbackText);
      this.xpFeedbackText.destroy();
      this.xpFeedbackText = null;
    }

    const label = this.add.text(
      this.player.x,
      this.player.y - 58,
      `EXP +${this.xpFeedbackBurst}`,
      {
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#94d5f3',
        stroke: '#17384a',
        strokeThickness: 3
      }
    )
      .setOrigin(0.5)
      .setDepth(36);

    const startY = this.placeWorldTextLabel(
      label,
      this.player.x,
      this.player.y - 58
    );

    this.xpFeedbackText = label;

    this.tweens.add({
      targets: label,
      y: startY - 14,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.Out',
      onComplete: () => {
        this.unregisterWorldTextLabel(label);
        if (label.active) label.destroy();
        if (this.xpFeedbackText === label) {
          this.xpFeedbackText = null;
        }
      }
    });
  }

  getXpNeeded() {
    let base = 5 + (this.level - 1) * 4;
    if (this.level === 1) base = 4;
    else if (this.level === 2) base = 7;
    else if (this.level === 3) base = 10;

    return Math.max(
      1,
      Math.round(base * (Number(this.difficultyProfile?.xpNeedMultiplier) || 1))
    );
  }

  getUpgradePool() {
    const pool = [];
    const add = (name, currentLevel, maxLevel, description, apply) => {
      if (currentLevel >= maxLevel) return;
      const nextLevel = currentLevel + 1;
      const isMax = nextLevel >= maxLevel;
      const levelLabel = isMax ? 'MAX' : UPGRADE_ROMAN[nextLevel];
      pool.push({
        title: `「${name} ${levelLabel}」`,
        description,
        isMax,
        apply
      });
    };

    add(
      '聚光更亮',
      Math.max(1, this.player.crescentLevel || 1),
      4,
      '自动月牙伤害 +30%，月牙视觉等级提升',
      () => {
        this.player.attackDamage = Math.round(this.player.attackDamage * 1.30);
        this.player.crescentLevel = Math.min(4, Math.max(1, this.player.crescentLevel || 1) + 1);
      }
    );

    add(
      '节奏加快',
      this.player.fireRateLevel || 0,
      3,
      '自动攻击间隔 -12%',
      () => {
        this.player.fireRateLevel = Math.min(3, (this.player.fireRateLevel || 0) + 1);
        this.player.fireInterval = Math.max(150, Math.round(this.player.fireInterval * 0.88));
      }
    );

    add(
      '舞步更稳',
      this.player.moveSpeedLevel || 0,
      3,
      '移动速度 +8%',
      () => {
        this.player.moveSpeedLevel = Math.min(3, (this.player.moveSpeedLevel || 0) + 1);
        this.player.moveSpeed = Math.round(this.player.moveSpeed * 1.08);
      }
    );

    add(
      '屏蔽杂音',
      this.player.noiseShieldLevel || 0,
      3,
      '受到的高伤害结果概率 -5%',
      () => {
        this.player.noiseShieldLevel = Math.min(3, (this.player.noiseShieldLevel || 0) + 1);
        this.player.damageReduction = Math.min(0.15, this.player.damageReduction + 0.05);
      }
    );

    add(
      '卡点训练',
      this.player.dashTrainingLevel || 0,
      4,
      '闪身冷却减少 1 拍',
      () => {
        this.player.dashTrainingLevel = Math.min(4, (this.player.dashTrainingLevel || 0) + 1);
        this.player.dashCooldown = Math.max(1000, PLAYER.DASH_COOLDOWN_MS - this.player.dashTrainingLevel * 500);
      }
    );

    add(
      '声浪',
      this.player.soundWaveLevel || 0,
      4,
      (this.player.soundWaveLevel || 0) <= 0
        ? '解锁低频主题蓝声浪：只麻痹，不伤害、不击退'
        : '范围扩大，冷却降低，麻痹时间小幅延长，并增加金色粒子',
      () => {
        const next = Math.min(4, (this.player.soundWaveLevel || 0) + 1);
        this.player.soundWaveUnlocked = true;
        this.player.soundWaveLevel = next;
        this.player.soundWaveDamage = 0;
        this.player.soundWaveKnockback = 0;
        this.player.soundWaveRadius = PLAYER.SOUND_WAVE_RADIUS_BY_LEVEL?.[next - 1] ?? PLAYER.SOUND_WAVE_RADIUS;
        this.player.soundWaveInterval = PLAYER.SOUND_WAVE_INTERVAL_MS_BY_LEVEL?.[next - 1] ?? PLAYER.SOUND_WAVE_INTERVAL_MS;
        if (next === 1) this.player.nextSoundWaveAt = this.time.now + 800;
      }
    );

    add(
      '电力四射',
      this.player.electricLevel || 0,
      4,
      (this.player.electricLevel || 0) <= 0
        ? '解锁低频强力 AOE：先电击麻痹，再爆发冲击波'
        : '电击/冲击伤害 +20%，范围 +8%，冷却 -8%',
      () => {
        if (!this.player.electricUnlocked) {
          this.player.electricUnlocked = true;
          this.player.electricLevel = 1;
          this.player.nextElectricAt = this.time.now + 1100;
        } else {
          this.player.electricLevel = Math.min(4, this.player.electricLevel + 1);
          this.player.electricBurstDamage = Math.round(this.player.electricBurstDamage * 1.20);
          this.player.electricShockDamage = Math.round(this.player.electricShockDamage * 1.20);
          this.player.electricBurstRadius = Math.round(this.player.electricBurstRadius * 1.08);
          this.player.electricShockRadius = Math.round(this.player.electricShockRadius * 1.08);
          this.player.electricStunMs = Math.min(1000, this.player.electricStunMs + 70);
          this.player.electricShockKnockback = Math.round(this.player.electricShockKnockback * 1.08);
          this.player.electricInterval = Math.max(7600, Math.round(this.player.electricInterval * 0.92));
        }
      }
    );

    add(
      '红气养人',
      this.player.lifestealLevel || 0,
      3,
      ['月牙命中回血 5%', '月牙命中回血 10%', '月牙命中回血 15%'][this.player.lifestealLevel || 0],
      () => {
        this.player.lifestealLevel = Math.min(3, (this.player.lifestealLevel || 0) + 1);
      }
    );

    return pool;
  }

  wrapUpgradeCardText(text, maxUnits = 13.5) {
    return wrapUpgradeCardTextSemantic(text, maxUnits);
  }

  showUpgradeChoice(milestoneLevel = this.level) {
    if (this.isChoosingUpgrade || this.finished) return;

    const availableUpgradePool = this.getUpgradePool();
    if (availableUpgradePool.length <= 0) {
      this.activeUpgradeMilestoneLevel = null;
      this.time.delayedCall(0, () => this.tryPresentPendingUpgradeChoice());
      return;
    }

    this.isChoosingUpgrade = true;

    this.upgradePreviousPhysicsTimeScale = this.physics.world.timeScale ?? 1;
    this.upgradePreviousClockTimeScale = this.time.timeScale ?? 1;
    this.physics.world.timeScale = 4;
    this.time.timeScale = 0.25;
    if (this.player?.active) {
      this.player.upgradeInvincible = true;
      this.player.setVelocity(0, 0);
    }

    const isTouchLayout =
      this.isTouchHudLayout
      || this.prefersTouchEscape
      || this.sys.game.device.input.touch;

    if (isTouchLayout && Array.isArray(this.mobileControls)) {
      this.mobileControls.forEach((item) => item?.setVisible(false));
    }

    const pool = Phaser.Utils.Array.Shuffle(availableUpgradePool.slice());
    const choices = pool.slice(0, 3);

    const cardWidth = isTouchLayout ? 228 : 244;
    const cardHeight = isTouchLayout ? 238 : 216;
    const cardGap = isTouchLayout ? 16 : 20;
    const cardY = isTouchLayout ? 318 : 320;
    const titleY = isTouchLayout ? 112 : 116;
    const titleFont = isTouchLayout ? '18px' : '24px';
    const nameFont = isTouchLayout ? '18px' : '21px';
    const descFont = isTouchLayout ? '12px' : '15px';
    const wrapUnits = isTouchLayout ? 10.5 : 12.8;
    const wrapWidth = cardWidth - (isTouchLayout ? 30 : 34);
    const totalCardsWidth = cardWidth * choices.length + cardGap * (choices.length - 1);
    const firstCardX = GAME.WIDTH / 2 - totalCardsWidth / 2 + cardWidth / 2;

    const overlay = this.add.rectangle(
      GAME.WIDTH / 2,
      GAME.HEIGHT / 2,
      GAME.WIDTH,
      GAME.HEIGHT,
      0x000000,
      0.42
    ).setScrollFactor(0).setDepth(200).setAlpha(0);

    const title = this.add.text(
      GAME.WIDTH / 2,
      titleY - 10,
      `「LEVEL ${milestoneLevel} · 技能选择」`,
      {
        fontSize: titleFont,
        fontStyle: 'bold',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 150,
      ease: 'Sine.Out'
    });
    this.tweens.add({
      targets: title,
      y: titleY,
      alpha: 1,
      duration: 170,
      ease: 'Cubic.Out'
    });

    const ui = [overlay, title];
    const handlers = [];

    choices.forEach((choice, index) => {
      const x = firstCardX + index * (cardWidth + cardGap);
      const cardTop = cardY - cardHeight / 2;

      const card = this.add.rectangle(x, cardY + 8, cardWidth, cardHeight, 0x172334, 0.98)
        .setStrokeStyle(2, 0x94d5f3, 0.62).setScrollFactor(0).setDepth(201)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0)
        .setScale(0.94);

      const badgeX = x - cardWidth / 2 + 24;
      const badgeY = cardTop + 22;
      const keyBadge = this.add.circle(badgeX, badgeY, isTouchLayout ? 13 : 14, 0x94d5f3, 0.16)
        .setStrokeStyle(1.5, 0x94d5f3, 0.72).setScrollFactor(0).setDepth(202);
      const keyText = this.add.text(badgeX, badgeY, `${index + 1}`, {
        fontSize: isTouchLayout ? '14px' : '15px',
        fontStyle: 'bold',
        color: '#dff6ff'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(203);

      const titleText = String(choice.title ?? '');
      const titleSafeWidth = cardWidth - (isTouchLayout ? 30 : 34);
      const baseNameFontPx = isTouchLayout ? 18 : 21;
      const minNameFontPx = isTouchLayout ? 14 : 17;
      const name = this.add.text(x, cardTop + (isTouchLayout ? 54 : 50), titleText, {
        fontSize: `${baseNameFontPx}px`,
        fontStyle: 'bold',
        color: choice.isMax ? THEME_BLUE_HEX : '#ffffff',
        align: 'center'
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(202);
      name.setPadding(4, 5, 4, 4);

      let fittedTitleSize = baseNameFontPx;
      while (name.width > titleSafeWidth && fittedTitleSize > minNameFontPx) {
        fittedTitleSize -= 1;
        name.setFontSize(fittedTitleSize);
      }

      const plainDescription = String(choice.description ?? '')
        .replace(/^「/, '')
        .replace(/」$/, '');
      const wrappedDesc = this.wrapUpgradeCardText(plainDescription, wrapUnits);
      const descTop = cardTop + (isTouchLayout ? 108 : 98);
      const descBottomSafe = cardTop + cardHeight - (isTouchLayout ? 20 : 18);
      const descMaxHeight = Math.max(72, descBottomSafe - descTop);
      const baseDescFontPx = isTouchLayout ? 12 : 15;
      const minDescFontPx = isTouchLayout ? 10 : 12;

      const desc = this.add.text(x, descTop, wrappedDesc, {
        fontSize: `${baseDescFontPx}px`,
        color: '#cbd9e7',
        align: 'center'
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(202);

      desc.setPadding(7, 6, 7, 9);
      desc.setLineSpacing(isTouchLayout ? 8 : 7);

      let fittedDescSize = baseDescFontPx;
      while ((desc.height > descMaxHeight || desc.width > wrapWidth) && fittedDescSize > minDescFontPx) {
        fittedDescSize -= 1;
        desc.setFontSize(fittedDescSize);
      }

      [keyBadge, keyText, name, desc].forEach((item) => item.setAlpha(0));
      ui.push(card, keyBadge, keyText, name, desc);

      this.tweens.add({
        targets: card,
        y: cardY,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 180,
        delay: index * 35,
        ease: 'Back.Out'
      });
      this.tweens.add({
        targets: [keyBadge, keyText, name, desc],
        alpha: 1,
        duration: 150,
        delay: 50 + index * 35,
        ease: 'Sine.Out'
      });

      const select = () => {
        if (!this.isChoosingUpgrade) return;
        choice.apply();
        handlers.forEach(({ key, fn }) => this.input.keyboard.off(`keydown-${key}`, fn));

        this.tweens.add({
          targets: ui,
          alpha: 0,
          duration: 130,
          ease: 'Sine.In',
          onComplete: () => {
            ui.forEach((item) => item?.destroy());
            this.physics.world.timeScale = this.upgradePreviousPhysicsTimeScale ?? 1;
            this.time.timeScale = this.upgradePreviousClockTimeScale ?? 1;
            this.upgradePreviousPhysicsTimeScale = null;
            this.upgradePreviousClockTimeScale = null;
            if (this.player?.active) this.player.upgradeInvincible = false;
            this.isChoosingUpgrade = false;
            this.activeUpgradeMilestoneLevel = null;

            if (isTouchLayout && Array.isArray(this.mobileControls)) {
              this.mobileControls.forEach((item) => item?.setVisible(true));
            }

            this.time.delayedCall(90, () => this.tryPresentPendingUpgradeChoice());
          }
        });
      };

      card.on('pointerover', () => {
        card.setFillStyle(0x213650, 1);
        card.setStrokeStyle(3, 0x94d5f3, 0.95);
      });
      card.on('pointerout', () => {
        card.setFillStyle(0x172334, 0.98);
        card.setStrokeStyle(2, 0x94d5f3, 0.62);
      });
      card.on('pointerdown', select);

      const key = ['ONE', 'TWO', 'THREE'][index];
      const fn = () => select();
      handlers.push({ key, fn });
      this.input.keyboard.once(`keydown-${key}`, fn);
    });
  }

  cleanupBullets(time) {
    this.bullets.children.iterate((bullet) => {
      if (!bullet?.active) return;

      if (bullet.lifestealLevel > 0 && time >= (bullet.nextLifestealParticleAt ?? 0)) {
        bullet.nextLifestealParticleAt = time + (bullet.lifestealLevel >= 3 ? 34 : bullet.lifestealLevel === 2 ? 46 : 62);
        this.spawnCrescentLifestealTrail(bullet, time);
      }

      if (time >= (bullet.nextTrailAt ?? 0)) {
        bullet.nextTrailAt = time + 48;
        const trail = this.add.image(
          bullet.x,
          bullet.y,
          'crescentTrail'
        )
          .setRotation(bullet.rotation)
          .setDepth(7)
          .setScale(bullet.charged ? 1.22 : 1)
          .setAlpha(bullet.charged ? 0.50 : 0.32);

        this.tweens.add({
          targets: trail,
          alpha: 0,
          scaleX: bullet.charged ? 0.48 : 0.35,
          scaleY: bullet.charged ? 0.48 : 0.35,
          duration: bullet.charged ? 145 : 115,
          onComplete: () => trail.destroy()
        });
      }

      if (time - bullet.createdAt > PLAYER.BULLET_LIFETIME_MS) {
        bullet.destroy();
      }
    });
  }

  getResponsiveVisibleRect() {
    return {
      x: 0,
      y: 0,
      width: GAME.WIDTH,
      height: GAME.HEIGHT,
      right: GAME.WIDTH,
      bottom: GAME.HEIGHT,
      centerX: GAME.WIDTH * 0.5,
      centerY: GAME.HEIGHT * 0.5
    };
  }

  repositionMobileActionButton(key, x, y) {
    const btn = this.mobileButtonState?.[key];
    if (!btn?.shape?.active) return;

    const { width, height, cut, primary } = btn;
    const localPoints = [
      { x: cut, y: 0 },
      { x: width - cut, y: 0 },
      { x: width, y: cut },
      { x: width, y: height - cut },
      { x: width - cut, y: height },
      { x: cut, y: height },
      { x: 0, y: height - cut },
      { x: 0, y: cut }
    ];

    btn.shape.setPosition(x, y);
    btn.shadow?.setPosition(x + 3, y + 4);
    btn.keyText?.setPosition(x - width * 0.5 + 18, y - height * 0.5 + 15);
    btn.labelText?.setPosition(x + (primary ? 4 : 5), y + 3);
    btn.hitPolygon = new Phaser.Geom.Polygon(
      localPoints.map((point) => ({
        x: x - width * 0.5 + point.x,
        y: y - height * 0.5 + point.y
      }))
    );
  }

  applyResponsiveLayout() {
    const view = this.getResponsiveVisibleRect();
    this.responsiveVisibleRect = view;

    const touchInset = this.prefersTouchEscape ? 18 : 0;
    const safeTop = Math.max(0, Math.round(view.y + touchInset));
    this.mobileHudSafeTop = safeTop;

    const leftX = view.x + 14 + (this.prefersTouchEscape ? 4 : 0);
    const rightX = view.right - 14 - (this.prefersTouchEscape ? 4 : 0);

    const playerHpWidth = this.playerHpBarWidth ?? 170;
    const bossReservedLeft = view.centerX - 190;
    const hpValueReserve = this.isTouchHudLayout ? 72 : 80;
    const playerHpWouldOverlapBoss = (leftX + playerHpWidth + 8 + hpValueReserve) > (bossReservedLeft - 8);
    const playerHpY = (playerHpWouldOverlapBoss ? 72 : 27) + safeTop;
    const leftSecondRowY = (playerHpWouldOverlapBoss ? 96 : 46) + safeTop;
    const leftThirdRowY = (playerHpWouldOverlapBoss ? 128 : 78) + safeTop;

    [
      this.playerHpBarBg,
      this.playerHpBarRedFill,
      this.playerHpBarYellowFill,
      this.playerHpBarGreenFill,
      this.playerHpBarSkyBlueFill
    ].forEach((bar) => bar?.setPosition(leftX, playerHpY));
    this.hpText?.setPosition(leftX + playerHpWidth + 8, playerHpY);
    this.levelText?.setPosition(leftX, leftSecondRowY);
    this.killText?.setPosition(leftX, leftThirdRowY);
    this.comboText?.setPosition(leftX, leftThirdRowY);

    this.timeText?.setPosition(rightX, 14 + safeTop);
    this.dashText?.setPosition(rightX, 46 + safeTop);
    this.spinText?.setPosition(rightX, 78 + safeTop);
    this.keyText?.setPosition(rightX, 110 + safeTop);
    this.supportText?.setPosition(rightX, 142 + safeTop);
    this.electricText?.setPosition(rightX, 174 + safeTop);

    if (this.bossBarBg?.active) {
      const bossX = view.centerX - 190;
      const bossY = 38 + safeTop;
      this.bossBarBg.setPosition(bossX, bossY);
      this.bossBarRedFill?.setPosition(bossX, bossY);
      this.bossBarYellowFill?.setPosition(bossX, bossY);
      this.bossBarGreenFill?.setPosition(bossX, bossY);
      this.bossBarSkyBlueFill?.setPosition(bossX, bossY);
      this.bossBarText?.setPosition(view.centerX, 17 + safeTop);
    }

    if (this.judgmentHudTitle?.active) {
      this.judgmentHudTitle.setY(17 + safeTop);
    }
    (this.judgmentHudCrosses ?? []).forEach((cross) => {
      if (cross?.active && Number.isFinite(cross.judgmentBaseYOffset)) {
        cross.setY(cross.judgmentBaseYOffset + safeTop);
      }
    });

    if (this.bossSkillHudText?.active) {
      const bossSkillY = safeTop + (
        this.bossSkillHudSourceType === 'potatoCommander' ? 158 : 66
      );
      this.bossSkillHudText.setPosition(view.centerX, bossSkillY);
    }

    if (this.tutorialHintText?.active) {
      this.tutorialHintText.setPosition(
        view.centerX,
        view.y + (this.prefersTouchEscape ? 104 : 94)
      );
    }

    if (this.prefersTouchEscape && this.mobileJoystickBase?.active) {
      const baseX = view.x + 112;
      const baseY = view.bottom - 105;
      this.mobileJoystickBase.setPosition(baseX, baseY);
      if (this.mobileMovePointerId === null) {
        this.mobileJoystickThumb?.setPosition(baseX, baseY);
      } else if (this.mobileJoystickThumb?.active) {
        this.mobileJoystickThumb.setPosition(
          baseX + this.mobileMoveVector.x * 56,
          baseY + this.mobileMoveVector.y * 56
        );
      }

      this.repositionMobileActionButton('B', view.right - 116, view.bottom - 214);
      this.repositionMobileActionButton('X', view.right - 54, view.bottom - 136);
      this.repositionMobileActionButton('A', view.right - 122, view.bottom - 58);
      this.repositionMobileActionButton('Y', view.right - 200, view.bottom - 136);
    }

    this.layoutScreenNotices?.();
  }

  createHud() {
    const isTouchDevice = Boolean(
      this.sys.game.device.input.touch
      || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
      || (
        typeof window !== 'undefined'
        && window.matchMedia
        && window.matchMedia('(pointer: coarse)').matches
      )
    );

    this.mobileHudSafeTop = isTouchDevice ? 24 : 0;
    this.isTouchHudLayout = isTouchDevice;

    const style = {
      fontSize: isTouchDevice ? '16px' : '18px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: isTouchDevice ? { x: 6, y: 4 } : { x: 8, y: 5 }
    };

    const compactStyle = {
      ...style,
      fontSize: isTouchDevice ? '13px' : '16px',
      padding: isTouchDevice ? { x: 5, y: 3 } : { x: 6, y: 4 }
    };

    const leftX = 14;
    const rightX = GAME.WIDTH - 14;

    const hpBarY = 27 + this.mobileHudSafeTop;
    const hpBarWidth = this.playerHpBarWidth;
    const hpBarHeight = this.playerHpBarHeight;

    this.playerHpBarBg = this.add.rectangle(
      leftX, hpBarY, hpBarWidth, hpBarHeight + 4, 0x10151c, 0.92
    )
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xffffff, 0.28)
      .setScrollFactor(0)
      .setDepth(100);

    this.playerHpBarRedFill = this.add.rectangle(
      leftX, hpBarY, hpBarWidth, hpBarHeight, 0xd8424a, 0.98
    ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    this.playerHpBarYellowFill = this.add.rectangle(
      leftX, hpBarY, hpBarWidth, hpBarHeight, 0xf2d24f, 0.99
    ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(102);

    this.playerHpBarGreenFill = this.add.rectangle(
      leftX, hpBarY, hpBarWidth, hpBarHeight, 0x5fc96b, 0.99
    ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(103);

    this.playerHpBarSkyBlueFill = this.add.rectangle(
      leftX, hpBarY, hpBarWidth, hpBarHeight, 0x94d5f3, 0.99
    ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(104);

    this.hpText = this.add.text(leftX + hpBarWidth + 8, hpBarY, '', {
      fontSize: isTouchDevice ? '13px' : '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(105);

    this.levelText = this.add.text(leftX, 46 + this.mobileHudSafeTop, '', style).setScrollFactor(0).setDepth(100);
    this.killText = this.add.text(leftX, 78 + this.mobileHudSafeTop, '', compactStyle).setScrollFactor(0).setDepth(100).setVisible(false);
    this.comboText = this.add.text(leftX, 78 + this.mobileHudSafeTop, '', compactStyle).setScrollFactor(0).setDepth(100);

    this.timeText = this.add.text(rightX, 14 + this.mobileHudSafeTop, '', style).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.dashText = this.add.text(rightX, 46 + this.mobileHudSafeTop, '', compactStyle).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.spinText = this.add.text(rightX, 78 + this.mobileHudSafeTop, '', compactStyle).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.keyText = this.add.text(rightX, 110 + this.mobileHudSafeTop, '', compactStyle).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.supportText = this.add.text(rightX, 142 + this.mobileHudSafeTop, '', compactStyle).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.electricText = this.add.text(rightX, 174 + this.mobileHudSafeTop, '', compactStyle)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    const regularHudTexts = [this.levelText, this.timeText];
    const compactHudTexts = [
      this.killText,
      this.comboText,
      this.dashText,
      this.spinText,
      this.keyText,
      this.supportText,
      this.electricText
    ];
    const regularPadding = isTouchDevice ? [6, 2, 6, 6] : [8, 3, 8, 7];
    const compactPadding = isTouchDevice ? [5, 1, 5, 5] : [6, 2, 6, 6];
    regularHudTexts.forEach((text) => text?.setPadding(...regularPadding));
    compactHudTexts.forEach((text) => text?.setPadding(...compactPadding));
  }

  updatePlayerHpBar() {
    if (!this.player?.active || !this.hpText) return;

    const maxHp = Math.max(1, Math.round(Number(this.player.maxHp) || 1));
    const hp = Phaser.Math.Clamp(Number(this.player.hp) || 0, 0, maxHp);

    const redCapacity = Math.min(100, maxHp);
    const yellowCapacity = Math.max(0, Math.min(100, maxHp - 100));
    const greenCapacity = Math.max(0, Math.min(100, maxHp - 200));
    const skyBlueCapacity = Math.max(0, maxHp - 300);

    const redRatio = redCapacity > 0
      ? Phaser.Math.Clamp(Math.min(hp, 100) / redCapacity, 0, 1)
      : 0;
    const yellowRatio = yellowCapacity > 0
      ? Phaser.Math.Clamp((hp - 100) / yellowCapacity, 0, 1)
      : 0;
    const greenRatio = greenCapacity > 0
      ? Phaser.Math.Clamp((hp - 200) / greenCapacity, 0, 1)
      : 0;
    const skyBlueRatio = skyBlueCapacity > 0
      ? Phaser.Math.Clamp((hp - 300) / skyBlueCapacity, 0, 1)
      : 0;

    this.playerHpBarRedFill?.setVisible(redCapacity > 0).setScale(redRatio, 1);
    this.playerHpBarYellowFill?.setVisible(yellowCapacity > 0).setScale(yellowRatio, 1);
    this.playerHpBarGreenFill?.setVisible(greenCapacity > 0).setScale(greenRatio, 1);
    this.playerHpBarSkyBlueFill?.setVisible(skyBlueCapacity > 0).setScale(skyBlueRatio, 1);

    this.hpText.setText(`${Math.ceil(hp)} / ${maxHp}`);
  }

  updateMobileHudSafeArea() {
    this.applyResponsiveLayout();
  }

  updateHud(elapsedSeconds, time) {
    const seconds = Math.max(0, Math.floor(elapsedSeconds));
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    const dashReadyIn = Math.max(0, this.player.nextDashAt - time);
    const dashLabel = this.isTouchHudLayout ? 'B' : 'Space';

    this.updatePlayerHpBar();
    this.levelText.setText(`Lv.${this.level}   XP ${this.xp} / ${this.xpNeeded}`);
    this.killText.setText('').setVisible(false);
    this.comboText.setText(`「舞步 Combo x${this.combo}」`);
    this.dashText.setText(dashReadyIn <= 0 ? `「${dashLabel}：闪身 READY」` : `「闪身 ${(dashReadyIn / 1000).toFixed(1)}s」`);

    if (this.player.electricUnlocked) {
      const electricReadyIn = Math.max(0, this.player.nextElectricAt - time);
      const electricLevel = Math.max(1, this.player.electricLevel || 1);
      const electricLevelLabel = electricLevel >= 4 ? 'MAX' : UPGRADE_ROMAN[electricLevel];
      this.electricText
        .setVisible(true)
        .setColor(electricLevel >= 4 ? THEME_BLUE_HEX : '#ffffff')
        .setText(
          electricReadyIn <= 0
            ? `「电力四射 ${electricLevelLabel}｜READY」`
            : `「电力四射 ${electricLevelLabel}｜${(electricReadyIn / 1000).toFixed(1)}s」`
        );
    } else {
      this.electricText.setText('').setVisible(false);
    }

    const spinLabel = this.isTouchHudLayout ? 'X' : 'Q';
    const keyUpLabel = this.isTouchHudLayout ? 'Y' : 'E';
    const supportLabel = this.isTouchHudLayout ? 'A' : 'R';

    this.spinText.setText(
      this.beatCharge
        ? `「${spinLabel}：踩拍｜下一发已强化」`
        : `「${spinLabel}：踩拍」`
    );

    this.keyText.setText(
      this.player.injustice >= PLAYER.KEY_UP_MAX
        ? `「${keyUpLabel}：升Key READY」`
        : `「${keyUpLabel}：升Key｜愤怒值 ${Math.round(this.player.injustice)}%」`
    );

    this.supportText.setText(
      this.player.support >= PLAYER.SUPPORT_MAX
        ? `「${supportLabel}：双向奔赴 READY」`
        : `「${supportLabel}：双向奔赴｜应援值 ${Math.round(this.player.support)}%」`
    );

    this.timeText.setText(`${mm}:${ss}`);
  }

  clearTransientTextForEndScreen() {
    this.importantText?.clear();
    this.activeWorldTextLabels?.forEach((label) => {
      if (!label?.active) return;
      this.tweens.killTweensOf(label);
      label.destroy();
    });
    this.activeWorldTextLabels = [];

    this.activeScreenNotices?.forEach((notice) => {
      if (!notice?.active) return;
      this.tweens.killTweensOf(notice);
      notice.destroy();
    });
    this.activeScreenNotices = [];

    if (this.xpFeedbackText?.active) {
      this.tweens.killTweensOf(this.xpFeedbackText);
      this.xpFeedbackText.destroy();
    }
    this.xpFeedbackText = null;
  }

  getKillStatEntries() {
    const entries = [
      { key: 'potato', name: '土豆', texture: 'potatoNormalArt' },
      { key: 'duck', name: '鸭子', texture: 'duckArt' },
      { key: 'ball', name: '足球', texture: 'ballArt' },
      { key: 'roach', name: '紫蟑螂', texture: 'roachArt' },
      { key: 'twinPig', name: '双子猪', texture: 'twinPigsNormalArt' },
      { key: 'plagueCat', name: '瘟疫猫', texture: 'plagueCatNormalArt' },
      { key: 'duckQueen', name: '丹麦鸭', texture: 'queenDuckS1NormalArt' }
    ];

    if (RELEASE.POTATO_COMMANDER_PUBLISHED) {
      entries.push({ key: 'potatoCommander', name: '土豆指挥官', texture: 'potatoCommanderS1NormalArt' });
    }

    return entries.map((entry) => ({
      ...entry,
      count: Math.max(0, Number(this.kills?.[entry.key]) || 0)
    }));
  }

  createKillStatsTable(centerX, topY, { depth = 302, cellWidth = 300, rowHeight = 36 } = {}) {
    const entries = this.getKillStatEntries();
    const columnOffset = 176;
    const columns = [centerX - columnOffset, centerX + columnOffset];
    const created = [];

    const heading = this.add.text(centerX, topY, '「屠杀统计」', {
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(depth);
    created.push(heading);

    entries.forEach((entry, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = columns[column];
      const y = topY + 34 + row * rowHeight;

      const cell = this.add.rectangle(x, y, cellWidth, rowHeight - 4, 0x101e2d, 0.78)
        .setStrokeStyle(1, 0x42637d, 0.55)
        .setScrollFactor(0)
        .setDepth(depth);
      created.push(cell);

      if (this.textures.exists(entry.texture)) {
        const icon = this.add.image(x - cellWidth * 0.5 + 25, y, entry.texture)
          .setScrollFactor(0)
          .setDepth(depth + 1);
        const scale = 27 / Math.max(1, icon.width, icon.height);
        icon.setScale(scale);
        created.push(icon);
      }

      const name = this.add.text(x - cellWidth * 0.5 + 47, y, entry.name, {
        fontSize: '15px',
        color: '#dce8f2'
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(depth + 1);

      const count = this.add.text(x + cellWidth * 0.5 - 16, y, `× ${entry.count}`, {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(depth + 1);

      created.push(name, count);
    });

    return created;
  }

  endRun(success) {
    if (this.finished) return;
    this.finished = true;
    this.physics.world.pause();
    this.clearTransientTextForEndScreen();

    if (!success) this.adaptiveMusic?.playTerminalCue('defeat');
    this.player.setVelocity(0, 0);

    const elapsedSeconds = this.victoryElapsedSeconds ?? this.getGameplayElapsedSeconds();

    const seconds = Math.floor(elapsedSeconds);
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    const total = this.getKillStatEntries().reduce((sum, entry) => sum + entry.count, 0);

    this.add.rectangle(GAME.WIDTH / 2, GAME.HEIGHT / 2, 760, 500, 0x000000, 0.92)
      .setScrollFactor(0).setDepth(300);
    this.add.text(GAME.WIDTH / 2, 58, success ? '「通关！」' : '「倒下了」', {
      fontSize: '32px', fontStyle: 'bold', color: '#ffffff', padding: { x: 8, y: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
    this.add.text(GAME.WIDTH / 2, 102, `时间 ${mm}:${ss}　｜　总击杀 ${total}　｜　Lv.${this.level}`, {
      fontSize: '18px', fontStyle: 'bold', color: '#dce4ef'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301);

    this.createKillStatsTable(GAME.WIDTH / 2, 148, { depth: 301, cellWidth: 300, rowHeight: 40 });

    this.add.text(GAME.WIDTH / 2, 476, '「按 R 重新开始」', {
      fontSize: '18px', color: '#dce4ef'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
  }

}
