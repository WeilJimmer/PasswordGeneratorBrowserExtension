// bitpacker.js
// Author: Weil Jimmer
// Description: This file contains the BitPacker class which is responsible for packing and unpacking data based on a schema.
// The schema defines the structure of the data to be packed and unpacked.

export class BitPacker {
    constructor() {
        this.buffer = new ArrayBuffer(0);
        this.dataView = new DataView(this.buffer);
        this.bytePosition = 0;  // 當前字節位置
        this.bitOffset = 0;     // 當前字節內的位元偏移 (0-7)
        this.textEncoder = new TextEncoder();
        this.textDecoder = new TextDecoder();
    }

    // 計算需要的總字節數 - 根據每個類型單獨計算
    static calculateSize(schema) {
        let bytePosition = 0;
        let bitOffset = 0;

        for (const type of schema) {
            const typeStr = type.toLowerCase();

            if (typeStr === 'bit' || typeStr === 'bool') {
                // 如果有空間，就在當前字節寫入
                if (bitOffset < 8) {
                    bitOffset++;
                } else {
                    // 否則移動到下一個字節
                    bytePosition++;
                    bitOffset = 1;
                }
            } else {
                // 對於非位元類型，先確保對齊到字節邊界
                if (bitOffset > 0) {
                    bytePosition++;
                    bitOffset = 0;
                }

                // 然後分配足夠的字節
                if (typeStr === 'byte') {
                    bytePosition += 1;
                } else if (typeStr === 'int') {
                    bytePosition += 4;
                } else if (typeStr === 'int64' || typeStr === 'timestamp') {
                    bytePosition += 8;
                } else if (typeStr.startsWith('s')) {
                    const byteLength = parseInt(typeStr.slice(1));
                    bytePosition += byteLength;
                } else {
                    throw new Error(`Unsupported type: ${type}`);
                }
            }
        }

        // 如果最後有未填滿的字節，算上它
        if (bitOffset > 0) {
            bytePosition++;
        }

        return bytePosition;
    }

    // 檢查一個數字是否在 JavaScript 安全整數範圍內
    static isInSafeIntegerRange(value) {
        const bigIntValue = typeof value === 'bigint' ? value : BigInt(value);
        return bigIntValue <= BigInt(Number.MAX_SAFE_INTEGER) && bigIntValue >= BigInt(Number.MIN_SAFE_INTEGER);
    }

    // 初始化 buffer
    initBuffer(schema) {
        const size = BitPacker.calculateSize(schema);
        this.buffer = new ArrayBuffer(size);
        this.dataView = new DataView(this.buffer);
        this.bytePosition = 0;
        this.bitOffset = 0;
    }

    // 寫入一個位元
    writeBit(value) {
        // 如果當前字節已滿，移到下一個字節
        if (this.bitOffset >= 8) {
            this.bytePosition++;
            this.bitOffset = 0;
        }

        // 獲取當前字節值
        let currentByte = 0;
        if (this.bytePosition < this.buffer.byteLength) {
            currentByte = this.dataView.getUint8(this.bytePosition);
        }

        // 設置位元，從最高位開始（MSB 優先）
        const bitIndex = 7 - this.bitOffset;
        if (value) {
            currentByte |= (1 << bitIndex);
        } else {
            currentByte &= ~(1 << bitIndex);
        }

        this.dataView.setUint8(this.bytePosition, currentByte);
        this.bitOffset++;
    }

    // 對齊到字節邊界
    alignToByteBoundary() {
        if (this.bitOffset > 0) {
            this.bytePosition++;
            this.bitOffset = 0;
        }
    }

    // 寫入一個字節
    writeByte(value) {
        this.alignToByteBoundary();
        this.dataView.setUint8(this.bytePosition, value);
        this.bytePosition++;
    }

    // 寫入一個整數 (32位)
    writeInt(value) {
        this.alignToByteBoundary();
        this.dataView.setInt32(this.bytePosition, value);
        this.bytePosition += 4;
    }

