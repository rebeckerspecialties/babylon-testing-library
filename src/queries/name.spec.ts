import { Engine, Mesh, MeshBuilder, NullEngine, Scene } from '@babylonjs/core';
import {
    findByName,
    getAllByName,
    getByName,
    queryAllByName,
    queryByName,
} from './name';
import { AdvancedDynamicTexture, Button, Grid } from '@babylonjs/gui';
import { BabylonContainer } from './utils';

describe('name query', () => {
    let scene: Scene,
        engine: Engine,
        texture: AdvancedDynamicTexture,
        containerControl: Grid,
        expectedControl: Button,
        uiPlane: Mesh;

    beforeAll(() => {
        engine = new NullEngine();
    });

    beforeEach(() => {
        scene = new Scene(engine);

        uiPlane = MeshBuilder.CreatePlane('container');
        texture = AdvancedDynamicTexture.CreateForMesh(uiPlane);

        containerControl = new Grid('container');
        containerControl.addColumnDefinition(1);
        containerControl.addColumnDefinition(1);
        texture.addControl(containerControl);

        expectedControl = Button.CreateSimpleButton('searchButton', 'Search');
        containerControl.addControl(expectedControl, 0, 0);
    });

    afterEach(() => {
        texture.dispose();
        uiPlane.material?.dispose();
        uiPlane.dispose();
        scene.dispose();
    });

    afterAll(() => {
        engine.dispose();
    });

    const scenarios: [string, () => BabylonContainer][] = [
        ['a scene', () => scene],
        ['a texture', () => texture],
        ['a control', () => containerControl],
    ];

    describe.each(scenarios)('when querying %s', (_label, getContainer) => {
        it('should find a control by name', () => {
            const container = getContainer();
            expect(queryByName(container, 'searchButton')).toEqual(
                expectedControl
            );
            expect(getByName(container, 'searchButton')).toEqual(
                expectedControl
            );
        });

        it('should return null from queryByName for a missing name', () => {
            expect(queryByName(getContainer(), 'missing')).toEqual(null);
        });

        it('should throw from getByName for a missing name', () => {
            const container = getContainer();
            expect(() => getByName(container, 'missing')).toThrow(
                new Error(
                    `Unable to find an element with the name: missing. Container: ${container}`
                )
            );
        });

        it('should throw from getByName when multiple controls share the name', () => {
            const container = getContainer();
            const duplicate = Button.CreateSimpleButton(
                'searchButton',
                'Search again'
            );
            containerControl.addControl(duplicate, 0, 1);

            expect(() => getByName(container, 'searchButton')).toThrow(
                /Found multiple elements with the name: searchButton/
            );
            expect(getAllByName(container, 'searchButton')).toHaveLength(2);
            expect(queryAllByName(container, 'searchButton')).toEqual([
                expectedControl,
                duplicate,
            ]);
        });
    });

    it('findByName resolves when the control appears via a fake-clock timer', async () => {
        jest.useFakeTimers();
        try {
            const delayed = Button.CreateSimpleButton('lateButton', 'Late');
            setTimeout(() => {
                containerControl.addControl(delayed, 0, 1);
            }, 2000);

            const resultControl = await findByName(scene, 'lateButton');
            expect(resultControl).toEqual(delayed);
        } finally {
            jest.useRealTimers();
        }
    });
});
