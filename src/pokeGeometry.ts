import { Matrix, Vector3 } from '@babylonjs/core';

/**
 * Geometry for near-field "poke" interaction: project a fingertip world
 * position into the oriented frame of a button hitbox and report how far it
 * is from the button's near face (along the hitbox's thinnest/"press" axis)
 * plus whether it sits within the wide face.
 *
 * The hitbox is a unit `CreateBox` (local extents ±0.5) carried by the
 * menu's transform, so the world half-extents come straight from the lengths
 * of the world-matrix axis columns. The thin axis (smallest half-extent) is
 * the press axis; the other two are the face/lateral axes.
 *
 * All distances are world meters. Allocation-free: only module-scoped
 * scratch is touched, so this is safe to call once per hitbox per frame on a
 * 90fps render path.
 */

const LOCAL_X = new Vector3(1, 0, 0);
const LOCAL_Y = new Vector3(0, 1, 0);
const LOCAL_Z = new Vector3(0, 0, 1);

// scratch — reused across calls, never returned
const _center = new Vector3();
const _rel = new Vector3();
const _axis = new Vector3();

export interface PokeProbe {
    /**
     * Signed distance (world meters) from the fingertip to the slab's near
     * face along the press axis: > 0 means the fingertip is in front of the
     * face, <= 0 means it has reached/passed it.
     */
    approachGap: number;
    /** Fingertip is laterally within the wide face, expanded by `lateralMargin`. */
    inFace: boolean;
}

/** |projection of `_rel` onto the (unit-normalized) local axis|, in world meters. */
function absProjectionOnAxis(local: Vector3, worldMatrix: Matrix): number {
    Vector3.TransformNormalToRef(local, worldMatrix, _axis);
    const len = _axis.length();
    return len === 0 ? 0 : Math.abs(Vector3.Dot(_rel, _axis) / len);
}

/** World half-extent (meters) of the unit box along the given local axis. */
function halfExtentOnAxis(local: Vector3, worldMatrix: Matrix): number {
    Vector3.TransformNormalToRef(local, worldMatrix, _axis);
    return 0.5 * _axis.length();
}

export function probePoke(
    fingerTipWorld: Vector3,
    hitboxWorldMatrix: Matrix,
    lateralMargin: number,
    out: PokeProbe = { approachGap: Number.POSITIVE_INFINITY, inFace: false }
): PokeProbe {
    hitboxWorldMatrix.getTranslationToRef(_center);
    fingerTipWorld.subtractToRef(_center, _rel);

    const halfX = halfExtentOnAxis(LOCAL_X, hitboxWorldMatrix);
    const halfY = halfExtentOnAxis(LOCAL_Y, hitboxWorldMatrix);
    const halfZ = halfExtentOnAxis(LOCAL_Z, hitboxWorldMatrix);
    const projX = absProjectionOnAxis(LOCAL_X, hitboxWorldMatrix);
    const projY = absProjectionOnAxis(LOCAL_Y, hitboxWorldMatrix);
    const projZ = absProjectionOnAxis(LOCAL_Z, hitboxWorldMatrix);

    // press axis = thinnest (smallest half-extent); the other two bound the wide face
    if (halfY <= halfX && halfY <= halfZ) {
        out.approachGap = projY - halfY;
        out.inFace =
            projX <= halfX + lateralMargin && projZ <= halfZ + lateralMargin;
    } else if (halfX <= halfZ) {
        out.approachGap = projX - halfX;
        out.inFace =
            projY <= halfY + lateralMargin && projZ <= halfZ + lateralMargin;
    } else {
        out.approachGap = projZ - halfZ;
        out.inFace =
            projX <= halfX + lateralMargin && projY <= halfY + lateralMargin;
    }

    return out;
}
