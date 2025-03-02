import { expect } from '@jest/globals';
import { HistoryItem } from '../../src/modules/history';
import { AUTOFILL_OPTIONS_INDEX_REVERSE } from '../../src/modules/constants';

describe('HistoryItem', () => {
    test('should initialize correctly', () => {
        const item = new HistoryItem();
        console.log('HistoryItem:', item);
        expect(item).toBeDefined();
    });

    test('should pack and unpack history item correctly', () => {
        const testCases = [
            new HistoryItem(
                true,                                 //lowercaseChecked
                true,                                 //uppercaseChecked
                true,                                 //numbersChecked
                true,                                 //symbolsChecked
                AUTOFILL_OPTIONS_INDEX_REVERSE[0],    //autoFillOption
                10,                                   //pwlength
                5,                                    //version
                '!@#$%^&*~.',                         //symbols
                'salt',                               //salt
                'password',                           //pw
                123456789                             //timestamp
            ),
            new HistoryItem(
                false,                                //lowercaseChecked
                false,                                //uppercaseChecked
                false,                                //numbersChecked
                false,                                //symbolsChecked
                AUTOFILL_OPTIONS_INDEX_REVERSE[3],    //autoFillOption
                100,                                  //pwlength
                2,                                    //version
                '[]~()',                              //symbols
                '鹽',                                 //salt
                'heh-password',                       //pw
                123456789456                          //timestamp
            ),
            new HistoryItem()
        ]
        testCases.forEach((item, index) => {
            console.log(`\nTest Case ${index + 1}:`);
            console.log('Original values:', item);

            const packedString = item.packHistory().getPackedString();
            console.log('PackedString (Base64):', packedString);

            const unpacked = new HistoryItem().unpackHistory(packedString);

            expect(unpacked.lowercaseChecked).toEqual(item.lowercaseChecked);
            expect(unpacked.uppercaseChecked).toEqual(item.uppercaseChecked);
            expect(unpacked.numbersChecked).toEqual(item.numbersChecked);
            expect(unpacked.symbolsChecked).toEqual(item.symbolsChecked);
            expect(unpacked.autoFillOption).toEqual(item.autoFillOption);
            expect(unpacked.pwlength).toEqual(item.pwlength);
            expect(unpacked.version).toEqual(item.version);
            expect(unpacked.symbols).toEqual(item.symbols);
            expect(unpacked.salt).toEqual(item.salt);
            expect(unpacked.pw).toEqual(item.pw);
            expect(unpacked.timestamp).toEqual(item.timestamp);

            console.log('All values match!');
        });
    });
});