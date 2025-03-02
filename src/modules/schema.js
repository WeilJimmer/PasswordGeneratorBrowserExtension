// schema.js
// Author: Weil Jimmer
// Description: This file contains the SchemaCompressor class which is responsible for compressing and decompressing schema information.
// The schema information is used to pack and unpack data using the BitPacker class.

export class SchemaCompressor {
    static TYPE_MAP = {
        'bit': 1,
        'bool': 2,
        'byte': 3,
        'int': 4,
        'int64': 5,
        'string': 6,    // 用於標識字串類型
        'timestamp': 7
    };

    static REVERSE_TYPE_MAP = Object.fromEntries(
        Object.entries(SchemaCompressor.TYPE_MAP).map(([k, v]) => [v, k])
    );

    // 壓縮 schema
    static compressSchema(schema) {
        // 計算需要的總位元數
        const totalBits = schema.reduce((total, type) => {
            const typeStr = type.toLowerCase();
            // 所有類型都需要 3 位用於類型標識
            // 如果是字串類型，額外需要 16 位用於長度
            return total + 3 + (typeStr.startsWith('s') ? 16 : 0);
        }, 0);

        const totalBytes = Math.ceil(totalBits / 8);
        const buffer = new ArrayBuffer(totalBytes);
        const view = new DataView(buffer);
        let bitPosition = 0;

        // 處理每個類型
        for (const type of schema) {
            const typeStr = type.toLowerCase();

            if (typeStr.startsWith('s')) {
                // 寫入字串類型標識 (6)
                this.writeBits(view, bitPosition, this.TYPE_MAP.string, 3);
                bitPosition += 3;
                // 解析並寫入字串長度
                const length = parseInt(typeStr.slice(1));
                if (length > 65535) {
                    throw new Error('String length cannot exceed 65535 bytes');
                }
                this.writeBits(view, bitPosition, length, 16);
                bitPosition += 16;
            } else {
                const typeId = this.TYPE_MAP[typeStr];
                if (typeId === undefined) {
                    throw new Error(`Unknown type: ${type}`);
                }
                this.writeBits(view, bitPosition, typeId, 3);
                bitPosition += 3;
            }
        }

        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    }

    // 解壓縮 schema
    static decompressSchema(base64String) {
        const binaryString = atob(base64String);
        const buffer = new ArrayBuffer(binaryString.length);
        const view = new DataView(buffer);
        const uint8Array = new Uint8Array(buffer);

        for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
        }

        const schema = [];
        let bitPosition = 0;

        while (bitPosition + 3 <= buffer.byteLength * 8) {
            const typeId = this.readBits(view, bitPosition, 3);
            bitPosition += 3;

            // 檢查是否為有效的類型 ID（1-7）
            if (typeId < 1 || typeId > 7) break;

            if (typeId === this.TYPE_MAP.string) {
                // 確保有足夠的位元可讀
                if (bitPosition + 16 > buffer.byteLength * 8) break;
                const length = this.readBits(view, bitPosition, 16);
                bitPosition += 16;
                schema.push(`s${length}`);
            } else {
                const type = this.REVERSE_TYPE_MAP[typeId];
                if (!type) break;
                schema.push(type);
            }
        }

        return schema;
    }

    // 輔助函數：寫入位元
    static writeBits(view, startBit, value, numBits) {
        let remainingBits = numBits;
        let remainingValue = value;
        while (remainingBits > 0) {
            const byteIndex = Math.floor(startBit / 8);
            const bitOffset = startBit % 8;
            const bitsToWrite = Math.min(8 - bitOffset, remainingBits);

            let currentByte = view.getUint8(byteIndex) || 0;
            const mask = ((1 << bitsToWrite) - 1) << (8 - bitOffset - bitsToWrite);
            const valueBits = (remainingValue >> (remainingBits - bitsToWrite)) & ((1 << bitsToWrite) - 1);

            currentByte = (currentByte & ~mask) | (valueBits << (8 - bitOffset - bitsToWrite));
            view.setUint8(byteIndex, currentByte);

            remainingBits -= bitsToWrite;
            startBit += bitsToWrite;
        }
    }

    // 輔助函數：讀取位元
    static readBits(view, startBit, numBits) {
        let result = 0;
        let bitsRead = 0;

        while (bitsRead < numBits) {
            const byteIndex = Math.floor(startBit / 8);
            const bitOffset = startBit % 8;
            const bitsToRead = Math.min(8 - bitOffset, numBits - bitsRead);

            const currentByte = view.getUint8(byteIndex);
            const mask = ((1 << bitsToRead) - 1) << (8 - bitOffset - bitsToRead);
            const value = (currentByte & mask) >> (8 - bitOffset - bitsToRead);

            result = (result << bitsToRead) | value;
            bitsRead += bitsToRead;
            startBit += bitsToRead;
        }
        return result;
    }
}


/*
// 測試函數
function testSchemaCompression() {
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
            console.log('Compressed (Base64):', compressed);

            // 解壓縮
            const decompressed = SchemaCompressor.decompressSchema(compressed);
            console.log('Decompressed Schema:', decompressed);

            // 驗證
            const isMatch = JSON.stringify(schema) === JSON.stringify(decompressed);
            console.log('Match:', isMatch);

            // 顯示二進制內容（用於調試）
            const binaryContent = Array.from(new Uint8Array(atob(compressed).split('').map(c => c.charCodeAt(0)))).map(b => b.toString(2).padStart(8, '0')).join(' ');
            console.log('Binary content:', binaryContent);

        } catch (error) {
            console.error(`Error in test case ${index + 1}:`, error);
        }
    });
}

// 運行測試
testSchemaCompression();
*/