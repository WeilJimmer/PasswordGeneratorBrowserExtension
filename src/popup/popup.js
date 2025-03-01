// popup.js
async function set_state(_key,_value,_ttl=-1) {
    await StateManagerClient.setState(_key, _value, { ttl: _ttl * 1000 });
}

async function get_state(_key, _default=null) {
    const _value = await StateManagerClient.getState(_key);
    if (_value!=null && _value!=undefined) return _value;
    return _default;
}

async function send_generate_password(mode=0) {
    // mode: 0 = don't save in history, 1 = save in history
    let response = await chrome.runtime.sendMessage({ type: 'GENERATE_PASSWORD', mode: mode });
    return response;
}

const AUTOFILL_OPTIONS = {
    DO_NOTHING : 'do-nothing',
    AUTOFILL_DOMAIN : 'autofill-domain',
    AUTOFILL_URL : 'autofill-url',
    AUTOFILL_KEYWORD : 'autofill-keyword'
}

class PopupManager {
    constructor() {
        this.initialized = false;
        this.elements = {
            lengthSlider: document.getElementById('length'),
            lengthValue: document.getElementById('lengthValue'),
            numbersCheckbox: document.getElementById('numbers'),
            uppercaseCheckbox: document.getElementById('uppercase'),
            lowercaseCheckbox: document.getElementById('lowercase'),
            symbolsCheckbox: document.getElementById('symbols'),
            symbolsCharField: document.getElementById('symbols_char'),
            masterPasswordField: document.getElementById('master_password'),
            saltField: document.getElementById('salt'),
            autofillSelect: document.getElementById('auto_fill_salt'),
            versionField: document.getElementById('version'),
            passwordField: document.getElementById('password'),
            checksumField: document.getElementById('checksum_span'),
            generateBtn: document.getElementById('generateBtn'),
            copyBtn: document.getElementById('copyBtn'),
        };
        this.init();
    }

    async init() {
        await this.checkBackgroundStatus();
        this.setupMessageListener();
    }

    async checkBackgroundStatus() {
        try {
            const status = await this.sendMessage('CHECK_INIT_STATUS');
            if (status.isInitialized) {
                this.onBackgroundReady();
            } else {
                this.waitForInitialization();
            }
        } catch (error) {
            console.error('Failed to check background status:', error);
        }
    }

