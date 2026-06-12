import {
    AbstractMesh,
    Engine,
    IMotionControllerProfile,
    MeshBuilder,
    NullEngine,
    Scene,
    TransformNode,
    Vector3,
    WebXRFeatureName,
    WebXRState,
} from '@babylonjs/core';
import {
    buildMockControllersFromProfile,
    createMockXRSession,
    createMockXrController,
    createMockXrControllerWithBindings,
    createMockXrExperience,
    createMockXrHand,
    createMockXrInputSource,
    setupBabylonExpect,
} from './index';

setupBabylonExpect();

describe('createMockXrController', () => {
    it('returns shared observables that reach component subscribers', () => {
        const requested: string[] = [];
        const { mockController, onButtonStateChangedObservable } =
            createMockXrController((button) => requested.push(button));

        const component = mockController.getComponent('xr-standard-trigger');
        expect(requested).toEqual(['xr-standard-trigger']);

        const listener = jest.fn();
        component.onButtonStateChangedObservable.add(listener);
        onButtonStateChangedObservable.notifyObservers({ pressed: true });

        expect(listener).toHaveBeenCalledTimes(1);
    });
});

describe('createMockXrControllerWithBindings', () => {
    it('keeps a distinct observable pair per binding', () => {
        const { mockController, componentObservableMap } =
            createMockXrControllerWithBindings([
                'xr-standard-trigger',
                'xr-standard-thumbstick',
            ]);

        const trigger = jest.fn();
        const thumbstick = jest.fn();
        mockController
            .getComponent('xr-standard-trigger')
            .onButtonStateChangedObservable.add(trigger);
        mockController
            .getComponent('xr-standard-thumbstick')
            .onButtonStateChangedObservable.add(thumbstick);

        componentObservableMap[
            'xr-standard-trigger'
        ].onButtonStateChangedObservable.notifyObservers({ pressed: true });

        expect(trigger).toHaveBeenCalledTimes(1);
        expect(thumbstick).not.toHaveBeenCalled();
    });
});

describe('createMockXrInputSource', () => {
    it('defaults to a right-handed xr-standard source', () => {
        const inputSource = createMockXrInputSource();

        expect(inputSource.inputSource.handedness).toEqual('right');
        expect(inputSource.inputSource.gamepad?.mapping).toEqual('xr-standard');
        expect(inputSource.pointer.getChildMeshes()).toEqual([]);
    });

    it('honors the handedness option', () => {
        const inputSource = createMockXrInputSource({ handedness: 'left' });
        expect(inputSource.inputSource.handedness).toEqual('left');
    });
});

describe('createMockXrExperience', () => {
    it('exposes the hand tracking feature when enabled', () => {
        const hand = createMockXrHand({});
        const experience = createMockXrExperience({
            handTrackingEnabled: true,
            getHandByHandedness: () => hand,
        });

        const feature =
            experience.baseExperience.featuresManager.getEnabledFeature(
                WebXRFeatureName.HAND_TRACKING
            );

        expect(feature).toBeDefined();
        expect(
            (
                feature as unknown as {
                    getHandByHandedness: (h: string) => unknown;
                }
            ).getHandByHandedness('left')
        ).toEqual(hand);
    });

    it('returns no feature when hand tracking is disabled', () => {
        const experience = createMockXrExperience();

        expect(
            experience.baseExperience.featuresManager.getEnabledFeature(
                WebXRFeatureName.HAND_TRACKING
            )
        ).toBeUndefined();
        expect(experience.baseExperience.state).toEqual(WebXRState.IN_XR);
    });
});

describe('createMockXrHand', () => {
    let engine: Engine, scene: Scene;

    beforeAll(() => {
        engine = new NullEngine();
    });

    beforeEach(() => {
        scene = new Scene(engine);
    });

    afterEach(() => {
        scene.dispose();
    });

    afterAll(() => {
        engine.dispose();
    });

    it('returns joint meshes by name', () => {
        const tip = MeshBuilder.CreateBox('tip', { size: 0.01 }, scene);
        const hand = createMockXrHand({ 'index-finger-tip': tip });

        expect(hand.getJointMesh('index-finger-tip' as never)).toEqual(tip);
        expect(
            hand.getJointMesh('wrist' as never) as AbstractMesh | undefined
        ).toBeUndefined();
    });
});

describe('createMockXRSession', () => {
    it('records listeners into the registry so tests can fire them', () => {
        const registry: Record<string, () => void> = {};
        const session = createMockXRSession(registry);

        const onEnd = jest.fn();
        session.addEventListener('end', onEnd);
        expect(registry['end']).toBeDefined();

        registry['end']();
        expect(onEnd).toHaveBeenCalledTimes(1);

        session.removeEventListener('end', onEnd);
        expect(registry['end']).toBeUndefined();
        expect(session.visibilityState).toEqual('visible');
    });
});

describe('buildMockControllersFromProfile', () => {
    let engine: Engine, scene: Scene;

    beforeAll(() => {
        engine = new NullEngine();
    });

    beforeEach(() => {
        scene = new Scene(engine);
    });

    afterEach(() => {
        scene.dispose();
    });

    afterAll(() => {
        engine.dispose();
    });

    const profile = {
        layouts: {
            left: {
                components: {
                    'xr-standard-trigger': {
                        visualResponses: {
                            pressed: {
                                valueNodeName: 'trigger_pressed_value',
                                minNodeName: 'trigger_pressed_min',
                                maxNodeName: 'trigger_pressed_max',
                            },
                        },
                    },
                    'xr-standard-thumbstick': {
                        visualResponses: {
                            yaxis: {
                                valueNodeName: 'thumbstick_yaxis_value',
                                minNodeName: 'thumbstick_yaxis_min',
                                maxNodeName: 'thumbstick_yaxis_max',
                            },
                        },
                    },
                },
            },
            right: {
                components: {
                    'xr-standard-trigger': {
                        visualResponses: {
                            pressed: {
                                valueNodeName: 'trigger_pressed_value',
                                minNodeName: 'trigger_pressed_min',
                                maxNodeName: 'trigger_pressed_max',
                            },
                        },
                    },
                },
            },
        },
    } as unknown as IMotionControllerProfile;

    it('creates min/max/value nodes per visual response without GLB assets', () => {
        const { left, right } = buildMockControllersFromProfile(profile, scene);

        expect(left.name).toEqual('left-controller-mock');
        expect(right.name).toEqual('right-controller-mock');

        const names = (left as unknown as TransformNode)
            .getChildren()
            .map((node) => node.name);
        expect(names).toEqual(
            expect.arrayContaining([
                'trigger_pressed_min',
                'trigger_pressed_max',
                'trigger_pressed_value',
                'thumbstick_yaxis_min',
                'thumbstick_yaxis_max',
                'thumbstick_yaxis_value',
            ])
        );
    });

    it('keeps thumbstick y-axis min == max so mid-step lerps are assertable', () => {
        buildMockControllersFromProfile(profile, scene);

        const min = scene.getTransformNodeByName('thumbstick_yaxis_min');
        const max = scene.getTransformNodeByName('thumbstick_yaxis_max');

        expect(min?.position).toEqualVector3(new Vector3(0, 0.02, 0));
        expect(max?.position).toEqualVector3(new Vector3(0, 0.02, 0));
    });
});
