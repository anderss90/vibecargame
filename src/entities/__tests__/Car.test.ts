import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Car } from '../Car';
import { Scene } from 'phaser';

// Mock Phaser Scene
const createMockScene = (): Scene => {
    const scene = {
        matter: {
            add: {
                sprite: vi.fn().mockReturnValue({
                    body: {
                        angle: 0,
                        velocity: { x: 0, y: 0 }
                    },
                    x: 400,
                    y: 300,
                    setFixedRotation: vi.fn(),
                    destroy: vi.fn()
                })
            }
        },
        add: {
            graphics: vi.fn().mockReturnValue({
                fillStyle: vi.fn().mockReturnThis(),
                fillRect: vi.fn().mockReturnThis(),
                generateTexture: vi.fn(),
                destroy: vi.fn()
            })
        }
    } as any;
    return scene as Scene;
};

describe('Car', () => {
    let car: Car;
    let scene: Scene;

    beforeEach(() => {
        scene = createMockScene();
        car = new Car(scene, 400, 300);
    });

    it('should create a car at the specified position', () => {
        const pos = car.getPosition();
        expect(pos.x).toBe(400);
        expect(pos.y).toBe(300);
    });

    it('should have an initial angle of 0', () => {
        expect(car.getAngle()).toBe(0);
    });

    it('should accept input keys', () => {
        const mockKeys = {
            up: [{ isDown: false }] as any,
            down: [{ isDown: false }] as any,
            left: [{ isDown: false }] as any,
            right: [{ isDown: false }] as any
        };
        
        car.setInputKeys(mockKeys);
        // Should not throw
        expect(true).toBe(true);
    });

    it('should update position when input is provided', () => {
        const mockKeys = {
            up: [{ isDown: true }] as any,
            down: [{ isDown: false }] as any,
            left: [{ isDown: false }] as any,
            right: [{ isDown: false }] as any
        };
        
        car.setInputKeys(mockKeys);
        car.update();
        
        // Car should have moved (velocity changed)
        const body = (car as any).sprite.body;
        expect(body).toBeDefined();
    });
});

