import { Engine, Mesh, MeshBuilder, NullEngine, Scene } from '@babylonjs/core';
import {
    findAllByDisplayValue,
    findByDisplayValue,
    getAllByDisplayValue,
    getByDisplayValue,
    queryAllByDisplayValue,
    queryByDisplayValue,
} from './display-value';
import {
    AdvancedDynamicTexture,
    Control,
    Grid,
    InputText,
} from '@babylonjs/gui';
import { BabylonContainer } from './utils';
import { getElementError } from '@testing-library/dom';
import { getMultipleElementsFoundError } from '../query-helpers';

describe('display value query', () => {
    let scene: Scene,
        engine: Engine,
        texture: AdvancedDynamicTexture,
        containerControl: Grid,
        expectedControl: InputText,
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

        expectedControl = new InputText('text');
        expectedControl.text = 'Hello World!';
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
        ['itself', () => expectedControl],
    ];

    const allByFunctions: [
        string,
        (container: BabylonContainer, text: string) => Control[]
    ][] = [
        ['getAllByDisplayValue', getAllByDisplayValue],
        ['queryAllByDisplayValue', queryAllByDisplayValue],
    ];

    const singleFunctions: [
        string,
        (container: BabylonContainer, text: string) => Control
    ][] = [
        ['getByDisplayValue', getByDisplayValue],
        ['queryByDisplayValue', queryByDisplayValue],
    ];

    describe.each(scenarios)('When querying %s', (_label, getContainer) => {
        describe('with a single matching element', () => {
            it.each(allByFunctions)(
                'should %s for a control with matching text',
                (_label, allByText) => {
                    const container = getContainer();
                    const resultControl = allByText(container, 'Hello World!');
                    expect(resultControl).toBeDefined();
                    expect(resultControl).toHaveLength(1);
                    expect(resultControl[0]).toEqual(expectedControl);
                }
            );

            it.each(singleFunctions)(
                'should %s for a control with matching text',
                (_label, singleText) => {
                    const container = getContainer();
                    const resultControl = singleText(container, 'Hello World!');
                    expect(resultControl).toEqual(expectedControl);
                }
            );

            it('should wait for an element with matching text', async () => {
                const container = getContainer();
                const resultControl = await findByDisplayValue(
                    container,
                    'Hello World!'
                );
                expect(resultControl).toEqual(expectedControl);
            });

            it('should wait for elements with matching text', async () => {
                const container = getContainer();
                const resultControl = await findAllByDisplayValue(
                    container,
                    'Hello World!'
                );
                expect(resultControl).toEqual([expectedControl]);
            });
        });

        describe('with no matching elements', () => {
            it('should return an empty list when querying non-existent text with queryAllByDisplayValue', () => {
                const container = getContainer();
                const resultControl = queryAllByDisplayValue(
                    container,
                    'Not real text'
                );
                expect(resultControl).toEqual([]);
            });

            it('should return null when querying non-existent text with queryByDisplayValue', () => {
                const container = getContainer();
                const resultControl = queryByDisplayValue(
                    container,
                    'Not real text'
                );
                expect(resultControl).toEqual(null);
            });

            it('should error when querying non-existent text with getAllByDisplayValue', () => {
                const container = getContainer();
                expect(() =>
                    getAllByDisplayValue(container, 'Not real text')
                ).toThrow(
                    new Error(
                        `Unable to find an element with the display value: Not real text. Container: ${container}`
                    )
                );
            });

            it('should error when querying non-existent text with getByDisplayValue', () => {
                const container = getContainer();
                expect(() =>
                    getByDisplayValue(container, 'Not real text')
                ).toThrow(
                    new Error(
                        `Unable to find an element with the display value: Not real text. Container: ${container}`
                    )
                );
            });

            it('should throw with findByText after waiting for the timeout', async () => {
                const container = getContainer();
                await expect(
                    findByDisplayValue(container, 'Not real text', {
                        timeout: 10,
                    })
                ).rejects.toEqual(
                    getElementError(
                        `Unable to find an element with the display value: Not real text. Container: ${container}`,
                        document.firstElementChild as HTMLElement
                    )
                );
            });

            it('should throw with findAllByText after waiting for the timeout', async () => {
                const container = getContainer();
                await expect(
                    findAllByDisplayValue(container, 'Not real text', {
                        timeout: 10,
                    })
                ).rejects.toEqual(
                    getElementError(
                        `Unable to find an element with the display value: Not real text. Container: ${container}`,
                        document.firstElementChild as HTMLElement
                    )
                );
            });
        });

        describe('with multiple matching elements', () => {
            let duplicateControl: InputText;

            beforeEach(() => {
                containerControl.setRowDefinition(0, 0.5);
                containerControl.addColumnDefinition(0.5);

                duplicateControl = new InputText('text');
                duplicateControl.text = 'Hello World!';
                containerControl.addControl(duplicateControl, 0, 1);
            });

            it.each(allByFunctions)(
                'should return multiple controls when querying with %s',
                (_label, allByText) => {
                    const container = getContainer();
                    if (container === expectedControl) {
                        return;
                    }

                    const resultControl = allByText(container, 'Hello World!');
                    expect(resultControl).toHaveLength(2);
                    expect(resultControl).toEqual([
                        expectedControl,
                        duplicateControl,
                    ]);
                }
            );

            it.each(allByFunctions)(
                'should return a single control',
                (_label, allByText) => {
                    if (getContainer() !== expectedControl) {
                        return;
                    }

                    const resultControl = allByText(
                        expectedControl,
                        'Hello World!'
                    );
                    expect(resultControl).toHaveLength(1);
                    expect(resultControl).toEqual([expectedControl]);
                }
            );

            it.each(singleFunctions)(
                'should error when finding multiple controls with %s',
                (_label, singleText) => {
                    const container = getContainer();
                    if (container === expectedControl) {
                        return;
                    }

                    expect(() => singleText(container, 'Hello World!')).toThrow(
                        new Error(
                            `Found multiple elements with the display value: Hello World!\n\n(If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)). Container: ${container}`
                        )
                    );
                }
            );

            it.each(singleFunctions)(
                'should return a single control',
                (_label, singleText) => {
                    if (getContainer() !== expectedControl) {
                        return;
                    }

                    const resultControl = singleText(
                        expectedControl,
                        'Hello World!'
                    );
                    expect(resultControl).toEqual(expectedControl);
                }
            );

            it('should wait for a single control', async () => {
                if (getContainer() !== expectedControl) {
                    return;
                }

                const resultControl = await findByDisplayValue(
                    expectedControl,
                    'Hello World!'
                );
                expect(resultControl).toEqual(expectedControl);
            });

            it('should reject if multiple elements are found', async () => {
                const container = getContainer();
                if (container === expectedControl) {
                    return;
                }

                await expect(
                    findByDisplayValue(container, 'Hello World!')
                ).rejects.toEqual(
                    getElementError(
                        getMultipleElementsFoundError(
                            'Found multiple elements with the display value: Hello World!',
                            container
                        ).message,
                        document.firstElementChild as HTMLElement
                    )
                );
            });

            it('should wait for a single control with findAllByText', async () => {
                if (getContainer() !== expectedControl) {
                    return;
                }

                const resultControl = await findAllByDisplayValue(
                    expectedControl,
                    'Hello World!'
                );
                expect(resultControl).toEqual([expectedControl]);
            });

            it('should reject if multiple elements are found', async () => {
                const container = getContainer();
                if (container === expectedControl) {
                    return;
                }

                const resultControl = await findAllByDisplayValue(
                    container,
                    'Hello World!'
                );
                expect(resultControl).toHaveLength(2);
                expect(resultControl).toEqual([
                    expectedControl,
                    duplicateControl,
                ]);
            });
        });
    });
});
