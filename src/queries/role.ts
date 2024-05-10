import { HTMLTwinRenderer } from '@babylonjs/accessibility';
import { Node, Scene } from '@babylonjs/core';
import {
    ByRoleMatcher,
    ByRoleOptions,
    queryAllByRole as domQueryAllByRole,
} from '@testing-library/dom';
import { findAllMatchingDescendants } from './utils';
import { Control } from '@babylonjs/gui';

/**
 * Idea:
 * - render scene to HTML with htmlTwinRenderer
 * - Use queryAllByRole from dom-testing-library
 * - Filter any found items to the parameters of the original query
 */

const queryAllByRole = (
    node: Node | Scene,
    role: ByRoleMatcher,
    options?: ByRoleOptions
): (Node | Control)[] => {
    const scene = node instanceof Scene ? node : node.getScene();

    const engine = scene.getEngine();
    engine._renderingCanvas = document.createElement('canvas');

    HTMLTwinRenderer.Render(scene);
    const elements = domQueryAllByRole(
        engine.getRenderingCanvas(),
        role,
        options
    );

    const matchingNodes = scene
        .getNodes()
        .filter((node) =>
            elements.some(
                (element) =>
                    element.firstChild.textContent ===
                    node.accessibilityTag?.description
            )
        );

    const matchingControls = findAllMatchingDescendants(scene, (control) =>
        elements.some(
            (element) =>
                element.firstChild.textContent ===
                control.accessibilityTag?.description
        )
    );

    return [...matchingNodes, ...matchingControls];
};

export { queryAllByRole };
