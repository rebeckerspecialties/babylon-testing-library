import { Camera, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { queryAllByRole } from './role';
import { AdvancedDynamicTexture, Button } from '@babylonjs/gui';
import { IAccessibilityTag } from '@babylonjs/core/IAccessibilityTag';

describe('role', () => {
    it('should queryAllByRole', async () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);
        const camera = new Camera('cam', new Vector3(0, 0, -10), scene);

        scene.render();
        const gui = AdvancedDynamicTexture.CreateFullscreenUI(
            'gui',
            undefined,
            scene
        );

        const control = Button.CreateSimpleButton('AddTodo', 'Add TODO');
        control.accessibilityTag = {
            description: 'Add a todo to the list.',
            aria: {
                'aria-hidden': 'true',
            } as IAccessibilityTag['aria'],
        };
        gui.addControl(control);

        scene.render();

        const elements = queryAllByRole(scene, 'button', { hidden: true });
        expect(elements).toHaveLength(1);
        expect(elements[0]).toEqual(control);

        camera.dispose();
        scene.dispose();
        engine.dispose();
    });
});
