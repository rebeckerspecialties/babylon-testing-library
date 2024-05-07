import { Observable } from '@babylonjs/core';
import { Control } from '@babylonjs/gui';
import { EventMap, eventMap } from './eventMap';

export type Event<K extends keyof EventMap> = {
    key: K;
    observableName: EventMap[K]['observableName'];
    eventData: EventMap[K]['defaultInit'];
};

function fireEventFn<K extends keyof EventMap>(
    control: Control,
    event: Event<K>
) {
    const eventObservable = control[event.observableName];

    if (!(eventObservable instanceof Observable)) {
        throw new Error(
            `Unable to fire an event - event of type "${
                event.key
            }" does not exist on "${control.getClassName()}"`
        );
    }

    (eventObservable as Observable<EventMap[K]['defaultInit']>).notifyObservers(
        event.eventData
    );
}

function createEventFn<K extends keyof EventMap>(
    eventName: K,
    _control: Control,
    init: EventMap[K]['defaultInit']
): Event<K> {
    const event = eventMap[eventName];
    return {
        key: eventName,
        observableName: event.observableName,
        eventData: init,
    };
}

Object.keys(eventMap).forEach((key: keyof EventMap) => {
    const { defaultInit } = eventMap[key];
    createEventFn[key] = (node: Control, init?: typeof defaultInit) =>
        createEvent(key, node, init ?? defaultInit);

    fireEventFn[key] = (node: Control, init?: typeof defaultInit) => {
        fireEvent(node, createEvent[key](node, init));
    };
});

type CreateEventFn = (
    k: keyof EventMap,
    c: Control,
    i: EventMap[keyof EventMap]['defaultInit']
) => Event<keyof EventMap>;

type CreateEventObject = {
    [K in keyof EventMap]: (
        c: Control,
        i?: EventMap[K]['defaultInit']
    ) => Event<K>;
};

type fireEventFn = (c: Control, e: Event<keyof EventMap>) => void;

type fireEventObject = {
    [K in keyof EventMap]: (c: Control, i?: EventMap[K]['defaultInit']) => void;
};

export const createEvent = createEventFn as CreateEventFn & CreateEventObject;
export const fireEvent = fireEventFn as fireEventFn & fireEventObject;
