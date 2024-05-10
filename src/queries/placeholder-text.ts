import { Control, InputText } from '@babylonjs/gui';
import { BabylonContainer, findAllMatchingDescendants } from './utils';
import { buildQueries } from '../query-helpers';

const getMultipleError = (_c: BabylonContainer, text: string) =>
    `Found multiple elements with the placeholder text of: ${text}`;

const getMissingError = (container: BabylonContainer, message: string) => {
    return `Unable to find an element with the placeholder text of: ${message}. Container: ${container}`;
};

const queryAllByPlaceholderText = (
    container: BabylonContainer,
    text: string
): Control[] => {
    const matcher = (control: Control) => {
        return control instanceof InputText && control.placeholderText === text;
    };

    return findAllMatchingDescendants(container, matcher);
};

const {
    queryBy: queryByPlaceholderText,
    getAllBy: getAllByPlaceholderText,
    getBy: getByPlaceholderText,
    findAllBy: findAllByPlaceholderText,
    findBy: findByPlaceholderText,
} = buildQueries(queryAllByPlaceholderText, getMultipleError, getMissingError);

export {
    queryAllByPlaceholderText,
    queryByPlaceholderText,
    getAllByPlaceholderText,
    getByPlaceholderText,
    findAllByPlaceholderText,
    findByPlaceholderText,
};
