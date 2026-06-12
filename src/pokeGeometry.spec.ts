import {
    Engine,
    Mesh,
    MeshBuilder,
    NullEngine,
    Quaternion,
    Scene,
    Vector3,
} from '@babylonjs/core';
import { PokeProbe, probePoke } from './pokeGeometry';

// Hitbox dims mirror a real menu button: wide (40mm) in X/Z, thin (1mm) in
// Y → Y is the press axis.
const HALF_THIN = 0.0005; // 0.5 * 0.001
const HALF_WIDE = 0.02; // 0.5 * 0.04
const MARGIN = 0.004;

describe('probePoke', () => {
    let engine: Engine;
    let scene: Scene;
    let box: Mesh;

    beforeAll(() => {
        engine = new NullEngine();
    });

    beforeEach(() => {
        scene = new Scene(engine);
        box = MeshBuilder.CreateBox('hitBox', { size: 1 }, scene);
        box.scaling = new Vector3(0.04, 0.001, 0.04);
        box.position = Vector3.Zero();
        box.rotationQuaternion = Quaternion.Identity();
        box.computeWorldMatrix(true);
    });

    afterEach(() => {
        box.dispose();
        scene.dispose();
    });

    afterAll(() => {
        engine.dispose();
    });

    const probe = (finger: Vector3) =>
        probePoke(finger, box.getWorldMatrix(), MARGIN);

    it('reports the gap to the near face along the thin (press) axis', () => {
        const p = probe(new Vector3(0, 0.02, 0));
        expect(p.approachGap).toBeCloseTo(0.02 - HALF_THIN, 5);
        expect(p.inFace).toBe(true);
    });

    it('is ~0 at the near face and negative once past it', () => {
        expect(probe(new Vector3(0, HALF_THIN, 0)).approachGap).toBeCloseTo(
            0,
            5
        );
        expect(probe(new Vector3(0, 0, 0)).approachGap).toBeCloseTo(
            -HALF_THIN,
            5
        );
    });

    it('rejects fingertips outside the wide face (beyond margin), accepts within margin', () => {
        expect(
            probe(new Vector3(HALF_WIDE + MARGIN + 0.002, 0.001, 0)).inFace
        ).toBe(false);
        expect(
            probe(new Vector3(HALF_WIDE + MARGIN - 0.001, 0.001, 0)).inFace
        ).toBe(true);
    });

    it('follows the oriented box under rotation (thin axis rotated onto world X)', () => {
        box.rotationQuaternion = Quaternion.RotationAxis(
            new Vector3(0, 0, 1),
            Math.PI / 2
        );
        box.computeWorldMatrix(true);

        const p = probe(new Vector3(0.02, 0, 0));
        expect(p.approachGap).toBeCloseTo(0.02 - HALF_THIN, 5);
        expect(p.inFace).toBe(true);
    });

    it('writes into the provided out object (allocation-free contract)', () => {
        const out: PokeProbe = { approachGap: 0, inFace: false };
        const result = probePoke(
            new Vector3(0, 0.02, 0),
            box.getWorldMatrix(),
            MARGIN,
            out
        );
        expect(result).toBe(out);
        expect(out.approachGap).toBeCloseTo(0.02 - HALF_THIN, 5);
    });
});
