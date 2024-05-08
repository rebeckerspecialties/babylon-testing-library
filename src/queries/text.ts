import { Control, TextBlock } from '@babylonjs/gui';
import { BabylonContainer, findAllMatchingDescendants } from './utils';
import { buildQueries } from '../query-helpers';

const getMultipleError = (_c: BabylonContainer, text: string) =>
    `Found multiple elements with the text: ${text}`;

const getMissingError = (message: string, container: BabylonContainer) => {
    return new Error(
        `Failed to find an element matching: ${message}. Container: ${container}`
    );
};

const queryAllByText = (
    container: BabylonContainer,
    text: string
): Control[] => {
    const matcher = (control: Control) => {
        return control instanceof TextBlock && control.text === text;
    };

    return findAllMatchingDescendants(container, matcher);
};

const {
    queryBy: queryByText,
    getAllBy: getAllByText,
    getBy: getByText,
    findAllBy: findAllByText,
    findBy: findByText,
} = buildQueries(queryAllByText, getMultipleError, getMissingError);

export {
    queryAllByText,
    queryByText,
    getAllByText,
    getByText,
    findAllByText,
    findByText,
};
