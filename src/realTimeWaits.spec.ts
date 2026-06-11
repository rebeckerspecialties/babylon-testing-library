import { readFile } from 'fs/promises';
import { waitForAllSettled, waitForRealTime } from './realTimeWaits';

describe('waitForRealTime', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('resolves once a fake-clock timer satisfies the condition', async () => {
        jest.useFakeTimers();
        let ready = false;
        setTimeout(() => {
            ready = true;
        }, 5000);

        // 5000 fake-ms must elapse via pump advances inside a 1s real budget.
        await waitForRealTime(() => {
            if (!ready) {
                throw new Error('not yet');
            }
        });

        expect(ready).toBe(true);
    });

    it('returns the callback result', async () => {
        await expect(waitForRealTime(() => 42)).resolves.toBe(42);
    });

    it('resolves an async callback that needs fake-clock advances to settle', async () => {
        jest.useFakeTimers();

        const result = await waitForRealTime(async () => {
            await new Promise((resolve) => {
                setTimeout(resolve, 2000);
            });
            return 'timer fired';
        });

        expect(result).toBe('timer fired');
    });

    it('enforces the timeout in real elapsed time under fake timers', async () => {
        jest.useFakeTimers();
        const begin = jest.getRealSystemTime();

        await expect(
            waitForRealTime(
                () => {
                    throw new Error('never ready');
                },
                { timeout: 250 }
            )
        ).rejects.toThrow('never ready');

        // A fake-ms budget would burn at CPU speed; the real deadline must
        // actually consume at least its real duration. Measured with
        // getRealSystemTime because fake timers also fake Date.
        expect(jest.getRealSystemTime() - begin).toBeGreaterThanOrEqual(250);
    });

    it('retries an async callback past transient rejections within the deadline', async () => {
        jest.useFakeTimers();
        let attempts = 0;

        await expect(
            waitForRealTime(
                async () => {
                    attempts += 1;
                    if (attempts < 3) {
                        throw new Error('not ready yet');
                    }
                    return 'ready';
                },
                { timeout: 5000 }
            )
        ).resolves.toBe('ready');

        expect(attempts).toBeGreaterThanOrEqual(3);
    });

    it('rejects with the last async error once the real deadline lapses', async () => {
        jest.useFakeTimers();
        const begin = jest.getRealSystemTime();

        await expect(
            waitForRealTime(
                async () => {
                    throw new Error('async never ready');
                },
                { timeout: 250 }
            )
        ).rejects.toThrow('async never ready');

        expect(jest.getRealSystemTime() - begin).toBeGreaterThanOrEqual(250);
    });

    it('rejects with the last callback error under real timers too', async () => {
        await expect(
            waitForRealTime(
                () => {
                    throw new Error('still failing');
                },
                { timeout: 100, interval: 10 }
            )
        ).rejects.toThrow('still failing');
    });

    it('invokes the wrapper around every pump step', async () => {
        jest.useFakeTimers();
        let pumps = 0;
        const wrapper = (pump: () => Promise<void>) => {
            pumps += 1;
            return pump();
        };
        let ready = false;
        setTimeout(() => {
            ready = true;
        }, 200);

        await waitForRealTime(
            () => {
                if (!ready) {
                    throw new Error('not yet');
                }
            },
            { wrapper }
        );

        // 200 fake-ms at the default 50ms interval needs four advances.
        expect(pumps).toBeGreaterThanOrEqual(4);
        expect(ready).toBe(true);
    });
});

describe('waitForAllSettled', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('lets real file I/O finish while fake timers are installed', async () => {
        // THE regression this module exists for: under jest.useFakeTimers()
        // and WITHOUT @testing-library/react's act-based timer wrapper, real
        // I/O must still get macrotask time between fake-clock advances.
        jest.useFakeTimers();
        const read = readFile(__filename, 'utf8');

        await waitForAllSettled([read], { timeout: 10000 });

        await expect(read).resolves.toContain('waitForAllSettled');
    });

    it('counts rejected promises as settled without propagating', async () => {
        jest.useFakeTimers();
        const rejected = Promise.reject(new Error('boom'));
        rejected.catch(() => undefined);

        await expect(
            waitForAllSettled([rejected], { timeout: 5000 })
        ).resolves.toBeUndefined();
    });

    it('reports pending counts with the provided label on timeout', async () => {
        jest.useFakeTimers();

        await expect(
            waitForAllSettled([new Promise(() => undefined)], {
                timeout: 200,
                label: 'GLB load(s)',
            })
        ).rejects.toThrow('Still waiting for 1 of 1 GLB load(s) to settle');
    });
});
