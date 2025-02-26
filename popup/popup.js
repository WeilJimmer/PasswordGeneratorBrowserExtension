// popup.js

async function set_state(_key,_value,_ttl=20) {
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
            saltField: document.getElementById('domain'),
            versionField: document.getElementById('version'),
            currentUrlField: document.getElementById('currentUrl'),
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
                this.elements.checksumField.textContent = message.data.checksum;
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
        this.elements.saltField.value = await get_state('domain', '');
        this.elements.versionField.value = await get_state('version', '1');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        this.elements.currentUrlField.textContent = tab.url;
        await set_state('current_url', tab.url);
        await this.initializeEventListeners();
        console.log('UI initialized');
        console.log(await get_state('length', 40))
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
            set_state('master_password', newPw);
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
            set_state('domain', e.target.value);
            await send_generate_password();
        });
        this.elements.versionField.addEventListener('input', async (e) => {
            set_state('version', e.target.value);
            await send_generate_password();
        });
        this.elements.generateBtn.addEventListener('click', async () => {
            console.log('generateBtn clicked');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const url = tab.url;
            const newSalt = this.elements.saltField.value;
            const response = await send_generate_password();
            this.elements.passwordField.textContent = response.password;
            this.elements.checksumField.textContent = response.checksum;
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

    handleButtonClick() {
        if (!this.initialized) {
            console.warn('Cannot perform action: background not ready');
            return;
        }
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
});