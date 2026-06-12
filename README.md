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

Babylon Testing Library implements a partial and modified API of the [DOM Testing Library](https://testing-library.com/docs/queries/about). Queries cover Babylon GUI controls and 3D meshes; events cover GUI control observables (`fireEvent`) and scene-level pointer picks on meshes (`clickMesh` and friends). WebXR mocks and Babylon-aware matchers round out headless testing of hand- and controller-driven UI.

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

#### ByName

Query a GUI control by its Babylon `name` — the engine-native equivalent of a test id. Prefer the user-facing queries above where possible; reach for ByName for icon buttons and other controls with no queryable text.

```js
const button = getByName(scene, 'searchButton');
const late = await findByName(scene, 'lateButton'); // waits in real elapsed time
```

#### ByMeshName

Query 3D meshes in a scene by name. The `findBy*` variants wait in real elapsed time, which suits meshes that appear via genuinely asynchronous asset loads.

```js
const hitBox = getByMeshName(scene, 'hitBox');
const loaded = await findByMeshName(scene, 'avatar', { timeout: 20000 });
```

### Mesh pointer simulation

Mesh interactions don't flow through GUI control observables — Babylon delivers them through `scene.onPointerObservable` with a `PickingInfo` from a ray pick. These helpers perform a real pick against the mesh and notify the scene observable exactly as Babylon's input layer would:

```js
await clickMesh(scene, hitBox); // ray pick → pointer down + pointer up
await hoverMesh(scene, hitBox); // pointer move
await fireMeshPointer(scene, hitBox, PointerEventTypes.POINTERUP, {
    pointerType: 'xr-near', // tag near-interaction pokes
});
```

Picks render the scene and recompute the target inside every retry (a stale pick target is a classic source of CI flakes), honor `isPickable`/`isEnabled`/`isVisible` by default — a disabled button is not clickable in tests, just like on device — and enforce their timeout in real elapsed time under fake timers. The ray origin defaults to the active camera's position; pass `origin` explicitly for camera-less scenes. `pickThinInstance(scene, mesh, index)` ray-picks a specific thin instance.

### WebXR mocks

Headless mocks for the WebXR surface that hand- and controller-menu code touches — no device, no session, no controller GLBs. All observables are real Babylon `Observable`s; tests drive them with `notifyObservers`.

```js
const hand = createMockXrHand({ 'index-finger-tip': tipMesh });
const experience = createMockXrExperience({
    handTrackingEnabled: true,
    getHandByHandedness: () => hand,
});
```

Also available: `createMockXrController` (shared button/axis observables), `createMockXrControllerWithBindings` (distinct observables per component), `createMockXrInputSource`, `createMockXRSession` (listener registry you can fire), and `buildMockControllersFromProfile`, which fabricates the min/max/value transform nodes from a motion-controller profile so button/thumbstick animation code runs without loading assets.

### Finger-poke simulation (near interaction)

A complete, allocation-free "poke a 3D button with a fingertip" stack — drive hand-tracked menu interactions headlessly from nothing but fingertip world positions, tuned on real hardware:

- `probePoke(fingerTipWorld, hitboxWorldMatrix, lateralMargin)` — projects a fingertip into a hitbox's oriented frame; the thinnest axis is the press axis.
- `stepPoke(mem, candidate, nowMs, thresholds)` — single-finger state machine emitting `move`/`down`/`up` with press/release hysteresis and a per-press debounce (`DEFAULT_POKE_THRESHOLDS`: hover 20mm, press 1mm, release 4mm, 250ms).
- `pokeFrame(scene, fingerTipWorld, hitboxes, mem, nowMs, thresholds?)` — probes the enabled hitboxes, advances the machine, and injects synthetic `PointerInfo`s (tagged `pointerType: 'xr-near'`, see `POKE_POINTER_TYPE`) into `scene.onPointerObservable`, so mesh-button pipelines react exactly as they would to a controller pointer. `pokeRelease(scene, mem, nowMs, thresholds?)` ends an in-progress poke on tracking loss without leaving stuck hover/press state.

```js
const mem = createPokeMemory();

pokeFrame(scene, new Vector3(0, 0.01, 0), [hitBox], mem, 0); // hover
pokeFrame(scene, new Vector3(0, 0, 0), [hitBox], mem, 16); // press
pokeFrame(scene, new Vector3(0, 0.01, 0), [hitBox], mem, 32); // withdraw → click

expect(onClick).toHaveBeenCalledTimes(1);
```

Disabled hitboxes are skipped (`isEnabled()` folds in every ancestor — palm-up gates and face toggles gate pokes the same way they gate rendering), so a test poking a gated-off menu fails the way the device does.

#### A complete hand-menu example

[`src/examples/handMenu.spec.ts`](./src/examples/handMenu.spec.ts) is a runnable, headless WebXR hand menu composed entirely from this library's public API: a menu node with two poke buttons (invisible thin hitbox + visible face that raises on hover, skips its press squeeze for `xr-near` pokes, clicks on release), a mock tracked hand whose `index-finger-tip` joint mesh is moved frame by frame, and the per-frame wiring an app uses with a real `WebXRHand`:

```js
const hand = createMockXrHand({ 'index-finger-tip': fingerTipMesh });
const mem = createPokeMemory();

scene.onBeforeRenderObservable.add(() => {
    const tip = hand.getJointMesh('index-finger-tip');
    if (tip) {
        pokeFrame(scene, tip.absolutePosition, hitboxes, mem, now);
    } else {
        pokeRelease(scene, mem, now); // tracking loss
    }
});
```

It covers the full interaction surface: click choreography (and that only the poked button clicks), hover raise/lower, the skipped squeeze for fingertip pokes, palm-down gating via `setEnabled` on the menu root, double-tap debounce, and tracking loss mid-press without stale re-fires.

Two things differ on a real device and are intentionally out of headless scope: the menu node carries Babylon's `HandConstraintBehavior` for palm-up summoning — configure it with `HandConstraintVisibility.PALM_UP` explicitly if pokes drive your menu, because the default `PALM_AND_GAZE` disables the node the moment the user looks away from the hand they are poking by feel — and real hand-tracking input arrives through `WebXRHandTracking` rather than a test-driven joint mesh. In headless tests, palm gating reduces to `setEnabled`, which the poke pipeline honors identically.

### Babylon-aware matchers

```js
import { setupBabylonExpect } from 'babylon-testing-library';
setupBabylonExpect(); // e.g. in a jest setup file

expect(node.position).toEqualVector3(new Vector3(0, 0.02, 0));
expect(mesh.rotationQuaternion).toEqualQuaternion(Quaternion.Identity(), 1e-6);
```

`toEqualVector3`, `toEqualQuaternion`, `toEqualMatrix`, `toEqualColor3`, and `toEqualColor4` compare via Babylon's own `equals`, with an optional epsilon argument mapping to `equalsWithEpsilon`. The raw matcher map is exported as `babylonMatchers` for direct `expect.extend` use in other runners.

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

`waitFor` semantics with the timeout enforced in real elapsed time. Reach for it when the awaited condition depends on genuine async work (network, file system) that fake-time budgets cannot meaningfully bound. Callbacks may be sync or async; a pending async callback is never treated as success — the clock keeps pumping while it settles, and a promise still pending when the real deadline lapses rejects with a named timeout error (no hanging until the test runner's own timeout). A callback that throws or rejects inside the real deadline is polled again; past the deadline the wait rejects with the last error.

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

Meshes can now be queried by name (`*ByMeshName`) and interacted with via real ray picks (`clickMesh`), but richer 3D queries remain open. It's not clear precisely how the existing queries map to a 3D sphere, for example. We want to be careful about maintaining high rigor around accessibility while implementing queries that map to how users parse a 3D scene. These will likely be queries around mesh transformation (scale, position, rotation), color, and role (selectable, clickable, collidable, etc.).

### Events

Only a small subset of Babylon GUI events are implemented currently. We aim to implement utilities for triggering [Babylon ActionManager events](https://doc.babylonjs.com/features/featuresDeepDive/events/actions) and observable GUI events where it will reduce boilerplate. Because Babylon is observable-driven, users may find it more convenient to fire a text change event with `input.text = 'First Name'`, rather than firing an event via Babylon Testing Library. User feedback will be crucial here for maintaining the right balance between providing a coherent API and avoiding test boilerplate where the functionality is already supportetd in Babylon.
