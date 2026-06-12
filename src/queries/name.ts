import { Control } from '@babylonjs/gui';
import { BabylonContainer, findAllMatchingDescendants } from './utils';
import { buildQueries } from '../query-helpers';

const getMultipleError = (_c: BabylonContainer, name: string) =>
    `Found multiple elements with the name: ${name}`;

const getMissingError = (container: BabylonContainer, message: string) => {
    return `Unable to find an element with the name: ${message}. Container: ${container}`;
};

/**
 * Queries GUI controls by their Babylon `name`. Names are the Babylon-native
 * equivalent of a test id: prefer the user-facing queries (ByText,
 * ByPlaceholderText, ByDisplayValue) where possible and reach for ByName for
 * icon buttons and other controls with no queryable text.
 */
const queryAllByName = (
    container: BabylonContainer,
    name: string
): Control[] => {
    return findAllMatchingDescendants(
        container,
        (control) => control.name === name
    );
};

const {
    queryBy: queryByName,
    getAllBy: getAllByName,
    getBy: getByName,
    findAllBy: findAllByName,
    findBy: findByName,
} = buildQueries(queryAllByName, getMultipleError, getMissingError);

export {
    queryAllByName,
    queryByName,
    getAllByName,
    getByName,
    findAllByName,
    findByName,
};
