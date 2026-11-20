// slave-golden.test.js
// Golden tests for derived (HMAC) password output. The derived generator's
// output IS users' real password on every site — a single changed character
// breaks existing logins. These values were produced with PWG.generateSlavePassword
// on commit 7725ee9 (before the buildCharset refactor); new code must reproduce
// them byte-for-byte, with master password "1234", salt "1:example".

const cryptoNode = require('crypto');
global.crypto = cryptoNode.webcrypto;

import { PWG } from '@/modules/password.js';
import { buildCharset } from '@/modules/strength.js';

const D = '0123456789';
const U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const L = 'abcdefghijklmnopqrstuvwxyz';
const S = '!@#$%^&*(){}[]=,.';

const CASES = [
    {
        name: 'all four classes + default symbols, length 40',
        map: { numbersChecked: true, uppercaseChecked: true, lowercaseChecked: true, symbolsChecked: true, symbols: S },
        length: 40,
        charsetExpect: D + U + L + S,
        golden: 'dnba1PRflbDDd^YNebla)brU}HJr}g=cvebdPZeD',
    },
    {
        name: 'lowercase only, length 40',
        map: { numbersChecked: false, uppercaseChecked: false, lowercaseChecked: true, symbolsChecked: false, symbols: '' },
        length: 40,
        charsetExpect: L,
        golden: 'nxlkbzcpwmooopiypmvltmbevrtbvqynfolnajoo',
    },
    {
        name: 'symbols field overlapping alnum ("a7!", NOT deduplicated), length 20',
        map: { numbersChecked: true, uppercaseChecked: true, lowercaseChecked: true, symbolsChecked: true, symbols: 'a7!' },
        length: 20,
        charsetExpect: D + U + L + 'a7!', // duplicates kept, order matters
        golden: 'dnba1PffzpRRr2Ybsplo',
    },
    {
        name: 'all four classes + default symbols, length 1',
        map: { numbersChecked: true, uppercaseChecked: true, lowercaseChecked: true, symbolsChecked: true, symbols: S },
        length: 1,
        charsetExpect: D + U + L + S,
        golden: 'd',
    },
    {
        name: 'all four classes + default symbols, length 100',
        map: { numbersChecked: true, uppercaseChecked: true, lowercaseChecked: true, symbolsChecked: true, symbols: S },
        length: 100,
        charsetExpect: D + U + L + S,
        golden: 'dnba1PRflbDDd^YNebla)brU}HJr}g=cvebdPZeDZwgg6SwmJ,cFFj}QZmCDZ0S(78j.44LS$3ogJxgeIQoHlSX]ZWMVbFh2^B,V',
    },
];

describe('derived (slave) password goldens — output must never change', () => {
    test.each(CASES)('$name', async ({ map, length, charsetExpect, golden }) => {
        // The shared buildCharset must yield the exact same string the
        // pre-refactor inline assembly produced (same order, duplicates kept).
        const charset = buildCharset(map);
        expect(charset).toBe(charsetExpect);
        const [password, masterHashHex] = await PWG.generateSlavePassword('1234', '1:example', charset, length);
        expect(password).toBe(golden);
        expect(masterHashHex).toBe('1F7B2B6D');
    });
});
