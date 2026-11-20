// strength.test.js
// Unit tests for the pure strength-meter functions extracted from popup.js
// (src/modules/strength.js), plus the background empty-charset guard.

import {
    buildCharset,
    charsetSize,
    perCharEntropy,
    calcEntropy,
    strengthLevel,
    crackTimeParts,
    evaluateStrength,
} from '@/modules/strength.js';

const DIGITS = '0123456789';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';

function makeMap(overrides = {}) {
    return Object.assign({
        numbersChecked: true,
        uppercaseChecked: true,
        lowercaseChecked: true,
        symbolsChecked: true,
        symbols: '!@#$%^&*(){}[]=,.',
        pwlength: 40,
    }, overrides);
}

describe('buildCharset', () => {
    test('all four classes enabled builds digits+upper+lower+symbols', () => {
        const map = makeMap({ symbols: 'abc' });
        expect(buildCharset(map)).toBe(DIGITS + UPPER + LOWER + 'abc');
    });

    test('symbols checked with EMPTY symbols field adds nothing (no 32-char fallback)', () => {
        const map = makeMap({ symbols: '' });
        const cs = buildCharset(map);
        expect(cs).toBe(DIGITS + UPPER + LOWER);
        expect(charsetSize(cs)).toBe(62);
    });

    test('only symbols checked with empty field yields empty charset', () => {
        const map = makeMap({
            numbersChecked: false, uppercaseChecked: false,
            lowercaseChecked: false, symbols: '',
        });
        expect(buildCharset(map)).toBe('');
        expect(charsetSize(buildCharset(map))).toBe(0);
    });

    test('duplicate symbols (and symbols overlapping alnum) are deduplicated in size', () => {
        const map = makeMap({ symbols: 'a!a!!@7' }); // 'a' overlaps lower, '7' overlaps digits
        const cs = buildCharset(map);
        // 10 + 26 + 26 base, symbols add only '!' and '@'
        expect(charsetSize(cs)).toBe(64);
    });

    test('charset string itself KEEPS duplicates (generator must not dedup)', () => {
        const map = makeMap({
            numbersChecked: false, uppercaseChecked: false,
            lowercaseChecked: true, symbols: 'aaaa!',
        });
        const cs = buildCharset(map);
        expect(cs.length).toBe(31); // 26 lower + 'aaaa!' as-is
        expect(charsetSize(cs)).toBe(27);
    });

    test('unicode symbols counted per code point', () => {
        const map = makeMap({ symbols: '😀😁😀' });
        expect(charsetSize(buildCharset(map))).toBe(64); // +😀 +😁
    });
});

describe('perCharEntropy (weighted draw over duplicates)', () => {
    test('no duplicates falls back to log2(N)', () => {
        const cs = buildCharset(makeMap()); // 79 unique chars
        expect(perCharEntropy(cs)).toBeCloseTo(Math.log2(79), 10);
    });

    test('lowercase only + symbols "aaaa!": N=31, a drawn 5x -> ~4.58 bits/char, not 4.75', () => {
        const map = makeMap({
            numbersChecked: false, uppercaseChecked: false,
            lowercaseChecked: true, symbols: 'aaaa!',
        });
        const cs = buildCharset(map);
        expect(cs.length).toBe(31);
        // unique-count formula would over-estimate: log2(27) = 4.7549
        expect(Math.log2(charsetSize(cs))).toBeCloseTo(4.7549, 3);
        // H = log2(31) - (5*log2(5) + 26*1*log2(1))/31 = 4.5797
        expect(perCharEntropy(cs)).toBeCloseTo(4.5797, 3);
    });

    test('evaluateStrength uses the weighted entropy', () => {
        const map = makeMap({
            numbersChecked: false, uppercaseChecked: false,
            lowercaseChecked: true, symbols: 'aaaa!', pwlength: 40,
        });
        const r = evaluateStrength(map, 'RANDOM');
        expect(r.entropy).toBeCloseTo(4.5797 * 40, 1);
    });

    test('degenerate charsets return 0', () => {
        expect(perCharEntropy('')).toBe(0);
        expect(perCharEntropy('a')).toBe(0);
    });
});

describe('calcEntropy', () => {
    test('four classes + 17 unique symbols + length 40 = 252.2 bits', () => {
        const map = makeMap({ symbols: '!@#$%^&*(){}[]=,.' }); // 17 distinct, no alnum overlap
        const cs = buildCharset(map);
        expect(charsetSize(cs)).toBe(79);
        const e = calcEntropy(charsetSize(cs), map.pwlength);
        expect(e.toFixed(1)).toBe('252.2');
    });

    test('degenerate sizes return 0', () => {
        expect(calcEntropy(0, 40)).toBe(0);
        expect(calcEntropy(1, 40)).toBe(0);
        expect(calcEntropy(62, 0)).toBe(0);
    });
});

describe('evaluateStrength', () => {
    test('checksum ERROR is not scored (returns null)', () => {
        expect(evaluateStrength(makeMap(), 'ERROR')).toBeNull();
    });

    test('missing parameters map is not scored', () => {
        expect(evaluateStrength(null, 'RANDOM')).toBeNull();
    });

    test('RANDOM checksum scores normally and is flagged as non-derived', () => {
        const r = evaluateStrength(makeMap(), 'RANDOM');
        expect(r).not.toBeNull();
        expect(r.derived).toBe(false);
        expect(r.level).toBe('excellent');
        expect(r.percent).toBe(100);
    });

    test('a hex checksum (derived mode) is flagged as derived', () => {
        const r = evaluateStrength(makeMap(), 'A1B2C3D4');
        expect(r.derived).toBe(true);
    });
});

