import { Control, TextBlock } from '@babylonjs/gui';
import { BabylonContainer, findAllMatchingDescendants } from './utils';
import { buildQueries } from '../query-helpers';

export function getMultipleElementsFoundError(
    message: string,
    container: BabylonContainer
) {
    return new Error(
        `${message}\n\n(If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)). Container: ${container}`
    );
}

const getMissingError = (message: string, container: BabylonContainer) => {
    return new Error(`${message}. Container: ${container}`);
};

const queryAllByText = (
    container: BabylonContainer,
    text: string
): Control[] => {
    const matcher = (control: Control) => {
        return control instanceof TextBlock && control.text === text;
    };

    const baseArray: Control[] = [];

    if (container instanceof Control && matcher(container)) {
        baseArray.push(container);
    }

    return [...baseArray, ...findAllMatchingDescendants(container, matcher)];
};

const {
    queryBy: queryByText,
    getAllBy: getAllByText,
    getBy: getByText,
    findAllBy: findAllByText,
    findBy: findByText,
} = buildQueries(
    queryAllByText,
    getMultipleElementsFoundError,
    getMissingError
);

export {
    queryAllByText,
    queryByText,
    getAllByText,
    getByText,
    findAllByText,
    findByText,
};
