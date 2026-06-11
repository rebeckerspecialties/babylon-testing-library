# babylon-testing-library

Simple utilities that encourage good testing practices for [Babylon.js](https://doc.babylonjs.com/). Inspired by [Testing Library](https://testing-library.com/).

## Why Babylon Testing Library?

Let's say you are using Babylon.js to build a 3D widget for your webapp, 3D-enabled native app, or WebXR application. You want to write maintainable unit tests that do not break when the implementation of your component changes, but fail with helpful outputs when the functionality changes. You want to avoid leaking implementation details into your unit tests. You want your unit tests to mirror how your users will interact with the code.

Babylon Testing Library provides a lightweight API for querying a Babylon scene for your components. These queries aim to match how your users might find elements in the scene. For example, you may want to query a UI element by its text content or a mesh by whether it can be clicked. Babylon testing Library also exports utility functions for firing events in your scene, like clicking a mesh or changing the text within a form.

## Installation

```
npm install --save-dev babylon-testing-library
```

## API

Babylon Testing Library implements a partial and modified API of the [DOM Testing Library](https://testing-library.com/docs/queries/about). In the alpha release, Babylon only includes utilities for interacting with the Babylon GUI. Utilities for interacting with 3D meshes will be included for the first release.

### Queries

#### ByText

Query a GUI control by its text content.

```js
const textBlock = getByText(scene, 'Hello World!');
expect(textBlock.text).toEqual('Hello World!');
```

#### ByPlaceholderText

Query an InputText control by its text content.

```js
const usernameInput = getByPlaceholderText(scene, 'username');
expect(usernameInput.placeholderText).toEqual('username');

const passwordInput = getByPlaceholderText(scene, 'password');
expect(passwordInput.placeholderText).toEqual('password');
```

#### ByDisplayValue

Query the current text value of an InputText control.

```js
const firstNameText = getByDisplayValue(scene, 'First Name');
expect(firstNameText.text).toEqual('First Name');
```

### Events

Fire an event on a Babylon control.

[Complete API](./src/eventMap.ts)

```js
const textBlock = getByText(scene, 'Count: 0');
const textButton = textBlock.parent;

fireEvent.pointerUp(textButton);

expect(textBlock.text).toEqual('Count: 1');
```

### Real-time waits under jest fake timers

Wall-clock polling helpers that stay correct when `jest.useFakeTimers()` is active.

Under fake timers, a conventional polling wait (like `@testing-library/dom`'s `waitFor`) burns its `timeout` budget in **fake** milliseconds: each loop iteration advances the fake clock by `interval`, so a "20 second" budget is really `timeout / interval` iterations executed at CPU speed. Real async work — asset HTTP loads, file I/O — gets only a sliver of event-loop time per iteration and can starve under CI load while the budget evaporates. The helpers below keep the fake clock pumping (so timer-driven app code keeps moving) but enforce the deadline on the real clock, and they yield one real macrotask per advance so genuine I/O makes progress between fake-clock ticks.

The `findBy*` queries above are built on the same engine, so they also behave correctly under fake timers.

#### waitForRealTime

`waitFor` semantics with the timeout enforced in real elapsed time. Reach for it when the awaited condition depends on genuine async work (network, file system) that fake-time budgets cannot meaningfully bound. Callbacks may be sync or async; a pending async callback is never treated as success — the clock keeps pumping while it settles. A callback that throws or rejects inside the real deadline is polled again; past the deadline the wait rejects with the last error.

```js
jest.useFakeTimers();

await waitForRealTime(
    () => {
        expect(getByText(scene, 'Asset loaded')).toBeDefined();
    },
    { timeout: 20000 }
);
```

#### waitForAllSettled

Resolves once every given promise has settled (fulfilled or rejected), pumping fake timers while real I/O completes. Rejections count as settled and are not propagated — assert on the operations' observable results afterwards. On timeout it rejects with an error naming the `label` and the pending/total counts. Prefer gating on the actual async operation over polling for its side effects.

```js
jest.useFakeTimers();
const loads = urls.map((url) => loadAssetAsync(url, scene));

await waitForAllSettled(loads, { timeout: 20000, label: 'asset load(s)' });
```

#### waitOrAdvance

Advances fake timers deterministically (draining a microtask so timer callbacks' continuations run) when they are installed, otherwise sleeps for real:

```js
await waitOrAdvance(500);
```

#### Choosing a helper

- Condition driven purely by timers? `waitOrAdvance(ms)` is deterministic and instant.
- Condition driven by real I/O while fake timers are installed? `waitForRealTime` / `waitForAllSettled`.
- Under real timers, `waitForRealTime` behaves like a plain polling `waitFor` with the same defaults (`timeout: 1000`, `interval: 50`).

Fake timers are detected by inspecting the timer functions themselves (the `clock` property that modern/sinon fake timers attach to `setTimeout`, or the legacy `_isMockFunction` flag) — never via `globalThis.jest`, which does not exist under Jest 30. This also makes the detection work under non-jest runners that install sinon fake timers.

#### Note for React consumers

babylon-testing-library has no React dependency, direct or transitive. If you use it inside a React app, note that `@testing-library/react`'s `waitFor` flushes state updates through `act` via its `unstable_advanceTimersWrapper`; to get the same warning-free behavior from these helpers, pass `act` as the `wrapper` option — it wraps every pump step:

```js
import { act } from 'react';

await waitForRealTime(callback, { wrapper: act });
```

## Unimplemented API

### Queries

A small set of queries is implemented for the alpha release. We plan to implement the remaining queries exported from DOM testing library, but it's not clear what the corresponding implementation will be for queries like `getByLabelText`, `getByAltText`, and `getByTitle`. Babylon is not as complete in its accessibility standards as the DOM, so we may need to lean on user accessibility tagging to implement these queries.

We will also want to extend the DOM testing API to allow us to query 3D meshes. It's not clear precisely how the existing queries map to a 3D sphere, for example. We want to be careful about maintaining high rigor around accessibility while implementing queries that map to how users parse a 3D scene. These will likely be queries around mesh transformation (scale, position, rotation), color, and role (selectable, clickable, collidable, etc.).

### Events

Only a small subset of Babylon GUI events are implemented currently. We aim to implement utilities for triggering [Babylon ActionManager events](https://doc.babylonjs.com/features/featuresDeepDive/events/actions) and observable GUI events where it will reduce boilerplate. Because Babylon is observable-driven, users may find it more convenient to fire a text change event with `input.text = 'First Name'`, rather than firing an event via Babylon Testing Library. User feedback will be crucial here for maintaining the right balance between providing a coherent API and avoiding test boilerplate where the functionality is already supportetd in Babylon.
