import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Track } from '../Track';
import { Scene } from 'phaser';

// Mock Phaser Scene
const createMockScene = (): Scene => {
    const walls: any[] = [];
    const scene = {
        matter: {
            add: {
                sprite: vi.fn().mockImplementation((x, y, texture, frame, options) => {
                    const wall = {
                        x,
                        y,
                        texture,
                        body: { isStatic: true }
                    };
                    walls.push(wall);
                    return wall;
                })
            }
        },
        add: {
            graphics: vi.fn().mockReturnValue({
                fillStyle: vi.fn().mockReturnThis(),
                fillRect: vi.fn().mockReturnThis(),
                setDepth: vi.fn(),
                generateTexture: vi.fn(),
                destroy: vi.fn()
            })
        }
    } as any;
    (scene as any).walls = walls;
    return scene as Scene;
};

describe('Track', () => {
    let track: Track;
    let scene: Scene;

    beforeEach(() => {
        scene = createMockScene();
        track = new Track(scene);
    });

    it('should create a track with walls', () => {
        const walls = track.getWalls();
        expect(walls.length).toBeGreaterThan(0);
    });

    it('should have 8 walls (4 outer + 4 inner)', () => {
        const walls = track.getWalls();
        expect(walls.length).toBe(8);
    });

    it('should have static walls', () => {
        const walls = track.getWalls();
        walls.forEach(wall => {
            expect((wall.body as any).isStatic).toBe(true);
        });
    });
});