    // 寫入一個64位整數
    writeInt64(value) {
        this.alignToByteBoundary();
        const bigInt = BigInt(value);
        this.dataView.setBigInt64(this.bytePosition, bigInt);
        this.bytePosition += 8;
    }

    // 寫入字串
    writeString(value, byteLength) {
        if (byteLength <= 0) {
            return;
        }

        this.alignToByteBoundary();

        const encodedString = this.textEncoder.encode(value || '');
        const buffer = new Uint8Array(byteLength);
        buffer.fill(0); // 用零填充

        const bytesToCopy = Math.min(encodedString.length, byteLength);
        buffer.set(encodedString.slice(0, bytesToCopy));

        for (let i = 0; i < byteLength; i++) {
            this.dataView.setUint8(this.bytePosition + i, buffer[i]);
        }
        this.bytePosition += byteLength;
    }

    writeTimestamp(timestamp) {
        // 確保以 BigInt 格式寫入
        this.writeInt64(BigInt(timestamp));
    }

    // 讀取一個位元
    readBit() {
        // 如果當前字節已讀完，移到下一個字節
        if (this.bitOffset >= 8) {
            this.bytePosition++;
            this.bitOffset = 0;
        }

        const currentByte = this.dataView.getUint8(this.bytePosition);
        const bitIndex = 7 - this.bitOffset;
        const value = (currentByte & (1 << bitIndex)) !== 0;
        this.bitOffset++;

        return value ? 1 : 0;
    }

    // 讀取一個字節
    readByte() {
        this.alignToByteBoundary();
        const value = this.dataView.getUint8(this.bytePosition);
        this.bytePosition++;
        return value;
    }

    // 讀取一個整數 (32位)
    readInt() {
        this.alignToByteBoundary();
        const value = this.dataView.getInt32(this.bytePosition);
        this.bytePosition += 4;
        return value;
    }

    // 讀取一個64位整數
    readInt64() {
        this.alignToByteBoundary();
        const value = this.dataView.getBigInt64(this.bytePosition);
        this.bytePosition += 8;
        return value;
    }

    // 讀取字串
    readString(byteLength) {
        if (byteLength <= 0) {
            return '';
        }

        this.alignToByteBoundary();

        // 確保不會讀取超出 buffer 範圍的數據
        const actualByteLength = Math.min(byteLength, this.buffer.byteLength - this.bytePosition);
        const bytes = new Uint8Array(this.buffer, this.bytePosition, actualByteLength);

        // 找到實際字串的結束位置（去除填充的零）
        let actualLength = actualByteLength;
        for (let i = bytes.length - 1; i >= 0; i--) {
            if (bytes[i] !== 0) {
                actualLength = i + 1;
                break;
            }
        }

        // 如果全是零，返回空字串
        if (actualLength === 0) {
            this.bytePosition += byteLength;
            return '';
        }

        const value = this.textDecoder.decode(bytes.slice(0, actualLength));
        this.bytePosition += byteLength;
        return value;
    }

    // 讀取時間戳
    readTimestamp() {
        const timestamp = this.readInt64();
        // 檢查是否在安全整數範圍內
        if (BitPacker.isInSafeIntegerRange(timestamp)) {
            return Number(timestamp); // 安全地轉換為 Number
        } else {
            console.warn("時間戳超出 JavaScript 安全整數範圍，保留為 BigInt 類型");
            return timestamp; // 保持 BigInt 類型
        }
    }

