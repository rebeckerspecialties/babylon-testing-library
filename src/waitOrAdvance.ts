import { advanceFakeTimers, timersAreFaked } from './fakeTimers';

/**
 * Waits for the specified milliseconds in a fake-timer-friendly way: when
 * fake timers are installed, advances them deterministically and drains a
 * microtask so timer callbacks' immediate continuations run; otherwise
 * performs a real-time wait via `setTimeout`.
 */
export async function waitOrAdvance(ms: number): Promise<void> {
    if (timersAreFaked()) {
        advanceFakeTimers(ms);
        // Yield so microtasks scheduled by fired timer callbacks run.
        await Promise.resolve();
        return;
    }

    await new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
}
