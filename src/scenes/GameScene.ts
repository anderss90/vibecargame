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
    private startLine!: Checkpoint;
    private checkpoints: Checkpoint[] = [];
    private allCheckpointsPassed: boolean = false;
    private gameWon: boolean = false;

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
        
        // Store input keys
        this.car.setInputKeys({
            up: [this.cursors.up, wasd['W']],
            down: [this.cursors.down, wasd['S']],
            left: [this.cursors.left, wasd['A']],
            right: [this.cursors.right, wasd['D']]
        });

        // Create speed display text
        this.speedText = this.add.text(10, 10, 'Speed: 0', {
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.speedText.setScrollFactor(0); // Keep text fixed on screen (not affected by camera)
        this.speedText.setDepth(1000); // Make sure it's on top

        // Create status text
        this.statusText = this.add.text(10, 50, 'Checkpoints: 0/2', {
            fontSize: '20px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.statusText.setScrollFactor(0);
        this.statusText.setDepth(1000);

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
    }

    update() {
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
        
        // Create win message
        const winText = this.add.text(400, 300, 'YOU WIN!', {
            fontSize: '64px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 5
        });
        winText.setScrollFactor(0);
        winText.setDepth(2000);
        winText.setOrigin(0.5);
        
        // Center on screen (setScrollFactor(0) means coordinates are relative to camera viewport)
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        winText.setPosition(centerX, centerY);
        
        this.statusText.setText('VICTORY!');
        this.statusText.setColor('#00ff00');
    }
}

