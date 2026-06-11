/**
 * @jest-environment node
 *
 * The jsdom environment lacks MessageChannel, so the pump yields via a
 * captured real setTimeout there. In a plain node environment the
 * MessageChannel path is taken instead — exercise the same contract there.
 */
import { readFile } from 'fs/promises';
import { waitForAllSettled, waitForRealTime } from './realTimeWaits';

describe('realTimeWaits in a node environment (MessageChannel pump)', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('has MessageChannel available', () => {
        expect(typeof MessageChannel).toBe('function');
    });

    it('lets real file I/O finish while fake timers are installed', async () => {
        jest.useFakeTimers();
        const read = readFile(__filename, 'utf8');

        await waitForAllSettled([read], { timeout: 10000 });

        await expect(read).resolves.toContain('MessageChannel pump');
    });

    it('resolves once a fake-clock timer satisfies the condition', async () => {
        jest.useFakeTimers();
        let ready = false;
        setTimeout(() => {
            ready = true;
        }, 5000);

        await waitForRealTime(() => {
            if (!ready) {
                throw new Error('not yet');
            }
        });

        expect(ready).toBe(true);
    });
});
