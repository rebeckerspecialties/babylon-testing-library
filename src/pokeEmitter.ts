import {
    AbstractMesh,
    PickingInfo,
    PointerEventTypes,
    PointerInfo,
    Scene,
    Vector3,
} from '@babylonjs/core';
import { PokeProbe, probePoke } from './pokeGeometry';
import {
    DEFAULT_POKE_THRESHOLDS,
    PokeCandidate,
    PokeEmitType,
    PokeMemory,
    PokeThresholds,
    stepPoke,
} from './pokeStateMachine';

/** Lateral finger radius (m) added to the button face so a slightly-off poke still lands. */
export const POKE_LATERAL_MARGIN = 0.004;

/**
 * pointerType tag on the synthetic events injected by the poke emitter, so
 * global `scene.onPointerObservable` consumers (e.g. world-selection
 * handlers) can recognise and ignore them — and buttons can skip
 * press-squeeze animations that make no sense when a fingertip occludes the
 * button.
 */
export const POKE_POINTER_TYPE = 'xr-near';

const EMIT_TYPE_TO_POINTER_EVENT: Record<PokeEmitType, number> = {
    move: PointerEventTypes.POINTERMOVE,
    down: PointerEventTypes.POINTERDOWN,
    up: PointerEventTypes.POINTERUP,
};

// scratch — reused across frames
const _probe: PokeProbe = {
    approachGap: Number.POSITIVE_INFINITY,
    inFace: false,
};
const _candidate: PokeCandidate = {
    hitbox: null as unknown as AbstractMesh,
    approachGap: 0,
};

let _nearEvent: MouseEvent | undefined;
function nearPointerEvent(): MouseEvent {
    if (!_nearEvent) {
        // MouseEvent carries no pointerType; tag one so consumers can filter
        // poke-synthesized events.
        _nearEvent = new MouseEvent('pointermove');
        Object.defineProperty(_nearEvent, 'pointerType', {
            value: POKE_POINTER_TYPE,
        });
    }
    return _nearEvent;
}

function emitPointer(
    scene: Scene,
    type: PokeEmitType,
    mesh: AbstractMesh | null
): void {
    const pickInfo = new PickingInfo();
    if (mesh) {
        pickInfo.hit = true;
        pickInfo.pickedMesh = mesh;
    }
    scene.onPointerObservable.notifyObservers(
        new PointerInfo(
            EMIT_TYPE_TO_POINTER_EVENT[type],
            nearPointerEvent(),
            pickInfo
        )
    );
}

/**
 * Run one poke frame: pick the hitbox the fingertip is closest to (in-face
 * and within hover range), advance the state machine, and inject the
 * resulting Babylon pointer events into the scene so a mesh-button pipeline
 * reacts exactly as it would to a controller pointer. Disabled hitboxes are
 * skipped — `isEnabled()` folds in every ancestor, so palm/gaze gates and
 * face toggles gate pokes the same way they gate rendering.
 *
 * Allocation-free on steady frames; only hover/press transitions construct
 * events (rare).
 */
export function pokeFrame(
    scene: Scene,
    fingerTipWorld: Vector3,
    hitboxes: Iterable<AbstractMesh>,
    mem: PokeMemory,
    nowMs: number,
    thresholds: PokeThresholds = DEFAULT_POKE_THRESHOLDS
): void {
    let candidate: PokeCandidate | null = null;

    for (const hitbox of hitboxes) {
        if (!hitbox.isEnabled()) {
            continue;
        }
        probePoke(
            fingerTipWorld,
            hitbox.getWorldMatrix(),
            POKE_LATERAL_MARGIN,
            _probe
        );
        if (!_probe.inFace || _probe.approachGap > thresholds.hoverApproach) {
            continue;
        }
        if (candidate === null || _probe.approachGap < candidate.approachGap) {
            _candidate.hitbox = hitbox;
            _candidate.approachGap = _probe.approachGap;
            candidate = _candidate;
        }
    }

    const emits = stepPoke(mem, candidate, nowMs, thresholds);
    for (let i = 0; i < emits.length; i++) {
        emitPointer(scene, emits[i].type, emits[i].mesh);
    }
}

/**
 * End any in-progress poke because the fingertip is unavailable (hand
 * tracking dropped the joint, or the hand left). Feeds the state machine an
 * empty frame: a held hover emits a `move(null)` hover-out and a held press
 * emits its `up`, then `mem` is left clean — so the button can't stay
 * visually stuck and a later re-tracked frame can't fire a stale release
 * against the old hitbox. Allocation-free once the state is already clear
 * (steady tracking-loss frames emit nothing).
 */
export function pokeRelease(
    scene: Scene,
    mem: PokeMemory,
    nowMs: number,
    thresholds: PokeThresholds = DEFAULT_POKE_THRESHOLDS
): void {
    const emits = stepPoke(mem, null, nowMs, thresholds);
    for (let i = 0; i < emits.length; i++) {
        emitPointer(scene, emits[i].type, emits[i].mesh);
    }
}
