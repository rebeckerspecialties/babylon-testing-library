import {
    AbstractMesh,
    Engine,
    MeshBuilder,
    NullEngine,
    Scene,
} from '@babylonjs/core';
import {
    findByMeshName,
    getAllByMeshName,
    getByMeshName,
    queryAllByMeshName,
    queryByMeshName,
} from './mesh-name';

describe('mesh name query', () => {
    let scene: Scene, engine: Engine, expectedMesh: AbstractMesh;

    beforeAll(() => {
        engine = new NullEngine();
    });

    beforeEach(() => {
        scene = new Scene(engine);
        expectedMesh = MeshBuilder.CreateBox('hitBox', { size: 1 }, scene);
    });

    afterEach(() => {
        scene.dispose();
    });

    afterAll(() => {
        engine.dispose();
    });

    it('should find a mesh by name', () => {
        expect(queryByMeshName(scene, 'hitBox')).toEqual(expectedMesh);
        expect(getByMeshName(scene, 'hitBox')).toEqual(expectedMesh);
    });

    it('should return null from queryByMeshName for a missing name', () => {
        expect(queryByMeshName(scene, 'missing')).toEqual(null);
    });

    it('should throw a count-bearing error from getByMeshName for a missing name', () => {
        expect(() => getByMeshName(scene, 'missing')).toThrow(
            new Error(
                'Unable to find a mesh with the name: missing. Scene contains 1 mesh(es)'
            )
        );
    });

    it('should report multiple matches', () => {
        const duplicate = MeshBuilder.CreateBox('hitBox', { size: 1 }, scene);

        expect(() => getByMeshName(scene, 'hitBox')).toThrow(
            /Found multiple meshes with the name: hitBox/
        );
        expect(getAllByMeshName(scene, 'hitBox')).toEqual([
            expectedMesh,
            duplicate,
        ]);
        expect(queryAllByMeshName(scene, 'hitBox')).toHaveLength(2);
    });

    it('findByMeshName resolves when the mesh appears via a fake-clock timer', async () => {
        jest.useFakeTimers();
        try {
            setTimeout(() => {
                MeshBuilder.CreateBox('lateMesh', { size: 1 }, scene);
            }, 3000);

            const resultMesh = await findByMeshName(scene, 'lateMesh');
            expect(resultMesh.name).toEqual('lateMesh');
        } finally {
            jest.useRealTimers();
        }
    });
});
