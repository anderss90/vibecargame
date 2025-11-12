import { Scene } from 'phaser';
import Matter from 'matter-js';

export class Track {
    private scene: Scene;
    private walls: Phaser.Physics.Matter.Sprite[] = [];

    constructor(scene: Scene) {
        this.scene = scene;
        this.createTrack();
    }

    private createTrack() {
        // Create a simple oval track (4x larger, 2x wider)
        const trackWidth = 4800; // 2400 * 2 (2x wider)
        const trackHeight = 1600; // 400 * 4 (height stays same)
        const wallThickness = 80; // 20 * 4
        const centerX = 4800; // Adjusted to center the wider track
        const centerY = 2400; // 600 * 4

        // Outer walls
        this.createWall(centerX, centerY - trackHeight / 2, trackWidth, wallThickness); // Top
        this.createWall(centerX, centerY + trackHeight / 2, trackWidth, wallThickness); // Bottom
        this.createWall(centerX - trackWidth / 2, centerY, wallThickness, trackHeight); // Left
        this.createWall(centerX + trackWidth / 2, centerY, wallThickness, trackHeight); // Right

        // Inner walls (to create a track shape)
        const innerWidth = trackWidth - 800; // 200 * 4
        const innerHeight = trackHeight - 800; // 200 * 4
        this.createWall(centerX, centerY - innerHeight / 2, innerWidth, wallThickness, 0x666666); // Top inner
        this.createWall(centerX, centerY + innerHeight / 2, innerWidth, wallThickness, 0x666666); // Bottom inner
        this.createWall(centerX - innerWidth / 2, centerY, wallThickness, innerHeight, 0x666666); // Left inner
        this.createWall(centerX + innerWidth / 2, centerY, wallThickness, innerHeight, 0x666666); // Right inner

        // Create track surface visual
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0x333333);
        graphics.fillRect(centerX - trackWidth / 2, centerY - trackHeight / 2, trackWidth, trackHeight);
        
        // Fill inner area with grass
        graphics.fillStyle(0x228B22);
        graphics.fillRect(centerX - innerWidth / 2, centerY - innerHeight / 2, innerWidth, innerHeight);
        
        graphics.setDepth(-1);
    }

    private createWall(x: number, y: number, width: number, height: number, color: number = 0xff0000) {
        // Create visual
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(color);
        graphics.fillRect(0, 0, width, height);
        graphics.generateTexture(`wall_${x}_${y}`, width, height);
        graphics.destroy();

        // Create physics body
        const wall = this.scene.matter.add.sprite(x, y, `wall_${x}_${y}`, undefined, {
            isStatic: true,
            shape: {
                type: 'rectangle',
                width: width,
                height: height
            }
        });

        this.walls.push(wall);
    }

    getWalls(): Phaser.Physics.Matter.Sprite[] {
        return this.walls;
    }
}

