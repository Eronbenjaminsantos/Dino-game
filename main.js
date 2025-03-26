class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'dino_default');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setScale(0.5);
        this.updateHitbox();

        this.isAlive = true;
        this.isJumping = false;

        // Create running animation
        scene.anims.create({
            key: 'run',
            frames: [{
                key: 'dino_run1'
            }, {
                key: 'dino_run2'
            }],
            frameRate: 10,
            repeat: -1
        });
    }

    updateHitbox() {
        this.body.setSize(this.width * 0.7, this.height * 0.9);
        this.body.setOffset(this.width * 0.15, this.height * 0.1);
    }

    jump() {
        if (this.body.touching.down) {
            this.setVelocityY(-487.5);
            this.isJumping = true;
            this.setTexture('dino_default');
        }
    }

    die() {
        this.isAlive = false;
        this.setTexture('dino_dead');
        this.anims.stop();
    }

    update() {
        if (this.isAlive) {
            if (this.body.touching.down) {
                if (this.isJumping) {
                    this.isJumping = false;
                    this.play('run');
                }
            } else {
                this.isJumping = true;
                this.setTexture('dino_default');
            }
        }
    }
}

class Ground extends Phaser.Physics.Arcade.StaticGroup {
    constructor(scene, x) {
        super(scene.physics.world, scene);

        this.groundImage = this.create(x, scene.scale.height - 24, 'chrome_ground');
        this.groundImage.setOrigin(0, 1);
    }

    move() {
        this.groundImage.x -= 6; // Tripled scroll speed from 2 to 6
        if (this.groundImage.x <= -this.groundImage.width) {
            this.groundImage.x = this.scene.cameras.main.width;
        }
    }
}

class FrogRunner extends Phaser.Scene {
    constructor() {
        super();
        this.ground1 = null;
        this.ground2 = null;
        this.player = null;
        this.cacti = null;
        this.isGameOver = false;

        this.projectName = 'FrogRunnerGame';
        this.gameHistory = [];
        this.score = 0;
        this.highScore = 0;
        this.scoreText = null;
        this.highScoreText = null;
        this.difficultyText = null;

        this.spawnInterval = 2500;
        this.minSpawnInterval = 800;
        this.difficultyLevel = 1;
        this.pointMultiplier = 1;
    }

    preload() {
        this.load.spritesheet('tiles', 'image (3).png', {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.image('cactus', 'image (2).png');
        this.load.image('dino_dead', 'image.png');
        this.load.image('dino_default', 'image (1).png');
        this.load.image('chrome_ground', 'image (6).png');
        this.load.image('dino_run1', 'image (4).png');
        this.load.image('dino_run2', 'image (5).png');
    }

    create() {
        this.isGameOver = false;
        this.loadGameHistory();
        this.cameras.main.setBackgroundColor('#FFFFFF');
        // Add history button
        const historyButton = this.add.text(16, 50, '📋 History', {
            fontSize: '20px',
            fill: '#000',
            backgroundColor: '#ddd',
            padding: {
                x: 10,
                y: 5
            }
        });
        historyButton.setInteractive();
        historyButton.on('pointerdown', () => this.showHistoryModal());

        this.ground1 = new Ground(this, 0);
        this.ground2 = new Ground(this, this.cameras.main.width);

        this.player = new Player(this, 100, this.scale.height - 200);

        this.physics.add.collider(this.player, this.ground1);
        this.physics.add.collider(this.player, this.ground2);

        this.input.keyboard.on('keydown-SPACE', function(event) {
            if (this.player.isAlive) {
                this.player.jump();
            } else if (this.isGameOver) {
                this.scene.restart();
            }
        }, this);

        this.setupCacti();
        this.setupScoreAndHighScore();

        // Delay the first cactus spawn by 3 seconds
        this.time.delayedCall(3000, this.spawnCactus, [], this);

        // Add difficulty text
        this.difficultyText = this.add.text(16, 16, 'Difficulty: 1', {
            fontSize: '24px',
            fill: '#000',
            fontWeight: 'bold'
        });
    }

    setupCacti() {
        this.cacti = this.physics.add.group();
        this.physics.add.collider(this.player, this.cacti, this.hitCactus, null, this);
    }

    setupScoreAndHighScore() {
        const textStyle = {
            fontSize: '24px',
            fill: '#000',
            fontWeight: 'bold'
        };

        this.highScoreText = this.add.text(
            this.scale.width - 16,
            16,
            'High Score: 0',
            textStyle
        ).setOrigin(1, 0);

        this.scoreText = this.add.text(
            this.scale.width - 16,
            this.highScoreText.y + this.highScoreText.height + 8,
            'Score: 0',
            textStyle
        ).setOrigin(1, 0);

        this.highScore = this.getHighScore();
        this.updateHighScoreText();

        this.score = 0;
        this.updateScoreText();

        this.time.addEvent({
            delay: 100,
            callback: this.incrementScore,
            callbackScope: this,
            loop: true
        });
    }

    spawnCactus() {
        if (this.isGameOver) {
            return;
        }
        let cactus = this.cacti.create(this.scale.width + 150, this.scale.height - 80, 'cactus');
        cactus.setCollideWorldBounds(false);
        cactus.body.setAllowGravity(false);
        cactus.setScale(0.5);
        cactus.body.setSize(cactus.width * 0.8, cactus.height * 0.9);
        cactus.body.setOffset(cactus.width * 0.1, cactus.height * 0.1);
        cactus.setVelocityX(-600); // Tripled velocity from -200 to -600

        // Schedule next cactus spawn
        this.time.delayedCall(this.spawnInterval, this.spawnCactus, [], this);
    }

    update() {
        if (!this.isGameOver) {
            this.ground1.move();
            this.ground2.move();
            this.player.update();

            this.cacti.children.iterate(function(cactus) {
                if (cactus && cactus.x < 0) {
                    cactus.destroy();
                }
            }, this);

            this.updateDifficulty();
        }
    }

    updateDifficulty() {
        let newDifficultyLevel = Math.floor(this.score / 500) + 1;
        if (newDifficultyLevel > this.difficultyLevel) {
            this.difficultyLevel = newDifficultyLevel;
            this.spawnInterval = Math.max(this.minSpawnInterval, 2500 - (this.difficultyLevel - 1) * 200);
            this.pointMultiplier = 1 + (this.difficultyLevel - 1) * 0.1;
            this.difficultyText.setText('Difficulty: ' + this.difficultyLevel);

            // Visual feedback for difficulty increase
            this.cameras.main.flash(500, 255, 255, 255, true);
        }
    }

    hitCactus(player, cactus) {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.physics.pause();
        this.player.die();
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
        // Save current score to history
        this.gameHistory.push({
            attempt: this.gameHistory.length + 1,
            score: this.score,
            time: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            })
        });
        this.saveGameHistory();
        // Add text to inform player they can restart
        this.add.text(this.scale.width / 2, this.scale.height / 2, 'Press SPACE to restart', {
            fontSize: '24px',
            fill: '#000',
            fontWeight: 'bold'
        }).setOrigin(0.5);
    }

