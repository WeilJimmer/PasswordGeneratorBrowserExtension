// background.js
import { DEFAULT_CONST } from '../modules/constants.js';

class StateManager {

    constructor() {
        this.isInitialized = false;
        this.state = new Map();
        this.cleanupTimes = new Map();
        this.setupMessageHandler();
        this.setupAutoCleanup();
        this.init();
    }

    sendPasswordResult(password, checksum) {
        try{
            chrome.runtime.sendMessage({
                type: 'PASSWORD_GENERATED',
                data: {
                    password: password,
                    checksum: checksum
                }
            });
        }catch(error){
            console.error('Failed to send password result:', error);
        }
    }

    getState(key, _default = null) {
        if (this.state.has(key)) {
            return this.state.get(key);
        }
        return _default;
    }

    async getPopupContext() {
        try {
            const contexts = await chrome.runtime.getContexts({
                contextTypes: ['POPUP']
            });
            return contexts.length > 0 ? contexts[0] : null;
        } catch (error) {
            console.error('Failed to get popup context:', error);
            return null;
        }
    }

    async sendMessageToPopup(message) {
        const popupContext = await this.getPopupContext();
        if (popupContext) {
            try {
                const response = await chrome.runtime.sendMessage(message);
                return response;
            } catch (error) {
                console.log('Send message error:', error);
            }
        } else {
            console.log('Popup is not open');
        }
    }

    async init() {
        try {
            this.isInitialized = true;
            this.sendMessageToPopup({
                type: 'BACKGROUND_INITIALIZED',
                data: { timestamp: Date.now() }
            });
        } catch (error) {
            console.log('Background initialization failed:', error);
        }
    }

    async generatePassword(map, mode=0) {
        let length = this.getState('length', DEFAULT_CONST.LENGTH);
        let symbols_char = this.getState('symbols_char', DEFAULT_CONST.SYMBOLS_CHAR);
        let numbers_checked = this.getState('numbers_checked', DEFAULT_CONST.NUMBERS_CHECKED);
        let symbols_checked = this.getState('symbols_checked', DEFAULT_CONST.SYMBOLS_CHECKED);
        let uppercase_checked = this.getState('uppercase_checked', DEFAULT_CONST.UPPERCASE_CHECKED);
        let lowercase_checked = this.getState('lowercase_checked', DEFAULT_CONST.LOWERCASE_CHECKED);
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
        let version = this.getState('version', DEFAULT_CONST.VERSION);
        let salt = this.getState('salt', DEFAULT_CONST.SALT);
        let length = this.getState('length', DEFAULT_CONST.LENGTH);
        let symbols_char = this.getState('symbols_char', DEFAULT_CONST.SYMBOLS_CHAR);
        let master_password = this.getState('master_password', DEFAULT_CONST.MASTER_PASSWORD);
        let numbers_checked = this.getState('numbers_checked', DEFAULT_CONST.NUMBERS_CHECKED);
        let symbols_checked = this.getState('symbols_checked', DEFAULT_CONST.SYMBOLS_CHECKED);
        let uppercase_checked = this.getState('uppercase_checked', DEFAULT_CONST.UPPERCASE_CHECKED);
        let lowercase_checked = this.getState('lowercase_checked', DEFAULT_CONST.LOWERCASE_CHECKED);
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

        const passwordData = `${version}:${salt}`;
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

    setupMessageHandler() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            try {
                switch (message.type) {
                    case 'CHECK_INIT_STATUS':
                        sendResponse({ isInitialized: this.isInitialized });
                        break;
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
                        if (this.getState('master_password', DEFAULT_CONST.MASTER_PASSWORD).length == 0) {
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
        if (options.ttl>0) {
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