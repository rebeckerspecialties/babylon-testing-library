import { Engine, Mesh, MeshBuilder, NullEngine, Scene } from '@babylonjs/core';
import { Event, createEvent, fireEvent } from './event';
import { EventMap, eventMap } from './eventMap';
import { AdvancedDynamicTexture, Button, Control, Grid } from '@babylonjs/gui';

describe('event', () => {
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

        expectedControl = new Button('button');
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

    it.each(Object.keys(eventMap))(
        'should create a default event for %s',
        (key: keyof EventMap) => {
            const eventFunc = createEvent[key];
            expect(eventFunc).toBeDefined();

            const event = eventMap[key];
            expect(eventFunc(expectedControl)).toEqual({
                key,
                observableName: event.observableName,
                eventData: event.defaultInit,
            });
        }
    );

    it.each(Object.keys(eventMap))(
        'should fire the %s event',
        (key: keyof EventMap) => {
            const spy = jest.fn();
            const { observableName } = eventMap[key];

            expectedControl[observableName].add(spy as null);

            const fireFunc = fireEvent[key];
            expect(fireFunc).toBeDefined();

            fireFunc(expectedControl);

            expect(spy).toHaveBeenCalledTimes(1);
        }
    );

    it('should throw when fireEvent is called with a bad observable name', () => {
        expect(() => {
            fireEvent(expectedControl, {
                key: 'bogusEvent',
                observableName: 'notAnObservable',
                eventData: {},
            } as unknown as Event<'pointerClick'>);
        }).toThrow(
            new Error(
                `Unable to fire an event - event of type "bogusEvent" does not exist on "${expectedControl.getClassName()}"`
            )
        );
    });
});
