import { Scene } from 'phaser';
import Matter from 'matter-js';

export class Car {
    public sprite: Phaser.Physics.Matter.Sprite;
    private scene: Scene;
    private inputKeys: {
        up: (Phaser.Input.Keyboard.Key | { isDown: boolean })[];
        down: (Phaser.Input.Keyboard.Key | { isDown: boolean })[];
        left: (Phaser.Input.Keyboard.Key | { isDown: boolean })[];
        right: (Phaser.Input.Keyboard.Key | { isDown: boolean })[];
    } | null = null;
    
    private readonly maxSpeed = 100;
    private readonly acceleration = 1; // Increased for better responsiveness
    private readonly maxAngularVelocity = 0.06; // Radians per frame - physically accurate rotation rate
    private readonly friction = 0.40; // Reduced friction for better movement

    constructor(scene: Scene, x: number, y: number) {
        this.scene = scene;
        
        // Create car sprite with physics body using preloaded car texture
        // Matter.js will automatically create a collision box based on sprite dimensions
        this.sprite = scene.matter.add.sprite(x, y, 'car', undefined, {
            frictionAir: 0.1,
            friction: 0.5,
            density: 0.001
        });

        // Set origin to center for proper rotation
        this.sprite.setOrigin(0.5,0.5);        
        // Rotate sprite 180 degrees total (90 + 90 clockwise) to match physics orientation
        this.sprite.setAngle(this.sprite.angle + 90);

        // Disable collisions with walls, but allow checkpoint detection
        const body = this.sprite.body as Matter.Body;
        body.collisionFilter = {
            category: 0x0001, // Car category
            mask: 0x0002, // Detect checkpoints (category 0x0002), but not walls
            group: 0
        };

        // Ensure car rotates around its center (center of mass)
        // The body is already centered by default
        // Car can now rotate - we control rotation through angular velocity
    }

    setInputKeys(keys: {
        up: (Phaser.Input.Keyboard.Key | { isDown: boolean })[];
        down: (Phaser.Input.Keyboard.Key | { isDown: boolean })[];
        left: (Phaser.Input.Keyboard.Key | { isDown: boolean })[];
        right: (Phaser.Input.Keyboard.Key | { isDown: boolean })[];
    }) {
        this.inputKeys = keys as any;
    }

    update() {
        if (!this.inputKeys) return;

        const body = this.sprite.body as Matter.Body;
        const angle = body.angle;
        
        // Check input
        const up = this.inputKeys.up.some(key => key.isDown);
        const down = this.inputKeys.down.some(key => key.isDown);
        const left = this.inputKeys.left.some(key => key.isDown);
        const right = this.inputKeys.right.some(key => key.isDown);

        // Calculate velocity
        let velocityX = body.velocity.x;
        let velocityY = body.velocity.y;

        // Calculate current speed
        const currentSpeed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        
        // Apply acceleration
        if (up) {
            velocityX += Math.cos(angle) * this.acceleration;
            velocityY += Math.sin(angle) * this.acceleration;
        }
        if (down) {
            velocityX -= Math.cos(angle) * this.acceleration;
            velocityY -= Math.sin(angle) * this.acceleration;
        }

        // Apply friction first (before limiting speed)
        //velocityX *= this.friction;
        //velocityY *= this.friction;

        // Limit speed (after friction)
        const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        if (speed > this.maxSpeed) {
            velocityX = (velocityX / speed) * this.maxSpeed;
            velocityY = (velocityY / speed) * this.maxSpeed;
        }

        // Apply velocity
        Matter.Body.setVelocity(body, { x: velocityX, y: velocityY });

        // Apply turning - allow turning even when stationary to help get started
        // Turn rate is proportional to speed for more realistic handling
        const newSpeed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        const speedFactor = Math.max(newSpeed / this.maxSpeed, 0.3); // Minimum 30% turn rate even when slow
        let angularVelocity = body.angularVelocity || 0;
        
        // Check if user is turning
        const isTurning = left || right;
        
        if (isTurning) {
            // Apply turning input
            if (left) {
                angularVelocity = -this.maxAngularVelocity * speedFactor;
            }
            if (right) {
                angularVelocity = this.maxAngularVelocity * speedFactor;
            }
        } else {
            // Apply angular damping (friction) when not turning
            angularVelocity *= 0.95;
        }
        
        // Apply angular velocity for smooth, physically accurate rotation
        Matter.Body.setAngularVelocity(body, angularVelocity);
    }

    getPosition(): { x: number; y: number } {
        return {
            x: this.sprite.x,
            y: this.sprite.y
        };
    }

    getAngle(): number {
        return (this.sprite.body as Matter.Body).angle;
    }

    getSpeed(): number {
        const body = this.sprite.body as Matter.Body;
        const velocityX = body.velocity.x;
        const velocityY = body.velocity.y;
        return Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    }
}