    incrementScore() {
        if (!this.isGameOver) {
            this.score += Math.round(1 * this.pointMultiplier);
            this.updateScoreText();
        }
    }

    updateScoreText() {
        this.scoreText.setText('Score: ' + this.score);
    }

    updateHighScoreText() {
        this.highScoreText.setText('High Score: ' + this.highScore);
    }

    getHighScore() {
        const storedScore = localStorage.getItem(this.projectName + '_highScore');
        return storedScore ? parseInt(storedScore) : 0;
    }

    saveHighScore() {
        localStorage.setItem(this.projectName + '_highScore', this.highScore.toString());
    }
    loadGameHistory() {
        const storedHistory = localStorage.getItem(this.projectName + '_history');
        this.gameHistory = storedHistory ? JSON.parse(storedHistory) : [];
    }
    saveGameHistory() {
        localStorage.setItem(this.projectName + '_history', JSON.stringify(this.gameHistory));
    }
    showHistoryModal() {
        // Create modal container
        const modalBg = this.add.rectangle(0, 0, this.scale.width * 2, this.scale.height * 2, 0x000000, 0.7);
        modalBg.setOrigin(0);
        modalBg.setScrollFactor(0);
        modalBg.setDepth(998);
        // Create modal content
        const modalWidth = 400;
        const modalHeight = 300;
        const modalX = (this.scale.width - modalWidth) / 2;
        const modalY = (this.scale.height - modalHeight) / 2;
        const modalContent = this.add.rectangle(modalX, modalY, modalWidth, modalHeight, 0xffffff);
        modalContent.setOrigin(0);
        modalContent.setDepth(999);
        // Add close button
        const closeBtn = this.add.text(modalX + modalWidth - 30, modalY + 10, 'X', {
            fontSize: '20px',
            fill: '#000'
        });
        closeBtn.setDepth(1000);
        closeBtn.setInteractive();
        closeBtn.on('pointerdown', () => {
            modalBg.destroy();
            modalContent.destroy();
            closeBtn.destroy();
            title.destroy();
            historyTexts.forEach(text => text.destroy());
        });
        // Add title
        const title = this.add.text(modalX + modalWidth / 2, modalY + 30, 'Game History', {
            fontSize: '24px',
            fill: '#000',
            fontWeight: 'bold'
        });
        title.setOrigin(0.5);
        title.setDepth(1000);
        // Add history entries
        const historyTexts = [];
        const recentHistory = [...this.gameHistory].reverse().slice(0, 8); // Show last 8 attempts
        recentHistory.forEach((entry, index) => {
            const text = this.add.text(
                modalX + 20,
                modalY + 70 + (index * 30),
                `Attempt ${entry.attempt}: Score ${entry.score} [${entry.time}]`, {
                    fontSize: '16px',
                    fill: '#000'
                }
            );
            text.setDepth(1000);
            historyTexts.push(text);
        });
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'renderDiv',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    width: 512,
    height: 512,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                y: 1088
            }, // Doubled gravity from 544 to 1088
            debug: false
        }
    },
    scene: FrogRunner,
    pixelArt: true,
    crisp: true,
};

window.phaserGame = new Phaser.Game(config);
window.phaserGame.scale.pageAlignHorizontally = true;
window.phaserGame.scale.pageAlignVertically = true;