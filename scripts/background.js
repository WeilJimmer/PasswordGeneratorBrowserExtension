class StateManager {
    constructor() {
        this.state = new Map();
        this.cleanupTimes = new Map();
        this.state.set('master_password', '');
        this.state.set('length', 40);
        this.state.set('numbers_checked', true);
        this.state.set('symbols_checked', true);
        this.state.set('uppercase_checked', true);
        this.state.set('lowercase_checked', true);
        this.state.set('symbols_char', '!@#$%^&*(){}[]=,.');
        this.state.set('domain', '');
        this.state.set('version', '1');
        this.setupMessageHandler();
        this.setupAutoCleanup();
    }
    sendPasswordResult(password, checksum) {
        chrome.runtime.sendMessage({
            type: 'PASSWORD_GENERATED',
            data: {
                password: password,
                checksum: checksum
            }
        });
    }
    async generatePassword(map, mode=0) {
        let length = map.get('length');
        let numbers_checked = map.get('numbers_checked');
        let symbols_checked = map.get('symbols_checked');
        let uppercase_checked = map.get('uppercase_checked');
        let lowercase_checked = map.get('lowercase_checked');
        let symbols_char = map.get('symbols_char');
        if (!numbers_checked && !uppercase_checked && !lowercase_checked && !symbols_checked) {
            this.sendPasswordResult('至少勾選一種類別', 'ERROR');
            return;
        }
        let charset = '';
        let password = '';
        if (numbers_checked){ charset += '0123456789';}
        if (uppercase_checked){ charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';}
        if (lowercase_checked){ charset += 'abcdefghijklmnopqrstuvwxyz';}
        if (symbols_checked){ charset += symbols_char;}
        for (let i = 0; i < length; i++) {
            var byte = new Uint8Array(1);
            crypto.getRandomValues(byte);
            var randomIndex = byte[0] % charset.length;
            password += charset.charAt(randomIndex);
        }
        this.sendPasswordResult(password, 'RANDOM');
    }
    async generateSlavePassword(map, mode=0){
        let version = map.get('version');
        let domain = map.get('domain');
        let length = map.get('length');
        let numbers_checked = map.get('numbers_checked');
        let symbols_checked = map.get('symbols_checked');
        let uppercase_checked = map.get('uppercase_checked');
        let lowercase_checked = map.get('lowercase_checked');
        let symbols_char = map.get('symbols_char');
        let master_password = map.get('master_password');
        if (master_password.length == 0) {
            this.sendPasswordResult('主密碼不可為空！', 'ERROR');
            return '';
        }
        let charset = '';
        if (numbers_checked){ charset += '0123456789';}
        if (uppercase_checked){ charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';}
        if (lowercase_checked){ charset += 'abcdefghijklmnopqrstuvwxyz';}
        if (symbols_checked){ charset += symbols_char;}

        const encoder = new TextEncoder();
        const masterPasswordBytes = encoder.encode(master_password);

        const passwordData = `${version}:${domain}`;
        const passwordDataBytes = encoder.encode(passwordData);

        const key = await crypto.subtle.importKey(
            'raw', masterPasswordBytes, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', key, passwordDataBytes);
        let password = Array.from(new Uint8Array(signature)).map(b => ('00000000' + b.toString(2)).slice(-8)).join('');

        const signature2 = await crypto.subtle.sign('HMAC', key, encoder.encode(passwordData + password));
        let password2 = Array.from(new Uint8Array(signature2)).map(b => ('00000000' + b.toString(2)).slice(-8)).join('');

        const signature_of_master = await crypto.subtle.sign('HMAC', key, masterPasswordBytes);
        let master_hash_hex = Array.from(new Uint8Array(signature_of_master)).map(b => ('00' + b.toString(16)).slice(-2)).join('').toUpperCase().substring(0, 8);

        let combine_binary_password = password + password2;
        let finalPassword = '';
        //7bit
        let charset_length = charset.length;
        for(let i = 0; i < length; i++) {
            let pos = parseInt(combine_binary_password.substring(i * 7, i * 7 + 7), 2) % charset_length;
            finalPassword += charset.charAt(pos);
        }
        this.sendPasswordResult(finalPassword, master_hash_hex);
    }

    getState(key, _default = null) {
        return this.state.get(key) || _default;
    }
    setupMessageHandler() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                switch (message.type) {
                    case 'GET_STATE':
                        sendResponse({
                            success: true,
                            data: this.state.get(message.key)
                        });
                        break;
                    case 'SET_STATE':
                        this.setState(message.key, message.data, message.options);
                        sendResponse({ success: true });
                        break;
                    case 'DELETE_STATE':
                        this.state.delete(message.key);
                        sendResponse({ success: true });
                        break;
                    case 'CLEAR_ALL':
                        this.state.clear();
                        this.cleanupTimes.clear();
                        sendResponse({ success: true });
                        break;
                    case 'GENERATE_PASSWORD':
                        if (this.state.get('master_password').length == 0) {
                            this.generatePassword(this.state, message.mode);
                        } else {
                            this.generateSlavePassword(this.state, message.mode);
                        }
                        sendResponse({ success: true, status: 'processing' });
                        break;
                    default:
                        sendResponse({ success: false, error: 'Invalid message type' });
                }
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
            return true;
        });
    }
    setState(key, value, options = {ttl:10}) {
        this.state.set(key, value);
        if (options.ttl) {
            if (this.cleanupTimes.has(key)) {
                clearTimeout(this.cleanupTimes.get(key));
            }
            const timeoutId = setTimeout(() => {
                this.state.delete(key);
                this.cleanupTimes.delete(key);
            }, options.ttl);
            this.cleanupTimes.set(key, timeoutId);
        }
    }
    setupAutoCleanup() {
        chrome.runtime.onSuspend.addListener(() => {
            this.state.clear();
            this.cleanupTimes.forEach(timeoutId => clearTimeout(timeoutId));
            this.cleanupTimes.clear();
        });
    }
}
const stateManager = new StateManager();