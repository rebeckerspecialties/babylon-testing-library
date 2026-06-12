import {
    advanceFakeTimers,
    realNow,
    timersAreFaked,
    yieldRealMacrotask,
} from './fakeTimers';

/**
 * Real-time wait helpers that stay correct under jest fake timers.
 *
 * Under `jest.useFakeTimers()`, a conventional polling wait (such as
 * `@testing-library/dom`'s `waitFor`) burns its `timeout` budget in FAKE
 * milliseconds: each loop iteration advances the fake clock by `interval`,
 * so a "20s" budget is really `timeout / interval` iterations executed at
 * CPU speed, and real async work (asset HTTP loads, file I/O) is starved of
 * the event-loop turns it needs while the budget evaporates. The helpers
 * below keep that pump — advancing the fake clock keeps timer-driven app
 * code moving — but enforce the deadline on the real clock and yield one
 * real macrotask per advance so genuine I/O makes progress.
 */
export interface RealTimeWaitOptions {
    /** Real wall-clock budget in milliseconds (default 1000). */
    timeout?: number;
    /** Poll / fake-clock advance interval in milliseconds (default 50). */
    interval?: number;
    /**
     * Wraps every pump step (fake-clock advance plus event-loop yield, or
     * real-time sleep). Defaults to the identity wrapper. React consumers
     * should pass `act` so state updates flushed while pumping do not warn,
     * mirroring @testing-library/react's `unstable_advanceTimersWrapper`.
     */
    wrapper?: (pump: () => Promise<void>) => unknown;
}

const defaultWrapper = (pump: () => Promise<void>) => pump();

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
    !!value && typeof (value as PromiseLike<unknown>).then === 'function';

/**
 * Advances the wait by one interval: under fake timers, advance the fake
 * clock and yield one real macrotask so genuine async work can progress;
 * under real timers, sleep for the interval.
 */
const pumpOnce = async (
    interval: number,
    wrapper: (pump: () => Promise<void>) => unknown
): Promise<void> => {
    await wrapper(async () => {
        if (timersAreFaked()) {
            advanceFakeTimers(interval);
            await yieldRealMacrotask();
        } else {
            await new Promise<void>((resolve) => {
                setTimeout(resolve, interval);
            });
        }
    });
};

type SettledOutcome<T> =
    | { state: 'resolved'; value: T }
    | { state: 'rejected'; rejection: unknown };

/**
 * Like `waitFor`, but the timeout is enforced in REAL elapsed time whether
 * fake timers are installed or not, while the fake clock is still pumped.
 * Use it for conditions driven by genuine async work (network, file I/O)
 * that fake-time budgets cannot meaningfully bound.
 *
 * Callbacks may be sync or async. A pending async callback does not count
 * as a successful poll: the fake clock keeps pumping while it settles (it
 * may need fake-clock advances to do so), and if it is still pending when
 * the real deadline lapses the wait rejects with a timeout error. A
 * callback that throws or rejects inside the real deadline is polled again;
 * past the deadline the wait ends with the last error. A callback that
 * returns (or resolves) ends the wait with its value.
 */
export const waitForRealTime = async <T>(
    callback: () => T | Promise<T>,
    options: RealTimeWaitOptions = {}
): Promise<T> => {
    const { timeout = 1000, interval = 50, wrapper = defaultWrapper } = options;
    const startedAt = realNow();
    const withinDeadline = () => realNow() - startedAt <= timeout;
    // Assigned before every read: each throw below follows an assignment.
    let lastError: unknown;

    for (;;) {
        let result: T | Promise<T>;
        try {
            result = callback();
        } catch (error) {
            lastError = error;
            if (!withinDeadline()) {
                throw lastError;
            }
            await pumpOnce(interval, wrapper);
            continue;
        }

        if (!isPromiseLike(result)) {
            return result;
        }

        let outcome: SettledOutcome<T> | undefined;
        Promise.resolve(result).then(
            (value) => {
                outcome = { state: 'resolved', value };
            },
            (rejection) => {
                outcome = { state: 'rejected', rejection };
            }
        );

        // A pending promise is not a successful poll, but it must not pump
        // unbounded either: once the real deadline lapses, the wait ends
        // with a named timeout error instead of hanging until the test
        // runner's own timeout. A settlement that lands during the final
        // in-deadline pump is still honored.
        while (outcome === undefined) {
            if (!withinDeadline()) {
                throw new Error(
                    `Timed out in waitForRealTime: callback promise still pending after ${timeout}ms`
                );
            }
            await pumpOnce(interval, wrapper);
        }

        if (outcome.state === 'resolved') {
            return outcome.value;
        }

        lastError = outcome.rejection;
        if (!withinDeadline()) {
            throw lastError;
        }
        await pumpOnce(interval, wrapper);
    }
};

/**
 * Resolves once every given promise has settled (fulfilled or rejected),
 * pumping fake timers while real I/O completes. Rejections count as settled
 * and are NOT propagated — callers should assert on the operations'
 * observable results afterwards. Times out in real elapsed time with an
 * error naming the `label` and the pending/total counts.
 */
export const waitForAllSettled = async (
    promises: ReadonlyArray<Promise<unknown>>,
    options: RealTimeWaitOptions & { label?: string } = {}
): Promise<void> => {
    const { label = 'promise(s)', ...waitOptions } = options;
    let pending = promises.length;
    for (const promise of promises) {
        const settle = () => {
            pending -= 1;
        };
        void promise.then(settle, settle);
    }

    await waitForRealTime(() => {
        if (pending > 0) {
            throw new Error(
                `Still waiting for ${pending} of ${promises.length} ${label} to settle`
            );
        }
    }, waitOptions);
};
