/**
 * A complete, headless WebXR hand-menu example — the capstone for the
 * library's XR testing pieces, composed entirely from public API:
 *
 *   - a menu node carrying two poke buttons (in a real session this node
 *     would also carry Babylon's HandConstraintBehavior — see the README
 *     walkthrough for the on-device configuration notes);
 *   - an OrnamentButton-style mesh button: invisible thin hitbox over a
 *     visible face that raises on hover, skips its press-squeeze for
 *     fingertip pokes, and fires onClick on release;
 *   - a mock hand (createMockXrHand) whose index-finger-tip joint mesh is
 *     moved frame by frame, with a scene.onBeforeRenderObservable observer
 *     feeding the fingertip position to pokeFrame — the same wiring an app
 *     uses with a real WebXRHand;
 *   - pokeRelease on tracking loss.
 *
 * Everything runs on NullEngine: no device, no session, no assets.
 */
import {
    AbstractMesh,
    Engine,
    FreeCamera,
    Mesh,
    MeshBuilder,
    NullEngine,
    PointerEventTypes,
    PointerInfo,
    Quaternion,
    Scene,
    TransformNode,
    Vector3,
    WebXRHand,
} from '@babylonjs/core';
import {
    createMockXrHand,
    createPokeMemory,
    DEFAULT_POKE_THRESHOLDS,
    getByMeshName,
    POKE_POINTER_TYPE,
    pokeFrame,
    pokeRelease,
    PokeMemory,
    setupBabylonExpect,
} from '../index';

setupBabylonExpect();

const FRAME_MS = 16;
const HOVER_RAISE = 0.002; // the face lifts 2mm toward the finger on hover
const FACE_REST_Y = -0.003; // face sits 3mm under the hitbox center

/**
 * A minimal poke button mirroring the contract of webapp's OrnamentButton:
 * a wide-thin invisible hitbox (thinnest axis = press axis) is what the
 * poke pipeline probes; the visible face raises on hover, would squeeze on
 * a controller press but skips the squeeze for fingertip pokes (the finger
 * occludes the button), and fires onClick when a press releases.
 */
interface PokeButton {
    hitBox: Mesh;
    face: Mesh;
    clicks: number;
    squeezes: number;
}

const createPokeButton = (
    scene: Scene,
    name: string,
    parent: TransformNode,
    positionX: number
): PokeButton => {
    // Unit box scaled to 40mm x 1mm x 40mm: Y is the thinnest axis, so the
    // poke geometry treats world Y as the press axis.
    const hitBox = MeshBuilder.CreateBox(`${name}HitBox`, { size: 1 }, scene);
    hitBox.scaling = new Vector3(0.04, 0.001, 0.04);
    hitBox.position = new Vector3(positionX, 0, 0);
    hitBox.rotationQuaternion = Quaternion.Identity();
    hitBox.isVisible = false;
    hitBox.parent = parent;

    const face = MeshBuilder.CreateBox(
        `${name}Face`,
        { width: 0.036, height: 0.001, depth: 0.036 },
        scene
    );
    face.position = new Vector3(positionX, FACE_REST_Y, 0);
    face.parent = parent;

    hitBox.computeWorldMatrix(true);
    face.computeWorldMatrix(true);

    const button: PokeButton = { hitBox, face, clicks: 0, squeezes: 0 };

    let primed = false;
    scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
        const isOwnPick = pointerInfo.pickInfo?.pickedMesh === hitBox;
        const pointerType = (
            pointerInfo.event as unknown as { pointerType?: string }
        ).pointerType;

        switch (pointerInfo.type) {
            case PointerEventTypes.POINTERMOVE:
                // One move drives hover-in on the picked button and
                // hover-out on every other (a null pick lowers them all).
                // Hover-out does NOT cancel a primed press — the state
                // machine completes every press with an `up` on the pressed
                // mesh (including on tracking loss), and the click fires
                // there.
                face.position.y = isOwnPick
                    ? FACE_REST_Y + HOVER_RAISE
                    : FACE_REST_Y;
                break;
            case PointerEventTypes.POINTERDOWN:
                if (isOwnPick) {
                    primed = true;
                    // A laser/controller press squeezes the face for 1:1
                    // trigger feel; a fingertip occludes the button, so
                    // poke-tagged presses skip the animation.
                    if (pointerType !== POKE_POINTER_TYPE) {
                        button.squeezes += 1;
                    }
                }
                break;
            case PointerEventTypes.POINTERUP:
                if (isOwnPick && primed) {
                    primed = false;
                    button.clicks += 1;
                }
                break;
        }
    });

    return button;
};

