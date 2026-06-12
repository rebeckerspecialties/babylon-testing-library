import {
    Engine,
    FreeCamera,
    Matrix,
    Mesh,
    MeshBuilder,
    NullEngine,
    PointerEventTypes,
    PointerInfo,
    Scene,
    Vector3,
} from '@babylonjs/core';
import {
    clickMesh,
    fireMeshPointer,
    getPickInfo,
    hoverMesh,
    pickThinInstance,
} from './mesh-events';

describe('mesh events', () => {
    let scene: Scene, engine: Engine, button: Mesh;

    beforeAll(() => {
        engine = new NullEngine();
    });

    beforeEach(() => {
        scene = new Scene(engine);
        new FreeCamera('camera', new Vector3(0, 0, -5), scene);
        button = MeshBuilder.CreateBox('button', { size: 1 }, scene);
    });

    afterEach(() => {
        scene.dispose();
    });

    afterAll(() => {
        engine.dispose();
    });

    it('clickMesh fires pointer down then pointer up with a real pick of the mesh', async () => {
        const received: PointerInfo[] = [];
        scene.onPointerObservable.add((pointerInfo) => {
            received.push(pointerInfo);
        });

        const pickInfo = await clickMesh(scene, button);

        expect(received.map((info) => info.type)).toEqual([
            PointerEventTypes.POINTERDOWN,
            PointerEventTypes.POINTERUP,
        ]);
        expect(pickInfo.pickedMesh).toEqual(button);
        expect(received[0].pickInfo?.pickedMesh).toEqual(button);
    });

    it('fireMeshPointer can fire a single pointer up (no down)', async () => {
        const received: PointerInfo[] = [];
        scene.onPointerObservable.add((pointerInfo) => {
            received.push(pointerInfo);
        });

        await fireMeshPointer(scene, button, PointerEventTypes.POINTERUP);

        expect(received.map((info) => info.type)).toEqual([
            PointerEventTypes.POINTERUP,
        ]);
    });

    it('hoverMesh fires a pointer move over the mesh', async () => {
        const received: PointerInfo[] = [];
        scene.onPointerObservable.add((pointerInfo) => {
            received.push(pointerInfo);
        });

        await hoverMesh(scene, button);

        expect(received.map((info) => info.type)).toEqual([
            PointerEventTypes.POINTERMOVE,
        ]);
    });

    it('tags the synthesized event with the requested pointerType', async () => {
        const received: PointerInfo[] = [];
        scene.onPointerObservable.add((pointerInfo) => {
            received.push(pointerInfo);
        });

        await fireMeshPointer(scene, button, PointerEventTypes.POINTERUP, {
            pointerType: 'xr-near',
        });

        const event = received[0].event as unknown as {
            pointerType?: string;
        };
        expect(event.pointerType).toEqual('xr-near');
    });

    it('accepts an explicit ray origin', async () => {
        const pickInfo = await getPickInfo(scene, button, {
            origin: new Vector3(0, 0, 3),
        });
        expect(pickInfo.pickedMesh).toEqual(button);
    });

    it('re-renders and recomputes the pick target on every retry', async () => {
        button.position.set(2, 1, 0);

        const pickInfo = await getPickInfo(scene, button);
        expect(pickInfo.pickedMesh).toEqual(button);
    });

    it('rejects with the pick failure when the mesh cannot be picked', async () => {
        button.isPickable = false;

        await expect(
            getPickInfo(scene, button, { timeout: 150, interval: 25 })
        ).rejects.toThrow('Expected to pick button, but picked: nothing');
    });

    it('pickThinInstance picks a specific thin instance', async () => {
        // thinInstanceAdd is gated on engine instancedArrays support (absent
        // under NullEngine); thinInstanceSetBuffer is plain data and works.
        button.thinInstanceEnablePicking = true;
        const matrices = new Float32Array(32);
        Matrix.Translation(0, 0, 0).copyToArray(matrices, 0);
        Matrix.Translation(2.5, 0, 0).copyToArray(matrices, 16);
        button.thinInstanceSetBuffer('matrix', matrices, 16);
        scene.render();

        const pickInfo = pickThinInstance(scene, button, 1, {
            origin: new Vector3(2.5, 0, -5),
        });

        expect(pickInfo?.pickedMesh).toEqual(button);
        expect(pickInfo?.thinInstanceIndex).toEqual(1);
    });
});
