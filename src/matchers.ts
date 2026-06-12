import { Color3, Color4, Matrix, Quaternion, Vector3 } from '@babylonjs/core';

/**
 * Babylon-aware jest matchers: structural equality via Babylon's own
 * equals/equalsWithEpsilon, with readable failure output. Register them once
 * per test environment (e.g. in a jest setup file):
 *
 *     import { setupBabylonExpect } from 'babylon-testing-library';
 *     setupBabylonExpect();
 *
 * or pass the raw map to your runner: `expect.extend(babylonMatchers)`.
 */
type MatcherResult = { pass: boolean; message: () => string };

type MatcherContextLike = {
    utils?: {
        diff?: (expected: unknown, received: unknown) => string | null;
    };
};

type BabylonEquatable<T> = {
    equals(other: T): boolean;
    equalsWithEpsilon(other: T, epsilon: number): boolean;
    toString(): string;
};

const buildMatcher = <T extends BabylonEquatable<T>>(
    babylonClass: new (...args: never[]) => T,
    className: string
) => {
    return function (
        this: MatcherContextLike,
        received: unknown,
        expected: unknown,
        epsilon?: number
    ): MatcherResult {
        if (!(received instanceof babylonClass)) {
            throw new Error(
                `Expected received value to be a ${className}, but got: ${received}`
            );
        }

        if (!(expected instanceof babylonClass)) {
            throw new Error(
                `Expected expected value to be a ${className}, but got: ${expected}`
            );
        }

        const pass =
            epsilon !== undefined
                ? received.equalsWithEpsilon(expected, epsilon)
                : received.equals(expected);

        const message = () => {
            const diff = this?.utils?.diff?.(expected, received);
            return `Expected: ${expected.toString()}\nReceived: ${received.toString()}${
                diff ? `\n\n${diff}` : ''
            }`;
        };

        return { pass, message };
    };
};

export const babylonMatchers = {
    toEqualVector3: buildMatcher(Vector3, 'Vector3'),
    toEqualQuaternion: buildMatcher(Quaternion, 'Quaternion'),
    toEqualMatrix: buildMatcher(Matrix, 'Matrix'),
    toEqualColor3: buildMatcher(Color3, 'Color3'),
    toEqualColor4: buildMatcher(Color4, 'Color4'),
};

// The test runner's expect global; typed structurally so this module carries
// no jest type dependency into consumers.
declare const expect:
    | { extend: (matchers: Record<string, unknown>) => void }
    | undefined;

/** Registers the Babylon matchers with the ambient `expect` global. */
export const setupBabylonExpect = () => {
    if (typeof expect === 'undefined') {
        throw new Error(
            'setupBabylonExpect requires a global `expect` (run it inside your test environment)'
        );
    }
    expect.extend(babylonMatchers);
};

declare global {
    // Merges with @types/jest's Matchers when present; declares a fresh,
    // harmless namespace otherwise.
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        // The type parameter list must match @types/jest's declaration.
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
        interface Matchers<R = void, T = {}> {
            toEqualVector3(expected: Vector3, epsilon?: number): R;
            toEqualQuaternion(expected: Quaternion, epsilon?: number): R;
            toEqualMatrix(expected: Matrix, epsilon?: number): R;
            toEqualColor3(expected: Color3, epsilon?: number): R;
            toEqualColor4(expected: Color4, epsilon?: number): R;
        }
    }
}
