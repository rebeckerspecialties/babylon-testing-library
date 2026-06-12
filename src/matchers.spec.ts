import { Color3, Color4, Matrix, Quaternion, Vector3 } from '@babylonjs/core';
import { babylonMatchers, setupBabylonExpect } from './matchers';

setupBabylonExpect();

describe('babylon matchers', () => {
    it('registers all five matchers', () => {
        expect(Object.keys(babylonMatchers).sort()).toEqual([
            'toEqualColor3',
            'toEqualColor4',
            'toEqualMatrix',
            'toEqualQuaternion',
            'toEqualVector3',
        ]);
    });

    it('toEqualVector3 passes for equal vectors', () => {
        expect(new Vector3(1, 2, 3)).toEqualVector3(new Vector3(1, 2, 3));
    });

    it('toEqualVector3 fails for different vectors with a readable message', () => {
        expect(() =>
            expect(new Vector3(1, 2, 3)).toEqualVector3(new Vector3(4, 5, 6))
        ).toThrow(/Expected:.*4.*5.*6/s);
    });

    it('toEqualVector3 supports epsilon comparison', () => {
        expect(new Vector3(1.0001, 2, 3)).toEqualVector3(
            new Vector3(1, 2, 3),
            0.01
        );
        expect(() =>
            expect(new Vector3(1.0001, 2, 3)).toEqualVector3(
                new Vector3(1, 2, 3),
                0.00001
            )
        ).toThrow();
    });

    it('rejects values of the wrong type', () => {
        expect(() =>
            expect('not a vector').toEqualVector3(new Vector3(1, 2, 3))
        ).toThrow('Expected received value to be a Vector3');
        expect(() =>
            expect(new Vector3(1, 2, 3)).toEqualVector3(
                'not a vector' as unknown as Vector3
            )
        ).toThrow('Expected expected value to be a Vector3');
    });

    it('toEqualQuaternion compares quaternions', () => {
        expect(Quaternion.Identity()).toEqualQuaternion(Quaternion.Identity());
    });

    it('toEqualMatrix compares matrices', () => {
        expect(Matrix.Identity()).toEqualMatrix(Matrix.Identity());
        expect(() =>
            expect(Matrix.Identity()).toEqualMatrix(Matrix.Zero())
        ).toThrow();
    });

    it('toEqualColor3 and toEqualColor4 compare colors', () => {
        expect(new Color3(0.5, 0.5, 0.5)).toEqualColor3(
            new Color3(0.5, 0.5, 0.5)
        );
        expect(new Color4(0.1, 0.2, 0.3, 1)).toEqualColor4(
            new Color4(0.1, 0.2, 0.3, 1)
        );
    });
});
