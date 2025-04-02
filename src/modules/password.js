export class PWG {

    static async generate_signature(key, saltData, extendData) {
        return await crypto.subtle.sign('HMAC', key, (new TextEncoder()).encode(saltData + extendData));
    }

    static get_binary_string(signature) {
        return Array.from(new Uint8Array(signature)).map(b => ('00000000' + b.toString(2)).slice(-8)).join('');
    }

    static async generateSlavePassword(master_password, saltData, charset, length){
        const charset_type = typeof charset;
        const charset_length = charset.length;
        let charset_need_bit = Math.ceil(Math.log2(charset_length));
        if (charset_need_bit < 7) charset_need_bit = 7;

        const masterPasswordBytes = (new TextEncoder()).encode(master_password);
        const key = await crypto.subtle.importKey(
            'raw', masterPasswordBytes, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
        );
        const signature_of_master = await crypto.subtle.sign('HMAC', key, masterPasswordBytes);
        const master_hash_hex = Array.from(new Uint8Array(signature_of_master)).map(b => ('00' + b.toString(16)).slice(-2)).join('').toUpperCase().substring(0, 8);

        let finalPassword = '';

        let combine_binary_password = '';
        let seek_offset = 0; // unit: bit
        let password_length = 0; // unit: bit
        for(let i = 0; i < length; i++) {
            let start_pos = i * charset_need_bit;
            let end_pos = start_pos + charset_need_bit;
            while (end_pos > (password_length + seek_offset)) {
                const next_password = this.get_binary_string(await this.generate_signature(key, saltData, combine_binary_password));
                combine_binary_password += next_password;
                password_length += next_password.length;
                let diff_offset = start_pos - seek_offset;
                seek_offset = start_pos;
                combine_binary_password = combine_binary_password.substring(diff_offset);
                password_length = combine_binary_password.length;
            }

            let index = parseInt(combine_binary_password.substring(start_pos-seek_offset, end_pos-seek_offset), 2) % charset_length;
            if (charset_type === 'string') {
                finalPassword += charset.charAt(index);
            } else {
                finalPassword += charset[index];
            }
        }
        return [finalPassword, master_hash_hex];
    }

}