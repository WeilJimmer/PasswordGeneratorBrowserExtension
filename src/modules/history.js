// history.js
// Author: Weil Jimmer
// Description: This file contains the history class that is used to store the history of the password generation.
// The history item is packed and unpacked using the BitPacker class.

import { DEFAULT_CONST, AUTOFILL_OPTIONS_INDEX, AUTOFILL_OPTIONS_INDEX_REVERSE } from './constants';
import { SchemaCompressor } from './schema.js';
import { BitPacker } from './bitpacker.js';

export class HistoryItem {
    constructor(
        lowercaseChecked = DEFAULT_CONST.LOWERCASE_CHECKED, // boolean
        uppercaseChecked = DEFAULT_CONST.UPPERCASE_CHECKED, // boolean
        numbersChecked = DEFAULT_CONST.NUMBERS_CHECKED,     // boolean
        symbolsChecked = DEFAULT_CONST.SYMBOLS_CHECKED,     // boolean
        autoFillOption = DEFAULT_CONST.AUTOFILL_OPTION,     // string
        pwlength = DEFAULT_CONST.LENGTH,                    // int
        version = DEFAULT_CONST.VERSION,                    // int
        symbols = DEFAULT_CONST.SYMBOLS_CHAR,               // string
        salt = DEFAULT_CONST.SALT,                          // string
        pw = '',                                            // string
        timestamp=Date.now()                                // timestamp (unit: milliseconds) save as int64 (BigInt)
    ) {
        this.packed_history_schema = "";
        this.packed_history = "";
        this.timestamp = timestamp;
        this.history = {
            is_initial_valuies: true,                       // using for check if the history is initial values (or is set by user)
            lowercaseChecked: lowercaseChecked,
            uppercaseChecked: uppercaseChecked,
            numbersChecked: numbersChecked,
            symbolsChecked: symbolsChecked,
            autoFillOption: autoFillOption,
            pwlength: pwlength,
            version: version,
            symbols: symbols,
            salt: salt,
            pw: pw,
            timestamp: timestamp
        }
    }

    packHistory() {
        let symbol_byte_length = (new TextEncoder()).encode(this.history.symbols).length;
        let salt_byte_length = (new TextEncoder()).encode(this.history.salt).length;
        let pw_byte_length = (new TextEncoder()).encode(this.history.pw).length;
        let history_schema = [
            'bool',                         // is initial values
            'bool',                         // lowercase_checked
            'bool',                         // uppercase_checked
            'bool',                         // number_checked
            'bool',                         // symbol_checked
            'byte',                         // auto fill option
            'int',                          // pwlength
            'int',                          // version
            ('s'+symbol_byte_length),       // symbols (max length: 100)
            ('s'+salt_byte_length),         // salt (max length: 10000)
            ('s'+pw_byte_length),           // pw
            'timestamp'                     // timestamp (unit: milliseconds)
        ];
        this.packed_history_schema = SchemaCompressor.compressSchema(history_schema);
        const packer = new BitPacker();
        this.packed_history = packer.pack(history_schema, [
            this.history.is_initial_valuies,
            this.history.lowercaseChecked,
            this.history.uppercaseChecked,
            this.history.numbersChecked,
            this.history.symbolsChecked,
            AUTOFILL_OPTIONS_INDEX[this.history.autoFillOption],  // translate to index, such as 0, 1, 2, 3...
            this.history.pwlength,
            this.history.version,
            this.history.symbols,
            this.history.salt,
            this.history.pw,
            this.history.timestamp
        ]); // base64 string
        return this
    }

    unpackHistory(packedString) {
        if (packedString.length == 0) {
            return this;
        }
        const split_parts = packedString.split('|');
        this.packed_history_schema = split_parts[0];
        this.packed_history = split_parts[1];
        const original_history_schema = SchemaCompressor.decompressSchema(split_parts[0]);
        const packer = new BitPacker();
        const unpacked = packer.unpack(original_history_schema, split_parts[1]);
        this.history.is_initial_valuies = unpacked[0];
        this.history.lowercaseChecked = unpacked[1];
        this.history.uppercaseChecked = unpacked[2];
        this.history.numbersChecked = unpacked[3];
        this.history.symbolsChecked = unpacked[4];
        this.history.autoFillOption = AUTOFILL_OPTIONS_INDEX_REVERSE[unpacked[5]];  // translate to string, such as 'do-nothing', 'autofill-domain', 'autofill-url', 'autofill-keyword'
        this.history.pwlength = unpacked[6];
        this.history.version = unpacked[7];
        this.history.symbols = unpacked[8];
        this.history.salt = unpacked[9];
        this.history.pw = unpacked[10];
        this.history.timestamp = unpacked[11];
        this.timestamp = this.history.timestamp;
        return this;
    }

    getPackedString(force_pack_again=false) {
        if (force_pack_again || this.packed_history_schema.length == 0 || this.packed_history.length == 0) {
            this.packHistory();
        }
        return this.packed_history_schema + '|' + this.packed_history;
    }

    setState(_key, _value) {
        this.history[_key] = _value;
        this.packHistory();
        return this;
    }

    setFromMap(_map) {
        this.history.is_initial_valuies = false;
        this.history.lowercaseChecked = _map.lowercaseChecked;
        this.history.uppercaseChecked = _map.uppercaseChecked;
        this.history.numbersChecked = _map.numbersChecked;
        this.history.symbolsChecked = _map.symbolsChecked;
        this.history.autoFillOption = _map.autoFillOption;
        this.history.pwlength = _map.pwlength;
        this.history.version = _map.version;
        this.history.symbols = _map.symbols;
        this.history.salt = _map.salt;
        return this;
    }
}