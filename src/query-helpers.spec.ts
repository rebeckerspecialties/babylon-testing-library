import { Engine, Mesh, MeshBuilder, NullEngine, Scene } from '@babylonjs/core';

import {
    AdvancedDynamicTexture,
    Control,
    Grid,
    TextBlock,
} from '@babylonjs/gui';
import { BabylonContainer } from './queries/utils';
import {
    getMultipleElementsFoundError,
    queryAllByAttribute,
    queryByAttribute,
} from './query-helpers';

describe('query-helpers', () => {
    let scene: Scene,
        engine: Engine,
        texture: AdvancedDynamicTexture,
        containerControl: Grid,
        expectedControl: Control,
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

        expectedControl = new TextBlock('text', 'Hello World!');
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

    describe.each(scenarios)(
        'query*ByAttribute within %s',
        (_label, getContainer) => {
            it('should queryAllByAttribute', () => {
                const container = getContainer();

                const controls = queryAllByAttribute(
                    'width',
                    container,
                    '100%'
                );

                expect(controls).toHaveLength(2);
                expect(controls).toEqual([containerControl, expectedControl]);
            });

            it('should error when queryByAttribute finds multiple elements', () => {
                const container = getContainer();

                expect(() => {
                    queryByAttribute('width', container, '100%');
                }).toThrow(
                    getMultipleElementsFoundError(
                        'Found multiple elements by [width=100%]',
                        container
                    )
                );
            });
        }
    );

    describe('query*ByAttribute within itself', () => {
        it('should queryAllByAttribute', () => {
            const controls = queryAllByAttribute(
                'width',
                expectedControl,
                '100%'
            );

            expect(controls).toHaveLength(1);
            expect(controls).toEqual([expectedControl]);
        });

        it('should return a single element', () => {
            const control = queryByAttribute('width', expectedControl, '100%');

            expect(control).toEqual(expectedControl);
        });

        it('should return null if no element is found', () => {
            const control = queryByAttribute('width', expectedControl, '99%%');

            expect(control).toEqual(null);
        });
    });
});
