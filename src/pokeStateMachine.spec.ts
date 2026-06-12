import { AbstractMesh } from '@babylonjs/core';
import {
    createPokeMemory,
    DEFAULT_POKE_THRESHOLDS,
    PokeCandidate,
    stepPoke,
} from './pokeStateMachine';

const T = DEFAULT_POKE_THRESHOLDS;

// stepPoke only compares/relays mesh references, so plain objects stand in
// for hitboxes.
const buttonA = { name: 'a' } as unknown as AbstractMesh;
const buttonB = { name: 'b' } as unknown as AbstractMesh;

const cand = (hitbox: AbstractMesh, approachGap: number): PokeCandidate => ({
    hitbox,
    approachGap,
});

describe('stepPoke', () => {
    it('emits a single move when the hovered hitbox changes, nothing while it stays', () => {
        const mem = createPokeMemory();
        expect(stepPoke(mem, cand(buttonA, 0.01), 0, T)).toEqual([
            { type: 'move', mesh: buttonA },
        ]);
        expect(stepPoke(mem, cand(buttonA, 0.01), 16, T)).toEqual([]);
    });

    it('emits move(null) when the finger leaves all hitboxes', () => {
        const mem = createPokeMemory();
        stepPoke(mem, cand(buttonA, 0.01), 0, T);
        expect(stepPoke(mem, null, 16, T)).toEqual([
            { type: 'move', mesh: null },
        ]);
    });

    it('presses at the face and releases only past the hysteresis gap', () => {
        const mem = createPokeMemory();
        stepPoke(mem, cand(buttonA, 0.01), 0, T); // hover

        expect(stepPoke(mem, cand(buttonA, 0.0005), 16, T)).toEqual([
            { type: 'down', mesh: buttonA },
        ]);
        expect(stepPoke(mem, cand(buttonA, 0.0005), 32, T)).toEqual([]); // held
        expect(stepPoke(mem, cand(buttonA, 0.003), 48, T)).toEqual([]); // inside hysteresis band → still held
        expect(stepPoke(mem, cand(buttonA, 0.005), 64, T)).toEqual([
            { type: 'up', mesh: buttonA },
        ]);
    });

    it('debounces a second press within debounceMs of release', () => {
        const mem = createPokeMemory();
        stepPoke(mem, cand(buttonA, 0.01), 1000, T); // hover
        stepPoke(mem, cand(buttonA, 0.0005), 1000, T); // down
        expect(stepPoke(mem, cand(buttonA, 0.01), 1000, T)).toEqual([
            { type: 'up', mesh: buttonA },
        ]);

        // re-press 100ms later is blocked...
        expect(stepPoke(mem, cand(buttonA, 0.0005), 1100, T)).toEqual([]);
        // ...but allowed once the debounce window passes
        expect(stepPoke(mem, cand(buttonA, 0.0005), 1300, T)).toEqual([
            { type: 'down', mesh: buttonA },
        ]);
    });

    it('releases (up) when the finger slides off the pressed button', () => {
        const mem = createPokeMemory();
        stepPoke(mem, cand(buttonA, 0.01), 0, T);
        stepPoke(mem, cand(buttonA, 0.0005), 16, T); // down
        expect(stepPoke(mem, null, 32, T)).toEqual([
            { type: 'move', mesh: null },
            { type: 'up', mesh: buttonA },
        ]);
    });

    it('releases the old button and re-hovers when sliding onto a different one mid-press', () => {
        const mem = createPokeMemory();
        stepPoke(mem, cand(buttonA, 0.01), 0, T);
        stepPoke(mem, cand(buttonA, 0.0005), 16, T); // down on A
        expect(stepPoke(mem, cand(buttonB, 0.0005), 32, T)).toEqual([
            { type: 'move', mesh: buttonB },
            { type: 'up', mesh: buttonA },
        ]);
    });
});
