import { expect } from '@jest/globals';
import { SchemaCompressor } from '../../src/modules/schema';

describe('SchemaCompressor', () => {
    test('should compress schema correctly', () => {
        const testCases = [
            ['bit', 'bool', 'byte', 'int', 'int64', 's20','s65535'],
            ['s10', 's5', 'int64', 'bit', 'bit', 'timestamp'],
            ['bit', 'byte', 'int', 'int64'],
            ['bit', 'timestamp', 's16', 's32', 's64', 's128'],
            ['bit', 'bit', 's10', 'int', 's20', 'int64', 'byte']
        ];

        testCases.forEach((schema, index) => {
            console.log(`\nTest Case ${index + 1}:`);
            console.log('Original Schema:', schema);
            try {
                // 壓縮
                const compressed = SchemaCompressor.compressSchema(schema);
                console.log('Compressed Schema:', compressed);

                // 解壓縮
                const decompressed = SchemaCompressor.decompressSchema(compressed);
                console.log('Decompressed Schema:', decompressed);

                expect(decompressed).toEqual(schema);
            } catch (error) {
                console.error('Error:', error);
            }
        });
    });
});