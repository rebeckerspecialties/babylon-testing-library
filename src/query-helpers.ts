import { waitFor, waitForOptions } from '@testing-library/dom';
import { BabylonContainer, findAllMatchingDescendants } from './queries/utils';

export type GetErrorFunction<ContainerType> = (
    c: ContainerType,
    text: string
) => string;

export function getMultipleElementsFoundError<ContainerType>(
    message: string,
    container: ContainerType
) {
    return new Error(
        `${message}\n\n(If this is intentional, then use the \`*AllBy*\` variant of the query (like \`queryAllByText\`, \`getAllByText\`, or \`findAllByText\`)). Container: ${container}`
    );
}

export function queryAllByAttribute<AttributeType>(
    attribute: string,
    container: BabylonContainer,
    value: AttributeType
) {
    return findAllMatchingDescendants(
        container,
        (control) => control[attribute] === value
    );
}

export function queryByAttribute<AttributeType>(
    attribute: string,
    container: BabylonContainer,
    value: AttributeType
) {
    const controls = queryAllByAttribute(attribute, container, value);

    if (controls.length === 0) {
        return null;
    }

    if (controls.length > 1) {
        throw getMultipleElementsFoundError(
            `Found multiple elements by [${attribute}=${value}]`,
            container
        );
    }

    return controls[0];
}

export function buildQueries<ContainerType, MatcherType, ResultType>(
    queryAllBy: (
        container: ContainerType,
        matcher: MatcherType
    ) => ResultType[],
    getMultipleError: GetErrorFunction<ContainerType>,
    getMissingError: GetErrorFunction<ContainerType>
) {
    const queryBy = (container: ContainerType, matcher: MatcherType) => {
        const result = queryAllBy(container, matcher);

        if (result.length === 0) {
            return null;
        }

        if (result.length > 1) {
            throw getMultipleElementsFoundError(
                getMultipleError(container, `${matcher}`),
                container
            );
        }

        return result[0];
    };

    const getAllBy = (container: ContainerType, matcher: MatcherType) => {
        const result = queryAllBy(container, matcher);
        if (result.length === 0) {
            throw new Error(getMissingError(container, `${matcher}`));
        }
        return result;
    };

    const getBy = (container: ContainerType, matcher: MatcherType) => {
        const result = getAllBy(container, matcher);
        if (result.length > 1) {
            throw getMultipleElementsFoundError(
                getMultipleError(container, `${matcher}`),
                container
            );
        }
        return result[0];
    };

    const findAllBy = (
        container: ContainerType,
        matcher: MatcherType,
        waitForOptions?: waitForOptions
    ) => {
        return waitFor(() => {
            return getAllBy(container, matcher);
        }, waitForOptions);
    };

    const findBy = (
        container: ContainerType,
        matcher: MatcherType,
        waitForOptions?: waitForOptions
    ) => {
        return waitFor(() => {
            return getBy(container, matcher);
        }, waitForOptions);
    };

    return { queryBy, getAllBy, getBy, findAllBy, findBy };
}
