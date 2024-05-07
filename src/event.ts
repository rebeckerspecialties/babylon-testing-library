import { Observable } from '@babylonjs/core';
import { Control } from '@babylonjs/gui';
import { EventMap, eventMap } from './eventMap';

export type Event<K extends keyof EventMap> = {
    key: K;
    observableName: EventMap[K]['observableName'];
    eventData: EventMap[K]['defaultInit'];
};

export function fireEvent<K extends keyof EventMap>(
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

export function createEvent<K extends keyof EventMap>(
    eventName: K,
    _control: Control,
    init: EventMap[K]['defaultInit']
): Event<K> {
    const event = eventMap[eventName];
    return { ...event, key: eventName, eventData: init };
}

Object.keys(eventMap).forEach((key: keyof EventMap) => {
    const { defaultInit } = eventMap[key];
    createEvent[key] = (node: Control, init?: typeof defaultInit) =>
        createEvent(key, node, init ?? defaultInit);

    fireEvent[key] = (node: Control, init?: typeof defaultInit) => {
        fireEvent(node, createEvent[key](node, init));
    };
});
