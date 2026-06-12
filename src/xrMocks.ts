import {
    AbstractMesh,
    IMotionControllerProfile,
    IWebXRFeature,
    Observable,
    Quaternion,
    Scene,
    TransformNode,
    WebXRAbstractMotionController,
    WebXRDefaultExperience,
    WebXRFeatureName,
    WebXRHand,
    WebXRHandTracking,
    WebXRInputSource,
    WebXRState,
} from '@babylonjs/core';

/**
 * Headless mocks for Babylon's WebXR surface, for testing hand- and
 * controller-driven UI (hand menus, controller menus, near interaction)
 * without a device, a session, or GLB controller assets. The observables are
 * real Babylon Observables — tests drive them with notifyObservers.
 */

export interface MockXrController {
    onButtonStateChangedObservable: Observable<unknown>;
    onAxisValueChangedObservable: Observable<unknown>;
    mockController: WebXRAbstractMotionController;
}

/**
 * A motion controller whose every component shares one pair of button/axis
 * observables — notify them to simulate input on whatever component the code
 * under test requested. `onGetComponent` observes which components are
 * looked up.
 */
export function createMockXrController(
    onGetComponent?: (button: string) => void
): MockXrController {
    const onButtonStateChangedObservable = new Observable<unknown>();
    const onAxisValueChangedObservable = new Observable<unknown>();
    const onModelLoadedObservable = new Observable<unknown>();

    const mockController = {
        getComponent: (button: string) => {
            onGetComponent?.(button);
            return {
                onAxisValueChangedObservable,
                onButtonStateChangedObservable,
            };
        },
        handedness: 'right',
        onModelLoadedObservable,
    } as unknown as WebXRAbstractMotionController;

    return {
        onButtonStateChangedObservable,
        onAxisValueChangedObservable,
        mockController,
    };
}

export interface MockXrComponentObservables {
    onButtonStateChangedObservable: Observable<unknown>;
    onAxisValueChangedObservable: Observable<unknown>;
}

/**
 * A motion controller with a distinct observable pair per named component
 * binding, for tests that need to tell thumbstick input from button input.
 */
export function createMockXrControllerWithBindings(bindings: string[]) {
    const componentObservableMap: Record<string, MockXrComponentObservables> =
        Object.fromEntries(
            bindings.map((button) => {
                const onButtonStateChangedObservable =
                    new Observable<unknown>();
                const onAxisValueChangedObservable = new Observable<unknown>();
                return [
                    button,
                    {
                        onButtonStateChangedObservable,
                        onAxisValueChangedObservable,
                    },
                ];
            })
        );

    const mockController = {
        getComponent: (button: string) => {
            return componentObservableMap[button];
        },
        handedness: 'right',
        onModelLoadedObservable: new Observable<unknown>(),
    } as unknown as WebXRAbstractMotionController;

    return { mockController, componentObservableMap };
}

export interface MockXrInputSourceOptions {
    /** Invoked when the first observer of onMotionControllerInitObservable is added. */
    onMotionControllerInit?: () => void;
    /** Invoked when the first observer of onMeshLoadedObservable is added. */
    onMeshLoaded?: () => void;
    handedness?: XRHandedness;
}

/**
 * An XR input source with an 'xr-standard' gamepad mapping and a stub
 * pointer mesh — enough for controller-discovery and menu-placement logic.
 */
export function createMockXrInputSource(
    options: MockXrInputSourceOptions = {}
): WebXRInputSource {
    const {
        onMotionControllerInit,
        onMeshLoaded,
        handedness = 'right',
    } = options;

    return {
        onMotionControllerInitObservable: new Observable(
            onMotionControllerInit
        ),
        onMeshLoadedObservable: new Observable(onMeshLoaded),
        inputSource: {
            handedness,
            gamepad: {
                mapping: 'xr-standard',
            },
            profiles: ['pico-4'],
        },
        pointer: {
            getChildMeshes: () => [],
            setEnabled: () => null,
        } as unknown as AbstractMesh,
    } as WebXRInputSource;
}

export interface MockXrExperienceOptions {
    /** Invoked when the first observer of input.onControllerAddedObservable is added. */
    onControllerAdded?: () => void;
    /** When true, getEnabledFeature(HAND_TRACKING) returns a mock hand-tracking feature. */
    handTrackingEnabled?: boolean;
    state?: WebXRState;
    getHandByControllerId?: (id: string) => WebXRHand;
    getHandByHandedness?: (handedness: XRHandedness) => WebXRHand;
}

