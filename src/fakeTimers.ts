/**
 * Internal fake-timer plumbing shared by the real-time wait helpers.
 *
 * Detection inspects the installed timer functions themselves: modern
 * (@sinonjs/fake-timers) fake timers tag the replacement `setTimeout` with a
 * `clock` property, and legacy jest fake timers replace it with a jest mock.
 * `globalThis.jest` must never be used for this — the `jest` object is
 * injected per-module by the jest runtime and is not a true global under
 * Jest 30, so a `globalThis.jest` guard silently takes the wrong branch.
 */

// The jest runtime injects a module-scoped `jest` object into every module it
// loads (including dependencies); outside jest the identifier is undefined.
declare const jest:
    | {
          advanceTimersByTime?: (ms: number) => void;
          getRealSystemTime?: () => number;
      }
    | undefined;

type FakeClock = {
    tick: (ms: number) => unknown;
};

// Captured at module load, normally before any test installs fake timers.
// Modern fake timers replace the global `Date` and `setTimeout` rather than
// mutating them, so references captured here keep reading the host clock and
// scheduling real macrotasks even while the globals are faked.
const capturedDateNow = Date.now;
const capturedSetTimeout = setTimeout;

const getFakeClock = (): FakeClock | undefined => {
    if (!Object.prototype.hasOwnProperty.call(setTimeout, 'clock')) {
        return undefined;
    }
    const { clock } = setTimeout as unknown as { clock?: FakeClock };
    return typeof clock?.tick === 'function' ? clock : undefined;
};

const legacyTimersAreMocked = (): boolean =>
    (setTimeout as unknown as { _isMockFunction?: boolean })._isMockFunction ===
    true;

export const timersAreFaked = (): boolean =>
    getFakeClock() !== undefined || legacyTimersAreMocked();

/**
 * Real wall-clock now, immune to fake timers. Modern fake timers replace
 * `Date` itself, so `Date.now()` reads the fake clock;
 * `jest.getRealSystemTime()` always reads the host clock. Outside jest, the
 * `Date.now` captured at module load serves the same purpose.
 */
export const realNow = (): number => {
    if (
        typeof jest !== 'undefined' &&
        typeof jest?.getRealSystemTime === 'function'
    ) {
        return jest.getRealSystemTime();
    }
    return capturedDateNow();
};

/**
 * Advances the fake clock, preferring the injected `jest` object (which also
 * covers legacy fake timers and keeps jest's bookkeeping consistent) and
 * falling back to ticking the sinon clock directly so non-jest runners and
 * `injectGlobals: false` setups still advance.
 */
export const advanceFakeTimers = (ms: number): void => {
    if (
        typeof jest !== 'undefined' &&
        typeof jest?.advanceTimersByTime === 'function'
    ) {
        jest.advanceTimersByTime(ms);
        return;
    }
    getFakeClock()?.tick(ms);
};

/**
 * Yields one REAL macrotask so the event loop can service genuine async work
 * (socket and file I/O) between fake-clock advances. Fake timers do not fake
 * `MessageChannel`; where the environment lacks it (jsdom does not implement
 * it), the `setTimeout` captured at module load — before fake timers were
 * installed — schedules a real timer instead. Only when fake timers were
 * already installed at module load AND there is no `MessageChannel` does
 * this degrade to a microtask yield, under which real I/O cannot progress.
 */
export const yieldRealMacrotask = (): Promise<void> => {
    if (typeof MessageChannel === 'function') {
        return new Promise((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = () => {
                channel.port1.close();
                channel.port2.close();
                resolve();
            };
            channel.port2.postMessage(undefined);
        });
    }

    const realTimer = !timersAreFaked()
        ? setTimeout
        : capturedSetTimeout !== setTimeout
          ? capturedSetTimeout
          : undefined;
    if (realTimer) {
        return new Promise((resolve) => {
            realTimer(() => resolve(), 0);
        });
    }

    return Promise.resolve();
};
