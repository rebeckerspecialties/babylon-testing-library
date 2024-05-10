import { Observable } from '@babylonjs/core';
import { Control, InputText } from '@babylonjs/gui';
import { EventMap, eventMap } from './eventMap';

export type Event<K extends keyof EventMap> = {
    key: K;
    observableName: EventMap[K]['observableName'];
    eventData: EventMap[K]['defaultInit'];
};

type ControlWithObservable<K extends keyof EventMap> = Control & {
    [observableKey in EventMap[K]['observableName']]: Observable<
        EventMap[K]['defaultInit']
    >;
};

function fireEventFn<
    K extends keyof EventMap,
    C extends ControlWithObservable<K>
>(control: C, event: Event<K>) {
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
        createEventFn(key, node, init ?? defaultInit);

    fireEventFn[key] = (
        node: ControlWithObservable<keyof EventMap>,
        init?: typeof defaultInit
    ) => {
        fireEventFn(node, createEventFn[key](node, init));
    };
});

fireEventFn['changeText'] = (node: InputText, input: string) => {
    node.text = input;
};

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
