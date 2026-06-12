import {
    AbstractMesh,
    Mesh,
    Nullable,
    PickingInfo,
    PointerEventTypes,
    PointerInfo,
    Ray,
    Scene,
    Vector3,
} from '@babylonjs/core';
import { RealTimeWaitOptions, waitForRealTime } from './realTimeWaits';

/**
 * Pointer simulation for 3D meshes. GUI controls receive events through
 * their own observables (see fireEvent), but mesh interactions in Babylon
 * flow through `scene.onPointerObservable` with a `PickingInfo` — these
 * helpers perform a real ray pick against the mesh and then notify the scene
 * observable, exactly as Babylon's input layer would.
 */
export interface MeshPickOptions extends RealTimeWaitOptions {
    /**
     * Ray origin for the pick. Defaults to the active camera's position,
     * falling back to the world origin (pass an explicit origin for
     * camera-less NullEngine scenes with meshes at the origin).
     */
    origin?: Vector3;
    /**
     * Pick predicate. Defaults to the target mesh itself, honoring
     * isPickable/isEnabled/isVisible the way Babylon's default pick
     * predicate does. Note that per Babylon semantics an explicit filter
     * REPLACES those checks rather than adding to them.
     */
    filter?: (mesh: AbstractMesh) => boolean;
}

export interface MeshPointerEventOptions extends MeshPickOptions {
    /**
     * `pointerType` tag for the synthesized DOM event (e.g. 'xr-near' for
     * near-interaction pokes); components can branch on it the way Babylon's
     * WebXR input does.
     */
    pointerType?: string;
}

const resolveOrigin = (scene: Scene, origin?: Vector3): Vector3 =>
    origin ?? scene.activeCamera?.globalPosition ?? Vector3.Zero();

/**
 * Ray-picks the given mesh, rendering the scene and recomputing the pick
 * target inside every retry — world matrices (including thin instances) may
 * not have settled yet, and a stale target is a classic source of pick
 * flakes under CI load. The wait is enforced in real elapsed time, so this
 * stays correct under jest fake timers.
 */
export const getPickInfo = (
    scene: Scene,
    mesh: AbstractMesh,
    options: MeshPickOptions = {}
): Promise<PickingInfo> => {
    const {
        origin,
        filter = (candidate: AbstractMesh) =>
            candidate === mesh &&
            candidate.isPickable &&
            candidate.isEnabled() &&
            candidate.isVisible,
        ...waitOptions
    } = options;

    return waitForRealTime(() => {
        scene.render();
        const rayOrigin = resolveOrigin(scene, origin);
        const target = mesh.absolutePosition;
        const pickInfo = scene.pickWithRay(
            new Ray(rayOrigin, target.subtract(rayOrigin)),
            filter
        );

        if (pickInfo?.pickedMesh !== mesh) {
            throw new Error(
                `Expected to pick ${mesh.name}, but picked: ${pickInfo?.pickedMesh?.name ?? 'nothing'}`
            );
        }

        return pickInfo;
    }, waitOptions);
};

const DOM_TYPE_BY_POINTER_EVENT: Partial<Record<number, string>> = {
    [PointerEventTypes.POINTERDOWN]: 'pointerdown',
    [PointerEventTypes.POINTERUP]: 'pointerup',
    [PointerEventTypes.POINTERMOVE]: 'pointermove',
};

const synthesizePointerEvent = (
    type: number,
    pointerType?: string
): MouseEvent => {
    const event = new MouseEvent(
        DOM_TYPE_BY_POINTER_EVENT[type] ?? 'pointermove'
    );
    if (pointerType !== undefined) {
        // jsdom's MouseEvent has no pointerType; tag it the way Babylon's
        // WebXR near-interaction layer tags its synthesized events.
        Object.defineProperty(event, 'pointerType', { value: pointerType });
    }
    return event;
};

/**
 * Picks the mesh, then notifies `scene.onPointerObservable` once per given
 * pointer event type (`PointerEventTypes` constants, in order), sharing one
 * `PickingInfo`. Returns it.
 */
export const fireMeshPointer = async (
    scene: Scene,
    mesh: AbstractMesh,
    types: number | number[],
    options: MeshPointerEventOptions = {}
): Promise<PickingInfo> => {
    const { pointerType, ...pickOptions } = options;
    const pickInfo = await getPickInfo(scene, mesh, pickOptions);

    const typeList = Array.isArray(types) ? types : [types];
    for (const type of typeList) {
        scene.onPointerObservable.notifyObservers(
            new PointerInfo(
                type,
                synthesizePointerEvent(type, pointerType),
                pickInfo
            )
        );
    }

    return pickInfo;
};

/** Pointer down followed by pointer up on the mesh — a full click. */
export const clickMesh = (
    scene: Scene,
    mesh: AbstractMesh,
    options: MeshPointerEventOptions = {}
): Promise<PickingInfo> =>
    fireMeshPointer(
        scene,
        mesh,
        [PointerEventTypes.POINTERDOWN, PointerEventTypes.POINTERUP],
        options
    );

/** A single pointer move over the mesh — drives hover behaviors. */
export const hoverMesh = (
    scene: Scene,
    mesh: AbstractMesh,
    options: MeshPointerEventOptions = {}
): Promise<PickingInfo> =>
    fireMeshPointer(scene, mesh, PointerEventTypes.POINTERMOVE, options);

/**
 * Ray-picks a specific thin instance of a mesh by decomposing the instance's
 * world matrix into a pick target. Returns Babylon's raw pick result.
 */
export const pickThinInstance = (
    scene: Scene,
    mesh: Mesh,
    index: number,
    options: Pick<MeshPickOptions, 'origin'> = {}
): Nullable<PickingInfo> => {
    const origin = resolveOrigin(scene, options.origin);
    const matrices = mesh.thinInstanceGetWorldMatrices();
    const transform = matrices[index];
    if (!transform) {
        throw new Error(
            `Mesh ${mesh.name} has no thin instance at index ${index} (found ${matrices.length})`
        );
    }
    const position = Vector3.Zero();
    transform.decompose(undefined, undefined, position);
    position.addInPlace(mesh.absolutePosition);

    return scene.pickWithRay(new Ray(origin, position.subtract(origin)));
};
