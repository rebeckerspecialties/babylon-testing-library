import { waitOrAdvance } from './waitOrAdvance';

describe('waitOrAdvance', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('fires a scheduled callback deterministically under fake timers', async () => {
        jest.useFakeTimers();
        const callback = jest.fn();
        setTimeout(callback, 100);

        await waitOrAdvance(100);

        expect(callback).toHaveBeenCalled();
    });

    it('does not fire callbacks scheduled beyond the advanced window', async () => {
        jest.useFakeTimers();
        const callback = jest.fn();
        setTimeout(callback, 101);

        await waitOrAdvance(100);

        expect(callback).not.toHaveBeenCalled();
    });

    it('sleeps for roughly the requested duration under real timers', async () => {
        const begin = Date.now();

        await waitOrAdvance(50);

        // Allow for timer granularity while still proving a real wait
        // happened.
        expect(Date.now() - begin).toBeGreaterThanOrEqual(45);
    });
});
