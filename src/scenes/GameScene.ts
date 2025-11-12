import { Scene } from 'phaser';
import Matter from 'matter-js';
import { Car } from '../entities/Car';
import { Track } from '../entities/Track';
import { Checkpoint } from '../entities/Checkpoint';

export class GameScene extends Scene {
    private car!: Car;
    private track!: Track;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private speedText!: Phaser.GameObjects.Text;
    private statusText!: Phaser.GameObjects.Text;
    private controlsText!: Phaser.GameObjects.Text;
    private restartText!: Phaser.GameObjects.Text;
    private startLine!: Checkpoint;
    private checkpoints: Checkpoint[] = [];
    private allCheckpointsPassed: boolean = false;
    private gameWon: boolean = false;
    private restartKey!: Phaser.Input.Keyboard.Key;
    private winText?: Phaser.GameObjects.Text;
    private mobileControls?: Phaser.GameObjects.Container;
    private virtualKeys!: {
        up: { isDown: boolean };
        down: { isDown: boolean };
        left: { isDown: boolean };
        right: { isDown: boolean };
    };

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load the car sprite image
        this.load.image('car', '/sprites/Black_viper.png');
    }

    create() {
        // Create track
        this.track = new Track(this);
        
        // Position car on the track (bottom center, facing up)
        // Track center is at (4800, 2400), track height is 1600, track width is 4800
        // Position car on the track surface, between inner and outer walls
        const startX = 4800; // New track center X
        const startY = 2400 + 600; // Bottom part of track
        
        // Create car
        this.car = new Car(this, startX, startY);
        
        // Set car to face upward initially
        // Sprite is rotated 90 degrees, so body angle of -90 makes sprite point up
        const body = this.car.sprite.body as Matter.Body;
        Matter.Body.setAngle(body, 0); // -90 degrees (facing up)
        
        // Setup camera to follow car (bounds for wider track)
        this.cameras.main.setBounds(0, 0, 9600, 4800);
        this.cameras.main.startFollow(this.car.sprite);
        // Zoom out 2x (zoom 0.5 shows 2x more area)
        this.cameras.main.setZoom(0.5);
        
        // Setup input
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Add WASD keys
        const wasd = this.input.keyboard!.addKeys('W,S,A,D');
        
        // Create virtual keys for mobile controls
        this.virtualKeys = {
            up: { isDown: false },
            down: { isDown: false },
            left: { isDown: false },
            right: { isDown: false }
        };
        
        // Store input keys (combine keyboard and virtual keys)
        this.car.setInputKeys({
            up: [this.cursors.up, wasd['W'], this.virtualKeys.up as any],
            down: [this.cursors.down, wasd['S'], this.virtualKeys.down as any],
            left: [this.cursors.left, wasd['A'], this.virtualKeys.left as any],
            right: [this.cursors.right, wasd['D'], this.virtualKeys.right as any]
        });
        
        // Create mobile controls if on touch device
        this.createMobileControls();

        // Create speed display text (top of screen, 2x size)
        this.speedText = this.add.text(10, 10, 'Speed: 0', {
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        });
        this.speedText.setScrollFactor(0); // Keep text fixed on screen (not affected by camera)
        this.speedText.setDepth(1000); // Make sure it's on top

        // Create status text (top of screen, 2x size)
        this.statusText = this.add.text(10, 70, 'Checkpoints: 0/2', {
            fontSize: '40px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 6
        });
        this.statusText.setScrollFactor(0);
        this.statusText.setDepth(1000);

        // Create controls text (top of screen, 2x size)
        this.controlsText = this.add.text(10, 130, 'Controls: Arrow Keys or WASD', {
            fontSize: '36px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });
        this.controlsText.setScrollFactor(0);
        this.controlsText.setDepth(1000);

        // Create restart text (top of screen, 2x size)
        this.restartText = this.add.text(10, 190, 'Press R to restart', {
            fontSize: '36px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 4
        });
        this.restartText.setScrollFactor(0);
        this.restartText.setDepth(1000);

        // Setup restart key
        this.restartKey = this.input.keyboard!.addKey('R');

        // Create start line (in front of car, facing up)
        // Car starts at (4800, 3000), facing up, so start line should be above it
        this.startLine = new Checkpoint(this, 4800, 2800, 200, 40, 0x00ff00, true); // Green start line

        // Create checkpoints around the track
        // Checkpoint 1: Left side of track
        this.checkpoints.push(new Checkpoint(this, 2400, 2400, 200, 40, 0x00ffff)); // Cyan checkpoint
        // Checkpoint 2: Right side of track
        this.checkpoints.push(new Checkpoint(this, 7200, 2400, 200, 40, 0xff00ff)); // Magenta checkpoint

        // Setup Matter.js collision events for checkpoint detection
        this.matter.world.on('collisionstart', (event: any) => {
            this.handleCheckpointCollision(event);
        });

        // Handle orientation changes on mobile
        this.scale.on('orientationchange', () => {
            this.handleOrientationChange();
        });

        // Handle resize events
        this.scale.on('resize', () => {
            this.handleResize();
        });
    }

    private handleOrientationChange() {
        // Update mobile controls position on orientation change
        if (this.mobileControls) {
            this.updateMobileControlsPosition();
        }
    }

    private handleResize() {
        // Update mobile controls position on resize
        if (this.mobileControls) {
            this.updateMobileControlsPosition();
        }
    }

    private updateMobileControlsPosition() {
        const buttonSize = 100;
        const buttonSpacing = 25;
        const bottomMargin = 40;
        const rightMargin = 40;
        
        // Use scaled game dimensions
        const screenWidth = this.scale.gameSize.width;
        const screenHeight = this.scale.gameSize.height;
        const centerX = screenWidth - rightMargin - buttonSize * 1.5;
        const centerY = screenHeight - bottomMargin - buttonSize * 1.5;

        // Update button positions (order: up, down, left, right as added to container)
        const buttons = this.mobileControls!.list as Phaser.GameObjects.Container[];
        if (buttons.length >= 4) {
            buttons[0].setPosition(centerX, centerY - buttonSize - buttonSpacing); // Up
            buttons[1].setPosition(centerX, centerY + buttonSize + buttonSpacing); // Down
            buttons[2].setPosition(centerX - buttonSize - buttonSpacing, centerY); // Left
            buttons[3].setPosition(centerX + buttonSize + buttonSpacing, centerY); // Right
        }
    }

    private createMobileControls() {
        // Check if device supports touch or is mobile
        const isMobile = this.sys.game.device.input.touch || 
                        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!isMobile) return;

        // Create container for mobile controls
        this.mobileControls = this.add.container(0, 0);
        this.mobileControls.setScrollFactor(0);
        this.mobileControls.setDepth(2000);

        // Larger buttons for mobile
        const buttonSize = 100;
        const buttonSpacing = 25;
        const bottomMargin = 40;
        const rightMargin = 40;
        
        // Calculate positions (bottom right of screen) - use scaled game dimensions
        const screenWidth = this.scale.gameSize.width;
        const screenHeight = this.scale.gameSize.height;
        const centerX = screenWidth - rightMargin - buttonSize * 1.5;
        const centerY = screenHeight - bottomMargin - buttonSize * 1.5;

        // Create arrow buttons
        const upButton = this.createArrowButton(centerX, centerY - buttonSize - buttonSpacing, 'up', 0);
        const leftButton = this.createArrowButton(centerX - buttonSize - buttonSpacing, centerY, 'left', -90);
        const downButton = this.createArrowButton(centerX, centerY + buttonSize + buttonSpacing, 'down', 180);
        const rightButton = this.createArrowButton(centerX + buttonSize + buttonSpacing, centerY, 'right', 90);

        // Add buttons to container
        this.mobileControls.add([upButton, downButton, leftButton, rightButton]);
    }

    private createArrowButton(x: number, y: number, direction: 'up' | 'down' | 'left' | 'right', rotation: number): Phaser.GameObjects.Container {
        const buttonSize = 100;
        const container = this.add.container(x, y);
        
        // Create button background (circle)
        const bg = this.add.circle(0, 0, buttonSize / 2, 0x333333, 0.8);
        bg.setStrokeStyle(4, 0xffffff);
        
        // Create arrow shape
        const arrow = this.add.graphics();
        arrow.fillStyle(0xffffff);
        arrow.lineStyle(6, 0xffffff);
        arrow.beginPath();
        arrow.moveTo(0, -buttonSize / 3);
        arrow.lineTo(-buttonSize / 4, buttonSize / 6);
        arrow.lineTo(buttonSize / 4, buttonSize / 6);
        arrow.closePath();
        arrow.fillPath();
        arrow.strokePath();
        
        // Rotate arrow
        arrow.setRotation(Phaser.Math.DegToRad(rotation));
        
        container.add([bg, arrow]);
        container.setSize(buttonSize, buttonSize);
        container.setInteractive(new Phaser.Geom.Circle(0, 0, buttonSize / 2), Phaser.Geom.Circle.Contains);
        
        // Touch/pointer events
        container.on('pointerdown', () => {
            this.virtualKeys[direction].isDown = true;
            bg.setFillStyle(0x00ff00, 0.8); // Green when pressed
        });
        
        container.on('pointerup', () => {
            this.virtualKeys[direction].isDown = false;
            bg.setFillStyle(0x333333, 0.8); // Back to gray
        });
        
        container.on('pointerout', () => {
            this.virtualKeys[direction].isDown = false;
            bg.setFillStyle(0x333333, 0.8); // Back to gray
        });
        
        return container;
    }

    update() {
        // Check for restart
        if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
            this.restartGame();
        }

        if (this.car) {
            this.car.update();
            
            // Update speed display
            const speed = this.car.getSpeed();
            this.speedText.setText(`Speed: ${speed.toFixed(1)}`);

            // Check checkpoint collisions manually (backup method)
            this.checkCheckpointCollisions();
        }
    }

    private handleCheckpointCollision(event: any) {
        const carBody = this.car.sprite.body as Matter.Body;
        
        for (const pair of event.pairs) {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            // Check if car collided with a checkpoint
            if (bodyA === carBody || bodyB === carBody) {
                const checkpointBody = bodyA === carBody ? bodyB : bodyA;
                
                // Check start line
                if (checkpointBody === this.startLine.sprite.body) {
                    if (this.allCheckpointsPassed && !this.gameWon) {
                        this.winGame();
                    }
                } else {
                    // Check regular checkpoints
                    for (const checkpoint of this.checkpoints) {
                        if (checkpointBody === checkpoint.sprite.body && !checkpoint.passed) {
                            checkpoint.passed = true;
                            this.updateStatus();
                        }
                    }
                }
            }
        }
    }

    private checkCheckpointCollisions() {
        const carBody = this.car.sprite.body as Matter.Body;
        
        // Check regular checkpoints
        for (const checkpoint of this.checkpoints) {
            if (!checkpoint.passed && checkpoint.checkCollision(carBody)) {
                checkpoint.passed = true;
                this.updateStatus();
            }
        }

        // Check start line (only if all checkpoints passed)
        if (this.allCheckpointsPassed && !this.startLine.passed && !this.gameWon) {
            if (this.startLine.checkCollision(carBody)) {
                this.winGame();
            }
        }
    }

    private updateStatus() {
        const passedCount = this.checkpoints.filter(cp => cp.passed).length;
        this.statusText.setText(`Checkpoints: ${passedCount}/${this.checkpoints.length}`);
        
        if (passedCount === this.checkpoints.length) {
            this.allCheckpointsPassed = true;
            this.statusText.setText('All checkpoints! Return to start line!');
            this.statusText.setColor('#00ff00');
        }
    }

    private winGame() {
        this.gameWon = true;
        this.startLine.passed = true;
        
        // Create win message (2x size)
        this.winText = this.add.text(400, 300, 'YOU WIN!', {
            fontSize: '128px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 10
        });
        this.winText.setScrollFactor(0);
        this.winText.setDepth(2000);
        this.winText.setOrigin(0.5);
        
        // Center on screen (setScrollFactor(0) means coordinates are relative to camera viewport)
        // Use scaled game dimensions for proper centering
        const centerX = this.scale.gameSize.width / 2;
        const centerY = this.scale.gameSize.height / 2;
        this.winText.setPosition(centerX, centerY);
        
        this.statusText.setText('VICTORY!');
        this.statusText.setColor('#00ff00');
    }

    private restartGame() {
        // Reset game state
        this.allCheckpointsPassed = false;
        this.gameWon = false;

        // Reset car position and angle
        const startX = 4800;
        const startY = 2400 + 600;
        const body = this.car.sprite.body as Matter.Body;
        Matter.Body.setPosition(body, { x: startX, y: startY });
        Matter.Body.setAngle(body, 0);
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);

        // Reset checkpoints
        this.startLine.passed = false;
        this.startLine.reset();
        for (const checkpoint of this.checkpoints) {
            checkpoint.passed = false;
            checkpoint.reset();
        }

        // Reset status text
        this.statusText.setText('Checkpoints: 0/2');
        this.statusText.setColor('#ffff00');

        // Remove win text if it exists
        if (this.winText) {
            this.winText.destroy();
            this.winText = undefined;
        }
    }
}

