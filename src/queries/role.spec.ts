import { Camera, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { queryAllByRole } from './role';
import { AdvancedDynamicTexture, InputText } from '@babylonjs/gui';

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

        const control = new InputText('UserSearch', 'user');
        control.accessibilityTag = {
            description: 'Search for users',
            aria: {
                role: 'search',
            },
        };
        gui.addControl(control);

        scene.render();

        expect(queryAllByRole(scene, 'search')).toHaveLength(1);

        camera.dispose();
        scene.dispose();
        engine.dispose();
    });
});
