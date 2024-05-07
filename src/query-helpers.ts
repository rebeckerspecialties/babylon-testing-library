import { waitFor, waitForOptions } from '@testing-library/dom';

export function buildQueries<ContainerType, MatcherType, ResultType>(
    queryAllBy: (
        container: ContainerType,
        matcher: MatcherType
    ) => ResultType[],
    getMultipleError: (message: string, container: ContainerType) => Error,
    getMissingError: (text: string, container: ContainerType) => Error
) {
    const queryBy = (container: ContainerType, matcher: MatcherType) => {
        const result = queryAllBy(container, matcher);

        if (result.length === 0) {
            return null;
        }

        if (result.length > 1) {
            throw getMultipleError(
                `Found multiple elements matching ${matcher}`,
                container
            );
        }

        return result[0];
    };

    const getAllBy = (container: ContainerType, matcher: MatcherType) => {
        const result = queryAllBy(container, matcher);
        if (result.length === 0) {
            throw getMissingError(
                `Failed to find an element matching: ${matcher}`,
                container
            );
        }
        return result;
    };

    const getBy = (container: ContainerType, matcher: MatcherType) => {
        const result = getAllBy(container, matcher);
        if (result.length > 1) {
            throw getMultipleError(
                `Found multiple elements matching ${matcher}`,
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
