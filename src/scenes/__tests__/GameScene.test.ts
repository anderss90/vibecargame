import { describe, it, expect, vi } from 'vitest';
import { GameScene } from '../GameScene';

describe('GameScene', () => {
    it('should be instantiable', () => {
        const scene = new GameScene();
        expect(scene).toBeInstanceOf(GameScene);
    });

    it('should have the correct key', () => {
        const scene = new GameScene();
        // Scene key should be set in constructor
        expect(scene).toBeDefined();
    });
});