describe('crackTimeParts (unit boundaries and rounding promotion)', () => {
    // entropy for a target average time: E = log2(t) + log2(20e9) + 1
    const eFor = (seconds) => Math.log2(seconds) + Math.log2(20e9) + 1;

    test('below 1ms renders the open-ended label', () => {
        expect(crackTimeParts(10)).toEqual({ unit: 'crack_lt_1ms' });
    });

    test('just over 1ms renders milliseconds', () => {
        const r = crackTimeParts(eFor(0.01)); // 10ms
        expect(r.unit).toBe('unit_ms');
        expect(r.value).toBe(10);
    });

    test('999.6ms rounds to 1000 and is promoted to seconds instead of showing 1000ms', () => {
        // pick a value that rounds to exactly 1000ms
        const r = crackTimeParts(eFor(0.9996));
        expect(r.unit).toBe('unit_s');
        expect(r.value).toBe(1);
    });

    test('59.96s rounds to 60s and is promoted to minutes', () => {
        const r = crackTimeParts(eFor(59.96));
        expect(r.unit).toBe('unit_min');
        expect(r.value).toBe(1);
    });

    test('23.999h rounds to 24h and is promoted to days', () => {
        const r = crackTimeParts(eFor(23.9997 * 3600));
        expect(r.unit).toBe('unit_d');
        expect(r.value).toBe(1);
    });

    test('364.9d rounds to 365d and is promoted to years', () => {
        const r = crackTimeParts(eFor(364.9 * 86400));
        expect(r.unit).toBe('unit_y');
        expect(r.value).toBe(1);
    });

    test('999.6y rounds to 1000y and is promoted to the open-ended label', () => {
        const r = crackTimeParts(eFor(999.6 * 86400 * 365));
        expect(r.unit).toBe('crack_gt_1000y');
        expect(r.value).toBeUndefined();
    });

    test('beyond 1000y renders the open-ended label', () => {
        expect(crackTimeParts(252.2).unit).toBe('crack_gt_1000y');
        expect(crackTimeParts(1e6).unit).toBe('crack_gt_1000y');
    });

    test('mid-range values keep one decimal in seconds', () => {
        const r = crackTimeParts(eFor(3.2));
        expect(r.unit).toBe('unit_s');
        expect(r.value.toFixed(1)).toBe('3.2');
    });

    test('monotonic: no unit ever displays a rounded 1000/60/24/365 overflow', () => {
        // sweep entropies, assert each rendered value is within its unit bounds
        const bounds = { unit_ms: 1000, unit_s: 60, unit_min: 60, unit_h: 24, unit_d: 365, unit_y: 1000 };
        for (let e = 0; e <= 300; e += 0.25) {
            const r = crackTimeParts(e);
            if (r.value !== undefined) {
                expect(r.value).toBeLessThan(bounds[r.unit]);
            }
        }
    });
});

describe('background empty-charset guard', () => {
    // Import the module and exercise the guard on a bare prototype instance,
    // stubbing sendPasswordResult so no chrome messaging is needed.
    let StateManager;
    let intervalSpy;
    let startedIntervals = [];
    beforeAll(async () => {
        // background.js instantiates StateManager at module scope, which starts
        // a 5s setInterval; capture and clear it so the test worker can exit.
        intervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(() => {
            const id = startedIntervals.length + 1000;
            startedIntervals.push(id);
            return id;
        });
        ({ StateManager } = await import('@/background/background.js'));
    });
    afterAll(() => {
        startedIntervals.forEach(id => clearInterval(id));
        intervalSpy.mockRestore();
    });

    function bareInstance() {
        const sm = Object.create(StateManager.prototype);
        sm.sent = [];
        sm.sendPasswordResult = (password, checksum, saved = false, parameters = null, mode = 0) => {
            sm.sent.push({ password, checksum, parameters });
        };
        return sm;
    }

    test('generatePassword with only symbols checked and empty field returns ERROR', async () => {
        const sm = bareInstance();
        await sm.generatePassword(makeMap({
            numbersChecked: false, uppercaseChecked: false,
            lowercaseChecked: false, symbols: '',
        }));
        expect(sm.sent).toHaveLength(1);
        expect(sm.sent[0].checksum).toBe('ERROR');
    });

    test('generateSlavePassword with empty charset returns ERROR before HMAC', async () => {
        const sm = bareInstance();
        await sm.generateSlavePassword(makeMap({
            numbersChecked: false, uppercaseChecked: false,
            lowercaseChecked: false, symbols: '', pw: 'master',
        }));
        expect(sm.sent).toHaveLength(1);
        expect(sm.sent[0].checksum).toBe('ERROR');
    });

    test('generatePassword still reports no-class error first', async () => {
        const sm = bareInstance();
        await sm.generatePassword(makeMap({
            numbersChecked: false, uppercaseChecked: false,
            lowercaseChecked: false, symbolsChecked: false,
        }));
        expect(sm.sent[0].checksum).toBe('ERROR');
    });
});