describe('hand menu example: poking buttons with a tracked fingertip', () => {
    let engine: Engine;
    let scene: Scene;
    let menuRoot: TransformNode;
    let playButton: PokeButton;
    let exitButton: PokeButton;
    let hand: WebXRHand;
    let fingerTip: Mesh;
    let hitboxes: Set<AbstractMesh>;
    let mem: PokeMemory;
    let now: number;

    beforeAll(() => {
        engine = new NullEngine();
    });

    beforeEach(() => {
        scene = new Scene(engine);
        now = 0;
        mem = createPokeMemory();

        // Stands in for the headset camera a real XR session provides;
        // scene.render() requires one.
        new FreeCamera('headset', new Vector3(0, 0.2, -0.3), scene);

        // The menu node. On device this is where HandConstraintBehavior
        // attaches (palm-up visibility); headlessly we just place it, and
        // palm gating reduces to setEnabled — which pokeFrame honors.
        menuRoot = new TransformNode('handMenu', scene);

        // Two buttons, like a play/exit pair on the menu's front face. A
        // registry of hitboxes keeps the per-frame probe to a handful of
        // meshes instead of the whole scene.
        playButton = createPokeButton(scene, 'play', menuRoot, 0);
        exitButton = createPokeButton(scene, 'exit', menuRoot, 0.06);
        hitboxes = new Set([playButton.hitBox, exitButton.hitBox]);

        // A mock tracked hand: the index fingertip is just a mesh the test
        // moves around; getJointMesh resolves it the way a real WebXRHand
        // would.
        fingerTip = MeshBuilder.CreateSphere(
            'fingerTip',
            { diameter: 0.008 },
            scene
        );
        // Park the finger well away from the menu so nothing is hovered or
        // pressed until a test moves it.
        fingerTip.position.set(0, 0.5, 0);
        fingerTip.computeWorldMatrix(true);
        hand = createMockXrHand({ 'index-finger-tip': fingerTip });

        // The app-side wiring, verbatim: once per rendered frame, read the
        // fingertip joint and advance the poke pipeline.
        scene.onBeforeRenderObservable.add(() => {
            const tip = hand.getJointMesh('index-finger-tip' as never) as
                | AbstractMesh
                | undefined;
            if (tip) {
                pokeFrame(
                    scene,
                    tip.absolutePosition,
                    hitboxes,
                    mem,
                    now,
                    DEFAULT_POKE_THRESHOLDS
                );
            } else {
                pokeRelease(scene, mem, now, DEFAULT_POKE_THRESHOLDS);
            }
        });

        scene.render();
    });

    afterEach(() => {
        scene.dispose();
    });

    afterAll(() => {
        engine.dispose();
    });

    /** Move the tracked fingertip and render one frame. */
    const trackFingerAt = (position: Vector3, dtMs = FRAME_MS) => {
        now += dtMs;
        fingerTip.position.copyFrom(position);
        fingerTip.computeWorldMatrix(true);
        scene.render();
    };

    it('clicks the poked button — and only that button', () => {
        trackFingerAt(new Vector3(0, 0.01, 0)); // approach: hover range
        trackFingerAt(new Vector3(0, 0, 0)); // contact: press
        trackFingerAt(new Vector3(0, 0.01, 0)); // withdraw: release → click

        expect(playButton.clicks).toBe(1);
        expect(exitButton.clicks).toBe(0);
    });

    it('raises the face on hover and lowers it after the finger leaves, without clicking', () => {
        trackFingerAt(new Vector3(0, 0.01, 0)); // hover only
        expect(playButton.face.position).toEqualVector3(
            new Vector3(0, FACE_REST_Y + HOVER_RAISE, 0)
        );

        trackFingerAt(new Vector3(0, 0.05, 0)); // leave hover range
        expect(playButton.face.position).toEqualVector3(
            new Vector3(0, FACE_REST_Y, 0)
        );
        expect(playButton.clicks).toBe(0);
    });

    it('skips the press squeeze for fingertip pokes (xr-near pointerType)', () => {
        trackFingerAt(new Vector3(0, 0.01, 0));
        trackFingerAt(new Vector3(0, 0, 0)); // held press

        expect(playButton.squeezes).toBe(0);
        expect(playButton.clicks).toBe(0); // no click until release
    });

    it('ignores pokes into a disabled menu face (palm-down gating)', () => {
        // On device, HandConstraintBehavior or a front/back-face toggle
        // disables the node; isEnabled() folds in every ancestor, so
        // disabling the menu root gates every hitbox under it.
        menuRoot.setEnabled(false);

        trackFingerAt(new Vector3(0, 0.01, 0));
        trackFingerAt(new Vector3(0, 0, 0));
        trackFingerAt(new Vector3(0, 0.01, 0));

        expect(playButton.clicks).toBe(0);
        expect(playButton.face.position).toEqualVector3(
            new Vector3(0, FACE_REST_Y, 0)
        );
    });

    it('debounces a double-tap inside the debounce window, allows it after', () => {
        trackFingerAt(new Vector3(0, 0.01, 0));
        trackFingerAt(new Vector3(0, 0, 0));
        trackFingerAt(new Vector3(0, 0.01, 0)); // click #1

        // Immediate re-tap, inside the 250ms window: no second click.
        trackFingerAt(new Vector3(0, 0, 0));
        trackFingerAt(new Vector3(0, 0.01, 0));
        expect(playButton.clicks).toBe(1);

        // Same tap after the window passes: clicks again.
        trackFingerAt(new Vector3(0, 0, 0), 300);
        trackFingerAt(new Vector3(0, 0.01, 0));
        expect(playButton.clicks).toBe(2);
    });

    it('completes the press when hand tracking drops mid-poke, with no stale re-fire', () => {
        trackFingerAt(new Vector3(0, 0.01, 0));
        trackFingerAt(new Vector3(0, 0, 0)); // held press

        // Tracking loss: the app-side observer can no longer resolve the
        // joint and calls pokeRelease — the held press completes its
        // release (click) and state is left clean.
        hand = createMockXrHand({});
        now += FRAME_MS;
        scene.render();
        expect(playButton.clicks).toBe(1);

        // The hand re-tracks with the finger already withdrawn, outside the
        // debounce window: no stale second release.
        hand = createMockXrHand({ 'index-finger-tip': fingerTip });
        trackFingerAt(new Vector3(0, 0.01, 0), 400);
        expect(playButton.clicks).toBe(1);
    });

    it('the menu is queryable like any other scene content', () => {
        expect(getByMeshName(scene, 'playHitBox')).toEqual(playButton.hitBox);
        expect(getByMeshName(scene, 'exitFace')).toEqual(exitButton.face);
    });
});
