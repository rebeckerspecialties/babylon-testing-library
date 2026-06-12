import {
    Engine,
    Mesh,
    MeshBuilder,
    NullEngine,
    PointerEventTypes,
    PointerInfo,
    Quaternion,
    Scene,
    Vector3,
} from '@babylonjs/core';
import { POKE_POINTER_TYPE, pokeFrame, pokeRelease } from './pokeEmitter';
import {
    createPokeMemory,
    DEFAULT_POKE_THRESHOLDS,
    PokeMemory,
} from './pokeStateMachine';

const T = DEFAULT_POKE_THRESHOLDS;

describe('pokeFrame / pokeRelease', () => {
    let engine: Engine;
    let scene: Scene;
    let hitBox: Mesh;
    let mem: PokeMemory;
    let received: PointerInfo[];

    beforeAll(() => {
        engine = new NullEngine();
    });

    beforeEach(() => {
        mem = createPokeMemory();
        scene = new Scene(engine);
        received = [];
        scene.onPointerObservable.add((pointerInfo) => {
            received.push(pointerInfo);
        });

        // A real menu button hitbox: wide (40mm) in X/Z, thin (1mm) in Y →
        // the finger pokes along world Y.
        hitBox = MeshBuilder.CreateBox('hitBox', { size: 1 }, scene);
        hitBox.scaling = new Vector3(0.04, 0.001, 0.04);
        hitBox.rotationQuaternion = Quaternion.Identity();
        hitBox.computeWorldMatrix(true);
    });

    afterEach(() => {
        scene.dispose();
    });

    afterAll(() => {
        engine.dispose();
    });

    const poke = (finger: Vector3, nowMs: number) =>
        pokeFrame(scene, finger, [hitBox], mem, nowMs, T);

    const types = () => received.map((pointerInfo) => pointerInfo.type);

    it('emits move, down, then up as the finger pokes in and withdraws', () => {
        poke(new Vector3(0, 0.01, 0), 0); // hover
        poke(new Vector3(0, 0, 0), 16); // press (reaches the face)
        poke(new Vector3(0, 0.01, 0), 32); // withdraw → release

        expect(types()).toEqual([
            PointerEventTypes.POINTERMOVE,
            PointerEventTypes.POINTERDOWN,
            PointerEventTypes.POINTERUP,
        ]);
        for (const pointerInfo of received) {
            expect(pointerInfo.pickInfo?.hit).toBe(true);
            expect(pointerInfo.pickInfo?.pickedMesh).toEqual(hitBox);
        }
    });

    it('tags every synthetic event with the xr-near pointerType', () => {
        poke(new Vector3(0, 0.01, 0), 0);
        poke(new Vector3(0, 0, 0), 16);

        const events = received.map(
            (pointerInfo) =>
                pointerInfo.event as unknown as { pointerType?: string }
        );
        expect(events.length).toBeGreaterThanOrEqual(2);
        for (const event of events) {
            expect(event.pointerType).toEqual(POKE_POINTER_TYPE);
        }
    });

    it('drives a down/up click consumer exactly once per poke', () => {
        // Minimal mesh-button pipeline: primed by down on the hitbox,
        // clicking on the following up — the contract OrnamentButton-style
        // components consume.
        let primed = false;
        let clicks = 0;
        scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.pickInfo?.pickedMesh !== hitBox) {
                return;
            }
            if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
                primed = true;
            } else if (
                pointerInfo.type === PointerEventTypes.POINTERUP &&
                primed
            ) {
                primed = false;
                clicks += 1;
            }
        });

        poke(new Vector3(0, 0.01, 0), 0);
        poke(new Vector3(0, 0, 0), 16);
        poke(new Vector3(0, 0.01, 0), 32);

        expect(clicks).toEqual(1);
    });

    it('emits nothing when the finger stays laterally off the button face', () => {
        // 30mm off-centre in X: outside the 20mm half-face + 4mm margin.
        poke(new Vector3(0.03, 0.01, 0), 0);
        poke(new Vector3(0.03, 0, 0), 16);
        poke(new Vector3(0.03, 0.01, 0), 32);

        expect(received).toEqual([]);
    });

    it('debounces a second poke within the debounce window', () => {
        poke(new Vector3(0, 0.01, 0), 0);
        poke(new Vector3(0, 0, 0), 16);
        poke(new Vector3(0, 0.01, 0), 32); // release #1 at t=32

        const afterFirstPoke = types();

        // immediate re-poke inside the 250ms window must not press again
        poke(new Vector3(0, 0, 0), 60);
        poke(new Vector3(0, 0.01, 0), 80);
        expect(types()).toEqual(afterFirstPoke);

        // ...but a poke after the window presses again
        poke(new Vector3(0, 0, 0), 320);
        expect(types()).toEqual([
            ...afterFirstPoke,
            PointerEventTypes.POINTERDOWN,
        ]);
    });

    it('skips disabled hitboxes entirely', () => {
        // isEnabled() folds in every ancestor: palm/gaze gates and face
        // toggles gate pokes exactly as they gate rendering. A poke into a
        // disabled hitbox must do nothing.
        hitBox.setEnabled(false);

        poke(new Vector3(0, 0.01, 0), 0);
        poke(new Vector3(0, 0, 0), 16);
        poke(new Vector3(0, 0.01, 0), 32);

        expect(received).toEqual([]);
    });

    it('targets the nearest in-face hitbox when several are in range', () => {
        const nearer = MeshBuilder.CreateBox('nearer', { size: 1 }, scene);
        nearer.scaling = new Vector3(0.04, 0.001, 0.04);
        nearer.position = new Vector3(0, 0.005, 0);
        nearer.rotationQuaternion = Quaternion.Identity();
        nearer.computeWorldMatrix(true);

        pokeFrame(
            scene,
            new Vector3(0, 0.0065, 0),
            [hitBox, nearer],
            mem,
            0,
            T
        );

        expect(types()).toEqual([PointerEventTypes.POINTERMOVE]);
        expect(received[0].pickInfo?.pickedMesh).toEqual(nearer);
    });

    it('pokeRelease while only hovering clears state with a hover-out and no click', () => {
        poke(new Vector3(0, 0.01, 0), 0); // hover, no press

        pokeRelease(scene, mem, 16, T); // hand tracking drops the fingertip

        expect(mem.hoverMesh).toBeNull();
        expect(mem.pressed).toBe(false);
        expect(types()).toEqual([
            PointerEventTypes.POINTERMOVE, // hover-in
            PointerEventTypes.POINTERMOVE, // hover-out (null pick)
        ]);
        expect(received[1].pickInfo?.hit).toBe(false);
        expect(received[1].pickInfo?.pickedMesh).toBeNull();
    });

    it('pokeRelease on a held press releases once; a re-tracked frame adds no stale release', () => {
        poke(new Vector3(0, 0.01, 0), 0); // hover
        poke(new Vector3(0, 0, 0), 16); // press (down)

        // Hand tracking drops the fingertip mid-press: the press completes
        // its release now...
        pokeRelease(scene, mem, 32, T);
        expect(types()).toEqual([
            PointerEventTypes.POINTERMOVE,
            PointerEventTypes.POINTERDOWN,
            PointerEventTypes.POINTERMOVE, // hover-out
            PointerEventTypes.POINTERUP,
        ]);
        expect(mem.pressed).toBe(false);
        expect(mem.pressedMesh).toBeNull();

        // ...and the re-tracked frame (finger already withdrawn, outside the
        // debounce window) must NOT fire a second, stale release.
        const afterRelease = types();
        poke(new Vector3(0, 0.01, 0), 400);
        // a hover-in move is fine; no down/up may appear
        const newEvents = types().slice(afterRelease.length);
        expect(newEvents).toEqual([PointerEventTypes.POINTERMOVE]);
    });
});