/**
 * A WebXRDefaultExperience covering the observable surface hand/controller
 * menu code touches: controller added, state changes, session init, and the
 * hand-tracking feature lookup.
 */
export function createMockXrExperience(
    options: MockXrExperienceOptions = {}
): WebXRDefaultExperience {
    const {
        onControllerAdded,
        handTrackingEnabled = false,
        state = WebXRState.IN_XR,
        getHandByControllerId = () => null as unknown as WebXRHand,
        getHandByHandedness = () => null as unknown as WebXRHand,
    } = options;

    return {
        input: {
            onControllerAddedObservable: new Observable(onControllerAdded),
        },
        baseExperience: {
            featuresManager: {
                getEnabledFeature: (value: string) => {
                    if (
                        handTrackingEnabled &&
                        value === WebXRFeatureName.HAND_TRACKING
                    ) {
                        return {
                            onHandAddedObservable: new Observable<WebXRHand>(),
                            onHandRemovedObservable:
                                new Observable<WebXRHand>(),
                            isCompatible: () => true,
                            getHandByControllerId: getHandByControllerId,
                            getHandByHandedness: getHandByHandedness,
                            attach: () => true,
                            detach: () => true,
                            dispose: () => null,
                        } as unknown as WebXRHandTracking;
                    }
                    return undefined as unknown as IWebXRFeature;
                },
            },
            onStateChangedObservable: new Observable(),
            sessionManager: {
                onXRSessionInit: new Observable(),
            },
            state,
        },
    } as WebXRDefaultExperience;
}

/**
 * A WebXRHand whose joint meshes are supplied by name (e.g.
 * 'index-finger-tip'); getJointMesh returns the matching mesh so tests can
 * read or animate a joint's world transform.
 */
export function createMockXrHand(
    jointMeshes: Record<string, AbstractMesh>
): WebXRHand {
    return {
        getJointMesh: (jointName: string) => jointMeshes[jointName],
        handMesh: null,
    } as unknown as WebXRHand;
}

/**
 * An XRSession that records event listeners into the given registry so tests
 * can invoke them (e.g. registry['end']()) to simulate session events.
 */
export function createMockXRSession(
    registry: Record<string, () => void>
): XRSession {
    return {
        addEventListener: (name: string, callback: () => void) => {
            registry[name] = callback;
        },
        removeEventListener: (name: string) => {
            delete registry[name];
        },
        visibilityState: 'visible',
    } as unknown as XRSession;
}

/**
 * Builds minimal controller node hierarchies from a WebXR motion controller
 * profile: the pressed min/max/value nodes for each visual response, so
 * button/thumbstick animation code runs without loading GLB assets.
 * Thumbstick Y-axis responses keep min == max so a mid-step lerp reaches an
 * assertable position.
 */
export function buildMockControllersFromProfile(
    profile: IMotionControllerProfile,
    scene: Scene
): Record<string, AbstractMesh> {
    const make = (handedness: 'left' | 'right') => {
        // A TransformNode root so instantiateHierarchy clones a hierarchy.
        const root = new TransformNode(`${handedness}-controller-mock`, scene);
        const comps = Object.values(profile.layouts[handedness].components);
        for (const comp of comps) {
            const vr = comp.visualResponses as Record<
                string,
                {
                    valueNodeName: string;
                    minNodeName: string;
                    maxNodeName: string;
                }
            >;
            for (const key in vr) {
                const { valueNodeName, minNodeName, maxNodeName } = vr[key];
                const mk = (name: string): TransformNode => {
                    const tn = new TransformNode(name, scene);
                    tn.rotationQuaternion = Quaternion.Identity();
                    tn.parent = root;
                    return tn;
                };
                const min = mk(minNodeName);
                const max = mk(maxNodeName);
                const value = mk(valueNodeName);
                if (valueNodeName.includes('thumbstick_yaxis')) {
                    min.position.set(0, 0.02, 0);
                    max.position.set(0, 0.02, 0);
                } else {
                    min.position.set(0, 0, 0);
                    max.position.set(0.01, 0.01, 0);
                }
                value.position.set(0, 0, 0);
            }
        }
        return root as unknown as AbstractMesh;
    };
    return { left: make('left'), right: make('right') };
}