    // 封裝數據
    pack(schema, values) {
        if (schema.length !== values.length) {
            throw new Error('Schema and values length mismatch');
        }

        this.initBuffer(schema);

        for (let i = 0; i < schema.length; i++) {
            const type = schema[i].toLowerCase();
            const value = values[i];

            if (type === 'bit') {
                this.writeBit(value);
            } else if (type === 'bool') {
                this.writeBit(value ? 1 : 0);
            } else if (type === 'byte') {
                this.writeByte(value);
            } else if (type === 'int') {
                this.writeInt(value);
            } else if (type === 'int64') {
                this.writeInt64(value);
            } else if (type === 'timestamp') {
                this.writeTimestamp(value);
            } else if (type.startsWith('s')) {
                const byteLength = parseInt(type.slice(1));
                this.writeString(value, byteLength);
            } else {
                throw new Error(`Unsupported type: ${type}`);
            }
        }

        return btoa(String.fromCharCode(...new Uint8Array(this.buffer)));
    }

    // 解封裝數據
    unpack(schema, base64String) {
        console.log('unpacking:',base64String);
        const binaryString = atob(base64String);
        this.buffer = new ArrayBuffer(binaryString.length);
        this.dataView = new DataView(this.buffer);
        const uint8Array = new Uint8Array(this.buffer);
        for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
        }

        this.bytePosition = 0;
        this.bitOffset = 0;
        const result = {};

        for (let i = 0; i < schema.length; i++) {
            const type = schema[i].toLowerCase();
            if (type === 'bit') {
                result[i] = this.readBit();
            } else if (type === 'bool') {
                result[i] = this.readBit() === 1;
            } else if (type === 'byte') {
                result[i] = this.readByte();
            } else if (type === 'int') {
                result[i] = this.readInt();
            } else if (type === 'int64') {
                result[i] = this.readInt64();
            } else if (type === 'timestamp') {
                result[i] = this.readTimestamp();
            } else if (type.startsWith('s')) {
                const byteLength = parseInt(type.slice(1));
                result[i] = this.readString(byteLength);
            } else {
                throw new Error(`Unsupported type: ${type}`);
            }
        }
        console.log('unpacked result:',result);
        return result;
    }
}

/*

// 使用示例
const packer = new BitPacker();

// 測試各種數據類型
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
            true,                                        // bit
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
    }
];

// 執行測試
testCases.forEach((test, index) => {
    console.log(`\nTest Case ${index + 1}:`);
    console.log('Original values:', test.values);

    const packed = packer.pack(test.schema, test.values);
    console.log('Packed (Base64):', packed);

    const unpacked = packer.unpack(test.schema, packed);
    console.log('Unpacked:', unpacked);

    // 驗證結果
    const matches = test.values.every((val, i) => {
        if (test.schema[i] === 'int64') {
            return BigInt(val).toString() === unpacked[i].toString();
        }
        return val.toString() === unpacked[i].toString();
    });
    console.log('All values match:', matches);
});

// 顯示壓縮率
function calculateCompressionRatio(original, compressed) {
    // 估算原始數據大小（考慮字串的 UTF-8 編碼）
    let originalSize = 0;
    original.schema.forEach((type, i) => {
        if (type === 'bit') originalSize += 1;
        else if (type === 'byte') originalSize += 8;
        else if (type === 'int') originalSize += 32;
        else if (type === 'int64') originalSize += 64;
        else if (type.startsWith('s')) {
            const str = original.values[i];
            originalSize += new TextEncoder().encode(str).length * 8;
        }
    });

    const compressedSize = atob(compressed).length * 8;
    return {
        originalBits: originalSize,
        compressedBits: compressedSize,
        ratio: ((1 - compressedSize / originalSize) * 100).toFixed(2)
    };
}

testCases.forEach((test, index) => {
    const packed = packer.pack(test.schema, test.values);
    const compression = calculateCompressionRatio({schema: test.schema, values: test.values}, packed);
    console.log(`\nCompression Analysis for Test Case ${index + 1}:`);
    console.log(`Original size: ${compression.originalBits} bits`);
    console.log(`Compressed size: ${compression.compressedBits} bits`);
    console.log(`Compression ratio: ${compression.ratio}%`);
});
*/