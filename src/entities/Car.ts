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
    
    private exhaustParticles?: Phaser.GameObjects.Particles.ParticleEmitter;
    private tireParticles?: Phaser.GameObjects.Particles.ParticleEmitter;
    
    private readonly maxSpeed = 120; // Increased max speed
    private readonly acceleration = 1.5; // More responsive acceleration
    private readonly maxAngularVelocity = 0.08; // Slightly faster turning
    private readonly friction = 0.40; // Reduced friction for better movement
    private lastSpeed: number = 0;

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
        
        // Create exhaust particle effect
        this.createExhaustParticles();
        
        // Create tire smoke particle effect
        this.createTireParticles();
    }
    
    private createExhaustParticles() {
        const particles = this.scene.add.particles(0, 0, 'car', {
            speed: { min: 20, max: 40 },
            scale: { start: 0.3, end: 0 },
            tint: [0x666666, 0x888888, 0xaaaaaa],
            lifespan: 300,
            frequency: 50,
            alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD'
        });
        
        particles.startFollow(this.sprite, 0, 20, false);
        this.exhaustParticles = particles;
    }
    
    private createTireParticles() {
        const particles = this.scene.add.particles(0, 0, 'car', {
            speed: { min: 10, max: 30 },
            scale: { start: 0.4, end: 0 },
            tint: [0x333333, 0x444444],
            lifespan: 400,
            frequency: 100,
            alpha: { start: 0.6, end: 0 },
            angle: { min: 0, max: 360 }
        });
        
        particles.startFollow(this.sprite, 0, 0, false);
        this.tireParticles = particles;
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
        
        // Debug logging for virtual keys (only log when they change or are active)
        if (up || down || left || right) {
            const virtualUp = this.inputKeys.up.find(k => !('isDown' in k) || typeof (k as any).isDown === 'boolean');
            const virtualDown = this.inputKeys.down.find(k => !('isDown' in k) || typeof (k as any).isDown === 'boolean');
            const virtualLeft = this.inputKeys.left.find(k => !('isDown' in k) || typeof (k as any).isDown === 'boolean');
            const virtualRight = this.inputKeys.right.find(k => !('isDown' in k) || typeof (k as any).isDown === 'boolean');
            
            if (virtualUp && 'isDown' in virtualUp) {
                console.log('CAR UPDATE - virtualKeys.up.isDown =', (virtualUp as any).isDown, 'up =', up);
            }
            if (virtualDown && 'isDown' in virtualDown) {
                console.log('CAR UPDATE - virtualKeys.down.isDown =', (virtualDown as any).isDown, 'down =', down);
            }
            if (virtualLeft && 'isDown' in virtualLeft) {
                console.log('CAR UPDATE - virtualKeys.left.isDown =', (virtualLeft as any).isDown, 'left =', left);
            }
            if (virtualRight && 'isDown' in virtualRight) {
                console.log('CAR UPDATE - virtualKeys.right.isDown =', (virtualRight as any).isDown, 'right =', right);
            }
        }

        // Calculate velocity
        let velocityX = body.velocity.x;
        let velocityY = body.velocity.y;

        // Calculate current speed
        const currentSpeed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        
        // Apply acceleration with speed-based curve for snappier feel
        const speedRatio = currentSpeed / this.maxSpeed;
        const accelerationMultiplier = 1 + (1 - speedRatio) * 0.5; // More acceleration at low speeds
        
        if (up) {
            const accel = this.acceleration * accelerationMultiplier;
            velocityX += Math.cos(angle) * accel;
            velocityY += Math.sin(angle) * accel;
        }
        if (down) {
            const accel = this.acceleration * accelerationMultiplier * 0.7; // Reverse is slower
            velocityX -= Math.cos(angle) * accel;
            velocityY -= Math.sin(angle) * accel;
        }
        
        // Apply air resistance (more realistic deceleration)
        const airResistance = 0.98;
        velocityX *= airResistance;
        velocityY *= airResistance;

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
        
        // Update particle effects based on movement
        this.updateParticleEffects(currentSpeed, isTurning);
        
        this.lastSpeed = currentSpeed;
    }
    
    private updateParticleEffects(speed: number, isTurning: boolean) {
        const speedRatio = speed / this.maxSpeed;
        
        // Exhaust particles - more intense when moving faster
        if (this.exhaustParticles) {
            const emissionRate = 20 + speedRatio * 80;
            this.exhaustParticles.setFrequency(emissionRate);
        }
        
        // Tire smoke - more when turning at speed
        if (this.tireParticles) {
            if (isTurning && speed > 20) {
                const turnIntensity = Math.min(speedRatio * 1.5, 1);
                this.tireParticles.setFrequency(50 + turnIntensity * 150);
            } else {
                this.tireParticles.setFrequency(0); // No smoke when not turning
            }
        }
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

