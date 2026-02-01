let scores = [];

// ===============================
// TOUCH INPUT STATE
// ===============================
let touchState = {
  p1: { left: false, right: false, up: false },
  p2: { left: false, right: false, up: false }
};
let joystick = {
  p1: { x: 0, y: 0 },
  p2: { x: 0, y: 0 }
};

class GameLevel extends Phaser.Scene {
  constructor(levelName = "level1", mapName, Data) {
    super({ key: levelName });
    this.levelName = levelName;
    this.mapName = mapName;
    this.intialData = Data;
    this.levelCount = 3;
  }

  init(data) {
    this.hearts = data.hearts;
  }

  preload() {
    this.load.image("tileset", "./assets/images/tileset.png");
    this.load.image("background", "./assets/images/Ground.png");

    this.load.image("character1", this.loadImageFromLocalStorage1("character1"));
    this.load.image("character2", this.loadImageFromLocalStorage2("character2"));

    this.load.audio("coin", "./assets/audio/coin.mp3");
    this.load.audio("jump", "./assets/audio/jump.mp3");
    this.load.audio("levelEnd", "./assets/audio/levelEnd.mp3");
    this.load.audio("theme", "./assets/audio/theme.mp3");

    this.load.image("coin", "./assets/images/diamond.png");
    this.load.image("coin2", "./assets/images/fire.png");
    this.load.image("wall", "./assets/images/Wall.png");
    this.load.image("wallBtn", "./assets/images/wallBtn.png");
    this.load.image("heart", "../assets/images/heart.png");
    this.load.image("door", "../assets/images/door.png");

    this.load.audio("wallOpen", "../assets/audio/wallOpen.mp3");
    this.load.audio("wallClose", "../assets/audio/wallClose.mp3");
    this.load.audio("lose", "../assets/audio/lose.mp3");
    this.load.audio("gameOverSound", "../assets/audio/gameOver.mp3");

    this.load.tilemapCSV("tilemap1", "./assets/maps/LEVEL1.csv");
    this.load.tilemapCSV("tilemap2", "./assets/maps/level2.csv");
    this.load.tilemapCSV("tilemap3", "./assets/maps/level3.csv");
  }

  create() {
    this.Data = structuredClone(this.intialData);
    this.levelStartTime = Math.floor(Date.now() / 1000);

    const bg = this.add.image(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      "background"
    );
    bg.displayWidth = this.cameras.main.width;
    bg.displayHeight = this.cameras.main.height;
    bg.setScrollFactor(0);

    const map = this.make.tilemap({
      key: this.mapName,
      tileWidth: 32,
      tileHeight: 32,
    });

    const tiles = map.addTilesetImage("tileset");
    const layerY = bg.displayHeight / map.heightInPixels;
    const layer = map.createLayer(0, tiles, 0, layerY);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const groundLevel = this.cameras.main.height - 60;

    this.character1 = this.physics.add.sprite(100, groundLevel, "character1")
      .setOrigin(0.5, 1)
      .setCollideWorldBounds(true)
      .setBounce(0.2)
      .setDrag(100)
      .setGravityY(500)
      .setScale(0.3);

    this.character1.body.setSize(80, 200);

    this.character2 = this.physics.add.sprite(160, groundLevel, "character2")
      .setOrigin(0.5, 1)
      .setCollideWorldBounds(true)
      .setBounce(0.2)
      .setDrag(100)
      .setGravityY(500)
      .setScale(0.3);

    this.character2.body.setSize(80, 200);

    this.coins = this.physics.add.staticGroup();
    this.coins2 = this.physics.add.staticGroup();

    map.setCollisionBetween(0, 2);
    this.physics.add.collider(this.character1, layer);
    this.physics.add.collider(this.character2, layer);

    this.physics.add.overlap(this.character2, this.coins, this.hitCoin, null, this);
    this.physics.add.overlap(this.character1, this.coins2, this.hitCoin, null, this);

    this.walls = this.physics.add.staticGroup();
    this.wallBtns = this.physics.add.staticGroup();
    this.createWalls();

    this.loadAudios();
    this.playMusic();

    this.score = 0;
    this.scoreText = this.add.text(26, 4, "Score: 0", {
      fontSize: "26px",
      fill: "#fff",
    }).setScrollFactor(0).setDepth(5);

    if (this.registry.get("currentLevel") === undefined) {
      this.registry.set("currentLevel", 1);
    }

    let doorY = this.registry.get("currentLevel") > 1 ? 96 : 64;
    let door = this.add.image(75, doorY, "door");
    door.setDisplaySize(100, 76);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.cameras.main.startFollow(this.character1, true);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.createCoins();
    this.createHearts();
    this.setupTouchControls();
  }

  // ===============================
  // TOUCH CONTROLS
  // ===============================
  setupTouchControls() {
    const bind = (id, player, dir) => {
      const btn = document.getElementById(id);
      if (!btn) return;

      btn.addEventListener("touchstart", e => {
        e.preventDefault();
        touchState[player][dir] = true;
      });

      ["touchend", "touchcancel"].forEach(evt => {
        btn.addEventListener(evt, () => {
          touchState[player][dir] = false;
        });
      });
    };

    bind("left1", "p1", "left");
    bind("right1", "p1", "right");
    bind("up1", "p1", "up");

    bind("left2", "p2", "left");
    bind("right2", "p2", "right");
    bind("up2", "p2", "up");
  }

  update() {
    // PLAYER 1
    this.character1.setVelocityX(0);

    if (this.cursors.left.isDown || touchState.p1.left) {
      this.character1.setVelocityX(-200);
    } else if (this.cursors.right.isDown || touchState.p1.right) {
      this.character1.setVelocityX(200);
    }

    if ((this.cursors.up.isDown || touchState.p1.up) && this.character1.body.blocked.down) {
      this.character1.setVelocityY(-500);
      this.playAudio("jump");
    }

    // PLAYER 2
    this.character2.setVelocityX(0);

    if (this.input.keyboard.addKey("A").isDown || touchState.p2.left) {
      this.character2.setVelocityX(-200);
    } else if (this.input.keyboard.addKey("D").isDown || touchState.p2.right) {
      this.character2.setVelocityX(200);
    }

    if ((this.input.keyboard.addKey("W").isDown || touchState.p2.up) && this.character2.body.blocked.down) {
      this.character2.setVelocityY(-500);
      this.playAudio("jump");
    }

    // END CONDITION
    if (
      this.character1.y <= 150 &&
      this.character2.y <= 150 &&
      this.character1.x <= 100 &&
      this.character2.x <= 100
    ) {
      this.finishScene();
    }
  }

  // ===============================
  // UTILS (UNCHANGED)
  // ===============================
  loadImageFromLocalStorage1(key) {
    let img = localStorage.getItem(key);
    return img && !useDefault ? img : "assets/images/firecharacter.png";
  }

  loadImageFromLocalStorage2(key) {
    let img = localStorage.getItem(key);
    return img && !useDefault ? img : "assets/images/watercharacter.png";
  }

  loadAudios() {
    this.audios = {
      jump: this.sound.add("jump"),
      coin: this.sound.add("coin"),
      levelEnd: this.sound.add("levelEnd"),
      wallOpen: this.sound.add("wallOpen"),
      wallClose: this.sound.add("wallClose"),
      lose: this.sound.add("lose"),
      gameOverSound: this.sound.add("gameOverSound"),
    };
  }

  playAudio(key) {
    this.audios[key]?.play();
  }

  playMusic(theme = "theme") {
    this.theme = this.sound.add(theme);
    this.theme.play({ volume: 0.1, loop: true });
  }
}

export default GameLevel;
