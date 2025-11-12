import { Scene } from 'phaser';
import Matter from 'matter-js';

export class Checkpoint {
    private scene: Scene;
    public sprite: Phaser.Physics.Matter.Sprite;
    private x: number;
    private y: number;
    private width: number;
    private height: number;
    private color: number;
    private isStartLine: boolean;
    public passed: boolean = false;

    constructor(scene: Scene, x: number, y: number, width: number, height: number, color: number, isStartLine: boolean = false) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.isStartLine = isStartLine;
        this.createCheckpoint();
    }

    private createCheckpoint() {
        // Create visual representation
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(this.color);
        graphics.fillRect(0, 0, this.width, this.height);
        
        // Add stripes for visibility
        graphics.lineStyle(4, 0xffffff);
        for (let i = 0; i < this.width; i += 40) {
            graphics.moveTo(i, 0);
            graphics.lineTo(i, this.height);
        }
        
        const textureKey = `checkpoint_${this.x}_${this.y}`;
        graphics.generateTexture(textureKey, this.width, this.height);
        graphics.destroy();

        // Create physics body (sensor - no collision, just detection)
        this.sprite = this.scene.matter.add.sprite(this.x, this.y, textureKey, undefined, {
            isStatic: true,
            isSensor: true, // Sensor doesn't collide, just detects
            shape: {
                type: 'rectangle',
                width: this.width,
                height: this.height
            }
        });

        // Set collision filter to detect car
        const body = this.sprite.body as Matter.Body;
        body.collisionFilter = {
            category: 0x0002, // Checkpoint category
            mask: 0x0001, // Only collide with car (category 0x0001)
            group: 0
        };
    }

    checkCollision(carBody: Matter.Body): boolean {
        const checkpointBody = this.sprite.body as Matter.Body;
        
        // Simple distance check - if car is close enough, consider it passed
        const dx = carBody.position.x - checkpointBody.position.x;
        const dy = carBody.position.y - checkpointBody.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if car is within checkpoint bounds
        const carRadius = Math.max(carBody.bounds.max.x - carBody.bounds.min.x, 
                                   carBody.bounds.max.y - carBody.bounds.min.y) / 2;
        const checkpointRadius = Math.max(this.width, this.height) / 2;
        
        return distance < (carRadius + checkpointRadius);
    }

    reset() {
        this.passed = false;
    }
}

