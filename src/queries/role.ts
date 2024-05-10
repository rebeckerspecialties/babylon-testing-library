import { HTMLTwinRenderer } from '@babylonjs/accessibility';
import { Node, Scene } from '@babylonjs/core';
import {
    ByRoleMatcher,
    ByRoleOptions,
    queryAllByRole as domQueryAllByRole,
    prettyDOM,
} from '@testing-library/dom';

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
) => {
    const scene = node instanceof Scene ? node : node.getScene();

    const engine = scene.getEngine();
    engine._renderingCanvas = document.createElement('canvas');

    HTMLTwinRenderer.Render(scene);
    return domQueryAllByRole(engine.getRenderingCanvas(), role, options);
};

export { queryAllByRole };
