import { expect } from '@jest/globals';
import { BitPacker } from '../../src/modules/bitpacker';

describe('BitPacker', () => {
    test('should initialize correctly', () => {
        const packer = new BitPacker();
        expect(packer).toBeDefined();
    });

    test('should pack and unpack boolean values correctly', () => {
        const packer = new BitPacker();
        const testCases = [
            {
                schema: ['bit', 'byte', 'int', 'int64', 's14', 'int', 'bit', 's8', 's0', 'bit', 'bool', 's4'],
                values: [
                    1,                                        // bit
                    255,                                      // byte
                    123456,                                   // int
                    "9007199254740991",                       // int64 (使用字串表示大數)
                    "Hello, 世界!",                           // UTF-8 字串，最大20字節
                    -123456,                                  // int
                    0,                                        // bit
                    "Test1234",                               // 8字節字串
                    "",                                       // 空字串
                    1,                                        // bit
                    true,                                     // bit
                    "ABCD"                                    // 4字節字串
                ]
            },
            {
                schema: ['s10', 's5', 'int64', 'bit', 'timestamp', 'bit'],
                values: [
                    "Test",                            // 10字節字串
                    "ABC",                             // 5字節字串
                    "123456789",                       // int64
                    1,                                 // bit
                    parseInt(Date.now()),              // timestamp
                    0                                  // bit
                ]
            },
            {
                schema: ['bool', 'bool', 'bool', 'bool', 'byte', 'int', 'int', 's4', 's10', 's8'],
                values: [
                    true,                              // bool
                    false,                             // bool
                    true,                              // bool
                    false,                             // bool
                    255,                               // byte
                    123456,                            // int
                    -123456,                           // int
                    "ABCD",                            // 4字節字串
                    "HelloWorld",                      // 10字節字串
                    "Test1234"                         // 8字節字串
                ]
            }
        ];
        testCases.forEach((test, index) => {
            console.log(`\nTest Case ${index + 1}:`);
            console.log('Original values:', test.values);

            const packed = packer.pack(test.schema, test.values);
            console.log('Packed (Base64):', packed);

            const unpacked = packer.unpack(test.schema, packed);
            console.log('Unpacked:', unpacked);

            const matches = test.values.every((val, i) => {
                if (test.schema[i] === 'int64') {
                    expect(BigInt(val).toString()).toBe(unpacked[i].toString());
                }
                expect(val.toString()).toBe(unpacked[i].toString());
            });
            console.log('All values match:', matches);
        });

    });
});