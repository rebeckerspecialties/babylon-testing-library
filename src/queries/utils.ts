import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, Control } from '@babylonjs/gui';

export type BabylonContainer = Scene | AdvancedDynamicTexture | Control;

const findAllMatchingInControl = (
    container: Control,
    matcher: (control: Control) => boolean
): Control[] => {
    const controls = [];
    if (matcher(container)) {
        controls.push(container);
    }

    return [
        ...controls,
        ...container.getDescendants().filter((control) => matcher(control)),
    ];
};
const findAllMatchingInTexture = (
    container: AdvancedDynamicTexture,
    matcher: (control: Control) => boolean
): Control[] => {
    return container.rootContainer.children.flatMap((control) =>
        findAllMatchingInControl(control, matcher)
    );
};

const findAllMatchingInScene = (
    container: Scene,
    matcher: (control: Control) => boolean
): Control[] => {
    return container.textures
        .filter(
            (texture): texture is AdvancedDynamicTexture =>
                texture instanceof AdvancedDynamicTexture
        )
        .flatMap((control) => findAllMatchingInTexture(control, matcher));
};

export const findAllMatchingDescendants = (
    container: BabylonContainer,
    matcher: (control: Control) => boolean
) => {
    if (container instanceof Scene) {
        return findAllMatchingInScene(container, matcher);
    } else if (container instanceof AdvancedDynamicTexture) {
        return findAllMatchingInTexture(container, matcher);
    } else {
        return findAllMatchingInControl(container, matcher);
    }
};
