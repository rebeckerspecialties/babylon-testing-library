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

## Unimplemented API

### Queries

A small set of queries is implemented for the alpha release. We plan to implement the remaining queries exported from DOM testing library, but it's not clear what the corresponding implementation will be for queries like `getByLabelText`, `getByAltText`, and `getByTitle`. Babylon is not as complete in its accessibility standards as the DOM, so we may need to lean on user accessibility tagging to implement these queries.

We will also want to extend the DOM testing API to allow us to query 3D meshes. It's not clear precisely how the existing queries map to a 3D sphere, for example. We want to be careful about maintaining high rigor around accessibility while implementing queries that map to how users parse a 3D scene. These will likely be queries around mesh transformation (scale, position, rotation), color, and role (selectable, clickable, collidable, etc.).

### Events

Only a small subset of Babylon GUI events are implemented currently. We aim to implement utilities for triggering [Babylon ActionManager events](https://doc.babylonjs.com/features/featuresDeepDive/events/actions) and observable GUI events where it will reduce boilerplate. Because Babylon is observable-driven, users may find it more convenient to fire a text change event with `input.text = 'First Name'`, rather than firing an event via Babylon Testing Library. User feedback will be crucial here for maintaining the right balance between providing a coherent API and avoiding test boilerplate where the functionality is already supportetd in Babylon.
