import { Vector2 } from '@babylonjs/core';
import { Vector2WithInfo } from '@babylonjs/gui';

export type EventMap = {
    pointerMove: {
        observableName: 'onPointerUpObservable';
        defaultInit: Vector2WithInfo;
    };
    pointerEnter: {
        observableName: 'onPointerEnterObservable';
        defaultInit: Vector2WithInfo;
    };
    pointerOut: {
        observableName: 'onPointerOutObservable';
        defaultInit: Vector2WithInfo;
    };
    pointerDown: {
        observableName: 'onPointerDownObservable';
        defaultInit: Vector2WithInfo;
    };
    pointerUp: {
        observableName: 'onPointerUpObservable';
        defaultInit: Vector2WithInfo;
    };
    pointerClick: {
        observableName: 'onPointerClickObservable';
        defaultInit: Vector2WithInfo;
    };
};

const DEFAULT_VECTOR2_WITH_INFO = new Vector2WithInfo(Vector2.Zero());

export const eventMap: EventMap = {
    pointerMove: {
        observableName: 'onPointerUpObservable',
        defaultInit: DEFAULT_VECTOR2_WITH_INFO,
    },
    pointerEnter: {
        observableName: 'onPointerEnterObservable',
        defaultInit: DEFAULT_VECTOR2_WITH_INFO,
    },
    pointerOut: {
        observableName: 'onPointerOutObservable',
        defaultInit: DEFAULT_VECTOR2_WITH_INFO,
    },
    pointerDown: {
        observableName: 'onPointerDownObservable',
        defaultInit: DEFAULT_VECTOR2_WITH_INFO,
    },
    pointerUp: {
        observableName: 'onPointerUpObservable',
        defaultInit: DEFAULT_VECTOR2_WITH_INFO,
    },
    pointerClick: {
        observableName: 'onPointerClickObservable',
        defaultInit: DEFAULT_VECTOR2_WITH_INFO,
    },
};
