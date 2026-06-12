import { AbstractMesh, Scene } from '@babylonjs/core';
import { buildQueries } from '../query-helpers';

const getMultipleError = (_scene: Scene, name: string) =>
    `Found multiple meshes with the name: ${name}`;

const getMissingError = (scene: Scene, message: string) => {
    return `Unable to find a mesh with the name: ${message}. Scene contains ${scene.meshes.length} mesh(es)`;
};

/**
 * Queries 3D meshes in a scene by their Babylon `name`. The findBy* variants
 * wait in real elapsed time (fake-timer safe), which suits meshes that appear
 * via genuinely asynchronous asset loads.
 */
const queryAllByMeshName = (scene: Scene, name: string): AbstractMesh[] => {
    return scene.meshes.filter((mesh) => mesh.name === name);
};

const {
    queryBy: queryByMeshName,
    getAllBy: getAllByMeshName,
    getBy: getByMeshName,
    findAllBy: findAllByMeshName,
    findBy: findByMeshName,
} = buildQueries(queryAllByMeshName, getMultipleError, getMissingError);

export {
    queryAllByMeshName,
    queryByMeshName,
    getAllByMeshName,
    getByMeshName,
    findAllByMeshName,
    findByMeshName,
};
