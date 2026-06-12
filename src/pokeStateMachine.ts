import { AbstractMesh } from '@babylonjs/core';

/**
 * Single-finger poke state machine. The fingertip interacts with at most one
 * hitbox at a time (menu buttons don't overlap), so one piece of state is
 * tracked and the Babylon pointer transitions a mesh-button pipeline
 * consumes are emitted:
 *
 *   - `move` whenever the hovered hitbox changes (mesh, or `null` when the
 *     finger leaves all of them) — one event drives hover-in on the new
 *     button and hover-out on the rest, exactly like a real pointer pick.
 *   - `down` when the fingertip crosses the press threshold on a button.
 *   - `up` when it withdraws past the release threshold or leaves the
 *     pressed button — the button fires its click.
 *
 * Forgiving, surface-anchored design: the press/release thresholds are close
 * to the button face (a hand-mounted menu physically backstops the finger),
 * with a hysteresis gap so resting at the surface can't chatter, and a
 * per-press debounce so one poke can't double-fire.
 */

export type PokeEmitType = 'move' | 'down' | 'up';

export interface PokeEmit {
    type: PokeEmitType;
    /** Target hitbox, or `null` for a "pointer left everything" move. */
    mesh: AbstractMesh | null;
}

export interface PokeThresholds {
    /** Within this distance (m) of the near face + laterally inside → hovering. */
    hoverApproach: number;
    /** approachGap (m) at/below which a press fires. */
    pressGap: number;
    /** approachGap (m) at/above which a held press releases (> pressGap → hysteresis). */
    releaseGap: number;
    /** Minimum ms between the end of one press and the start of the next on the same finger. */
    debounceMs: number;
}

export const DEFAULT_POKE_THRESHOLDS: PokeThresholds = {
    hoverApproach: 0.02,
    pressGap: 0.001,
    releaseGap: 0.004,
    debounceMs: 250,
};

/** The hitbox the fingertip is closest to this frame (already filtered to in-face + in hover range). */
export interface PokeCandidate {
    hitbox: AbstractMesh;
    approachGap: number;
}

export interface PokeMemory {
    pressed: boolean;
    hoverMesh: AbstractMesh | null;
    pressedMesh: AbstractMesh | null;
    lastReleaseMs: number;
}

export function createPokeMemory(): PokeMemory {
    return {
        pressed: false,
        hoverMesh: null,
        pressedMesh: null,
        lastReleaseMs: Number.NEGATIVE_INFINITY,
    };
}

const NO_EMITS: readonly PokeEmit[] = Object.freeze([]);

/**
 * Advance the machine by one frame. Mutates `mem` and returns the pointer
 * events to emit (a shared frozen empty array on the common no-transition
 * frame, so steady hover/press allocate nothing).
 */
export function stepPoke(
    mem: PokeMemory,
    candidate: PokeCandidate | null,
    nowMs: number,
    thresholds: PokeThresholds
): readonly PokeEmit[] {
    const overMesh = candidate ? candidate.hitbox : null;
    let emits: PokeEmit[] | null = null;

    // Hover change → one move reflecting the current pick (mesh or null).
    if (overMesh !== mem.hoverMesh) {
        mem.hoverMesh = overMesh;
        emits = [{ type: 'move', mesh: overMesh }];
    }

    if (!mem.pressed) {
        const debounced = nowMs - mem.lastReleaseMs < thresholds.debounceMs;
        if (
            candidate &&
            candidate.approachGap <= thresholds.pressGap &&
            !debounced
        ) {
            mem.pressed = true;
            mem.pressedMesh = overMesh;
            (emits ??= []).push({ type: 'down', mesh: overMesh });
        }
    } else {
        let release: boolean;
        if (candidate == null || candidate.hitbox !== mem.pressedMesh) {
            release = true;
        } else {
            release = candidate.approachGap >= thresholds.releaseGap;
        }
        if (release) {
            const releasedMesh = mem.pressedMesh;
            mem.pressed = false;
            mem.pressedMesh = null;
            mem.lastReleaseMs = nowMs;
            (emits ??= []).push({ type: 'up', mesh: releasedMesh });
        }
    }

    return emits ?? NO_EMITS;
}
