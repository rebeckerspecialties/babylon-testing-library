# babylon-testing-library

Simple utilities that encourage good testing practices for [Babylon.js](https://doc.babylonjs.com/). Inspired by [Testing Library](https://testing-library.com/).

## Why Babylon Testing Library?

Let's say you are using Babylon.js to build a 3D widget for your webapp, 3D-enabled native app, or WebXR application. You want to write maintainable unit tests that do not break when the implementation of your component changes, but fail with helpful outputs when the functionality changes. You want to avoid leaking implementation details into your unit tests. You want your unit tests to mirror how your users will interact with the code.

## What is Babylon Testing Library?

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