    sendMessage(type, data = {}) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                { type, data },
                response => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'BACKGROUND_INITIALIZED') {
                this.onBackgroundReady();
            }else if (message.type === 'PASSWORD_GENERATED') {
                this.elements.passwordField.textContent = message.data.password;
                this.elements.checksumField.textContent = '['+message.data.checksum+']';
            }
        });
    }

    waitForInitialization() {
        // 顯示載入中狀態
        //document.getElementById('loading').style.display = 'block';
        //document.getElementById('content').style.display = 'none';
    }

    async onBackgroundReady() {
        this.initialized = true;

        // 隱藏載入中狀態
        //document.getElementById('loading').style.display = 'none';
        //document.getElementById('content').style.display = 'block';

        // 初始化其他功能
        await this.initializeUI();
    }

    getKeywordFromUrl(domain){
        if (domain.indexOf('www.')===0) domain = domain.substring(4);
        return domain.replace(/\./g, '-');
    }

    getPureURL(url){
        const urlObj = new URL(url);
        return urlObj.protocol + '//' + urlObj.hostname + urlObj.pathname;
    }

    async setAutofillOptions(){
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = new URL(tab.url);
        const domain = url.hostname;
        const keyword = this.getKeywordFromUrl(domain);
        const options = this.elements.autofillSelect.value;
        let final_salt = '';
        if (options == AUTOFILL_OPTIONS.DO_NOTHING) return;
        if (options == AUTOFILL_OPTIONS.AUTOFILL_DOMAIN) final_salt = domain;
        if (options == AUTOFILL_OPTIONS.AUTOFILL_URL) final_salt = this.getPureURL(url.href);
        if (options == AUTOFILL_OPTIONS.AUTOFILL_KEYWORD) final_salt = keyword;
        this.elements.saltField.value = final_salt;
    }

    async initializeUI() {
        // 初始化按鈕和其他 UI 元素
        this.elements.masterPasswordField.value = await get_state('master_password', '');
        this.elements.lengthSlider.value = await get_state('length', 40);
        this.elements.lengthValue.value = await get_state('length', 40);
        this.elements.numbersCheckbox.checked = await get_state('numbers_checked', true);
        this.elements.symbolsCheckbox.checked = await get_state('symbols_checked', true);
        this.elements.uppercaseCheckbox.checked = await get_state('uppercase_checked', true);
        this.elements.lowercaseCheckbox.checked = await get_state('lowercase_checked', true);
        this.elements.symbolsCharField.value = await get_state('symbols_char', '!@#$%^&*(){}[]=,.');
        this.elements.saltField.value = await get_state('salt', '');
        this.elements.versionField.value = await get_state('version', '1');
        this.elements.autofillSelect.value = await get_state('autofill_options', AUTOFILL_OPTIONS.DO_NOTHING);
        await this.initializeEventListeners();
        this.setAllUiState();
    }

    async setAllUiState(){
        await set_state('master_password', this.elements.masterPasswordField.value, 60);
        await set_state('length', this.elements.lengthValue.value);
        await set_state('numbers_checked', this.elements.numbersCheckbox.checked);
        await set_state('symbols_checked', this.elements.symbolsCheckbox.checked);
        await set_state('uppercase_checked', this.elements.uppercaseCheckbox.checked);
        await set_state('lowercase_checked', this.elements.lowercaseCheckbox.checked);
        await set_state('symbols_char', this.elements.symbolsCharField.value);
        await set_state('salt', this.elements.saltField.value);
        await set_state('version', this.elements.versionField.value);
        await set_state('autofill_options', this.elements.autofillSelect.value);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await set_state('current_url', tab.url);
        await this.setAutofillOptions();
    }

    async initializeEventListeners() {
        // 初始化事件監聽器
        this.elements.lengthValue.addEventListener('input', async (e) => {
            this.elements.lengthSlider.value = e.target.value;
            set_state('length', e.target.value);
            await send_generate_password();
        });
        this.elements.lengthSlider.addEventListener('input', async (e) => {
            this.elements.lengthValue.value = e.target.value;
            set_state('length', e.target.value);
            await send_generate_password();
        });
        this.elements.masterPasswordField.addEventListener('input', async (e) => {
            const newPw = e.target.value;
            set_state('master_password', newPw, 60);
            await send_generate_password();
        });
        this.elements.numbersCheckbox.addEventListener('change', async (e) => {
            set_state('numbers_checked', e.target.checked);
            await send_generate_password();
        });
        this.elements.uppercaseCheckbox.addEventListener('change', async (e) => {
            set_state('uppercase_checked', e.target.checked);
            await send_generate_password();
        });
        this.elements.lowercaseCheckbox.addEventListener('change', async (e) => {
            set_state('lowercase_checked', e.target.checked);
            await send_generate_password();
        });
        this.elements.symbolsCheckbox.addEventListener('change', async (e) => {
            set_state('symbols_checked', e.target.checked);
            await send_generate_password();
        });
        this.elements.symbolsCharField.addEventListener('input', async (e) => {
            set_state('symbols_char', e.target.value);
            await send_generate_password();
        });
        this.elements.saltField.addEventListener('input', async (e) => {
            set_state('salt', e.target.value);
            await send_generate_password();
        });
        this.elements.versionField.addEventListener('input', async (e) => {
            set_state('version', e.target.value);
            await send_generate_password();
        });
        this.elements.autofillSelect.addEventListener('change', async (e) => {
            set_state('autofill_options', e.target.value);
            await this.setAutofillOptions();
            await send_generate_password();
        });
        this.elements.generateBtn.addEventListener('click', async () => {
            this.setAllUiState();
            await send_generate_password();
        });
        this.elements.copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(this.elements.passwordField.textContent).then(() => {
                const successMessage = document.getElementById('successMessage');
                successMessage.classList.add('show');
                setTimeout(() => {
                    successMessage.classList.remove('show');
                }, 2000);
            });
        });
    }
}
// 當擴充功能彈出視窗開啟時
document.addEventListener('DOMContentLoaded', async () => {
    const popupManager = new PopupManager();
    document.querySelectorAll('data-lang').forEach(elem => {
        elem.innerText = chrome.i18n.getMessage(elem.innerText);
    });
    document.querySelectorAll('[local-placeholder]').forEach(elem => {
        elem.placeholder = chrome.i18n.getMessage(elem.getAttribute("local-placeholder"))
    });
    document.querySelectorAll('[data-lang]').forEach(elem => {
        elem.innerText = chrome.i18n.getMessage(elem.getAttribute("data-lang"))
    });
});