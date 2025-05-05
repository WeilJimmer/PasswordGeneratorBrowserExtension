const cryptoNode = require('crypto');
global.crypto = cryptoNode.webcrypto;
import { PWG } from "../../src/modules/password";

console.log('Node.js version:', process.version);
console.log('Test environment:', process.env.NODE_ENV);
console.log('Available globals:', Object.keys(global));
describe('PWG', () => {

    const master_password = '123456';
    const number_table = '0123456789';
    const lower_case = 'abcdefghijklmnopqrstuvwxyz';
    const upper_case = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const symbols = '!@#$%^&*(){}[]=,.';
    const default_table = number_table + upper_case + lower_case + symbols;

    test('should initialize correctly', () => {
        const pwg = new PWG();
        expect(pwg).toBeDefined();
    });

    test('should generate slave password correctly', async () => {
        const charset = default_table;
        const length = 40;

        const [password, master_hash_hex] = await PWG.generateSlavePassword(master_password, `1:`, charset, length);
        expect(password).toBeDefined();
        expect(master_hash_hex).toBeDefined();

        expect(password.length).toBe(length);
        expect(password).toBe('o2=2O$TnER7O{60EG)T0TZwR}d.LkMsP2c0I2hO9');
        expect(master_hash_hex).toBe('4899F48B');
    });

    test('should generate slave password with custom UTF-8 salt', async () => {
        const charset = default_table;
        const length = 40;
        const saltData = '1:測試';

        const [password, master_hash_hex] = await PWG.generateSlavePassword(master_password, saltData, charset, length);
        expect(password).toBeDefined();
        expect(master_hash_hex).toBeDefined();

        expect(password.length).toBe(length);
        expect(password).toBe('Wh&D4eUvi#N88l3B0B2c6N3QMVX7jXmu^IP!0uy1');
        expect(master_hash_hex).toBe('4899F48B');
    });

    test('should generate slave password with custom charset', async () => {
        const charset = number_table + upper_case + lower_case + '.,(){}&^%$#@!_-+=~`|<>?:";';
        const length = 100;

        const [password, master_hash_hex] = await PWG.generateSlavePassword('12345678', `1:test`, charset, length);
        expect(password).toBeDefined();
        expect(master_hash_hex).toBeDefined();

        expect(password.length).toBe(length);
        expect(password).toBe('ycPzHrS3V7LTL;B7MJ|R%FXQCg{iQJ"&KVjA!B#9D:L7#TLJLLV4Zd0QHCPjGKX"6F1Q=KHw{Y$NEercRIOR+QBX42%-OoqWSY0B');
        expect(master_hash_hex).toBe('2D0D1BCB');
    });

    test('should generate slave password correctly', async () => {
        let charset = [];
        const length = 200;

        for(let i = 0; i < 1024; i++) {
            charset.push('['+i.toString()+']');
        }
        const [password, master_hash_hex] = await PWG.generateSlavePassword(master_password, `1:`, charset, length);
        expect(password).toBeDefined();
        expect(master_hash_hex).toBeDefined();

        expect(password.split('][').length).toBe(length);
        expect(password).toBe('[400][166][8][784][472][795][746][689][548][342][483][703][125][512][239][157][426][317][669][581][790][433][616][666][504][261][940][984][728][13][134][690][596][905][970][9][73][214][481][567][827][720][821][681][67][319][884][888][376][349][617][876][174][940][989][40][851][827][832][115][398][520][950][168][120][284][989][591][819][318][260][15][815][693][750][700][129][263][803][779][688][623][825][526][1010][293][298][40][447][762][901][789][687][345][740][604][449][736][772][447][971][809][113][334][401][854][166][1007][335][328][628][458][389][879][804][785][18][665][904][34][661][427][549][848][544][947][635][903][545][456][233][164][968][921][468][409][852][228][304][559][534][968][850][330][582][692][326][796][273][976][141][543][352][159][859][790][24][589][554][524][617][690][659][580][937][675][956][983][835][364][817][159][295][882][92][586][891][361][334][936][817][331][386][111][252][885][707][283][579][482][308][605][633][76][702][233][278][456][928][841]');
        expect(master_hash_hex).toBe('4899F48B');
    });
});