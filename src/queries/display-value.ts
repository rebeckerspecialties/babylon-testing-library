import { Control, InputText } from '@babylonjs/gui';
import { BabylonContainer, findAllMatchingDescendants } from './utils';
import { buildQueries } from '../query-helpers';

const getMultipleError = (_c: BabylonContainer, text: string) =>
    `Found multiple elements with the display value: ${text}`;

const getMissingError = (container: BabylonContainer, message: string) => {
    return `Unable to find an element with the display value: ${message}. Container: ${container}`;
};

const queryAllByDisplayValue = (
    container: BabylonContainer,
    text: string
): Control[] => {
    const matcher = (control: Control) => {
        return control instanceof InputText && control.text === text;
    };

    return findAllMatchingDescendants(container, matcher);
};

const {
    queryBy: queryByDisplayValue,
    getAllBy: getAllByDisplayValue,
    getBy: getByDisplayValue,
    findAllBy: findAllByDisplayValue,
    findBy: findByDisplayValue,
} = buildQueries(queryAllByDisplayValue, getMultipleError, getMissingError);

export {
    queryAllByDisplayValue,
    queryByDisplayValue,
    getAllByDisplayValue,
    getByDisplayValue,
    findAllByDisplayValue,
    findByDisplayValue,
};
